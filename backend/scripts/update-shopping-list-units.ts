import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateShoppingListUnits() {
  try {
    console.log('开始更新购物清单中的中文单位...');

    const shoppingLists = await prisma.shoppingList.findMany();

    console.log(`找到 ${shoppingLists.length} 个购物清单需要检查`);

    let updatedCount = 0;

    for (const shoppingList of shoppingLists) {
      try {
        // 解析items JSON
        const items = JSON.parse(shoppingList.items as string);
        
        let hasChanges = false;
        
        // 更新每个item的单位
        const updatedItems = items.map((item: any) => {
          if (item.unit === '份') {
            hasChanges = true;
            return {
              ...item,
              unit: 'serving'
            };
          }
          return item;
        });

        // 如果有更改，更新数据库
        if (hasChanges) {
          await prisma.shoppingList.update({
            where: { id: shoppingList.id },
            data: {
              items: JSON.stringify(updatedItems)
            }
          });
          
          console.log(`已更新购物清单: ${shoppingList.name}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`处理购物清单 ${shoppingList.id} 时出错:`, error);
      }
    }

    console.log(`\n单位更新完成！`);
    console.log(`📊 统计信息:`);
    console.log(`   - 总购物清单数: ${shoppingLists.length}`);
    console.log(`   - 已更新数量: ${updatedCount}`);
    console.log(`   - 中文单位 "份" 已全部替换为 "serving"`);
    
  } catch (error) {
    console.error('更新过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateShoppingListUnits();
