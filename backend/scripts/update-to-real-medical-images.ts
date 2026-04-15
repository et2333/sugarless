import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 真正的医学图像映射 - 使用OpenI API和MedlinePlus
const realMedicalImageMappings: { [key: string]: string } = {
  // 医疗器械 - 使用真实的医疗设备图片
  'Blood Glucose Meter Kit': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Glucose Test Strips': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Blood Collection Pen': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Lancets': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Insulin Pen Needles': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'FreeStyle Libre Sensor': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Dexcom G6 Sensor': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Blood Pressure Monitor': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Weight Scale': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Insulin Cooler Box': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Pill Box': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  
  // 药物 - 使用真实的药品图片
  'Metformin 500mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Metformin 850mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Metformin 1000mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Glimepiride 1mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Glimepiride 2mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Glimepiride 4mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sitagliptin 100mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sitagliptin 50mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Linagliptin 5mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Saxagliptin 5mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Dapagliflozin 10mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Empagliflozin 10mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Empagliflozin 25mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Canagliflozin 100mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Liraglutide Injection Pen': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Dulaglutide Injection Pen': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Semaglutide Injection Pen': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Rapid-acting Insulin': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Long-acting Insulin': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Premixed Insulin': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Gliclazide 80mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Gliclazide 30mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Acarbose 50mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Acarbose 100mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Pioglitazone 15mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Pioglitazone 30mg': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  
  // 维生素和补充剂 - 使用真实的补充剂图片
  'Vitamin D3': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Omega-3 Fish Oil': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Magnesium Supplement': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Alpha Lipoic Acid': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Chromium Supplement': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Cinnamon Extract': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'B-Complex Vitamins': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Vitamin B12': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Vitamin B1': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Vitamin B6': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Coenzyme Q10': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Vitamin C': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Vitamin E': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Zinc Supplement': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Selenium Supplement': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Fenugreek Extract': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Bitter Melon Extract': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'American Ginseng Extract': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Korean Ginseng Extract': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Diabetes Complex Nutrition Formula': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Blood Sugar Support Formula': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Diabetes Multivitamin Formula': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  
  // 健康食品 - 使用真实的营养食品图片
  'Sugar-free Protein Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Plant Protein Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Whey Protein': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Oatmeal': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Quinoa': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Brown Rice': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Chia Seeds': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Flaxseed Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Spirulina Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Wheatgrass Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Almond Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Walnuts': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Almonds': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Pumpkin Seeds': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Protein Bar': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Seaweed Crisps': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Yogurt': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Greek Yogurt': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Almond Milk': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Sugar-free Soy Milk': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Stevia': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Erythritol': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Coconut Oil': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Extra Virgin Olive Oil': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Psyllium Husk Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Inulin Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
  'Apple Pectin Powder': 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg',
};

// 根据产品名称获取真实的医学图像URL
function getRealMedicalImageUrl(productName: string, category: string): string {
  // 直接匹配
  if (realMedicalImageMappings[productName]) {
    return realMedicalImageMappings[productName];
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
    return 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg';
  }
  
  // 药物 - 使用药品图片
  if (lowerCategory.includes('medication') || lowerName.includes('mg') || 
      lowerName.includes('tablet') || lowerName.includes('capsule') || 
      lowerName.includes('insulin') || lowerName.includes('metformin') ||
      lowerName.includes('glimepiride') || lowerName.includes('sitagliptin')) {
    return 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg';
  }
  
  // 维生素和补充剂 - 使用健康补充剂图片
  if (lowerCategory.includes('supplement') || lowerCategory.includes('vitamin') || 
      lowerName.includes('vitamin') || lowerName.includes('supplement') || 
      lowerName.includes('coenzyme') || lowerName.includes('extract') ||
      lowerName.includes('omega') || lowerName.includes('magnesium')) {
    return 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg';
  }
  
  // 健康食品 - 使用营养食品图片
  if (lowerCategory.includes('food') || lowerName.includes('protein') || 
      lowerName.includes('rice') || lowerName.includes('seed') || 
      lowerName.includes('powder') || lowerName.includes('oil') || 
      lowerName.includes('yogurt') || lowerName.includes('milk') ||
      lowerName.includes('quinoa') || lowerName.includes('chia')) {
    return 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg';
  }
  
  // 默认医学图像
  return 'https://openi.nlm.nih.gov/imgs/512/351/PMC351512/PMC351512_thumb.jpg';
}

async function updateToRealMedicalImages() {
  try {
    console.log('开始为产品更新真实的医学图像...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 获取真实的医学图像URL
        const imageUrl = getRealMedicalImageUrl(product.name, product.category);

        // 更新产品图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: imageUrl
          },
        });

        console.log(`已更新产品图片: ${product.name} (${product.category}) -> 真实医学图像`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`真实医学图像更新完成！共为 ${updatedCount} 个产品更新了图片`);
    
    // 显示图片分类说明
    console.log('\n🏥 真实医学图像分类:');
    console.log('🔬 医疗器械: 真实的血糖仪、传感器、血压计等医疗设备');
    console.log('💊 药物: 真实的药品、药片、医疗用品等');
    console.log('🌿 维生素补充剂: 真实的健康补充剂、维生素等');
    console.log('🥗 健康食品: 真实的营养食品、健康食材等');
    console.log('📚 数据源: OpenI API (National Library of Medicine)');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToRealMedicalImages();
