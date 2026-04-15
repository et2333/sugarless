import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// 获取所有库存
router.get('/', async (req: AuthRequest, res) => {
  const { lowStock, page = '1', limit = '20', search } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  
  // 筛选低库存 - 需要在应用层过滤，因为 Prisma 不支持字段间比较
  // 暂时获取所有数据，然后在内存中过滤
  const shouldFilterLowStock = lowStock === 'true';

  let inventory = await prisma.inventory.findMany({
    where,
    include: {
      product: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // 在应用层过滤低库存
  if (shouldFilterLowStock) {
    inventory = inventory.filter((item: any) => item.quantity <= item.lowStockThreshold);
  }

  const total = inventory.length;
  const paginatedInventory = inventory.slice(skip, skip + limitNum);

  res.json({
    success: true,
    data: paginatedInventory,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// 获取单个库存
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      product: true,
      stockLedgers: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      }
    }
  });

  if (!inventory) {
    throw new AppError('库存不存在', 404, 'INVENTORY_NOT_FOUND');
  }

  res.json({
    success: true,
    data: inventory
  });
});

// 创建库存记录
const createInventorySchema = z.object({
  productId: z.string(),
  sku: z.string(),
  quantity: z.number().int().min(0),
  warehouse: z.string().default('main'),
  location: z.string().optional(),
  lowStockThreshold: z.number().int().default(10),
  reorderPoint: z.number().int().default(20),
  reorderQuantity: z.number().int().default(50)
});

router.post('/', async (req: AuthRequest, res) => {
  const data = createInventorySchema.parse(req.body);

  // 检查产品是否存在
  const product = await prisma.product.findUnique({
    where: { id: data.productId }
  });

  if (!product) {
    throw new AppError('产品不存在', 404, 'PRODUCT_NOT_FOUND');
  }

  // 检查SKU是否已存在
  const existingSku = await prisma.inventory.findUnique({
    where: { sku: data.sku }
  });

  if (existingSku) {
    throw new AppError('SKU已存在', 400, 'SKU_EXISTS');
  }

  const inventory = await prisma.inventory.create({
    data: {
      ...data,
      available: data.quantity
    }
  });

  // 创建初始库存流水
  await prisma.stockLedger.create({
    data: {
      inventoryId: inventory.id,
      productId: data.productId,
      type: 'in',
      quantity: data.quantity,
      beforeQty: 0,
      afterQty: data.quantity,
      reason: '初始库存',
      operator: req.user!.userId
    }
  });

  res.status(201).json({
    success: true,
    data: inventory
  });
});

// 调整库存
const adjustInventorySchema = z.object({
  quantity: z.number().int(),
  type: z.enum(['in', 'out', 'adjust']),
  reason: z.string(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional()
});

router.post('/:id/adjust', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = adjustInventorySchema.parse(req.body);

  const inventory = await prisma.inventory.findUnique({
    where: { id }
  });

  if (!inventory) {
    throw new AppError('库存不存在', 404, 'INVENTORY_NOT_FOUND');
  }

  // 计算新数量
  let newQuantity = inventory.quantity;
  if (data.type === 'in') {
    newQuantity += Math.abs(data.quantity);
  } else if (data.type === 'out') {
    newQuantity -= Math.abs(data.quantity);
  } else { // adjust
    newQuantity = data.quantity;
  }

  if (newQuantity < 0) {
    throw new AppError('库存不足', 400, 'INSUFFICIENT_STOCK');
  }

  // 更新库存
  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      quantity: newQuantity,
      available: newQuantity - inventory.reserved,
      lastRestockDate: data.type === 'in' ? new Date() : inventory.lastRestockDate
    }
  });

  // 创建库存流水
  await prisma.stockLedger.create({
    data: {
      inventoryId: id,
      productId: inventory.productId,
      type: data.type,
      quantity: data.quantity,
      beforeQty: inventory.quantity,
      afterQty: newQuantity,
      reason: data.reason,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      operator: req.user!.userId
    }
  });

  res.json({
    success: true,
    data: updated,
    message: '库存调整成功'
  });
});

// 预留库存（订单创建时）
const reserveStockSchema = z.object({
  quantity: z.number().int().min(1)
});

router.post('/:id/reserve', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quantity } = reserveStockSchema.parse(req.body);

  const inventory = await prisma.inventory.findUnique({
    where: { id }
  });

  if (!inventory) {
    throw new AppError('库存不存在', 404, 'INVENTORY_NOT_FOUND');
  }

  if (inventory.available < quantity) {
    throw new AppError('可用库存不足', 400, 'INSUFFICIENT_AVAILABLE_STOCK');
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      reserved: inventory.reserved + quantity,
      available: inventory.available - quantity
    }
  });

  // 创建库存流水
  await prisma.stockLedger.create({
    data: {
      inventoryId: id,
      productId: inventory.productId,
      type: 'reserve',
      quantity: -quantity,
      beforeQty: inventory.available,
      afterQty: inventory.available - quantity,
      reason: '订单预留',
      operator: req.user!.userId
    }
  });

  res.json({
    success: true,
    data: updated,
    message: '库存预留成功'
  });
});

// 释放库存（订单取消时）
const releaseStockSchema = z.object({
  quantity: z.number().int().min(1)
});

router.post('/:id/release', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quantity } = releaseStockSchema.parse(req.body);

  const inventory = await prisma.inventory.findUnique({
    where: { id }
  });

  if (!inventory) {
    throw new AppError('库存不存在', 404, 'INVENTORY_NOT_FOUND');
  }

  if (inventory.reserved < quantity) {
    throw new AppError('预留库存不足', 400, 'INSUFFICIENT_RESERVED_STOCK');
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      reserved: inventory.reserved - quantity,
      available: inventory.available + quantity
    }
  });

  // 创建库存流水
  await prisma.stockLedger.create({
    data: {
      inventoryId: id,
      productId: inventory.productId,
      type: 'release',
      quantity: quantity,
      beforeQty: inventory.available,
      afterQty: inventory.available + quantity,
      reason: '库存释放',
      operator: req.user!.userId
    }
  });

  res.json({
    success: true,
    data: updated,
    message: '库存释放成功'
  });
});

// 获取低库存报告
router.get('/reports/low-stock', async (req: AuthRequest, res) => {
  const lowStockItems = await prisma.$queryRaw`
    SELECT 
      i.*,
      p.name as productName,
      p.category as productCategory
    FROM inventory i
    LEFT JOIN products p ON i.productId = p.id
    WHERE i.quantity <= i.lowStockThreshold
    AND i.status = 'active'
    ORDER BY i.quantity ASC
  `;

  res.json({
    success: true,
    data: lowStockItems
  });
});

// 获取库存流水
router.get('/:id/ledgers', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { page = '1', limit = '50' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [ledgers, total] = await Promise.all([
    prisma.stockLedger.findMany({
      where: { inventoryId: id },
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.stockLedger.count({
      where: { inventoryId: id }
    })
  ]);

  res.json({
    success: true,
    data: ledgers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

export default router;

