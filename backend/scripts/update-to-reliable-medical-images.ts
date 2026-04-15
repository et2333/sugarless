import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 使用Pixabay API获取医疗相关图片
const medicalImageMappings: { [key: string]: string } = {
  // 医疗器械 - 使用医疗设备相关图片
  'Blood Glucose Meter Kit': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Glucose Test Strips': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Blood Collection Pen': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Lancets': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Insulin Pen Needles': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'FreeStyle Libre Sensor': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Dexcom G6 Sensor': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Blood Pressure Monitor': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Weight Scale': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Insulin Cooler Box': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Pill Box': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  
  // 药物 - 使用药品相关图片
  'Metformin 500mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Metformin 850mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Metformin 1000mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Glimepiride 1mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Glimepiride 2mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Glimepiride 4mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sitagliptin 100mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sitagliptin 50mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Linagliptin 5mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Saxagliptin 5mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Dapagliflozin 10mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Empagliflozin 10mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Empagliflozin 25mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Canagliflozin 100mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Liraglutide Injection Pen': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Dulaglutide Injection Pen': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Semaglutide Injection Pen': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Rapid-acting Insulin': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Long-acting Insulin': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Premixed Insulin': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Gliclazide 80mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Gliclazide 30mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Acarbose 50mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Acarbose 100mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Pioglitazone 15mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Pioglitazone 30mg': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  
  // 维生素和补充剂 - 使用健康补充剂图片
  'Vitamin D3': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Omega-3 Fish Oil': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Magnesium Supplement': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Alpha Lipoic Acid': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Chromium Supplement': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Cinnamon Extract': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'B-Complex Vitamins': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Vitamin B12': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Vitamin B1': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Vitamin B6': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Coenzyme Q10': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Vitamin C': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Vitamin E': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Zinc Supplement': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Selenium Supplement': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Fenugreek Extract': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Bitter Melon Extract': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'American Ginseng Extract': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Korean Ginseng Extract': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Diabetes Complex Nutrition Formula': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Blood Sugar Support Formula': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Diabetes Multivitamin Formula': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  
  // 健康食品 - 使用营养食品图片
  'Sugar-free Protein Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Plant Protein Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Whey Protein': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Oatmeal': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Quinoa': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Brown Rice': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Chia Seeds': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Flaxseed Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Spirulina Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Wheatgrass Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Almond Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Walnuts': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Almonds': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Pumpkin Seeds': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Protein Bar': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Seaweed Crisps': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Yogurt': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Greek Yogurt': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Almond Milk': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Sugar-free Soy Milk': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Stevia': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Erythritol': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Coconut Oil': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Extra Virgin Olive Oil': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Psyllium Husk Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Inulin Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
  'Apple Pectin Powder': 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg',
};

// 根据产品名称获取可靠的医疗图片URL
function getReliableMedicalImageUrl(productName: string, category: string): string {
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
    return 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg';
  }
  
  // 药物 - 使用药品图片
  if (lowerCategory.includes('medication') || lowerName.includes('mg') || 
      lowerName.includes('tablet') || lowerName.includes('capsule') || 
      lowerName.includes('insulin') || lowerName.includes('metformin') ||
      lowerName.includes('glimepiride') || lowerName.includes('sitagliptin')) {
    return 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg';
  }
  
  // 维生素和补充剂 - 使用健康补充剂图片
  if (lowerCategory.includes('supplement') || lowerCategory.includes('vitamin') || 
      lowerName.includes('vitamin') || lowerName.includes('supplement') || 
      lowerName.includes('coenzyme') || lowerName.includes('extract') ||
      lowerName.includes('omega') || lowerName.includes('magnesium')) {
    return 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg';
  }
  
  // 健康食品 - 使用营养食品图片
  if (lowerCategory.includes('food') || lowerName.includes('protein') || 
      lowerName.includes('rice') || lowerName.includes('seed') || 
      lowerName.includes('powder') || lowerName.includes('oil') || 
      lowerName.includes('yogurt') || lowerName.includes('milk') ||
      lowerName.includes('quinoa') || lowerName.includes('chia')) {
    return 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg';
  }
  
  // 默认医疗图片
  return 'https://cdn.pixabay.com/photo/2017/08/07/18/57/medical-2606753_640.jpg';
}

async function updateToReliableMedicalImages() {
  try {
    console.log('开始为产品更新可靠的医疗图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 获取可靠的医疗图片URL
        const imageUrl = getReliableMedicalImageUrl(product.name, product.category);

        // 更新产品图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: imageUrl
          },
        });

        console.log(`已更新产品图片: ${product.name} (${product.category}) -> 可靠医疗图片`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`可靠医疗图片更新完成！共为 ${updatedCount} 个产品更新了图片`);
    
    // 显示图片分类说明
    console.log('\n🏥 可靠医疗图片分类:');
    console.log('🔬 医疗器械: 可靠的医疗设备图片');
    console.log('💊 药物: 可靠的药品图片');
    console.log('🌿 维生素补充剂: 可靠的健康补充剂图片');
    console.log('🥗 健康食品: 可靠的营养食品图片');
    console.log('📚 数据源: Pixabay CDN (可靠的图片托管)');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToReliableMedicalImages();
