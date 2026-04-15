import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 产品名称翻译映射
const productNameTranslations: { [key: string]: string } = {
  '格列美脲 2mg': 'Glimepiride 2mg',
  '格列美脲 1mg': 'Glimepiride 1mg',
  '二甲双胍 500mg': 'Metformin 500mg',
  '格列美脲 4mg': 'Glimepiride 4mg',
  '长效胰岛素': 'Long-acting Insulin',
  '卡格列净 100mg': 'Canagliflozin 100mg',
  '格列齐特 80mg': 'Gliclazide 80mg',
  '达格列净 10mg': 'Dapagliflozin 10mg',
  '降血糖的药': 'Blood Sugar Lowering Drugs',
  '便宜的维生素D': 'Cheap Vitamin D',
  '血糖仪试纸': 'Glucose Test Strips',
  '适合糖尿病患者的补充剂': 'Supplements Suitable for Diabetics',
  '维生素D3': 'Vitamin D3',
  'Omega-3鱼油': 'Omega-3 Fish Oil',
};

// 品牌名称翻译映射
const brandNameTranslations: { [key: string]: string } = {
  '通用品牌': 'Generic Brand',
  'Amaryl': 'Amaryl',
  'Levemir': 'Levemir',
  'Invokana': 'Invokana',
  'Diamicron': 'Diamicron',
  'Forxiga': 'Forxiga',
};

// 类别翻译映射
const categoryTranslations: { [key: string]: string } = {
  '糖尿病药物': 'Diabetes Medication',
  '血糖控制补充剂': 'Blood Sugar Control Supplements',
  '维生素': 'Vitamins',
  '医疗器械': 'Medical Devices',
  '营养补充剂': 'Nutritional Supplements',
};

// 供应商翻译映射
const vendorTranslations: { [key: string]: string } = {
  'Chemist Warehouse': 'Chemist Warehouse',
  'Priceline': 'Priceline',
  'Terry White': 'Terry White',
};

// 剂量单位翻译映射
const unitTranslations: { [key: string]: string } = {
  '片': 'tablets',
  '胶囊': 'capsules',
  'ml': 'ml',
  'g': 'g',
  'mg': 'mg',
};

const translateText = (text: string, type: 'productName' | 'brand' | 'category' | 'vendor' | 'unit') => {
  if (type === 'productName') {
    return productNameTranslations[text] || text;
  }
  if (type === 'brand') {
    return brandNameTranslations[text] || text;
  }
  if (type === 'category') {
    return categoryTranslations[text] || text;
  }
  if (type === 'vendor') {
    return vendorTranslations[text] || text;
  }
  if (type === 'unit') {
    return unitTranslations[text] || text;
  }
  return text;
};

async function updateProducts() {
  try {
    console.log('开始更新产品数据为英文...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新`);

    for (const product of products) {
      try {
        const updates: any = {};

        // 更新产品名称
        if (product.name) {
          updates.name = translateText(product.name, 'productName');
        }

        // 更新品牌
        if (product.brand) {
          updates.brand = translateText(product.brand, 'brand');
        }

        // 更新类别
        if (product.category) {
          updates.category = translateText(product.category, 'category');
        }

        // 更新供应商
        if (product.vendor) {
          updates.vendor = translateText(product.vendor, 'vendor');
        }

        // 更新单位
        if (product.unit) {
          updates.unit = translateText(product.unit, 'unit');
        }

        // 更新描述（如果有中文描述）
        if (product.description) {
          const descriptionTranslations: { [key: string]: string } = {
            '适合糖尿病患者使用的药物': 'Medication suitable for diabetic patients',
            '血糖控制药物': 'Blood sugar control medication',
            '长效胰岛素制剂': 'Long-acting insulin preparation',
            'SGLT2抑制剂': 'SGLT2 inhibitor',
            'DPP-4抑制剂': 'DPP-4 inhibitor',
          };
          updates.description = descriptionTranslations[product.description] || product.description;
        }

        // 如果有更新内容，则保存
        if (Object.keys(updates).length > 0) {
          await prisma.product.update({
            where: { id: product.id },
            data: updates,
          });
          console.log(`已更新产品: ${product.name} -> ${updates.name || product.name}`);
        }
      } catch (innerError) {
        console.error(`更新产品 ${product.id} 时出错:`, innerError);
      }
    }

    console.log('产品数据更新完成！');
  } catch (error) {
    console.error('更新过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProducts();
