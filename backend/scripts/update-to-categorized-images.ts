import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 三类不同的Base64图片
const imageCategories = {
  // 医疗器件 - 蓝色医疗主题
  medicalDevice: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNEE5MEUyIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5NZWRpY2FsPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjE4NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCI+RGV2aWNlPC90ZXh0Pgo8L3N2Zz4=',
  
  // 药品 - 绿色药品主题
  medication: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNTJjNDFhIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5NZWRpY2F0aW9uPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjE4NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCI+RHJ1ZzwvdGV4dD4KPC9zdmc+',
  
  // 食物 - 橙色营养主题
  food: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZmY3ODAwIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5OdXRyaXRpb248L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMTg1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5Gb29kPC90ZXh0Pgo8L3N2Zz4='
};

// 根据产品名称和类别确定图片类型
function getImageCategory(productName: string, category: string): string {
  const lowerName = productName.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  // 医疗器件
  if (lowerCategory.includes('medical') || 
      lowerName.includes('glucose') || 
      lowerName.includes('blood') || 
      lowerName.includes('sensor') || 
      lowerName.includes('monitor') || 
      lowerName.includes('meter') ||
      lowerName.includes('pen') || 
      lowerName.includes('needle') ||
      lowerName.includes('lancet') || 
      lowerName.includes('kit') ||
      lowerName.includes('device') ||
      lowerName.includes('scale') ||
      lowerName.includes('cooler') ||
      lowerName.includes('box')) {
    return imageCategories.medicalDevice;
  }
  
  // 药品
  if (lowerCategory.includes('medication') || 
      lowerName.includes('mg') || 
      lowerName.includes('tablet') || 
      lowerName.includes('capsule') || 
      lowerName.includes('insulin') || 
      lowerName.includes('metformin') ||
      lowerName.includes('glimepiride') || 
      lowerName.includes('sitagliptin') ||
      lowerName.includes('linagliptin') ||
      lowerName.includes('saxagliptin') ||
      lowerName.includes('dapagliflozin') ||
      lowerName.includes('empagliflozin') ||
      lowerName.includes('canagliflozin') ||
      lowerName.includes('liraglutide') ||
      lowerName.includes('dulaglutide') ||
      lowerName.includes('semaglutide') ||
      lowerName.includes('gliclazide') ||
      lowerName.includes('acarbose') ||
      lowerName.includes('pioglitazone')) {
    return imageCategories.medication;
  }
  
  // 维生素和补充剂 - 也归类为药品
  if (lowerCategory.includes('supplement') || 
      lowerCategory.includes('vitamin') || 
      lowerName.includes('vitamin') || 
      lowerName.includes('supplement') || 
      lowerName.includes('coenzyme') || 
      lowerName.includes('extract') ||
      lowerName.includes('omega') || 
      lowerName.includes('magnesium') ||
      lowerName.includes('chromium') ||
      lowerName.includes('cinnamon') ||
      lowerName.includes('alpha') ||
      lowerName.includes('lipoic') ||
      lowerName.includes('acid') ||
      lowerName.includes('zinc') ||
      lowerName.includes('selenium') ||
      lowerName.includes('fenugreek') ||
      lowerName.includes('bitter') ||
      lowerName.includes('melon') ||
      lowerName.includes('ginseng') ||
      lowerName.includes('formula')) {
    return imageCategories.medication;
  }
  
  // 健康食品
  if (lowerCategory.includes('food') || 
      lowerName.includes('protein') || 
      lowerName.includes('rice') || 
      lowerName.includes('seed') || 
      lowerName.includes('powder') || 
      lowerName.includes('oil') || 
      lowerName.includes('yogurt') || 
      lowerName.includes('milk') ||
      lowerName.includes('quinoa') || 
      lowerName.includes('chia') ||
      lowerName.includes('flaxseed') ||
      lowerName.includes('spirulina') ||
      lowerName.includes('wheatgrass') ||
      lowerName.includes('almond') ||
      lowerName.includes('walnut') ||
      lowerName.includes('pumpkin') ||
      lowerName.includes('bar') ||
      lowerName.includes('crisp') ||
      lowerName.includes('oatmeal') ||
      lowerName.includes('stevia') ||
      lowerName.includes('erythritol') ||
      lowerName.includes('coconut') ||
      lowerName.includes('olive') ||
      lowerName.includes('psyllium') ||
      lowerName.includes('inulin') ||
      lowerName.includes('pectin')) {
    return imageCategories.food;
  }
  
  // 默认归类为药品
  return imageCategories.medication;
}

async function updateToCategorizedImages() {
  try {
    console.log('开始为产品更新分类图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let medicalDeviceCount = 0;
    let medicationCount = 0;
    let foodCount = 0;

    for (const product of products) {
      try {
        // 获取分类图片
        const imageUrl = getImageCategory(product.name, product.category);

        // 更新产品图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: imageUrl
          },
        });

        // 统计分类
        if (imageUrl === imageCategories.medicalDevice) {
          medicalDeviceCount++;
          console.log(`医疗器件: ${product.name} (${product.category})`);
        } else if (imageUrl === imageCategories.medication) {
          medicationCount++;
          console.log(`药品: ${product.name} (${product.category})`);
        } else if (imageUrl === imageCategories.food) {
          foodCount++;
          console.log(`食物: ${product.name} (${product.category})`);
        }
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`\n分类图片更新完成！`);
    console.log(`🔬 医疗器件: ${medicalDeviceCount} 个产品`);
    console.log(`💊 药品: ${medicationCount} 个产品`);
    console.log(`🥗 食物: ${foodCount} 个产品`);
    console.log(`📊 总计: ${medicalDeviceCount + medicationCount + foodCount} 个产品`);
    
    // 显示图片分类说明
    console.log('\n🏥 三类图片分类:');
    console.log('🔬 医疗器件: 蓝色背景，白色圆形，显示"Medical Device"');
    console.log('💊 药品: 绿色背景，白色圆形，显示"Medication Drug"');
    console.log('🥗 食物: 橙色背景，白色圆形，显示"Nutrition Food"');
    console.log('📱 所有图片都是SVG格式，Base64编码，无网络依赖');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToCategorizedImages();
