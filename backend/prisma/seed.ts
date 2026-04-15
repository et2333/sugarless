import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充数据...');
  
  // 1. 创建示例用户
  const passwordHash = await bcrypt.hash('Demo123456!', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      role: 'user',
      passwordHash,
      emailVerified: true
    },
    create: {
      email: 'demo@example.com',
      passwordHash,
      role: 'user',
      emailVerified: true
    }
  });
  
  console.log('✅ 创建示例用户:', demoUser.email);
  
  // 创建商家测试账号
  const merchantPasswordHash = await bcrypt.hash('Merchant123456!', 10);
  
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant@example.com' },
    update: {
      role: 'merchant',
      passwordHash: merchantPasswordHash,
      emailVerified: true
    },
    create: {
      email: 'merchant@example.com',
      passwordHash: merchantPasswordHash,
      role: 'merchant',
      emailVerified: true
    }
  });
  
  console.log('✅ 创建商家账号:', merchantUser.email);
  
  // 2. 创建示例档案
  await prisma.profile.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      firstName: '张',
      lastName: '三',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'male',
      phone: '1234567890',
      diabetesType: 'type_2',
      diagnosisDate: new Date('2020-01-01'),
      hba1c: 7.5,
      fastingGlucose: 126,
      allergies: JSON.stringify(['花生', '海鲜']),
      dietaryPrefs: JSON.stringify(['低糖', '低盐']),
      activityLevel: 'moderate'
    }
  });
  
  console.log('✅ 创建示例档案');
  
  // 3. 创建示例食谱（共30个）
  const recipes = [
    // === 早餐食谱 (10个) ===
    {
      name: '燕麦粥',
      nameEn: 'Oatmeal',
      description: '健康的早餐选择，富含纤维，有助于稳定血糖',
      ingredients: JSON.stringify([
        { name: '燕麦', quantity: 50, unit: 'g' },
        { name: '低脂牛奶', quantity: 200, unit: 'ml' },
        { name: '蓝莓', quantity: 30, unit: 'g' },
        { name: '杏仁片', quantity: 10, unit: 'g' }
      ]),
      calories: 280,
      carbs: 42,
      protein: 12,
      fat: 7,
      fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 10,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '全麦面包配鸡蛋',
      nameEn: 'Whole Wheat Toast with Eggs',
      description: '简单营养的早餐，提供优质蛋白质',
      ingredients: JSON.stringify([
        { name: '全麦面包', quantity: 2, unit: '片' },
        { name: '鸡蛋', quantity: 2, unit: '个' },
        { name: '番茄', quantity: 1, unit: '个' },
        { name: '橄榄油', quantity: 5, unit: 'ml' }
      ]),
      calories: 320,
      carbs: 32,
      protein: 18,
      fat: 12,
      fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 8,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '希腊酸奶配坚果',
      nameEn: 'Greek Yogurt with Nuts',
      description: '高蛋白低糖早餐，富含益生菌',
      ingredients: JSON.stringify([
        { name: '希腊酸奶', quantity: 200, unit: 'g' },
        { name: '核桃', quantity: 15, unit: 'g' },
        { name: '奇亚籽', quantity: 10, unit: 'g' },
        { name: '草莓', quantity: 50, unit: 'g' }
      ]),
      calories: 260,
      carbs: 22,
      protein: 15,
      fat: 13,
      fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '菠菜蘑菇煎蛋卷',
      nameEn: 'Spinach Mushroom Omelette',
      description: '低碳高蛋白早餐，富含维生素',
      ingredients: JSON.stringify([
        { name: '鸡蛋', quantity: 3, unit: '个' },
        { name: '菠菜', quantity: 50, unit: 'g' },
        { name: '蘑菇', quantity: 50, unit: 'g' },
        { name: '低脂奶酪', quantity: 20, unit: 'g' }
      ]),
      calories: 290,
      carbs: 8,
      protein: 24,
      fat: 18,
      fiber: 3,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 10,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '奇亚籽布丁',
      nameEn: 'Chia Seed Pudding',
      description: '富含omega-3和纤维的营养早餐',
      ingredients: JSON.stringify([
        { name: '奇亚籽', quantity: 30, unit: 'g' },
        { name: '杏仁奶', quantity: 250, unit: 'ml' },
        { name: '肉桂粉', quantity: 1, unit: 'g' },
        { name: '桃子', quantity: 50, unit: 'g' }
      ]),
      calories: 240,
      carbs: 28,
      protein: 8,
      fat: 11,
      fiber: 12,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 0,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '全麦煎饼配浆果',
      nameEn: 'Whole Wheat Pancakes with Berries',
      description: '美味的全麦煎饼，升糖指数较低',
      ingredients: JSON.stringify([
        { name: '全麦面粉', quantity: 50, unit: 'g' },
        { name: '鸡蛋', quantity: 1, unit: '个' },
        { name: '低脂牛奶', quantity: 100, unit: 'ml' },
        { name: '混合浆果', quantity: 60, unit: 'g' }
      ]),
      calories: 310,
      carbs: 45,
      protein: 14,
      fat: 8,
      fiber: 7,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 15,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '豆腐炒蛋',
      nameEn: 'Tofu Scramble',
      description: '植物蛋白早餐，适合素食者',
      ingredients: JSON.stringify([
        { name: '嫩豆腐', quantity: 150, unit: 'g' },
        { name: '鸡蛋', quantity: 1, unit: '个' },
        { name: '彩椒', quantity: 50, unit: 'g' },
        { name: '洋葱', quantity: 30, unit: 'g' }
      ]),
      calories: 220,
      carbs: 12,
      protein: 18,
      fat: 12,
      fiber: 4,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 10,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '鳄梨吐司',
      nameEn: 'Avocado Toast',
      description: '富含健康脂肪的能量早餐',
      ingredients: JSON.stringify([
        { name: '全麦面包', quantity: 2, unit: '片' },
        { name: '鳄梨', quantity: 80, unit: 'g' },
        { name: '水煮蛋', quantity: 1, unit: '个' },
        { name: '番茄', quantity: 50, unit: 'g' }
      ]),
      calories: 340,
      carbs: 35,
      protein: 15,
      fat: 17,
      fiber: 10,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 5,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '藜麦早餐碗',
      nameEn: 'Quinoa Breakfast Bowl',
      description: '完全蛋白质来源，营养全面',
      ingredients: JSON.stringify([
        { name: '藜麦', quantity: 50, unit: 'g' },
        { name: '杏仁奶', quantity: 150, unit: 'ml' },
        { name: '香蕉', quantity: 60, unit: 'g' },
        { name: '肉桂', quantity: 1, unit: 'g' }
      ]),
      calories: 270,
      carbs: 42,
      protein: 10,
      fat: 7,
      fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 15,
      servings: 1,
      category: 'breakfast'
    },
    {
      name: '花生酱香蕉吐司',
      nameEn: 'Peanut Butter Banana Toast',
      description: '简单快速的能量早餐',
      ingredients: JSON.stringify([
        { name: '全麦面包', quantity: 2, unit: '片' },
        { name: '天然花生酱', quantity: 20, unit: 'g' },
        { name: '香蕉', quantity: 80, unit: 'g' },
        { name: '肉桂粉', quantity: 1, unit: 'g' }
      ]),
      calories: 350,
      carbs: 48,
      protein: 13,
      fat: 13,
      fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5,
      cookTime: 2,
      servings: 1,
      category: 'breakfast'
    },
    
    // === 午餐食谱 (10个) ===
    {
      name: '鸡胸肉沙拉',
      nameEn: 'Grilled Chicken Salad',
      description: '低脂高蛋白的健康午餐',
      ingredients: JSON.stringify([
        { name: '鸡胸肉', quantity: 150, unit: 'g' },
        { name: '混合生菜', quantity: 100, unit: 'g' },
        { name: '樱桃番茄', quantity: 50, unit: 'g' },
        { name: '黄瓜', quantity: 50, unit: 'g' },
        { name: '橄榄油', quantity: 10, unit: 'ml' }
      ]),
      calories: 320,
      carbs: 15,
      protein: 45,
      fat: 12,
      fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 10,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '三文鱼藜麦碗',
      nameEn: 'Salmon Quinoa Bowl',
      description: '富含omega-3的营养午餐',
      ingredients: JSON.stringify([
        { name: '三文鱼', quantity: 150, unit: 'g' },
        { name: '藜麦', quantity: 80, unit: 'g' },
        { name: '西兰花', quantity: 100, unit: 'g' },
        { name: '柠檬', quantity: 10, unit: 'g' }
      ]),
      calories: 480,
      carbs: 42,
      protein: 38,
      fat: 18,
      fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 20,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '豆腐蔬菜炒饭',
      nameEn: 'Tofu Vegetable Fried Rice',
      description: '素食友好的平衡午餐',
      ingredients: JSON.stringify([
        { name: '豆腐', quantity: 150, unit: 'g' },
        { name: '糙米饭', quantity: 150, unit: 'g' },
        { name: '混合蔬菜', quantity: 150, unit: 'g' },
        { name: '鸡蛋', quantity: 1, unit: '个' }
      ]),
      calories: 420,
      carbs: 52,
      protein: 22,
      fat: 14,
      fiber: 7,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 15,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '金枪鱼全麦三明治',
      nameEn: 'Tuna Whole Wheat Sandwich',
      description: '便携营养的午餐选择',
      ingredients: JSON.stringify([
        { name: '金枪鱼罐头', quantity: 100, unit: 'g' },
        { name: '全麦面包', quantity: 2, unit: '片' },
        { name: '生菜', quantity: 30, unit: 'g' },
        { name: '番茄', quantity: 50, unit: 'g' }
      ]),
      calories: 340,
      carbs: 38,
      protein: 30,
      fat: 8,
      fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 0,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '土耳其扁豆汤',
      nameEn: 'Turkish Lentil Soup',
      description: '高纤维低GI的暖心午餐',
      ingredients: JSON.stringify([
        { name: '红扁豆', quantity: 80, unit: 'g' },
        { name: '洋葱', quantity: 50, unit: 'g' },
        { name: '番茄', quantity: 100, unit: 'g' },
        { name: '香料', quantity: 5, unit: 'g' }
      ]),
      calories: 280,
      carbs: 45,
      protein: 18,
      fat: 3,
      fiber: 12,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 30,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '牛肉蔬菜卷',
      nameEn: 'Beef and Vegetable Wrap',
      description: '高蛋白低碳卷饼',
      ingredients: JSON.stringify([
        { name: '瘦牛肉', quantity: 120, unit: 'g' },
        { name: '全麦卷饼', quantity: 1, unit: '张' },
        { name: '生菜', quantity: 50, unit: 'g' },
        { name: '彩椒', quantity: 50, unit: 'g' }
      ]),
      calories: 380,
      carbs: 35,
      protein: 32,
      fat: 14,
      fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 10,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '意大利蔬菜汤',
      nameEn: 'Minestrone Soup',
      description: '传统意式蔬菜汤，营养丰富',
      ingredients: JSON.stringify([
        { name: '番茄', quantity: 150, unit: 'g' },
        { name: '芸豆', quantity: 80, unit: 'g' },
        { name: '意面', quantity: 40, unit: 'g' },
        { name: '混合蔬菜', quantity: 100, unit: 'g' }
      ]),
      calories: 320,
      carbs: 52,
      protein: 16,
      fat: 5,
      fiber: 11,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 35,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '虾仁糙米饭',
      nameEn: 'Shrimp with Brown Rice',
      description: '海鲜低脂午餐',
      ingredients: JSON.stringify([
        { name: '虾仁', quantity: 150, unit: 'g' },
        { name: '糙米饭', quantity: 150, unit: 'g' },
        { name: '芦笋', quantity: 100, unit: 'g' },
        { name: '大蒜', quantity: 10, unit: 'g' }
      ]),
      calories: 380,
      carbs: 48,
      protein: 35,
      fat: 6,
      fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 15,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '鹰嘴豆沙拉',
      nameEn: 'Chickpea Salad',
      description: '植物蛋白丰富的地中海风味',
      ingredients: JSON.stringify([
        { name: '鹰嘴豆', quantity: 150, unit: 'g' },
        { name: '黄瓜', quantity: 100, unit: 'g' },
        { name: '番茄', quantity: 100, unit: 'g' },
        { name: '橄榄油', quantity: 15, unit: 'ml' }
      ]),
      calories: 340,
      carbs: 45,
      protein: 15,
      fat: 12,
      fiber: 12,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 0,
      servings: 1,
      category: 'lunch'
    },
    {
      name: '烤鸡胸意面',
      nameEn: 'Grilled Chicken Pasta',
      description: '全麦意面配烤鸡胸',
      ingredients: JSON.stringify([
        { name: '鸡胸肉', quantity: 150, unit: 'g' },
        { name: '全麦意面', quantity: 80, unit: 'g' },
        { name: '番茄酱', quantity: 100, unit: 'g' },
        { name: '罗勒', quantity: 5, unit: 'g' }
      ]),
      calories: 420,
      carbs: 48,
      protein: 42,
      fat: 9,
      fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 20,
      servings: 1,
      category: 'lunch'
    },
    
    // === 晚餐食谱 (10个) ===
    {
      name: '清蒸鱼配蔬菜',
      nameEn: 'Steamed Fish with Vegetables',
      description: '低脂高蛋白的营养晚餐',
      ingredients: JSON.stringify([
        { name: '鲈鱼', quantity: 200, unit: 'g' },
        { name: '西兰花', quantity: 100, unit: 'g' },
        { name: '胡萝卜', quantity: 50, unit: 'g' },
        { name: '生姜', quantity: 10, unit: 'g' }
      ]),
      calories: 280,
      carbs: 20,
      protein: 35,
      fat: 8,
      fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 20,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '烤三文鱼配芦笋',
      nameEn: 'Baked Salmon with Asparagus',
      description: 'Omega-3丰富的美味晚餐',
      ingredients: JSON.stringify([
        { name: '三文鱼', quantity: 180, unit: 'g' },
        { name: '芦笋', quantity: 150, unit: 'g' },
        { name: '柠檬', quantity: 20, unit: 'g' },
        { name: '橄榄油', quantity: 10, unit: 'ml' }
      ]),
      calories: 380,
      carbs: 12,
      protein: 42,
      fat: 20,
      fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 25,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '烤鸡腿配烤蔬菜',
      nameEn: 'Roasted Chicken with Roasted Vegetables',
      description: '简单美味的家常晚餐',
      ingredients: JSON.stringify([
        { name: '鸡腿', quantity: 200, unit: 'g' },
        { name: '南瓜', quantity: 100, unit: 'g' },
        { name: '甜椒', quantity: 100, unit: 'g' },
        { name: '橄榄油', quantity: 15, unit: 'ml' }
      ]),
      calories: 420,
      carbs: 28,
      protein: 38,
      fat: 18,
      fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 40,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '牛肉炒西兰花',
      nameEn: 'Beef and Broccoli Stir-fry',
      description: '中式经典低碳晚餐',
      ingredients: JSON.stringify([
        { name: '瘦牛肉', quantity: 150, unit: 'g' },
        { name: '西兰花', quantity: 200, unit: 'g' },
        { name: '大蒜', quantity: 10, unit: 'g' },
        { name: '酱油', quantity: 10, unit: 'ml' }
      ]),
      calories: 340,
      carbs: 18,
      protein: 42,
      fat: 14,
      fiber: 7,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 15,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '豆腐蘑菇汤',
      nameEn: 'Tofu Mushroom Soup',
      description: '清淡营养的暖心晚餐',
      ingredients: JSON.stringify([
        { name: '嫩豆腐', quantity: 150, unit: 'g' },
        { name: '蘑菇', quantity: 100, unit: 'g' },
        { name: '小白菜', quantity: 100, unit: 'g' },
        { name: '高汤', quantity: 400, unit: 'ml' }
      ]),
      calories: 180,
      carbs: 15,
      protein: 18,
      fat: 6,
      fiber: 4,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 20,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '烤猪里脊配红薯',
      nameEn: 'Pork Tenderloin with Sweet Potato',
      description: '瘦肉配复合碳水',
      ingredients: JSON.stringify([
        { name: '猪里脊', quantity: 150, unit: 'g' },
        { name: '红薯', quantity: 150, unit: 'g' },
        { name: '四季豆', quantity: 100, unit: 'g' },
        { name: '迷迭香', quantity: 2, unit: 'g' }
      ]),
      calories: 390,
      carbs: 38,
      protein: 38,
      fat: 10,
      fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 35,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '鳕鱼配菠菜',
      nameEn: 'Cod with Spinach',
      description: '白鱼低卡晚餐',
      ingredients: JSON.stringify([
        { name: '鳕鱼', quantity: 180, unit: 'g' },
        { name: '菠菜', quantity: 150, unit: 'g' },
        { name: '大蒜', quantity: 10, unit: 'g' },
        { name: '柠檬', quantity: 20, unit: 'g' }
      ]),
      calories: 260,
      carbs: 12,
      protein: 40,
      fat: 7,
      fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10,
      cookTime: 15,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '土耳其肉丸配全麦面',
      nameEn: 'Turkey Meatballs with Whole Wheat Pasta',
      description: '瘦肉丸子健康晚餐',
      ingredients: JSON.stringify([
        { name: '火鸡肉末', quantity: 150, unit: 'g' },
        { name: '全麦意面', quantity: 80, unit: 'g' },
        { name: '番茄酱', quantity: 100, unit: 'g' },
        { name: '洋葱', quantity: 30, unit: 'g' }
      ]),
      calories: 420,
      carbs: 48,
      protein: 40,
      fat: 10,
      fiber: 9,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 20,
      cookTime: 30,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '虾仁西葫芦面',
      nameEn: 'Shrimp Zucchini Noodles',
      description: '低碳蔬菜面替代',
      ingredients: JSON.stringify([
        { name: '虾仁', quantity: 150, unit: 'g' },
        { name: '西葫芦', quantity: 200, unit: 'g' },
        { name: '大蒜', quantity: 10, unit: 'g' },
        { name: '橄榄油', quantity: 10, unit: 'ml' }
      ]),
      calories: 240,
      carbs: 12,
      protein: 32,
      fat: 8,
      fiber: 4,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 10,
      servings: 1,
      category: 'dinner'
    },
    {
      name: '烤鸡胸配藜麦',
      nameEn: 'Grilled Chicken with Quinoa',
      description: '完美蛋白质组合',
      ingredients: JSON.stringify([
        { name: '鸡胸肉', quantity: 180, unit: 'g' },
        { name: '藜麦', quantity: 80, unit: 'g' },
        { name: '混合蔬菜', quantity: 150, unit: 'g' },
        { name: '橄榄油', quantity: 10, unit: 'ml' }
      ]),
      calories: 450,
      carbs: 42,
      protein: 48,
      fat: 12,
      fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15,
      cookTime: 25,
      servings: 1,
      category: 'dinner'
    }
  ];
  
  // 清空旧的食谱数据
  await prisma.recipe.deleteMany({});
  
  // 批量创建新食谱
  await prisma.recipe.createMany({
    data: recipes
  });
  
  console.log('✅ 创建示例食谱:', recipes.length, '个');
  
  // 4. 创建示例产品（扩充到50+个，包含多个供应商）
  // --- Bilingual helper: generate English names from Chinese base names ---
  // Basic mapping for common medical/supplement items. Extend as needed.
  const CH_EN_MAP: Array<[RegExp, string]> = [
    [/二甲双胍/g, 'Metformin'],
    [/格列美脲/g, 'Glimepiride'],
    [/西格列汀/g, 'Sitagliptin'],
    [/胰岛素注射笔针头/g, 'Insulin Pen Needles'],
    [/胰岛素注射笔/g, 'Insulin Pen'],
    [/胰岛素/g, 'Insulin'],
    [/血糖仪试纸/g, 'Glucose Test Strips'],
    [/试纸/g, 'Test Strips'],
    [/采血针/g, 'Lancets'],
    [/维生素D3/g, 'Vitamin D3'],
    [/鱼油/g, 'Fish Oil'],
    [/Omega-?3/gi, 'Omega-3'],
    [/镁补充剂/g, 'Magnesium Supplement'],
    [/镁/g, 'Magnesium'],
    [/铬/g, 'Chromium'],
    [/肉桂/g, 'Cinnamon'],
    [/钙补充剂/g, 'Calcium Supplement'],
    [/钙/g, 'Calcium'],
    [/铁/g, 'Iron'],
    [/锌/g, 'Zinc'],
  ];

  // Convert a Chinese product name to an English display name.
  function translateProductNameToEn(p: any): string {
    const hasLatin = (s?: string) => !!(s && /[A-Za-z]/.test(s));
    let out = String(p.name || '');

    // Broader vitamin/mineral and supplement mappings
    const EXTRA_RULES: Array<[RegExp, string]> = [
      [/复合B(族)?维生素/g, 'Vitamin B Complex'],
      [/(综合|复合)维生素/g, 'Multivitamin'],
      [/维生素\s*D3/g, 'Vitamin D3'],
      [/维生素\s*D(?!\d)/g, 'Vitamin D'],
      [/维生素\s*A/g, 'Vitamin A'],
      [/维生素\s*E/g, 'Vitamin E'],
      [/维生素\s*C/g, 'Vitamin C'],
      [/维生素\s*K2?/g, 'Vitamin K'],
      [/维生素\s*B12/g, 'Vitamin B12'],
      [/维生素\s*B9/g, 'Vitamin B9'],
      [/维生素\s*B6/g, 'Vitamin B6'],
      [/维生素\s*B5/g, 'Vitamin B5'],
      [/维生素\s*B3/g, 'Vitamin B3'],
      [/维生素\s*B2/g, 'Vitamin B2'],
      [/维生素\s*B1/g, 'Vitamin B1'],
      [/鱼油/g, 'Fish Oil'],
      [/亚麻籽油/g, 'Flaxseed Oil'],
      [/辅酶?Q?10/g, 'Coenzyme Q10'],
      [/叶酸/g, 'Folic Acid'],
      [/胶原蛋白/g, 'Collagen'],
      [/蛋白粉/g, 'Protein Powder'],
      [/乳清蛋白/g, 'Whey Protein'],
      [/葡萄籽/g, 'Grape Seed'],
      [/钙/g, 'Calcium'],
      [/镁/g, 'Magnesium'],
      [/锌/g, 'Zinc'],
      [/铁/g, 'Iron'],
      [/铬/g, 'Chromium'],
      [/硒/g, 'Selenium'],
      [/锰/g, 'Manganese'],
      [/钾/g, 'Potassium'],
      [/碘/g, 'Iodine'],
      // Special compounds / herbals
      [/α[-–]?硫辛酸|硫辛酸/gi, 'Alpha-Lipoic Acid'],
      [/高丽参/g, 'Korean Ginseng'],
      // Generic suffixes
      [/补充剂/g, ' Supplement'],
      [/提取物|提取/g, ' Extract'],
      [/元素/g, ''],
    ];

    // Apply base map + extra rules
    for (const [re, en] of [...CH_EN_MAP, ...EXTRA_RULES]) {
      out = out.replace(re, en);
    }

    // Generic fallback for patterns like "维生素B" + number/letter
    out = out.replace(/维生素\s*([A-Za-z]\d?)/g, 'Vitamin $1');

    // Normalize missing space before suffix words
    out = out.replace(/([A-Za-z])(Supplement|Extract)\b/g, '$1 $2');

    // Append dosage if available and not already included
    if (p.dosage && !new RegExp(p.dosage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(out)) {
      out = `${out} ${p.dosage}`.trim();
    }

    // Final fallback: use brand + dosage if still not Latin
    if (!hasLatin(out) && hasLatin(p?.brand)) {
      out = p.dosage ? `${p.brand} ${p.dosage}` : String(p.brand);
    }

    // Collapse extra spaces
    return out.replace(/\s{2,}/g, ' ').trim();
  }
  
  // Normalize category to English
  function toEnglishCategory(category?: string): string {
    const map: Record<string, string> = {
      '糖尿病药物': 'Diabetes Medications',
      '营养补充剂': 'Supplements',
      '医疗器械': 'Medical Devices',
      '健康食品': 'Health Foods',
    };
    if (!category) return '' as any;
    return map[category] || category;
  }

  // Normalize unit to English (best-effort)
  function toEnglishUnit(unit?: string): string | undefined {
    if (!unit) return unit;
    const map: Record<string, string> = {
      '片': 'tablets',
      '粒': 'capsules',
      '支': 'pcs',
      '盒': 'box',
      '瓶': 'bottle',
      '包': 'pack',
      '袋': 'bag',
      '枚': 'pcs',
    };
    if (map[unit]) return map[unit];
    for (const key of Object.keys(map)) {
      if (unit.includes(key)) return unit.replace(key, map[key]);
    }
    return unit; // keep g, ml, IU, etc.
  }

  const products = [
    // === 糖尿病药物（多供应商对比）===
    {
      name: '二甲双胍 500mg',
      brand: '通用品牌',
      category: '糖尿病药物',
      dosage: '500mg',
      quantity: 100,
      unit: '片',
      price: 12.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '常用的2型糖尿病口服药物，帮助控制血糖水平'
    },
    {
      name: '二甲双胍 500mg',
      brand: 'Mylan',
      category: '糖尿病药物',
      dosage: '500mg',
      quantity: 100,
      unit: '片',
      price: 14.50,
      vendor: 'Priceline',
      inStock: true,
      description: '品牌二甲双胍，质量可靠'
    },
    {
      name: '二甲双胍 500mg',
      brand: 'Glucophage',
      category: '糖尿病药物',
      dosage: '500mg',
      quantity: 100,
      unit: '片',
      price: 16.99,
      vendor: 'Terry White',
      inStock: true,
      description: '原研药品牌，效果显著'
    },
    {
      name: '二甲双胍 500mg',
      brand: '通用品牌',
      category: '糖尿病药物',
      dosage: '500mg',
      quantity: 100,
      unit: '片',
      price: 11.99,
      vendor: 'Amcal',
      inStock: true,
      description: '经济实惠的选择'
    },
    {
      name: '二甲双胍 850mg',
      brand: 'Mylan',
      category: '糖尿病药物',
      dosage: '850mg',
      quantity: 100,
      unit: '片',
      price: 15.99,
      vendor: 'Priceline',
      inStock: true,
      description: '高剂量二甲双胍，适合需要更强控制的患者'
    },
    {
      name: '二甲双胍 850mg',
      brand: 'Glucophage',
      category: '糖尿病药物',
      dosage: '850mg',
      quantity: 100,
      unit: '片',
      price: 18.50,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '原研药，高剂量配方'
    },
    {
      name: '格列美脲 2mg',
      brand: 'Amaryl',
      category: '糖尿病药物',
      dosage: '2mg',
      quantity: 30,
      unit: '片',
      price: 24.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '磺脲类降糖药，刺激胰岛素分泌'
    },
    {
      name: '格列美脲 2mg',
      brand: '通用品牌',
      category: '糖尿病药物',
      dosage: '2mg',
      quantity: 30,
      unit: '片',
      price: 19.99,
      vendor: 'Priceline',
      inStock: true,
      description: '经济型格列美脲'
    },
    {
      name: '西格列汀 100mg',
      brand: 'Januvia',
      category: '糖尿病药物',
      dosage: '100mg',
      quantity: 28,
      unit: '片',
      price: 89.99,
      vendor: 'Terry White',
      inStock: true,
      description: 'DPP-4抑制剂，帮助控制血糖'
    },
    {
      name: '西格列汀 100mg',
      brand: 'Januvia',
      category: '糖尿病药物',
      dosage: '100mg',
      quantity: 28,
      unit: '片',
      price: 85.50,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: 'DPP-4抑制剂，特价促销中'
    },
    
    // === 医疗器械（多供应商）===
    {
      name: '血糖仪试纸',
      brand: 'OneTouch',
      category: '医疗器械',
      quantity: 50,
      unit: '片',
      price: 29.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '兼容OneTouch血糖仪，准确快速'
    },
    {
      name: '血糖仪试纸',
      brand: 'OneTouch',
      category: '医疗器械',
      quantity: 50,
      unit: '片',
      price: 32.50,
      vendor: 'Priceline',
      inStock: true,
      description: 'OneTouch原装试纸'
    },
    {
      name: '血糖仪试纸',
      brand: 'OneTouch',
      category: '医疗器械',
      quantity: 50,
      unit: '片',
      price: 27.99,
      vendor: 'Amcal',
      inStock: true,
      description: '促销价，数量有限'
    },
    {
      name: '血糖仪试纸',
      brand: 'Accu-Chek',
      category: '医疗器械',
      quantity: 50,
      unit: '片',
      price: 31.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '适配Accu-Chek血糖仪'
    },
    {
      name: '血糖仪套装',
      brand: 'Accu-Chek',
      category: '医疗器械',
      quantity: 1,
      unit: '套',
      price: 49.99,
      vendor: 'Priceline',
      inStock: true,
      description: '含血糖仪、试纸10片、采血笔'
    },
    {
      name: '血糖仪套装',
      brand: 'OneTouch',
      category: '医疗器械',
      quantity: 1,
      unit: '套',
      price: 45.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: 'OneTouch入门套装'
    },
    {
      name: '血糖仪套装',
      brand: 'Contour',
      category: '医疗器械',
      quantity: 1,
      unit: '套',
      price: 52.99,
      vendor: 'Terry White',
      inStock: true,
      description: '高精度血糖监测系统'
    },
    {
      name: '采血针',
      brand: 'OneTouch',
      category: '医疗器械',
      quantity: 100,
      unit: '支',
      price: 12.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '无痛采血针，适配各种采血笔'
    },
    {
      name: '采血针',
      brand: 'BD',
      category: '医疗器械',
      quantity: 100,
      unit: '支',
      price: 14.50,
      vendor: 'Priceline',
      inStock: true,
      description: 'BD超细采血针'
    },
    {
      name: '采血针',
      brand: 'Accu-Chek',
      category: '医疗器械',
      quantity: 100,
      unit: '支',
      price: 13.99,
      vendor: 'Amcal',
      inStock: true,
      description: '兼容多种采血笔'
    },
    {
      name: '胰岛素注射笔针头',
      brand: 'BD',
      category: '医疗器械',
      quantity: 100,
      unit: '支',
      price: 34.99,
      vendor: 'Medical Supplies',
      inStock: true,
      description: '超细针头，减少注射疼痛'
    },
    {
      name: '胰岛素注射笔针头',
      brand: 'NovoFine',
      category: '医疗器械',
      quantity: 100,
      unit: '支',
      price: 32.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '4mm超短针头'
    },
    {
      name: '胰岛素注射笔针头',
      brand: 'BD',
      category: '医疗器械',
      quantity: 100,
      unit: '支',
      price: 36.50,
      vendor: 'Terry White',
      inStock: true,
      description: 'Ultra-Fine针头'
    },
    
    // === 营养补充剂（多供应商）===
    {
      name: '维生素D3',
      brand: 'Nature Made',
      category: '营养补充剂',
      dosage: '1000IU',
      quantity: 120,
      unit: '粒',
      price: 18.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '有助于骨骼健康和免疫系统，糖尿病患者常需补充'
    },
    {
      name: '维生素D3',
      brand: 'Blackmores',
      category: '营养补充剂',
      dosage: '1000IU',
      quantity: 120,
      unit: '粒',
      price: 22.50,
      vendor: 'Priceline',
      inStock: true,
      description: '澳洲本土品牌，高品质'
    },
    {
      name: '维生素D3',
      brand: 'Swisse',
      category: '营养补充剂',
      dosage: '1000IU',
      quantity: 150,
      unit: '粒',
      price: 19.99,
      vendor: 'Woolworths',
      inStock: true,
      description: '大容量装，更实惠'
    },
    {
      name: '维生素D3',
      brand: 'Nature\'s Own',
      category: '营养补充剂',
      dosage: '1000IU',
      quantity: 100,
      unit: '粒',
      price: 16.99,
      vendor: 'Amcal',
      inStock: true,
      description: '性价比之选'
    },
    {
      name: 'Omega-3 鱼油',
      brand: 'Nordic Naturals',
      category: '营养补充剂',
      dosage: '1000mg',
      quantity: 60,
      unit: '粒',
      price: 24.99,
      vendor: 'Health Store',
      inStock: true,
      description: '支持心血管健康，降低炎症'
    },
    {
      name: 'Omega-3 鱼油',
      brand: 'Blackmores',
      category: '营养补充剂',
      dosage: '1000mg',
      quantity: 60,
      unit: '粒',
      price: 21.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '无腥味配方'
    },
    {
      name: 'Omega-3 鱼油',
      brand: 'Swisse',
      category: '营养补充剂',
      dosage: '1000mg',
      quantity: 60,
      unit: '粒',
      price: 23.50,
      vendor: 'Priceline',
      inStock: true,
      description: '高纯度鱼油'
    },
    {
      name: 'Omega-3 鱼油',
      brand: 'Nature Made',
      category: '营养补充剂',
      dosage: '1000mg',
      quantity: 90,
      unit: '粒',
      price: 26.99,
      vendor: 'iHerb',
      inStock: true,
      description: '大容量装'
    },
    {
      name: '镁补充剂',
      brand: 'Blackmores',
      category: '营养补充剂',
      dosage: '500mg',
      quantity: 100,
      unit: '片',
      price: 16.99,
      vendor: 'Priceline',
      inStock: true,
      description: '改善胰岛素敏感性，支持神经健康'
    },
    {
      name: '镁补充剂',
      brand: 'Nature Made',
      category: '营养补充剂',
      dosage: '500mg',
      quantity: 100,
      unit: '片',
      price: 14.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '有助于血糖控制'
    },
    {
      name: '镁补充剂',
      brand: 'Swisse',
      category: '营养补充剂',
      dosage: '500mg',
      quantity: 120,
      unit: '片',
      price: 18.50,
      vendor: 'Woolworths',
      inStock: true,
      description: '高吸收率配方'
    },
    {
      name: 'α-硫辛酸',
      brand: 'Life Extension',
      category: '营养补充剂',
      dosage: '600mg',
      quantity: 60,
      unit: '粒',
      price: 32.99,
      vendor: 'iHerb',
      inStock: true,
      description: '强抗氧化剂，帮助预防糖尿病神经病变'
    },
    {
      name: 'α-硫辛酸',
      brand: 'Now Foods',
      category: '营养补充剂',
      dosage: '600mg',
      quantity: 60,
      unit: '粒',
      price: 29.99,
      vendor: 'Health Store',
      inStock: true,
      description: '改善神经功能'
    },
    {
      name: '铬元素补充剂',
      brand: 'Now Foods',
      category: '营养补充剂',
      dosage: '200mcg',
      quantity: 100,
      unit: '粒',
      price: 14.99,
      vendor: 'Health Store',
      inStock: true,
      description: '帮助改善胰岛素功能'
    },
    {
      name: '铬元素补充剂',
      brand: 'Nature Made',
      category: '营养补充剂',
      dosage: '200mcg',
      quantity: 100,
      unit: '粒',
      price: 16.50,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '支持血糖代谢'
    },
    {
      name: '肉桂提取物',
      brand: 'Swanson',
      category: '营养补充剂',
      dosage: '500mg',
      quantity: 120,
      unit: '粒',
      price: 19.99,
      vendor: 'iHerb',
      inStock: true,
      description: '天然降血糖辅助品'
    },
    {
      name: '肉桂提取物',
      brand: 'Now Foods',
      category: '营养补充剂',
      dosage: '500mg',
      quantity: 120,
      unit: '粒',
      price: 18.50,
      vendor: 'Health Store',
      inStock: true,
      description: '有助于控制血糖'
    },
    {
      name: '复合B族维生素',
      brand: 'Nature\'s Way',
      category: '营养补充剂',
      quantity: 100,
      unit: '片',
      price: 22.99,
      vendor: 'Chemist Warehouse',
      inStock: true,
      description: '支持神经健康和能量代谢'
    },
    {
      name: '复合B族维生素',
      brand: 'Blackmores',
      category: '营养补充剂',
      quantity: 100,
      unit: '片',
      price: 24.50,
      vendor: 'Priceline',
      inStock: true,
      description: '全面B族维生素补充'
    },
    {
      name: '复合B族维生素',
      brand: 'Swisse',
      category: '营养补充剂',
      quantity: 60,
      unit: '片',
      price: 19.99,
      vendor: 'Woolworths',
      inStock: true,
      description: '缓释配方'
    },
    
    // === 低糖食品 ===
    {
      name: '无糖蛋白粉',
      brand: 'Optimum Nutrition',
      category: '健康食品',
      quantity: 900,
      unit: 'g',
      price: 45.99,
      vendor: 'GNC',
      inStock: true,
      description: '低碳高蛋白，适合糖尿病患者'
    },
    {
      name: '无糖燕麦',
      brand: 'Uncle Tobys',
      category: '健康食品',
      quantity: 500,
      unit: 'g',
      price: 6.99,
      vendor: 'Woolworths',
      inStock: true,
      description: '高纤维全谷物，升糖指数低'
    },
    {
      name: '奇亚籽',
      brand: 'Organic',
      category: '健康食品',
      quantity: 500,
      unit: 'g',
      price: 12.99,
      vendor: 'Health Store',
      inStock: true,
      description: '富含omega-3和纤维'
    },
    {
      name: '杏仁粉',
      brand: 'Bob\'s Red Mill',
      category: '健康食品',
      quantity: 453,
      unit: 'g',
      price: 16.99,
      vendor: 'Coles',
      inStock: true,
      description: '低碳面粉替代品'
    },
    {
      name: '无糖酸奶',
      brand: 'Chobani',
      category: '健康食品',
      quantity: 500,
      unit: 'g',
      price: 5.99,
      vendor: 'Woolworths',
      inStock: true,
      description: '高蛋白低糖，富含益生菌'
    }
  ];
  
  // 清空旧的产品数据
  await prisma.product.deleteMany({});
  
  // Inject English names into products for bilingual support
  const productsWithEn = (products as any[]).map((p: any) => {
    const enName = translateProductNameToEn(p);
    return {
      ...p,
      // Force English-first naming to guarantee English display
      name: enName,
      nameEn: enName,
      category: toEnglishCategory(p.category),
      unit: toEnglishUnit(p.unit),
    };
  });
  
  // 批量创建新产品
  await prisma.product.createMany({
    data: productsWithEn
  });
  
  console.log('✅ 创建示例产品:', products.length, '个');
  
  // 5. 创建示例药物
  const medications = [
    {
      userId: demoUser.id,
      name: '二甲双胍',
      genericName: 'Metformin',
      brand: 'Glucophage',
      dosage: '500mg',
      form: 'tablet',
      prescribedDose: 1,
      frequency: 'twice_daily',
      timings: JSON.stringify(['08:00', '20:00']),
      currentQuantity: 90,
      refillThreshold: 7,
      prescribedBy: 'Dr. 李医生',
      prescriptionDate: new Date('2024-01-15'),
      validUntil: new Date('2025-01-15'),
      isActive: true,
      startDate: new Date('2024-01-15'),
      notes: '随餐服用，可能有轻微胃肠道反应'
    },
    {
      userId: demoUser.id,
      name: '格列美脲',
      genericName: 'Glimepiride',
      brand: 'Amaryl',
      dosage: '2mg',
      form: 'tablet',
      prescribedDose: 1,
      frequency: 'once_daily',
      timings: JSON.stringify(['08:00']),
      currentQuantity: 25,
      refillThreshold: 7,
      prescribedBy: 'Dr. 李医生',
      prescriptionDate: new Date('2024-03-01'),
      validUntil: new Date('2025-03-01'),
      isActive: true,
      startDate: new Date('2024-03-01'),
      notes: '早餐前服用'
    }
  ];
  
  await prisma.medication.createMany({
    data: medications
  });
  
  console.log('✅ 创建示例药物:', medications.length, '个');
  
  // 6. 创建示例提醒
  const reminders = [
    {
      userId: demoUser.id,
      type: 'medication',
      title: '服用二甲双胍',
      message: '记得服用您的二甲双胍（500mg）💊',
      priority: 'high',
      scheduleType: 'daily',
      scheduleTime: '08:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
      startDate: new Date(),
      isActive: true
    },
    {
      userId: demoUser.id,
      type: 'medication',
      title: '服用二甲双胍',
      message: '记得服用您的晚间二甲双胍（500mg）💊',
      priority: 'high',
      scheduleType: 'daily',
      scheduleTime: '20:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
      startDate: new Date(),
      isActive: true
    },
    {
      userId: demoUser.id,
      type: 'glucose_check',
      title: '测量血糖',
      message: '该测量您的空腹血糖了 📊',
      priority: 'medium',
      scheduleType: 'daily',
      scheduleTime: '07:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
      startDate: new Date(),
      isActive: true
    },
    {
      userId: demoUser.id,
      type: 'exercise',
      title: '运动提醒',
      message: '坚持每天30分钟运动 🏃‍♂️',
      priority: 'medium',
      scheduleType: 'daily',
      scheduleTime: '17:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5]),
      startDate: new Date(),
      isActive: true
    }
  ];
  
  await prisma.reminder.createMany({
    data: reminders
  });
  
  console.log('✅ 创建示例提醒:', reminders.length, '个');
  
  console.log('🎉 数据填充完成！');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

