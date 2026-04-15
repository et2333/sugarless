import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 为每个产品生成独特的图片ID
function generateImageId(productName: string): number {
  // 使用产品名称的哈希值来生成一致的图片ID
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    const char = productName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 确保ID在1-1000范围内（Lorem Picsum的有效范围）
  return Math.abs(hash) % 1000 + 1;
}

// 根据产品类型选择不同的图片风格
function getImageStyle(productName: string, category: string): string {
  const lowerName = productName.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  // 医疗器械 - 使用科技/医疗风格的图片
  if (lowerCategory.includes('medical') || lowerName.includes('glucose') || 
      lowerName.includes('blood') || lowerName.includes('sensor') || 
      lowerName.includes('monitor') || lowerName.includes('meter')) {
    return 'medical';
  }
  
  // 药物 - 使用药品/化学风格的图片
  if (lowerCategory.includes('medication') || lowerName.includes('mg') || 
      lowerName.includes('tablet') || lowerName.includes('capsule') || 
      lowerName.includes('insulin') || lowerName.includes('pen')) {
    return 'pharmaceutical';
  }
  
  // 维生素和补充剂 - 使用健康/自然风格的图片
  if (lowerCategory.includes('supplement') || lowerCategory.includes('vitamin') || 
      lowerName.includes('vitamin') || lowerName.includes('supplement') || 
      lowerName.includes('coenzyme') || lowerName.includes('extract')) {
    return 'health';
  }
  
  // 食品 - 使用食物/营养风格的图片
  if (lowerCategory.includes('food') || lowerName.includes('protein') || 
      lowerName.includes('rice') || lowerName.includes('seed') || 
      lowerName.includes('powder') || lowerName.includes('oil') || 
      lowerName.includes('yogurt') || lowerName.includes('milk')) {
    return 'food';
  }
  
  // 默认
  return 'general';
}

// 根据产品类型获取图片ID范围
function getImageIdRange(style: string): { min: number; max: number } {
  switch (style) {
    case 'medical':
      return { min: 1, max: 200 };    // 科技/医疗风格
    case 'pharmaceutical':
      return { min: 201, max: 400 };  // 药品/化学风格
    case 'health':
      return { min: 401, max: 600 };  // 健康/自然风格
    case 'food':
      return { min: 601, max: 800 };  // 食物/营养风格
    default:
      return { min: 801, max: 1000 }; // 通用风格
  }
}

// 生成产品图片URL
function generateProductImageUrl(productName: string, category: string): string {
  const style = getImageStyle(productName, category);
  const range = getImageIdRange(style);
  
  // 基于产品名称生成一致的图片ID
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    const char = productName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // 在指定范围内生成ID
  const imageId = range.min + (Math.abs(hash) % (range.max - range.min + 1));
  
  // 添加一些变化，基于产品名称的长度
  const variation = productName.length % 3;
  const finalImageId = imageId + variation;
  
  return `https://picsum.photos/id/${finalImageId}/400/300`;
}

async function updateProductImages() {
  try {
    console.log('开始为产品更新独特的图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 生成独特的图片URL
        const imageUrl = generateProductImageUrl(product.name, product.category);

        // 更新产品图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: imageUrl
          },
        });

        console.log(`已更新产品图片: ${product.name} (${product.category}) -> ID: ${imageUrl.split('/')[4]}`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`产品图片更新完成！共为 ${updatedCount} 个产品更新了独特图片`);
    
    // 显示一些示例
    console.log('\n📸 图片风格分类示例:');
    console.log('🏥 医疗器械 (ID 1-200): Blood Glucose Meter Kit, Glucose Test Strips');
    console.log('💊 药物 (ID 201-400): Metformin 500mg, Insulin Pen Needles');
    console.log('🌿 维生素补充剂 (ID 401-600): Vitamin D3, Coenzyme Q10');
    console.log('🥗 健康食品 (ID 601-800): Brown Rice, Sugar-free Protein Powder');
    console.log('📦 通用 (ID 801-1000): 其他产品');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductImages();
