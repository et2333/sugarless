import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// 创建发货
const createShipmentSchema = z.object({
  orderId: z.string(),
  carrier: z.string(),
  service: z.enum(['standard', 'express']),
  packages: z.array(z.object({
    weight: z.number(),
    length: z.number(),
    width: z.number(),
    height: z.number(),
    description: z.string().optional()
  })),
  shippingCost: z.number().optional()
});

router.post('/', async (req: AuthRequest, res) => {
  const data = createShipmentSchema.parse(req.body);

  // 1. 获取订单
  const order = await prisma.order.findUnique({
    where: { id: data.orderId }
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  // 验证用户权限
  if (order.userId !== req.user!.userId && req.user!.role !== 'merchant' && req.user!.role !== 'admin') {
    throw new AppError('无权限', 403, 'FORBIDDEN');
  }

  // 检查订单状态
  if (!['confirmed', 'processing'].includes(order.status)) {
    throw new AppError('订单状态不允许发货', 400, 'INVALID_ORDER_STATUS');
  }

  // 2. 生成追踪号
  const trackingNumber = generateTrackingNumber(data.carrier);
  const trackingUrl = generateTrackingUrl(data.carrier, trackingNumber);

  // 3. 创建发货记录
  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      carrier: data.carrier,
      service: data.service,
      trackingNumber,
      trackingUrl,
      packages: JSON.stringify(data.packages),
      origin: JSON.stringify({
        address: 'Warehouse Main',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      }),
      destination: order.deliveryAddress,
      status: 'created',
      statusHistory: JSON.stringify([{
        status: 'created',
        timestamp: new Date(),
        location: 'Sydney Warehouse',
        description: '包裹已创建'
      }]),
      shippingCost: data.shippingCost || order.shippingCost
    }
  });

  // 4. 更新订单状态，同步更新子订单
  const subOrders = JSON.parse(order.subOrders);
  const updatedSubOrders = subOrders.map((so: any) => ({
    ...so,
    status: 'shipped',
    updatedAt: new Date().toISOString()
  }));

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'shipped',
      subOrders: JSON.stringify(updatedSubOrders)
    }
  });

  console.log(`✅ [发货] 订单状态已更新为 shipped，同步更新了 ${updatedSubOrders.length} 个子订单`);

  res.status(201).json({
    success: true,
    data: {
      ...shipment,
      packages: JSON.parse(shipment.packages),
      origin: JSON.parse(shipment.origin),
      destination: JSON.parse(shipment.destination),
      statusHistory: JSON.parse(shipment.statusHistory)
    },
    message: '发货成功！'
  });
});

// 获取发货记录
router.get('/', async (req: AuthRequest, res) => {
  const { orderId, status, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (orderId) where.orderId = orderId;
  if (status) where.status = status;

  // 如果是普通用户，只能查看自己的订单
  if (req.user!.role === 'patient') {
    const userOrders = await prisma.order.findMany({
      where: { userId: req.user!.userId },
      select: { id: true }
    });
    const orderIds = userOrders.map(o => o.id);
    where.orderId = { in: orderIds };
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.shipment.count({ where })
  ]);

  const shipmentsWithParsedData = shipments.map(s => ({
    ...s,
    packages: JSON.parse(s.packages),
    origin: JSON.parse(s.origin),
    destination: JSON.parse(s.destination),
    statusHistory: JSON.parse(s.statusHistory)
  }));

  res.json({
    success: true,
    data: shipmentsWithParsedData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// 获取单个发货记录
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      order: true
    }
  });

  if (!shipment) {
    throw new AppError('发货记录不存在', 404, 'SHIPMENT_NOT_FOUND');
  }

  // 权限检查
  if (req.user!.role === 'patient' && shipment.order.userId !== req.user!.userId) {
    throw new AppError('无权限', 403, 'FORBIDDEN');
  }

  res.json({
    success: true,
    data: {
      ...shipment,
      packages: JSON.parse(shipment.packages),
      origin: JSON.parse(shipment.origin),
      destination: JSON.parse(shipment.destination),
      statusHistory: JSON.parse(shipment.statusHistory)
    }
  });
});

// 通过追踪号查询
router.get('/tracking/:trackingNumber', async (req: AuthRequest, res) => {
  const { trackingNumber } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { trackingNumber }
  });

  if (!shipment) {
    throw new AppError('追踪号不存在', 404, 'TRACKING_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      ...shipment,
      packages: JSON.parse(shipment.packages),
      origin: JSON.parse(shipment.origin),
      destination: JSON.parse(shipment.destination),
      statusHistory: JSON.parse(shipment.statusHistory)
    }
  });
});

// 更新物流状态
const updateStatusSchema = z.object({
  status: z.enum(['created', 'in_transit', 'out_for_delivery', 'delivered', 'failed']),
  location: z.string(),
  description: z.string()
});

router.post('/:id/status', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateStatusSchema.parse(req.body);

  const shipment = await prisma.shipment.findUnique({
    where: { id }
  });

  if (!shipment) {
    throw new AppError('发货记录不存在', 404, 'SHIPMENT_NOT_FOUND');
  }

  // 只有商家和管理员可以更新状态
  if (!['merchant', 'admin'].includes(req.user!.role)) {
    throw new AppError('无权限', 403, 'FORBIDDEN');
  }

  // 更新状态历史
  const statusHistory = JSON.parse(shipment.statusHistory);
  statusHistory.push({
    status: data.status,
    timestamp: new Date(),
    location: data.location,
    description: data.description
  });

  // 更新发货记录
  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      status: data.status,
      statusHistory: JSON.stringify(statusHistory),
      actualDelivery: data.status === 'delivered' ? new Date() : shipment.actualDelivery
    }
  });

  // 如果是已送达，更新订单状态
  if (data.status === 'delivered') {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: {
        status: 'delivered',
        actualDelivery: new Date()
      }
    });
  }

  res.json({
    success: true,
    data: {
      ...updated,
      packages: JSON.parse(updated.packages),
      origin: JSON.parse(updated.origin),
      destination: JSON.parse(updated.destination),
      statusHistory: JSON.parse(updated.statusHistory)
    },
    message: '状态更新成功'
  });
});

// 模拟物流更新（用于测试）
router.post('/:id/simulate-tracking', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { id }
  });

  if (!shipment) {
    throw new AppError('发货记录不存在', 404, 'SHIPMENT_NOT_FOUND');
  }

  const statusHistory = JSON.parse(shipment.statusHistory);
  const currentStatus = shipment.status;

  // 根据当前状态模拟下一个状态
  let nextStatus = currentStatus;
  let location = 'Processing Center';
  let description = '包裹处理中';

  if (currentStatus === 'created') {
    nextStatus = 'in_transit';
    location = 'Sydney Sorting Facility';
    description = '包裹已发出';
  } else if (currentStatus === 'in_transit') {
    nextStatus = 'out_for_delivery';
    location = 'Local Delivery Hub';
    description = '包裹派送中';
  } else if (currentStatus === 'out_for_delivery') {
    nextStatus = 'delivered';
    location = 'Recipient Address';
    description = '包裹已签收';
  }

  statusHistory.push({
    status: nextStatus,
    timestamp: new Date(),
    location,
    description
  });

  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      status: nextStatus,
      statusHistory: JSON.stringify(statusHistory),
      actualDelivery: nextStatus === 'delivered' ? new Date() : shipment.actualDelivery
    }
  });

  // 如果是已送达，更新订单状态
  if (nextStatus === 'delivered') {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: {
        status: 'delivered',
        actualDelivery: new Date()
      }
    });
  }

  res.json({
    success: true,
    data: {
      ...updated,
      packages: JSON.parse(updated.packages),
      origin: JSON.parse(updated.origin),
      destination: JSON.parse(updated.destination),
      statusHistory: JSON.parse(updated.statusHistory)
    },
    message: '物流状态已更新'
  });
});

// 辅助函数：生成追踪号
function generateTrackingNumber(carrier: string): string {
  const prefix = carrier.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// 辅助函数：生成追踪URL
function generateTrackingUrl(carrier: string, trackingNumber: string): string {
  const baseUrls: { [key: string]: string } = {
    'Australia Post': 'https://auspost.com.au/mypost/track/#/details/',
    'StarTrack': 'https://starstrack.com.au/track/',
    'DHL': 'https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id=',
    'FedEx': 'https://www.fedex.com/fedextrack/?tracknumbers='
  };

  const baseUrl = baseUrls[carrier] || 'https://tracking.example.com/';
  return `${baseUrl}${trackingNumber}`;
}

export default router;

