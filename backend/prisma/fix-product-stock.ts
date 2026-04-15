/**
 * Fix all products to have inStock: true and stockQuantity > 0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProductStock() {
  console.log('\n🔧 Fixing product stock status...');

  // Update all products to be in stock with quantity
  const result = await prisma.product.updateMany({
    data: {
      inStock: true,
      stockQuantity: 100, // Set default stock quantity
    },
    where: {
      OR: [
        { inStock: false },
        { stockQuantity: { lte: 0 } },
        { stockQuantity: null }
      ]
    }
  });

  console.log(`  ✅ Updated ${result.count} products to be in stock`);

  // Also ensure all products have stockQuantity
  const result2 = await prisma.product.updateMany({
    data: {
      stockQuantity: 100,
    },
    where: {
      stockQuantity: null
    }
  });

  console.log(`  ✅ Set stockQuantity for ${result2.count} products`);

  // Verify
  const totalProducts = await prisma.product.count();
  const inStockProducts = await prisma.product.count({
    where: {
      inStock: true,
      OR: [
        { stockQuantity: { gt: 0 } },
        { stockQuantity: null }
      ]
    }
  });

  console.log(`  📊 Total products: ${totalProducts}`);
  console.log(`  ✅ In-stock products: ${inStockProducts}`);
}

fixProductStock()
  .catch((e) => {
    console.error('Error fixing product stock:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

