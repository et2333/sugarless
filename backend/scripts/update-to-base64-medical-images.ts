import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 使用base64编码的简单医疗图片
const base64MedicalImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNEE5MEUyIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4Ij5NZWRpY2FsPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjE4NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCI+UHJvZHVjdDwvdGV4dD4KPC9zdmc+';

async function updateToBase64MedicalImages() {
  try {
    console.log('开始为产品更新Base64医疗图片...');

    const products = await prisma.product.findMany();

    console.log(`找到 ${products.length} 个产品需要更新图片`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        // 更新产品图片为Base64医疗图片
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: base64MedicalImage
          },
        });

        console.log(`已更新产品图片: ${product.name} (${product.category}) -> Base64医疗图片`);
        updatedCount++;
      } catch (innerError) {
        console.error(`为产品 ${product.id} 更新图片时出错:`, innerError);
      }
    }

    console.log(`Base64医疗图片更新完成！共为 ${updatedCount} 个产品更新了图片`);
    
    // 显示图片说明
    console.log('\n🏥 Base64医疗图片:');
    console.log('🔬 使用SVG格式，Base64编码');
    console.log('💊 蓝色背景，白色圆形，白色文字');
    console.log('🌿 尺寸: 400x300 像素');
    console.log('🥗 100% 可靠，无网络依赖');
    console.log('📱 内嵌在数据库中，无需外部请求');
    
  } catch (error) {
    console.error('更新图片过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToBase64MedicalImages();
