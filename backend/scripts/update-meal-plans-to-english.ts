import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 食材名称翻译映射
const ingredientTranslations: { [key: string]: string } = {
  // 主食类
  '全麦馒头': 'Whole Wheat Steamed Bun',
  '全麦面包': 'Whole Wheat Bread',
  '全麦吐司': 'Whole Wheat Toast',
  '糙米饭': 'Brown Rice',
  '藜麦饭': 'Quinoa Rice',
  '红薯饭': 'Sweet Potato Rice',
  '荞麦面': 'Buckwheat Noodles',
  '荞麦面条': 'Buckwheat Noodles',
  '燕麦粥': 'Oatmeal',
  '小米粥': 'Millet Porridge',
  '玉米粥': 'Corn Porridge',
  '紫薯粥': 'Purple Sweet Potato Porridge',
  '杂粮粥': 'Mixed Grain Porridge',
  
  // 蛋白质类
  '水煮蛋': 'Boiled Egg',
  '鸡蛋': 'Egg',
  '鸡胸肉': 'Chicken Breast',
  '瘦猪肉': 'Lean Pork',
  '猪里脊': 'Pork Tenderloin',
  '猪瘦肉': 'Lean Pork',
  '牛腩': 'Beef Brisket',
  '鲈鱼': 'Sea Bass',
  '虾仁': 'Shrimp',
  '去皮鸡腿': 'Skinless Chicken Thigh',
  '猪肉末': 'Ground Pork',
  
  // 蔬菜类
  '西兰花': 'Broccoli',
  '菠菜': 'Spinach',
  '上海青': 'Shanghai Greens',
  '油麦菜': 'Lettuce',
  '小白菜': 'Baby Bok Choy',
  '青椒': 'Green Pepper',
  '茄子': 'Eggplant',
  '小番茄': 'Cherry Tomatoes',
  '胡萝卜': 'Carrot',
  '芹菜': 'Celery',
  '芥蓝': 'Chinese Broccoli',
  '菜心': 'Choy Sum',
  '绿豆芽': 'Mung Bean Sprouts',
  
  // 菌类
  '香菇': 'Shiitake Mushroom',
  
  // 乳制品
  '脱脂牛奶': 'Skim Milk',
  '无糖豆浆': 'Unsweetened Soy Milk',
  '无糖酸奶': 'Unsweetened Yogurt',
  '低脂奶酪': 'Low-fat Cheese',
  
  // 坚果类
  '混合坚果': 'Mixed Nuts',
  '核桃': 'Walnuts',
  '杏仁片': 'Almond Slices',
  '腰果': 'Cashews',
  
  // 水果类
  '蓝莓': 'Blueberries',
  '苹果': 'Apple',
  '草莓': 'Strawberries',
  
  // 其他
  '奇亚籽': 'Chia Seeds',
  '紫菜': 'Seaweed',
  '黑木耳': 'Black Fungus',
  '黄花菜': 'Day Lily',
  '橄榄油': 'Olive Oil',
  '肉桂': 'Cinnamon',
  '燕麦片': 'Oatmeal',
  '番茄': 'Tomato',
  '牛油果': 'Avocado',
  '红薯': 'Sweet Potato',
  '豆腐': 'Tofu',
  '混合蔬菜': 'Mixed Vegetables',
  '黄瓜': 'Cucumber',
  '苹果': 'Apple',
};

// 餐食名称翻译映射
const mealNameTranslations: { [key: string]: string } = {
  '全麦馒头+水煮蛋+牛奶': 'Whole Wheat Steamed Bun + Boiled Egg + Milk',
  '糙米饭+香菇滑鸡+清炒时蔬': 'Brown Rice + Mushroom Chicken + Stir-fried Vegetables',
  '荞麦面+瘦肉炒青椒+紫菜蛋花汤': 'Buckwheat Noodles + Lean Pork with Green Pepper + Seaweed Egg Drop Soup',
  '燕麦粥+坚果+无糖豆浆': 'Oatmeal + Nuts + Unsweetened Soy Milk',
  '藜麦饭+番茄炖牛腩+蒜蓉菠菜': 'Quinoa Rice + Tomato Braised Beef + Garlic Spinach',
  '小米粥+清蒸鲈鱼+炒时蔬': 'Millet Porridge + Steamed Sea Bass + Stir-fried Vegetables',
  '全麦面包+牛油果+脱脂牛奶': 'Whole Wheat Bread + Avocado + Skim Milk',
  '红薯饭+豆腐蔬菜沙拉+鸡胸肉': 'Sweet Potato Rice + Tofu Vegetable Salad + Chicken Breast',
  '杂粮粥+清炒虾仁+炒青菜': 'Mixed Grain Porridge + Stir-fried Shrimp + Stir-fried Greens',
  '荞麦面条+水煮蛋+蔬菜': 'Buckwheat Noodles + Boiled Egg + Vegetables',
  '糙米饭+鱼香茄子+小白菜': 'Brown Rice + Fish-flavored Eggplant + Baby Bok Choy',
  '玉米粥+蒸鸡腿+炒豆芽': 'Corn Porridge + Steamed Chicken Thigh + Stir-fried Bean Sprouts',
  '全麦吐司+奶酪+黄瓜': 'Whole Wheat Toast + Cheese + Cucumber',
  '藜麦饭+宫保鸡丁+炒时蔬': 'Quinoa Rice + Kung Pao Chicken + Stir-fried Vegetables',
  '紫薯粥+炒鸡蛋+蒜蓉芥蓝': 'Purple Sweet Potato Porridge + Scrambled Eggs + Garlic Chinese Broccoli',
  '燕麦粥+水果+坚果': 'Oatmeal + Fruits + Nuts',
  '红薯饭+木须肉+炒青菜': 'Sweet Potato Rice + Moo Shu Pork + Stir-fried Greens',
  '小米粥+豆腐蔬菜沙拉': 'Millet Porridge + Tofu Vegetable Salad',
  '全麦馒头+无糖酸奶+蓝莓': 'Whole Wheat Steamed Bun + Unsweetened Yogurt + Blueberries',
  '糙米饭+香菇滑鸡+清炒西兰花': 'Brown Rice + Mushroom Chicken + Stir-fried Broccoli',
  '荞麦面+肉末茄子+白灼菜心': 'Buckwheat Noodles + Ground Pork Eggplant + Blanched Choy Sum',
};

function translateIngredients(ingredients: string[]): string[] {
  return ingredients.map(ingredient => {
    // 处理带数量的食材，如 "全麦馒头(1个)"
    const match = ingredient.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      const [, name, quantity] = match;
      const translatedName = ingredientTranslations[name] || name;
      return `${translatedName} (${quantity})`;
    }
    
    // 直接翻译食材名称
    return ingredientTranslations[ingredient] || ingredient;
  });
}

function translateMealName(name: string): string {
  return mealNameTranslations[name] || name;
}

async function updateMealPlans() {
  try {
    console.log('开始更新膳食计划为英文...');
    
    const mealPlans = await prisma.mealPlan.findMany();
    
    console.log(`找到 ${mealPlans.length} 个膳食计划需要更新`);
    
    for (const mealPlan of mealPlans) {
      try {
        const mealsData = JSON.parse(mealPlan.meals as string);
        
        if (mealsData.aiGenerated && mealsData.plan) {
          // 更新AI生成的计划
          const updatedPlan = mealsData.plan.map((dayPlan: any) => {
            const updatedDay = { ...dayPlan };
            
            // 更新天数
            if (updatedDay.day && updatedDay.day.startsWith('第')) {
              const dayNumber = updatedDay.day.match(/第(\d+)天/);
              if (dayNumber) {
                updatedDay.day = `Day ${dayNumber[1]}`;
              }
            }
            
            // 更新每餐
            ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
              if (updatedDay[mealType]) {
                const meal = updatedDay[mealType];
                
                // 更新餐食名称
                if (meal.name) {
                  meal.name = translateMealName(meal.name);
                }
                
                // 更新食材列表
                if (meal.ingredients && Array.isArray(meal.ingredients)) {
                  meal.ingredients = translateIngredients(meal.ingredients);
                }
              }
            });
            
            return updatedDay;
          });
          
          // 更新总结和提示
          const updatedSummary = mealsData.summary ? 
            mealsData.summary.replace(/此膳食计划以低糖、低盐、高纤维的食物为主，控制每日总热量和碳水化合物摄入，适合2型糖尿病患者。/g, 
              'This meal plan focuses on low-sugar, low-salt, high-fiber foods, controlling daily total calories and carbohydrate intake, suitable for type 2 diabetes patients.') : 
            mealsData.summary;
          
          const updatedTips = mealsData.tips ? mealsData.tips.map((tip: string) => {
            const tipTranslations: { [key: string]: string } = {
              '建议多喝水，每日至少1.5升。': 'Recommend drinking more water, at least 1.5 liters daily.',
              '餐间可以适量补充低GI水果，如苹果、梨等，但要注意控制量。': 'You can supplement with low-GI fruits between meals, such as apples and pears, but pay attention to controlling the amount.',
              '注意监测血糖，根据血糖情况调整饮食。': 'Pay attention to monitoring blood sugar and adjust diet according to blood sugar levels.',
              '保持均衡饮食': 'Maintain balanced diet',
              '定时定量': 'Regular meals',
              '多蔬菜少油盐': 'More vegetables, less oil and salt'
            };
            return tipTranslations[tip] || tip;
          }) : mealsData.tips;
          
          const updatedMealsData = {
            ...mealsData,
            plan: updatedPlan,
            summary: updatedSummary,
            tips: updatedTips
          };
          
          await prisma.mealPlan.update({
            where: { id: mealPlan.id },
            data: {
              meals: JSON.stringify(updatedMealsData)
            }
          });
          
          console.log(`已更新膳食计划: ${mealPlan.id}`);
        }
      } catch (error) {
        console.error(`更新膳食计划 ${mealPlan.id} 时出错:`, error);
      }
    }
    
    console.log('膳食计划更新完成！');
    
  } catch (error) {
    console.error('更新过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行更新
updateMealPlans();
