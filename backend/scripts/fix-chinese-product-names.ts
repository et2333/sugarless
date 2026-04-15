import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 更全面的产品名称翻译映射
const productNameTranslations: { [key: string]: string } = {
  // 二甲双胍相关
  '二甲双胍 500mg': 'Metformin 500mg',
  '二甲双胍 850mg': 'Metformin 850mg',
  '二甲双胍 1000mg': 'Metformin 1000mg',
  
  // 格列美脲相关
  '格列美脲 1mg': 'Glimepiride 1mg',
  '格列美脲 2mg': 'Glimepiride 2mg',
  '格列美脲 4mg': 'Glimepiride 4mg',
  
  // 西格列汀相关
  '西格列汀 50mg': 'Sitagliptin 50mg',
  '西格列汀 100mg': 'Sitagliptin 100mg',
  
  // 利格列汀相关
  '利格列汀 5mg': 'Linagliptin 5mg',
  
  // 沙格列汀相关
  '沙格列汀 5mg': 'Saxagliptin 5mg',
  
  // 达格列净相关
  '达格列净 10mg': 'Dapagliflozin 10mg',
  
  // 恩格列净相关
  '恩格列净 10mg': 'Empagliflozin 10mg',
  '恩格列净 25mg': 'Empagliflozin 25mg',
  
  // 卡格列净相关
  '卡格列净 100mg': 'Canagliflozin 100mg',
  
  // 利拉鲁肽相关
  '利拉鲁肽注射笔': 'Liraglutide Injection Pen',
  
  // 度拉糖肽相关
  '度拉糖肽注射笔': 'Dulaglutide Injection Pen',
  
  // 司美格鲁肽相关
  '司美格鲁肽注射笔': 'Semaglutide Injection Pen',
  
  // 速效胰岛素相关
  '速效胰岛素': 'Rapid-acting Insulin',
  
  // 长效胰岛素相关
  '长效胰岛素': 'Long-acting Insulin',
  
  // 预混胰岛素相关
  '预混胰岛素': 'Premixed Insulin',
  
  // 格列齐特相关
  '格列齐特 30mg': 'Gliclazide 30mg',
  '格列齐特 80mg': 'Gliclazide 80mg',
  
  // 阿卡波糖相关
  '阿卡波糖 50mg': 'Acarbose 50mg',
  '阿卡波糖 100mg': 'Acarbose 100mg',
  
  // 吡格列酮相关
  '吡格列酮 15mg': 'Pioglitazone 15mg',
  '吡格列酮 30mg': 'Pioglitazone 30mg',
  
  // Omega-3相关
  'Omega-3 鱼油': 'Omega-3 Fish Oil',
  
  // 其他可能的中文名称
  '血糖仪套装': 'Blood Glucose Meter Kit',
  '血糖试纸': 'Glucose Test Strips',
  '采血笔': 'Blood Collection Pen',
  '采血针': 'Lancets',
  '胰岛素笔针': 'Insulin Pen Needles',
  '血压计': 'Blood Pressure Monitor',
  '体重秤': 'Weight Scale',
  '胰岛素冷藏盒': 'Insulin Cooler Box',
  '药盒': 'Pill Box',
  '维生素D3': 'Vitamin D3',
  '镁补充剂': 'Magnesium Supplement',
  '硫辛酸': 'Alpha Lipoic Acid',
  '铬补充剂': 'Chromium Supplement',
  '肉桂提取物': 'Cinnamon Extract',
  '复合维生素B': 'B-Complex Vitamins',
  '维生素B12': 'Vitamin B12',
  '维生素B1': 'Vitamin B1',
  '维生素B6': 'Vitamin B6',
  '辅酶Q10': 'Coenzyme Q10',
  '维生素C': 'Vitamin C',
  '维生素E': 'Vitamin E',
  '锌补充剂': 'Zinc Supplement',
  '硒补充剂': 'Selenium Supplement',
  '胡芦巴提取物': 'Fenugreek Extract',
  '苦瓜提取物': 'Bitter Melon Extract',
  '西洋参提取物': 'American Ginseng Extract',
  '韩国人参提取物': 'Korean Ginseng Extract',
  '糖尿病复合营养配方': 'Diabetes Complex Nutrition Formula',
  '血糖支持配方': 'Blood Sugar Support Formula',
  '糖尿病复合维生素配方': 'Diabetes Multivitamin Formula',
  '无糖蛋白粉': 'Sugar-free Protein Powder',
  '植物蛋白粉': 'Plant Protein Powder',
  '无糖乳清蛋白': 'Sugar-free Whey Protein',
  '无糖燕麦片': 'Sugar-free Oatmeal',
  '藜麦': 'Quinoa',
  '糙米': 'Brown Rice',
  '奇亚籽': 'Chia Seeds',
  '亚麻籽粉': 'Flaxseed Powder',
  '螺旋藻粉': 'Spirulina Powder',
  '小麦草粉': 'Wheatgrass Powder',
  '杏仁粉': 'Almond Powder',
  '核桃': 'Walnuts',
  '杏仁': 'Almonds',
  '南瓜籽': 'Pumpkin Seeds',
  '无糖蛋白棒': 'Sugar-free Protein Bar',
  '海苔脆片': 'Seaweed Crisps',
  '无糖酸奶': 'Sugar-free Yogurt',
  '无糖希腊酸奶': 'Sugar-free Greek Yogurt',
  '无糖杏仁奶': 'Sugar-free Almond Milk',
  '无糖豆浆': 'Sugar-free Soy Milk',
  '甜叶菊': 'Stevia',
  '赤藓糖醇': 'Erythritol',
  '椰子油': 'Coconut Oil',
  '特级初榨橄榄油': 'Extra Virgin Olive Oil',
  '车前子壳粉': 'Psyllium Husk Powder',
  '菊粉粉': 'Inulin Powder',
  '苹果果胶粉': 'Apple Pectin Powder',
};

async function fixChineseProductNames() {
  try {
    console.log('开始修复剩余的中文产品名称...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要检查`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        let newName = product.name;
        let hasUpdate = false;

        // 检查是否有直接匹配的翻译
        if (productNameTranslations[product.name]) {
          newName = productNameTranslations[product.name];
          hasUpdate = true;
        } else {
          // 检查是否包含中文字符
          const hasChinese = /[\u4e00-\u9fff]/.test(product.name);
          if (hasChinese) {
            console.log(`发现中文产品名称: ${product.name} (ID: ${product.id})`);
            // 尝试部分匹配
            for (const [chinese, english] of Object.entries(productNameTranslations)) {
              if (product.name.includes(chinese.split(' ')[0])) {
                newName = product.name.replace(chinese.split(' ')[0], english.split(' ')[0]);
                hasUpdate = true;
                break;
              }
            }
          }
        }

        if (hasUpdate && newName !== product.name) {
          // 更新产品名称
          await prisma.product.update({
            where: { id: product.id },
            data: {
              name: newName
            },
          });

          console.log(`已更新产品名称: ${product.name} -> ${newName}`);
          updatedCount++;
        }
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新名称时出错:`, innerError);
      }
    }

    console.log(`产品名称修复完成！共更新了 ${updatedCount} 个产品名称`);
    
  } catch (error) {
    console.error('修复产品名称过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixChineseProductNames();
