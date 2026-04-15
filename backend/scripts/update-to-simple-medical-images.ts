import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 使用简单可靠的医疗图片URL
const reliableMedicalImageUrl = 'https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Medical+Product';

async function updateToSimpleMedicalImages() {
  try {
    console.log('开始为产品更新简单可靠的医疗图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 更新产品图片为简单可靠的医疗图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: reliableMedicalImageUrl
          },
        });

        console.log(`已更新产品图片: ${product.name} (${product.category}) -> 简单可靠医疗图片`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`简单可靠医疗图片更新完成！共为 ${updatedCount} 个产品更新了图片`);
    
    // 显示图片说明
    console.log('\n🏥 简单可靠医疗图片:');
    console.log('🔬 使用 via.placeholder.com 服务');
    console.log('💊 蓝色背景，白色文字 "Medical Product"');
    console.log('🌿 尺寸: 400x300 像素');
    console.log('🥗 100% 可靠，无加载问题');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToSimpleMedicalImages();
