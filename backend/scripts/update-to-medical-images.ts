import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 医疗相关图片映射 - 使用更合适的图片源
const medicalImageMappings: { [key: string]: string } = {
  // 医疗器械 - 使用医疗设备相关图片
  'Blood Glucose Meter Kit': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  'Glucose Test Strips': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Blood Collection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Lancets': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Insulin Pen Needles': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'FreeStyle Libre Sensor': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  'Dexcom G6 Sensor': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  'Blood Pressure Monitor': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  'Weight Scale': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  'Insulin Cooler Box': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  'Pill Box': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80',
  
  // 药物 - 使用药品相关图片
  'Metformin 500mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Metformin 850mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Metformin 1000mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Glimepiride 1mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Glimepiride 2mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Glimepiride 4mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Sitagliptin 100mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Sitagliptin 50mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Linagliptin 5mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Saxagliptin 5mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Dapagliflozin 10mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Empagliflozin 10mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Empagliflozin 25mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Canagliflozin 100mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Liraglutide Injection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Dulaglutide Injection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Semaglutide Injection Pen': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Rapid-acting Insulin': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Long-acting Insulin': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Premixed Insulin': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop&q=80',
  'Gliclazide 80mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Gliclazide 30mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Acarbose 50mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Acarbose 100mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Pioglitazone 15mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Pioglitazone 30mg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  
  // 维生素和补充剂 - 使用健康相关图片
  'Vitamin D3': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Omega-3 fish oil': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Magnesium Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Alpha Lipoic Acid': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Chromium Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Cinnamon Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'B-Complex Vitamins': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Vitamin B12': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Vitamin B1': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Vitamin B6': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Coenzyme Q10': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Vitamin C': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Vitamin E': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Zinc Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Selenium Supplement': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Fenugreek Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Bitter Melon Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'American Ginseng Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Korean Ginseng Extract': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Diabetes Complex Nutrition Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Blood Sugar Support Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  'Diabetes Multivitamin Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
  
  // 健康食品 - 使用营养食品相关图片
  'Sugar-free Protein Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Plant Protein Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Whey Protein': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Oatmeal': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Quinoa': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Brown Rice': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Chia Seeds': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Flaxseed Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Spirulina Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Wheatgrass Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Almond Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Walnuts': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Almonds': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Pumpkin Seeds': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Protein Bar': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Seaweed Crisps': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Yogurt': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Greek Yogurt': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Almond Milk': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Sugar-free Soy Milk': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Stevia': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Erythritol': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Coconut Oil': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Extra Virgin Olive Oil': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Psyllium Husk Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Inulin Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
  'Apple Pectin Powder': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80',
};

// 根据产品名称获取医疗相关图片URL
function getMedicalImageUrl(productName: string, category: string): string {
  // 直接匹配
  if (medicalImageMappings[productName]) {
    return medicalImageMappings[productName];
  }
  
  // 模糊匹配 - 根据关键词匹配
  const lowerName = productName.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  // 医疗器械 - 使用医疗设备图片
  if (lowerCategory.includes('medical') || lowerName.includes('glucose') || 
      lowerName.includes('blood') || lowerName.includes('sensor') || 
      lowerName.includes('monitor') || lowerName.includes('meter') ||
      lowerName.includes('pen') || lowerName.includes('needle') ||
      lowerName.includes('lancet') || lowerName.includes('kit')) {
    return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop&q=80';
  }
  
  // 药物 - 使用药品图片
  if (lowerCategory.includes('medication') || lowerName.includes('mg') || 
      lowerName.includes('tablet') || lowerName.includes('capsule') || 
      lowerName.includes('insulin') || lowerName.includes('metformin') ||
      lowerName.includes('glimepiride') || lowerName.includes('sitagliptin')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80';
  }
  
  // 维生素和补充剂 - 使用健康补充剂图片
  if (lowerCategory.includes('supplement') || lowerCategory.includes('vitamin') || 
      lowerName.includes('vitamin') || lowerName.includes('supplement') || 
      lowerName.includes('coenzyme') || lowerName.includes('extract') ||
      lowerName.includes('omega') || lowerName.includes('magnesium')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80';
  }
  
  // 健康食品 - 使用营养食品图片
  if (lowerCategory.includes('food') || lowerName.includes('protein') || 
      lowerName.includes('rice') || lowerName.includes('seed') || 
      lowerName.includes('powder') || lowerName.includes('oil') || 
      lowerName.includes('yogurt') || lowerName.includes('milk') ||
      lowerName.includes('quinoa') || lowerName.includes('chia')) {
    return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=300&fit=crop&q=80';
  }
  
  // 默认医疗相关图片
  return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80';
}

async function updateToMedicalImages() {
  try {
    console.log('开始为产品更新医疗相关图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 获取医疗相关图片URL
        const imageUrl = getMedicalImageUrl(product.name, product.category);

        // 更新产品图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: imageUrl
          },
        });

        console.log(`已更新产品图片: ${product.name} (${product.category}) -> 医疗相关图片`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`医疗相关图片更新完成！共为 ${updatedCount} 个产品更新了图片`);
    
    // 显示图片分类说明
    console.log('\n🏥 医疗相关图片分类:');
    console.log('🔬 医疗器械: 血糖仪、传感器、血压计等医疗设备');
    console.log('💊 药物: 各种糖尿病药物、胰岛素等药品');
    console.log('🌿 维生素补充剂: 维生素、补充剂、提取物等健康产品');
    console.log('🥗 健康食品: 蛋白粉、谷物、坚果等营养食品');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToMedicalImages();
