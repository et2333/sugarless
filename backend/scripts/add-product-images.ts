import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 产品图片映射 - 使用Unsplash的免费图片
const productImageMappings: { [key: string]: string } = {
  // 医疗器械
  'Blood Glucose Meter Kit': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  'Blood Collection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Lancets': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Insulin Pen Needles': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'FreeStyle Libre Sensor': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  'Dexcom G6 Sensor': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  'Blood Pressure Monitor': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  'Weight Scale': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  'Insulin Cooler Box': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  'Pill Box': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  
  // 药物
  'Semaglutide Injection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Liraglutide Injection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Dulaglutide Injection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Rapid-acting Insulin': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Long-acting Insulin': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Premixed Insulin': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Sitagliptin 100mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Sitagliptin 50mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Linagliptin 5mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Saxagliptin 5mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Empagliflozin 10mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Empagliflozin 25mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Gliclazide 30mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Acarbose 50mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Acarbose 100mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Pioglitazone 15mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Pioglitazone 30mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Glimepiride 1mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Glimepiride 2mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Glimepiride 4mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Metformin 500mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Metformin 850mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Metformin 1000mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Canagliflozin 100mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Dapagliflozin 10mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  'Gliclazide 80mg': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop',
  
  // 维生素和补充剂
  'Vitamin D3': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Omega-3 fish oil': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Magnesium Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Alpha Lipoic Acid': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Chromium Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Cinnamon Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'B-Complex Vitamins': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Vitamin B12': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Vitamin B1': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Vitamin B6': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Coenzyme Q10': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Vitamin C': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Vitamin E': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Zinc Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Selenium Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Fenugreek Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Bitter Melon Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'American Ginseng Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Korean Ginseng Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Diabetes Complex Nutrition Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Blood Sugar Support Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  'Diabetes Multivitamin Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
  
  // 食品
  'Sugar-free Protein Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Plant Protein Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Whey Protein': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Oatmeal': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Quinoa': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Brown Rice': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Chia Seeds': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Flaxseed Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Spirulina Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Wheatgrass Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Almond Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Walnuts': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Almonds': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Pumpkin Seeds': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Protein Bar': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Seaweed Crisps': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Yogurt': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Greek Yogurt': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Almond Milk': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Sugar-free Soy Milk': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Stevia': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Erythritol': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Coconut Oil': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Extra Virgin Olive Oil': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Psyllium Husk Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Inulin Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  'Apple Pectin Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop',
  
  // 血糖试纸
  'Glucose Test Strips': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
};

// 根据产品名称获取图片URL
function getProductImageUrl(productName: string): string {
  // 直接匹配
  if (productImageMappings[productName]) {
    return productImageMappings[productName];
  }
  
  // 模糊匹配 - 根据关键词匹配
  const lowerName = productName.toLowerCase();
  
  if (lowerName.includes('glucose') || lowerName.includes('blood')) {
    return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop';
  }
  
  if (lowerName.includes('insulin') || lowerName.includes('pen') || lowerName.includes('needle')) {
    return 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop';
  }
  
  if (lowerName.includes('vitamin') || lowerName.includes('supplement') || lowerName.includes('coenzyme')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop';
  }
  
  if (lowerName.includes('protein') || lowerName.includes('food') || lowerName.includes('rice') || lowerName.includes('seed')) {
    return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop';
  }
  
  if (lowerName.includes('mg') || lowerName.includes('tablet') || lowerName.includes('capsule')) {
    return 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop';
  }
  
  // 默认图片
  return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop';
}

async function addProductImages() {
  try {
    console.log('开始为产品添加图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要添加图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 如果已经有图片URL，跳过
        if (product.imageUrl && product.imageUrl.trim() !== '') {
          continue;
        }

        // 获取产品图片URL
        const imageUrl = getProductImageUrl(product.name);

        // 更新产品图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: imageUrl
          },
        });

        console.log(`已为产品添加图片: ${product.name} -> ${imageUrl}`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 添加图片时出错:`, innerError);
      }
    }

    console.log(`产品图片添加完成！共为 ${updatedCount} 个产品添加了图片`);
  } catch (error) {
    console.error('添加图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addProductImages();
