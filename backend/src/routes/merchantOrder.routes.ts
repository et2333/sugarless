import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// 获取商户的所有订单（按供应商分组查看）
router.get('/vendor-orders', async (req: AuthRequest, res) => {
  const { vendor, status, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // 获取所有订单
  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [allOrders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.order.count({ where })
  ]);

  // 解析并筛选出包含指定供应商的订单
  const vendorOrders = allOrders
    .map(order => {
      const subOrders = JSON.parse(order.subOrders);
      const deliveryAddress = JSON.parse(order.deliveryAddress);
      
      // 筛选出该供应商的子订单
      const vendorSubOrders = vendor 
        ? subOrders.filter((so: any) => so.vendor === vendor)
        : subOrders;

      if (!vendor || vendorSubOrders.length > 0) {
        return {
          ...order,
          subOrders: vendorSubOrders,
          allSubOrders: subOrders, // 保留完整信息用于参考
          deliveryAddress
        };
      }
      return null;
    })
    .filter(Boolean);

  // 统计各供应商的订单数
  const vendorStats = new Map<string, number>();
  allOrders.forEach(order => {
    const subOrders = JSON.parse(order.subOrders);
    subOrders.forEach((so: any) => {
      vendorStats.set(so.vendor, (vendorStats.get(so.vendor) || 0) + 1);
    });
  });

  res.json({
    success: true,
    data: vendorOrders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: vendor ? vendorOrders.length : totalOrders,
      totalPages: Math.ceil((vendor ? vendorOrders.length : totalOrders) / limitNum)
    },
    vendorStats: Object.fromEntries(vendorStats)
  });
});

// 获取单个订单详情（商户视角）
router.get('/orders/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      shipments: true
    }
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      ...order,
      subOrders: JSON.parse(order.subOrders),
      deliveryAddress: JSON.parse(order.deliveryAddress),
      shipments: order.shipments.map(s => ({
        ...s,
        packages: JSON.parse(s.packages),
        origin: JSON.parse(s.origin),
        destination: JSON.parse(s.destination),
        statusHistory: JSON.parse(s.statusHistory)
      }))
    }
  });
});

// 更新订单状态（商户操作）
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  note: z.string().optional()
});

router.patch('/orders/:id/status', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateStatusSchema.parse(req.body);

  console.log(`📝 [商户] 更新订单状态: ${id}, 新状态: ${data.status}`);

  const order = await prisma.order.findUnique({
    where: { id }
  });

  if (!order) {
    console.error(`❌ [商户] 订单不存在: ${id}`);
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  // 解析子订单并同步更新所有子订单状态
  const subOrders = JSON.parse(order.subOrders);
  const updatedSubOrders = subOrders.map((so: any) => ({
    ...so,
    status: data.status,
    updatedAt: new Date().toISOString()
  }));

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: data.status,
      subOrders: JSON.stringify(updatedSubOrders), // 同步更新子订单状态
      note: data.note ? `${order.note || ''}\n[商户备注] ${data.note}` : order.note
    }
  });

  console.log(`✅ [商户] 订单状态已更新: ${id}, ${order.status} -> ${updatedOrder.status}`);
  console.log(`✅ [商户] 同步更新 ${updatedSubOrders.length} 个子订单状态为: ${data.status}`);

  res.json({
    success: true,
    data: {
      ...updatedOrder,
      subOrders: JSON.parse(updatedOrder.subOrders),
      deliveryAddress: JSON.parse(updatedOrder.deliveryAddress)
    },
    message: '订单状态已更新'
  });
});

// 更新子订单状态（针对特定供应商）
const updateSubOrderSchema = z.object({
  vendor: z.string(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  trackingNumber: z.string().optional(),
  note: z.string().optional()
});

router.patch('/orders/:id/sub-order', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateSubOrderSchema.parse(req.body);

  console.log(`📝 [商户] 更新子订单状态: ${id}, 供应商: ${data.vendor}, 新状态: ${data.status}`);

  const order = await prisma.order.findUnique({
    where: { id }
  });

  if (!order) {
    console.error(`❌ [商户] 订单不存在: ${id}`);
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  const subOrders = JSON.parse(order.subOrders);
  const subOrderIndex = subOrders.findIndex((so: any) => so.vendor === data.vendor);

  if (subOrderIndex === -1) {
    console.error(`❌ [商户] 子订单不存在: ${data.vendor}`);
    throw new AppError('子订单不存在', 404, 'SUB_ORDER_NOT_FOUND');
  }

  const oldStatus = subOrders[subOrderIndex].status;

  // 更新子订单
  subOrders[subOrderIndex].status = data.status;
  if (data.trackingNumber) {
    subOrders[subOrderIndex].trackingNumber = data.trackingNumber;
  }
  if (data.note) {
    subOrders[subOrderIndex].note = data.note;
  }
  subOrders[subOrderIndex].updatedAt = new Date().toISOString();

  // 根据子订单状态更新主订单状态
  const allConfirmed = subOrders.every((so: any) => ['confirmed', 'processing', 'shipped', 'delivered'].includes(so.status));
  const allShipped = subOrders.every((so: any) => so.status === 'shipped' || so.status === 'delivered');
  const allDelivered = subOrders.every((so: any) => so.status === 'delivered');
  const anyProcessing = subOrders.some((so: any) => so.status === 'processing');

  let mainStatus = order.status;
  if (allDelivered) {
    mainStatus = 'delivered';
  } else if (allShipped) {
    mainStatus = 'shipped';
  } else if (anyProcessing) {
    mainStatus = 'processing';
  } else if (allConfirmed) {
    mainStatus = 'confirmed';
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: mainStatus,
      subOrders: JSON.stringify(subOrders)
    }
  });

  console.log(`✅ [商户] 子订单状态已更新: ${data.vendor}, ${oldStatus} -> ${data.status}`);
  console.log(`✅ [商户] 主订单状态: ${order.status} -> ${mainStatus}`);

  res.json({
    success: true,
    data: {
      ...updatedOrder,
      subOrders: JSON.parse(updatedOrder.subOrders),
      deliveryAddress: JSON.parse(updatedOrder.deliveryAddress)
    },
    message: '子订单状态已更新'
  });
});

// 批量处理订单（商户快速操作）
const batchUpdateSchema = z.object({
  orderIds: z.array(z.string()),
  action: z.enum(['confirm', 'process', 'cancel']),
  note: z.string().optional()
});

router.post('/orders/batch-update', async (req: AuthRequest, res) => {
  const data = batchUpdateSchema.parse(req.body);

  const statusMap = {
    confirm: 'confirmed',
    process: 'processing',
    cancel: 'cancelled'
  };

  const targetStatus = statusMap[data.action];

  // 批量更新订单状态，同时同步子订单状态
  const orders = await prisma.order.findMany({
    where: {
      id: { in: data.orderIds },
      status: { not: 'delivered' } // 已完成的订单不能批量操作
    }
  });

  await prisma.$transaction(
    orders.map(order => {
      const subOrders = JSON.parse(order.subOrders);
      const updatedSubOrders = subOrders.map((so: any) => ({
        ...so,
        status: targetStatus,
        updatedAt: new Date().toISOString()
      }));

      return prisma.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus as any,
          note: data.note,
          subOrders: JSON.stringify(updatedSubOrders)
        }
      });
    })
  );

  console.log(`✅ [商户批量操作] 已批量更新 ${orders.length} 个订单及其子订单为: ${targetStatus}`);

  res.json({
    success: true,
    message: `已批量更新 ${orders.length} 个订单`
  });
});

// 获取商户订单统计
router.get('/statistics', async (req: AuthRequest, res) => {
  const { vendor } = req.query;

  const allOrders = await prisma.order.findMany({
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      subOrders: true
    }
  });

  // 按供应商统计
  const stats: any = {
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    vendors: {}
  };

  allOrders.forEach(order => {
    const subOrders = JSON.parse(order.subOrders);
    
    subOrders.forEach((so: any) => {
      if (!vendor || so.vendor === vendor) {
        // 初始化供应商统计
        if (!stats.vendors[so.vendor]) {
          stats.vendors[so.vendor] = {
            totalOrders: 0,
            totalRevenue: 0,
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
          };
        }

        // 更新统计
        stats.totalOrders++;
        stats.vendors[so.vendor].totalOrders++;
        stats.vendors[so.vendor].totalRevenue += so.totalAmount;
        stats.vendors[so.vendor][so.status]++;

        if (so.status === 'pending') stats.pendingOrders++;
        if (so.status === 'processing') stats.processingOrders++;
        if (so.status === 'shipped') stats.shippedOrders++;
        if (so.status === 'delivered') stats.deliveredOrders++;
        if (so.status === 'cancelled') stats.cancelledOrders++;
      }
    });
  });

  stats.totalRevenue = Object.values(stats.vendors).reduce((sum: number, v: any) => sum + v.totalRevenue, 0);

  res.json({
    success: true,
    data: stats
  });
});

export default router;

