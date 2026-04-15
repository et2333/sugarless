import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// 一键下单 - 从购物清单创建订单
const createOrderSchema = z.object({
  shoppingListId: z.string(),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string().default('Australia'),
    phone: z.string().optional(),
    notes: z.string().optional()
  }),
  deliveryMethod: z.enum(['standard', 'express', 'pickup']).default('standard'),
  paymentMethod: z.string().default('credit_card'),
  note: z.string().optional()
});

router.post('/create-from-shopping-list', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const data = createOrderSchema.parse(req.body);

  // 1. 获取购物清单
  const shoppingList = await prisma.shoppingList.findFirst({
    where: {
      id: data.shoppingListId,
      userId
    }
  });

  if (!shoppingList) {
    throw new AppError('购物清单不存在', 404, 'SHOPPING_LIST_NOT_FOUND');
  }

  const items = JSON.parse(shoppingList.items);

  // 2. 按供应商分组
  const ordersByVendor = new Map<string, any[]>();
  items.forEach((item: any) => {
    if (item.suggestedVendor) {
      const vendor = item.suggestedVendor.vendorName;
      if (!ordersByVendor.has(vendor)) {
        ordersByVendor.set(vendor, []);
      }
      ordersByVendor.get(vendor)!.push(item);
    }
  });

  // 3. 创建子订单
  const subOrders: any[] = [];
  for (const [vendor, vendorItems] of ordersByVendor.entries()) {
    const subtotal = vendorItems.reduce((sum, item) => {
      return sum + (item.suggestedVendor.price * item.quantity);
    }, 0);

    subOrders.push({
      vendor,
      items: vendorItems,
      status: 'pending',
      totalAmount: subtotal,
      externalOrderId: `EXT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // 4. 计算总金额
  const totalAmount = subOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const shippingCost = data.deliveryMethod === 'express' ? 15.0 : 
                       data.deliveryMethod === 'standard' ? 8.0 : 0;
  const taxAmount = totalAmount * 0.1; // 10% GST
  const finalAmount = totalAmount + shippingCost + taxAmount;

  // 5. 生成订单号
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // 6. 创建主订单
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      shoppingListId: shoppingList.id,
      mealPlanId: shoppingList.mealPlanId,
      status: 'pending',
      paymentStatus: 'pending',
      subOrders: JSON.stringify(subOrders),
      totalAmount,
      shippingCost,
      taxAmount,
      finalAmount,
      currency: 'AUD',
      deliveryAddress: JSON.stringify(data.deliveryAddress),
      deliveryMethod: data.deliveryMethod,
      estimatedDelivery: calculateEstimatedDelivery(data.deliveryMethod),
      note: data.note || null
    }
  });

  // 7. 更新购物清单状态
  await prisma.shoppingList.update({
    where: { id: shoppingList.id },
    data: { status: 'completed' }
  });

  res.status(201).json({
    success: true,
    data: {
      ...order,
      subOrders: JSON.parse(order.subOrders),
      deliveryAddress: JSON.parse(order.deliveryAddress)
    },
    message: '订单创建成功！'
  });
});

// 获取用户的所有订单
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { status, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
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

  const ordersWithParsedData = orders.map(order => ({
    ...order,
    subOrders: JSON.parse(order.subOrders),
    deliveryAddress: JSON.parse(order.deliveryAddress)
  }));

  res.json({
    success: true,
    data: ordersWithParsedData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// 获取单个订单详情
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId
    },
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

// 取消订单
router.post('/:id/cancel', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { reason } = z.object({
    reason: z.string().optional()
  }).parse(req.body);

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  // 只有pending和confirmed状态的订单可以取消
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new AppError('订单状态不允许取消', 400, 'INVALID_ORDER_STATUS');
  }

  // 同步更新子订单状态
  const subOrders = JSON.parse(order.subOrders);
  const updatedSubOrders = subOrders.map((so: any) => ({
    ...so,
    status: 'cancelled',
    updatedAt: new Date().toISOString()
  }));

  await prisma.order.update({
    where: { id },
    data: {
      status: 'cancelled',
      note: reason ? `${order.note || ''}\n取消原因: ${reason}` : order.note,
      subOrders: JSON.stringify(updatedSubOrders)
    }
  });

  console.log(`✅ [取消订单] 订单状态已更新为 cancelled，同步更新了 ${updatedSubOrders.length} 个子订单`);

  res.json({
    success: true,
    message: '订单已取消'
  });
});

// 更新支付状态（模拟支付完成）
router.post('/:id/payment', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { status } = z.object({
    status: z.enum(['paid', 'failed'])
  }).parse(req.body);

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  await prisma.order.update({
    where: { id },
    data: {
      paymentStatus: status,
      // 支付成功后订单状态保持 pending，等待商家确认
      // 支付失败则取消订单
      status: status === 'paid' ? order.status : 'cancelled'
    }
  });

  console.log(`✅ [订单支付] 支付状态已更新为 ${status}${status === 'paid' ? '，等待商家确认订单' : ''}`);

  res.json({
    success: true,
    message: status === 'paid' ? '支付成功' : '支付失败'
  });
});

// 确认收货
router.post('/:id/confirm-delivery', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'shipped') {
    throw new AppError('订单状态错误', 400, 'INVALID_ORDER_STATUS');
  }

  // 同步更新子订单状态
  const subOrders = JSON.parse(order.subOrders);
  const updatedSubOrders = subOrders.map((so: any) => ({
    ...so,
    status: 'delivered',
    updatedAt: new Date().toISOString()
  }));

  await prisma.order.update({
    where: { id },
    data: {
      status: 'delivered',
      actualDelivery: new Date(),
      subOrders: JSON.stringify(updatedSubOrders)
    }
  });

  console.log(`✅ [确认收货] 订单状态已更新为 delivered，同步更新了 ${updatedSubOrders.length} 个子订单`);

  res.json({
    success: true,
    message: '确认收货成功'
  });
});

// 删除订单（仅限已取消的订单）
router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
  }

  // 只能删除已取消的订单
  if (order.status !== 'cancelled') {
    throw new AppError('只能删除已取消的订单', 400, 'INVALID_ORDER_STATUS');
  }

  // 删除订单
  await prisma.order.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: '订单已删除'
  });
});

// 辅助函数：计算预计送达时间
function calculateEstimatedDelivery(method: string): Date {
  const now = new Date();
  const daysToAdd = method === 'express' ? 1 : method === 'standard' ? 5 : 0;
  now.setDate(now.getDate() + daysToAdd);
  return now;
}

export default router;

