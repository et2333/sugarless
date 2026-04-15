import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 更全面的产品名称翻译映射
const productNameTranslations: { [key: string]: string } = {
  // 医疗器械
  '血糖仪套装': 'Blood Glucose Meter Kit',
  '采血笔': 'Blood Collection Pen',
  '采血针': 'Lancets',
  '胰岛素注射笔针头': 'Insulin Pen Needles',
  'FreeStyle Libre传感器': 'FreeStyle Libre Sensor',
  'Dexcom G6传感器': 'Dexcom G6 Sensor',
  '血压计': 'Blood Pressure Monitor',
  '体重秤': 'Weight Scale',
  '胰岛素冷藏盒': 'Insulin Cooler Box',
  '药盒': 'Pill Box',
  
  // 药物
  '司美格鲁肽注射笔': 'Semaglutide Injection Pen',
  '利拉鲁肽注射笔': 'Liraglutide Injection Pen',
  '度拉糖肽注射笔': 'Dulaglutide Injection Pen',
  '速效胰岛素': 'Rapid-acting Insulin',
  '长效胰岛素': 'Long-acting Insulin',
  '预混胰岛素': 'Premixed Insulin',
  '西格列汀 100mg': 'Sitagliptin 100mg',
  '西格列汀 50mg': 'Sitagliptin 50mg',
  '利格列汀 5mg': 'Linagliptin 5mg',
  '沙格列汀 5mg': 'Saxagliptin 5mg',
  '恩格列净 10mg': 'Empagliflozin 10mg',
  '恩格列净 25mg': 'Empagliflozin 25mg',
  '格列齐特 30mg': 'Gliclazide 30mg',
  '阿卡波糖 50mg': 'Acarbose 50mg',
  '阿卡波糖 100mg': 'Acarbose 100mg',
  '吡格列酮 15mg': 'Pioglitazone 15mg',
  '吡格列酮 30mg': 'Pioglitazone 30mg',
  
  // 食品和补充剂
  '糙米': 'Brown Rice',
  '辅酶Q10': 'Coenzyme Q10',
  '硒补充剂': 'Selenium Supplement',
  '镁补充剂': 'Magnesium Supplement',
  'α-硫辛酸': 'Alpha Lipoic Acid',
  '铬元素补充剂': 'Chromium Supplement',
  '肉桂提取物': 'Cinnamon Extract',
  '复合B族维生素': 'B-Complex Vitamins',
  '维生素B12': 'Vitamin B12',
  '维生素B1': 'Vitamin B1',
  '维生素B6': 'Vitamin B6',
  '维生素C': 'Vitamin C',
  '维生素E': 'Vitamin E',
  '锌补充剂': 'Zinc Supplement',
  '葫芦巴提取物': 'Fenugreek Extract',
  '苦瓜提取物': 'Bitter Melon Extract',
  '西洋参提取物': 'American Ginseng Extract',
  '高丽参提取物': 'Korean Ginseng Extract',
  '糖尿病复合营养配方': 'Diabetes Complex Nutrition Formula',
  '血糖支持配方': 'Blood Sugar Support Formula',
  '糖尿病多维配方': 'Diabetes Multivitamin Formula',
  '无糖蛋白粉': 'Sugar-free Protein Powder',
  '植物蛋白粉': 'Plant Protein Powder',
  '无糖乳清蛋白': 'Sugar-free Whey Protein',
  '无糖燕麦': 'Sugar-free Oatmeal',
  '藜麦': 'Quinoa',
  '奇亚籽': 'Chia Seeds',
  '亚麻籽粉': 'Flaxseed Powder',
  '螺旋藻粉': 'Spirulina Powder',
  '小麦草粉': 'Wheatgrass Powder',
  '杏仁粉': 'Almond Powder',
  '核桃仁': 'Walnuts',
  '杏仁': 'Almonds',
  '南瓜籽': 'Pumpkin Seeds',
  '无糖蛋白棒': 'Sugar-free Protein Bar',
  '海苔脆片': 'Seaweed Crisps',
  '无糖酸奶': 'Sugar-free Yogurt',
  '无糖希腊酸奶': 'Sugar-free Greek Yogurt',
  '无糖杏仁奶': 'Sugar-free Almond Milk',
  '无糖豆奶': 'Sugar-free Soy Milk',
  '甜菊糖': 'Stevia',
  '赤藓糖醇': 'Erythritol',
  '椰子油': 'Coconut Oil',
  '特级初榨橄榄油': 'Extra Virgin Olive Oil',
  '洋车前子壳粉': 'Psyllium Husk Powder',
  '菊粉粉末': 'Inulin Powder',
  '苹果果胶粉': 'Apple Pectin Powder',
};

// 类别翻译映射
const categoryTranslations: { [key: string]: string } = {
  '健康食品': 'Healthy Food',
  '医疗器械': 'Medical Devices',
  '糖尿病药物': 'Diabetes Medication',
  '血糖控制补充剂': 'Blood Sugar Control Supplements',
  '维生素': 'Vitamins',
  '营养补充剂': 'Nutritional Supplements',
  '血糖仪': 'Glucose Meter',
  '胰岛素': 'Insulin',
  '血糖试纸': 'Glucose Test Strips',
  '采血用品': 'Blood Collection Supplies',
  '糖尿病护理': 'Diabetes Care',
  '血糖监测': 'Blood Glucose Monitoring',
  '糖尿病管理': 'Diabetes Management',
  '血糖控制': 'Blood Sugar Control',
  '糖尿病治疗': 'Diabetes Treatment',
  '血糖调节': 'Blood Sugar Regulation',
  '糖尿病预防': 'Diabetes Prevention',
  '血糖稳定': 'Blood Sugar Stability',
  '糖尿病康复': 'Diabetes Recovery',
  '血糖平衡': 'Blood Sugar Balance',
};

// 单位翻译映射
const unitTranslations: { [key: string]: string } = {
  '支': 'units',
  '粒': 'capsules',
  '片': 'tablets',
  '胶囊': 'capsules',
  'ml': 'ml',
  'g': 'g',
  'mg': 'mg',
  'mcg': 'mcg',
  '袋': 'bags',
  '盒': 'boxes',
  '瓶': 'bottles',
  '包': 'packages',
  '套': 'sets',
  '个': 'pieces',
  '条': 'strips',
  '张': 'sheets',
};

const translateText = (text: string, type: 'productName' | 'category' | 'unit') => {
  if (type === 'productName') {
    return productNameTranslations[text] || text;
  }
  if (type === 'category') {
    return categoryTranslations[text] || text;
  }
  if (type === 'unit') {
    return unitTranslations[text] || text;
  }
  return text;
};

async function updateRemainingProducts() {
  try {
    console.log('开始更新剩余的中文产品数据...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要检查`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        const updates: any = {};

        // 更新产品名称
        if (product.name) {
          const translatedName = translateText(product.name, 'productName');
          if (translatedName !== product.name) {
            updates.name = translatedName;
          }
        }

        // 更新类别
        if (product.category) {
          const translatedCategory = translateText(product.category, 'category');
          if (translatedCategory !== product.category) {
            updates.category = translatedCategory;
          }
        }

        // 更新单位
        if (product.unit) {
          const translatedUnit = translateText(product.unit, 'unit');
          if (translatedUnit !== product.unit) {
            updates.unit = translatedUnit;
          }
        }

        // 更新描述中的单位
        if (product.description) {
          let updatedDescription = product.description;
          // 替换描述中的中文单位
          for (const [chineseUnit, englishUnit] of Object.entries(unitTranslations)) {
            updatedDescription = updatedDescription.replace(new RegExp(chineseUnit, 'g'), englishUnit);
          }
          if (updatedDescription !== product.description) {
            updates.description = updatedDescription;
          }
        }

        // 如果有更新内容，则保存
        if (Object.keys(updates).length > 0) {
          await prisma.product.update({
            where: { id: product.id },
            data: updates,
          });
          console.log(`已更新产品: ${product.name} -> ${updates.name || product.name}`);
          updatedCount++;
        }
      } catch (innerError) {
        console.error(`更新产品 ${product.id} 时出错:`, innerError);
      }
    }

    console.log(`产品数据更新完成！共更新了 ${updatedCount} 个产品`);
  } catch (error) {
    console.error('更新过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateRemainingProducts();
