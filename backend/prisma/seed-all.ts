/**
 * 统一的数据种子脚本
 * 一键初始化所有必需的种子数据
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ==================== 1. 用户数据 ====================
async function seedUsers() {
  console.log('\n📦 1. 初始化用户数据...');
  
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
  
  console.log('  ✅ 示例用户: demo@example.com');
  
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
  
  console.log('  ✅ 商户账号: merchant@example.com');
  
  return { demoUser, merchantUser };
}

// ==================== 2. 档案数据 ====================
async function seedProfiles(userId: string) {
  console.log('\n📦 2. 初始化用户档案...');
  
  await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'male',
      phone: '1234567890',
      diabetesType: 'type_2',
      diagnosisDate: new Date('2020-01-01'),
      hba1c: 7.5,
      fastingGlucose: 126,
      allergies: JSON.stringify(['Peanuts', 'Seafood']),
      dietaryPrefs: JSON.stringify(['Low Sugar', 'Low Salt']),
      activityLevel: 'moderate'
    }
  });
  
  console.log('  ✅ 已创建示例档案');
}

// ==================== 3. 食谱数据 ====================
async function seedRecipes() {
  console.log('\n📦 3. 初始化食谱数据...');
  
  const recipes = [
    // 早餐 (10个)
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
      calories: 280, carbs: 42, protein: 12, fat: 7, fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 10, servings: 1, category: 'breakfast'
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
      calories: 320, carbs: 32, protein: 18, fat: 12, fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 8, servings: 1, category: 'breakfast'
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
      calories: 260, carbs: 22, protein: 15, fat: 13, fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 0, servings: 1, category: 'breakfast'
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
      calories: 290, carbs: 8, protein: 24, fat: 18, fiber: 3,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 10, servings: 1, category: 'breakfast'
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
      calories: 240, carbs: 28, protein: 8, fat: 11, fiber: 12,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 0, servings: 1, category: 'breakfast'
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
      calories: 310, carbs: 45, protein: 14, fat: 8, fiber: 7,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 15, servings: 1, category: 'breakfast'
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
      calories: 220, carbs: 12, protein: 18, fat: 12, fiber: 4,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 10, servings: 1, category: 'breakfast'
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
      calories: 340, carbs: 35, protein: 15, fat: 17, fiber: 10,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 5, servings: 1, category: 'breakfast'
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
      calories: 270, carbs: 42, protein: 10, fat: 7, fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 15, servings: 1, category: 'breakfast'
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
      calories: 350, carbs: 48, protein: 13, fat: 13, fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 5, cookTime: 2, servings: 1, category: 'breakfast'
    },
    
    // 午餐 (10个)
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
      calories: 320, carbs: 15, protein: 45, fat: 12, fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 10, servings: 1, category: 'lunch'
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
      calories: 480, carbs: 42, protein: 38, fat: 18, fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 20, servings: 1, category: 'lunch'
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
      calories: 420, carbs: 52, protein: 22, fat: 14, fiber: 7,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 15, servings: 1, category: 'lunch'
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
      calories: 340, carbs: 38, protein: 30, fat: 8, fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 0, servings: 1, category: 'lunch'
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
      calories: 280, carbs: 45, protein: 18, fat: 3, fiber: 12,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 30, servings: 1, category: 'lunch'
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
      calories: 380, carbs: 35, protein: 32, fat: 14, fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 10, servings: 1, category: 'lunch'
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
      calories: 320, carbs: 52, protein: 16, fat: 5, fiber: 11,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 35, servings: 1, category: 'lunch'
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
      calories: 380, carbs: 48, protein: 35, fat: 6, fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 15, servings: 1, category: 'lunch'
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
      calories: 340, carbs: 45, protein: 15, fat: 12, fiber: 12,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 0, servings: 1, category: 'lunch'
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
      calories: 420, carbs: 48, protein: 42, fat: 9, fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 20, servings: 1, category: 'lunch'
    },
    
    // 晚餐 (10个)
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
      calories: 280, carbs: 20, protein: 35, fat: 8, fiber: 6,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 20, servings: 1, category: 'dinner'
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
      calories: 380, carbs: 12, protein: 42, fat: 20, fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 25, servings: 1, category: 'dinner'
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
      calories: 420, carbs: 28, protein: 38, fat: 18, fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 40, servings: 1, category: 'dinner'
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
      calories: 340, carbs: 18, protein: 42, fat: 14, fiber: 7,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 15, servings: 1, category: 'dinner'
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
      calories: 180, carbs: 15, protein: 18, fat: 6, fiber: 4,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 20, servings: 1, category: 'dinner'
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
      calories: 390, carbs: 38, protein: 38, fat: 10, fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 35, servings: 1, category: 'dinner'
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
      calories: 260, carbs: 12, protein: 40, fat: 7, fiber: 5,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 10, cookTime: 15, servings: 1, category: 'dinner'
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
      calories: 420, carbs: 48, protein: 40, fat: 10, fiber: 9,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 20, cookTime: 30, servings: 1, category: 'dinner'
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
      calories: 240, carbs: 12, protein: 32, fat: 8, fiber: 4,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 10, servings: 1, category: 'dinner'
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
      calories: 450, carbs: 42, protein: 48, fat: 12, fiber: 8,
      diabetesTypes: JSON.stringify(['type_1', 'type_2']),
      prepTime: 15, cookTime: 25, servings: 1, category: 'dinner'
    }
  ];
  
  // Translate recipe data to English
  const ingredientTranslations: Record<string, string> = {
    '燕麦': 'Oats', '低脂牛奶': 'Low-fat milk', '蓝莓': 'Blueberries', '杏仁片': 'Almond slices',
    '全麦面包': 'Whole wheat bread', '鸡蛋': 'Eggs', '番茄': 'Tomato', '橄榄油': 'Olive oil',
    '希腊酸奶': 'Greek yogurt', '核桃': 'Walnuts', '奇亚籽': 'Chia seeds', '草莓': 'Strawberries',
    '菠菜': 'Spinach', '蘑菇': 'Mushrooms', '低脂奶酪': 'Low-fat cheese',
    '杏仁奶': 'Almond milk', '肉桂粉': 'Cinnamon powder', '桃子': 'Peach',
    '全麦面粉': 'Whole wheat flour', '混合浆果': 'Mixed berries',
    '嫩豆腐': 'Soft tofu', '彩椒': 'Bell peppers', '洋葱': 'Onion',
    '鳄梨': 'Avocado', '水煮蛋': 'Boiled egg',
    '藜麦': 'Quinoa', '香蕉': 'Banana',
    '天然花生酱': 'Natural peanut butter',
    '鸡胸肉': 'Chicken breast', '混合生菜': 'Mixed lettuce', '樱桃番茄': 'Cherry tomatoes', '黄瓜': 'Cucumber',
    '三文鱼': 'Salmon', '西兰花': 'Broccoli', '柠檬': 'Lemon',
    '豆腐': 'Tofu', '糙米饭': 'Brown rice', '混合蔬菜': 'Mixed vegetables',
    '金枪鱼罐头': 'Canned tuna', '生菜': 'Lettuce',
    '红扁豆': 'Red lentils', '香料': 'Spices',
    '瘦牛肉': 'Lean beef', '全麦卷饼': 'Whole wheat wrap',
    '芸豆': 'Kidney beans', '意面': 'Pasta',
    '虾仁': 'Shrimp', '芦笋': 'Asparagus', '大蒜': 'Garlic',
    '鹰嘴豆': 'Chickpeas',
    '全麦意面': 'Whole wheat pasta', '番茄酱': 'Tomato sauce', '罗勒': 'Basil',
    '鲈鱼': 'Sea bass', '胡萝卜': 'Carrots', '生姜': 'Ginger',
    '鸡腿': 'Chicken thighs', '南瓜': 'Pumpkin', '甜椒': 'Sweet peppers',
    '酱油': 'Soy sauce',
    '小白菜': 'Bok choy', '高汤': 'Broth',
    '猪里脊': 'Pork tenderloin', '红薯': 'Sweet potato', '四季豆': 'Green beans', '迷迭香': 'Rosemary',
    '鳕鱼': 'Cod',
    '火鸡肉末': 'Ground turkey',
    '西葫芦': 'Zucchini',
    '片': 'slices', '个': 'pcs', '张': 'sheet',
  };

  const recipeDescriptionTranslations: Record<string, string> = {
    '健康的早餐选择，富含纤维，有助于稳定血糖': 'Healthy breakfast choice, rich in fiber, helps stabilize blood sugar',
    '简单营养的早餐，提供优质蛋白质': 'Simple and nutritious breakfast, provides high-quality protein',
    '高蛋白低糖早餐，富含益生菌': 'High-protein low-sugar breakfast, rich in probiotics',
    '低碳高蛋白早餐，富含维生素': 'Low-carb high-protein breakfast, rich in vitamins',
    '富含omega-3和纤维的营养早餐': 'Nutritious breakfast rich in omega-3 and fiber',
    '美味的全麦煎饼，升糖指数较低': 'Delicious whole wheat pancakes, low glycemic index',
    '植物蛋白早餐，适合素食者': 'Plant-based protein breakfast, suitable for vegetarians',
    '富含健康脂肪的能量早餐': 'Energy breakfast rich in healthy fats',
    '完全蛋白质来源，营养全面': 'Complete protein source, comprehensive nutrition',
    '简单快速的能量早餐': 'Simple and quick energy breakfast',
    '低脂高蛋白的健康午餐': 'Low-fat high-protein healthy lunch',
    '富含omega-3的营养午餐': 'Nutritious lunch rich in omega-3',
    '素食友好的平衡午餐': 'Vegetarian-friendly balanced lunch',
    '便携营养的午餐选择': 'Portable and nutritious lunch option',
    '高纤维低GI的暖心午餐': 'High-fiber low-GI comforting lunch',
    '高蛋白低碳卷饼': 'High-protein low-carb wrap',
    '传统意式蔬菜汤，营养丰富': 'Traditional Italian vegetable soup, nutrient-rich',
    '海鲜低脂午餐': 'Seafood low-fat lunch',
    '植物蛋白丰富的地中海风味': 'Mediterranean flavor rich in plant protein',
    '全麦意面配烤鸡胸': 'Whole wheat pasta with grilled chicken breast',
    '低脂高蛋白的营养晚餐': 'Low-fat high-protein nutritious dinner',
    'Omega-3丰富的美味晚餐': 'Delicious dinner rich in omega-3',
    '简单美味的家常晚餐': 'Simple and delicious home-style dinner',
    '中式经典低碳晚餐': 'Classic Chinese low-carb dinner',
    '清淡营养的暖心晚餐': 'Light and nutritious comforting dinner',
    '瘦肉配复合碳水': 'Lean meat with complex carbs',
    '白鱼低卡晚餐': 'White fish low-calorie dinner',
    '瘦肉丸子健康晚餐': 'Lean meatballs healthy dinner',
    '低碳蔬菜面替代': 'Low-carb vegetable noodle alternative',
    '完美蛋白质组合': 'Perfect protein combination',
  };

  const recipesTranslated = recipes.map((recipe: any) => {
    // Translate name if it's Chinese (keep nameEn if exists, otherwise use nameEn from mapping)
    const translatedName = recipe.nameEn || recipe.name;
    
    // Translate description
    const translatedDescription = recipeDescriptionTranslations[recipe.description] || recipe.description;
    
    // Translate ingredients
    let translatedIngredients = recipe.ingredients;
    try {
      const ingredients = JSON.parse(recipe.ingredients);
      const translated = ingredients.map((ing: any) => ({
        ...ing,
        name: ingredientTranslations[ing.name] || ing.name,
        unit: ingredientTranslations[ing.unit] || ing.unit,
      }));
      translatedIngredients = JSON.stringify(translated);
    } catch (e) {
      // If parsing fails, keep original
    }
    
    return {
      ...recipe,
      name: translatedName, // Use English name as primary
      nameEn: translatedName,
      description: translatedDescription,
      ingredients: translatedIngredients,
    };
  });

  await prisma.recipe.deleteMany({});
  await prisma.recipe.createMany({ data: recipesTranslated });
  
  console.log(`  ✅ 已创建 ${recipes.length} 个食谱`);
}

// ==================== 4. 产品数据 ====================
async function seedProducts() {
  console.log('\n📦 4. 初始化产品数据...');
  
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
      '套': 'set',
      '个': 'pcs',
      '台': 'unit',
      '张': 'sheet',
      '条': 'bar',
    };
    if (map[unit]) return map[unit];
    for (const key of Object.keys(map)) {
      if (unit.includes(key)) return unit.replace(key, map[key]);
    }
    return unit; // keep g, ml, IU, etc.
  }

  // Translate product description to English
  function translateDescription(desc?: string): string {
    if (!desc) return '';
    const translations: Record<string, string> = {
      '常用的2型糖尿病口服药物，一线降糖药': 'Common oral medication for type 2 diabetes, first-line glucose-lowering drug',
      '品牌二甲双胍，质量可靠': 'Brand metformin, reliable quality',
      '原研药品牌，效果显著': 'Original brand drug, effective',
      '高剂量二甲双胍': 'High-dose metformin',
      '原研药，高剂量配方': 'Original drug, high-dose formula',
      '缓释片，每日一次': 'Extended-release tablet, once daily',
      '磺脲类降糖药，低剂量': 'Sulfonylurea, low dose',
      '磺脲类降糖药，中等剂量': 'Sulfonylurea, medium dose',
      '磺脲类降糖药，高剂量': 'Sulfonylurea, high dose',
      '经济型格列美脲': 'Economy glimepiride',
      'DPP-4抑制剂，帮助控制血糖': 'DPP-4 inhibitor, helps control blood sugar',
      'DPP-4抑制剂，低剂量': 'DPP-4 inhibitor, low dose',
      'DPP-4抑制剂，无需调整剂量': 'DPP-4 inhibitor, no dose adjustment needed',
      'DPP-4抑制剂，心血管安全': 'DPP-4 inhibitor, cardiovascular safe',
      'SGLT2抑制剂，降糖减重': 'SGLT2 inhibitor, lowers blood sugar and weight',
      'SGLT2抑制剂，心血管获益': 'SGLT2 inhibitor, cardiovascular benefits',
      'SGLT2抑制剂，高剂量': 'SGLT2 inhibitor, high dose',
      'SGLT2抑制剂，降糖降压': 'SGLT2 inhibitor, lowers blood sugar and blood pressure',
      'GLP-1受体激动剂，每日一次注射': 'GLP-1 receptor agonist, once daily injection',
      'GLP-1受体激动剂，每周一次': 'GLP-1 receptor agonist, once weekly',
      'GLP-1受体激动剂，减重效果显著': 'GLP-1 receptor agonist, significant weight loss effect',
      '餐时胰岛素，起效快': 'Meal-time insulin, fast-acting',
      '餐时胰岛素，作用迅速': 'Meal-time insulin, rapid action',
      '基础胰岛素，24小时持续': 'Basal insulin, 24-hour duration',
      '基础胰岛素，平稳降糖': 'Basal insulin, steady glucose lowering',
      '速效+中效混合，方便使用': 'Fast-acting + intermediate-acting mix, convenient',
      '磺脲类，低血糖风险较低': 'Sulfonylurea, lower hypoglycemia risk',
      '缓释配方': 'Extended-release formula',
      'α-糖苷酶抑制剂，延缓糖吸收': 'Alpha-glucosidase inhibitor, delays sugar absorption',
      'α-糖苷酶抑制剂，高剂量': 'Alpha-glucosidase inhibitor, high dose',
      '噻唑烷二酮类，改善胰岛素敏感性': 'Thiazolidinedione, improves insulin sensitivity',
      '噻唑烷二酮类，高剂量': 'Thiazolidinedione, high dose',
      '兼容OneTouch血糖仪，准确快速': 'Compatible with OneTouch meter, accurate and fast',
      'OneTouch试纸，大容量装': 'OneTouch strips, large pack',
      '适配Accu-Chek血糖仪': 'Compatible with Accu-Chek meter',
      'Accu-Chek试纸，大包装': 'Accu-Chek strips, large pack',
      'Contour系列试纸': 'Contour series strips',
      'FreeStyle试纸，高精度': 'FreeStyle strips, high precision',
      '含血糖仪、试纸10片、采血笔': 'Includes meter, 10 strips, lancing device',
      'OneTouch入门套装': 'OneTouch starter kit',
      '高精度血糖监测系统': 'High-precision blood glucose monitoring system',
      '扫描式血糖监测，无需采血': 'Scan-based glucose monitoring, no blood sampling',
      '无痛采血针，适配各种采血笔': 'Painless lancets, compatible with various lancing devices',
      'BD超细采血针，28G': 'BD ultra-fine lancets, 28G',
      '兼容多种采血笔': 'Compatible with multiple lancing devices',
      'BD采血针，大包装': 'BD lancets, large pack',
      '舒适型采血笔，可调深度': 'Comfortable lancing device, adjustable depth',
      '便携式采血笔': 'Portable lancing device',
      '超细针头，减少注射疼痛，31G': 'Ultra-fine needles, reduces injection pain, 31G',
      '4mm超短针头': '4mm ultra-short needles',
      'Ultra-Fine针头，32G': 'Ultra-Fine needles, 32G',
      '5mm针头，适合各种体型': '5mm needles, suitable for all body types',
      '14天连续血糖监测传感器': '14-day continuous glucose monitoring sensor',
      '2个装，优惠套装': '2-pack, value bundle',
      '实时血糖监测，30天用量': 'Real-time glucose monitoring, 30-day supply',
      '上臂式血压计，适合糖尿病患者': 'Upper arm blood pressure monitor, suitable for diabetics',
      '体脂秤，监测体重变化': 'Body fat scale, monitors weight changes',
      '便携式胰岛素保存盒，出行必备': 'Portable insulin storage case, essential for travel',
      '7天分格药盒，方便管理': '7-day pill organizer, convenient management',
      '骨骼健康和免疫系统，改善胰岛素敏感性': 'Bone health and immune system, improves insulin sensitivity',
      '澳洲本土品牌，高品质': 'Australian brand, high quality',
      '大容量装，更实惠': 'Large pack, more economical',
      '性价比之选': 'Best value for money',
      '澳洲知名骨骼健康品牌': 'Well-known Australian bone health brand',
      '高剂量配方': 'High-dose formula',
      '支持心血管健康，降低炎症': 'Supports cardiovascular health, reduces inflammation',
      '无腥味配方': 'Odorless formula',
      '高纯度鱼油': 'High-purity fish oil',
      '大容量装': 'Large pack',
      '经济实惠': 'Economical',
      '高浓度EPA+DHA': 'High concentration EPA+DHA',
      '超高浓度配方': 'Ultra-high concentration formula',
      '改善胰岛素敏感性，支持神经健康': 'Improves insulin sensitivity, supports nerve health',
      '有助于血糖控制': 'Helps with blood sugar control',
      '高吸收率配方': 'High absorption formula',
      '柠檬酸镁，易吸收': 'Magnesium citrate, easily absorbed',
      '支持肌肉和神经功能': 'Supports muscle and nerve function',
      '强抗氧化剂，预防糖尿病神经病变': 'Potent antioxidant, prevents diabetic neuropathy',
      '改善神经功能': 'Improves nerve function',
      'R型硫辛酸，活性更高': 'R-lipoic acid, higher activity',
      '大容量装，超值': 'Large pack, great value',
      '帮助改善胰岛素功能': 'Helps improve insulin function',
      '支持血糖代谢': 'Supports blood sugar metabolism',
      '吡啶甲酸铬，大包装': 'Chromium picolinate, large pack',
      '天然降血糖辅助品': 'Natural blood sugar lowering aid',
      '有助于控制血糖': 'Helps control blood sugar',
      '标准化提取物': 'Standardized extract',
      '高浓度CinSulin配方': 'High-concentration CinSulin formula',
      '支持神经健康和能量代谢': 'Supports nerve health and energy metabolism',
      '全面B族维生素补充': 'Comprehensive B-vitamin supplement',
      '预防神经病变，特别适合服用二甲双胍的患者': 'Prevents neuropathy, especially suitable for metformin users',
      '甲基钴胺素形式': 'Methylcobalamin form',
      '硫胺素，支持神经健康': 'Thiamine, supports nerve health',
      '吡哆醇，支持蛋白质代谢': 'Pyridoxine, supports protein metabolism',
      '保护心血管健康，抗氧化': 'Protects cardiovascular health, antioxidant',
      '支持心脏健康': 'Supports heart health',
      '泛醇形式，更易吸收': 'Ubiquinol form, more easily absorbed',
      '增强免疫力，抗氧化': 'Enhances immunity, antioxidant',
      '支持免疫系统': 'Supports immune system',
      '高强度配方': 'High-potency formula',
      '天然维生素E，抗氧化': 'Natural vitamin E, antioxidant',
      '保护细胞免受氧化损伤': 'Protects cells from oxidative damage',
      '天然d-α生育酚': 'Natural d-alpha tocopherol',
      '支持免疫功能和伤口愈合': 'Supports immune function and wound healing',
      '抗氧化矿物质': 'Antioxidant mineral',
      '有机硒，保护细胞': 'Organic selenium, protects cells',
      '传统草药，辅助血糖控制': 'Traditional herb, aids blood sugar control',
      '天然降糖辅助': 'Natural blood sugar lowering aid',
      '传统降糖植物': 'Traditional blood sugar lowering plant',
      '辅助血糖管理': 'Aids blood sugar management',
      '提高能量，辅助血糖控制': 'Increases energy, aids blood sugar control',
      '增强体力和免疫力': 'Enhances strength and immunity',
      '含铬、镁、维生素B等多种营养素': 'Contains chromium, magnesium, B vitamins and other nutrients',
      '综合血糖管理营养素': 'Comprehensive blood sugar management nutrients',
      '专为糖尿病患者设计': 'Designed specifically for diabetics',
      '低碳高蛋白，适合糖尿病患者': 'Low-carb high-protein, suitable for diabetics',
      '乳清蛋白，易吸收': 'Whey protein, easily absorbed',
      '素食友好，豌豆蛋白': 'Vegan-friendly, pea protein',
      '澳洲品牌，高品质': 'Australian brand, high quality',
      '高纤维全谷物，升糖指数低': 'High-fiber whole grain, low glycemic index',
      '传统燕麦，无添加糖': 'Traditional oats, no added sugar',
      '完全蛋白质，低GI': 'Complete protein, low GI',
      '全谷物，纤维丰富': 'Whole grain, fiber-rich',
      '富含omega-3和纤维': 'Rich in omega-3 and fiber',
      '富含纤维和omega-3': 'Rich in fiber and omega-3',
      '超级食品，营养丰富': 'Superfood, nutrient-rich',
      '碱性食品，抗氧化': 'Alkaline food, antioxidant',
      '低碳面粉替代品': 'Low-carb flour alternative',
      '无盐烘焙，健康零食': 'Unsalted roasted, healthy snack',
      '富含锌和镁': 'Rich in zinc and magnesium',
      '低碳高蛋白零食': 'Low-carb high-protein snack',
      '适合低碳饮食': 'Suitable for low-carb diet',
      '低卡健康零食': 'Low-calorie healthy snack',
      '高蛋白低糖，富含益生菌': 'High-protein low-sugar, rich in probiotics',
      '高蛋白，奶油质地': 'High-protein, creamy texture',
      '植物奶，低卡低糖': 'Plant milk, low-calorie low-sugar',
      '植物蛋白，无乳糖': 'Plant protein, lactose-free',
      '天然零卡甜味剂': 'Natural zero-calorie sweetener',
      '零卡糖替代品': 'Zero-calorie sugar substitute',
      '健康烹饪油': 'Healthy cooking oil',
      '健康脂肪，适合糖尿病饮食': 'Healthy fats, suitable for diabetic diet',
      '可溶性纤维，辅助血糖控制': 'Soluble fiber, aids blood sugar control',
      '益生元纤维': 'Prebiotic fiber',
      '可溶性纤维补充': 'Soluble fiber supplement',
    };
    return translations[desc] || desc;
  }

  const products = [
    // ========== 糖尿病药物 (40+个) ==========
    // 二甲双胍系列
    { name: '二甲双胍 500mg', brand: '通用品牌', category: '糖尿病药物', dosage: '500mg', quantity: 100, unit: '片', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: '常用的2型糖尿病口服药物，一线降糖药' },
    { name: '二甲双胍 500mg', brand: 'Mylan', category: '糖尿病药物', dosage: '500mg', quantity: 100, unit: '片', price: 14.50, vendor: 'Priceline', inStock: true, description: '品牌二甲双胍，质量可靠' },
    { name: '二甲双胍 500mg', brand: 'Glucophage', category: '糖尿病药物', dosage: '500mg', quantity: 100, unit: '片', price: 16.99, vendor: 'Terry White', inStock: true, description: '原研药品牌，效果显著' },
    { name: '二甲双胍 850mg', brand: 'Mylan', category: '糖尿病药物', dosage: '850mg', quantity: 100, unit: '片', price: 15.99, vendor: 'Priceline', inStock: true, description: '高剂量二甲双胍' },
    { name: '二甲双胍 850mg', brand: 'Glucophage', category: '糖尿病药物', dosage: '850mg', quantity: 100, unit: '片', price: 18.50, vendor: 'Chemist Warehouse', inStock: true, description: '原研药，高剂量配方' },
    { name: '二甲双胍 1000mg', brand: 'Glucophage XR', category: '糖尿病药物', dosage: '1000mg', quantity: 60, unit: '片', price: 22.99, vendor: 'Terry White', inStock: true, description: '缓释片，每日一次' },
    
    // 格列美脲系列
    { name: '格列美脲 1mg', brand: 'Amaryl', category: '糖尿病药物', dosage: '1mg', quantity: 30, unit: '片', price: 19.99, vendor: 'Chemist Warehouse', inStock: true, description: '磺脲类降糖药，低剂量' },
    { name: '格列美脲 2mg', brand: 'Amaryl', category: '糖尿病药物', dosage: '2mg', quantity: 30, unit: '片', price: 24.99, vendor: 'Chemist Warehouse', inStock: true, description: '磺脲类降糖药，中等剂量' },
    { name: '格列美脲 4mg', brand: 'Amaryl', category: '糖尿病药物', dosage: '4mg', quantity: 30, unit: '片', price: 29.99, vendor: 'Priceline', inStock: true, description: '磺脲类降糖药，高剂量' },
    { name: '格列美脲 2mg', brand: '通用品牌', category: '糖尿病药物', dosage: '2mg', quantity: 30, unit: '片', price: 19.99, vendor: 'Amcal', inStock: true, description: '经济型格列美脲' },
    
    // DPP-4抑制剂
    { name: '西格列汀 100mg', brand: 'Januvia', category: '糖尿病药物', dosage: '100mg', quantity: 28, unit: '片', price: 85.50, vendor: 'Chemist Warehouse', inStock: true, description: 'DPP-4抑制剂，帮助控制血糖' },
    { name: '西格列汀 50mg', brand: 'Januvia', category: '糖尿病药物', dosage: '50mg', quantity: 28, unit: '片', price: 72.50, vendor: 'Terry White', inStock: true, description: 'DPP-4抑制剂，低剂量' },
    { name: '利格列汀 5mg', brand: 'Trajenta', category: '糖尿病药物', dosage: '5mg', quantity: 30, unit: '片', price: 78.99, vendor: 'Priceline', inStock: true, description: 'DPP-4抑制剂，无需调整剂量' },
    { name: '沙格列汀 5mg', brand: 'Onglyza', category: '糖尿病药物', dosage: '5mg', quantity: 30, unit: '片', price: 82.50, vendor: 'Chemist Warehouse', inStock: true, description: 'DPP-4抑制剂，心血管安全' },
    
    // SGLT2抑制剂
    { name: '达格列净 10mg', brand: 'Forxiga', category: '糖尿病药物', dosage: '10mg', quantity: 28, unit: '片', price: 95.99, vendor: 'Terry White', inStock: true, description: 'SGLT2抑制剂，降糖减重' },
    { name: '恩格列净 10mg', brand: 'Jardiance', category: '糖尿病药物', dosage: '10mg', quantity: 30, unit: '片', price: 89.99, vendor: 'Chemist Warehouse', inStock: true, description: 'SGLT2抑制剂，心血管获益' },
    { name: '恩格列净 25mg', brand: 'Jardiance', category: '糖尿病药物', dosage: '25mg', quantity: 30, unit: '片', price: 99.99, vendor: 'Priceline', inStock: true, description: 'SGLT2抑制剂，高剂量' },
    { name: '卡格列净 100mg', brand: 'Invokana', category: '糖尿病药物', dosage: '100mg', quantity: 30, unit: '片', price: 92.50, vendor: 'Terry White', inStock: true, description: 'SGLT2抑制剂，降糖降压' },
    
    // GLP-1受体激动剂
    { name: '利拉鲁肽注射笔', brand: 'Victoza', category: '糖尿病药物', dosage: '6mg/ml', quantity: 2, unit: '支', price: 245.00, vendor: 'Chemist Warehouse', inStock: true, description: 'GLP-1受体激动剂，每日一次注射' },
    { name: '度拉糖肽注射笔', brand: 'Trulicity', category: '糖尿病药物', dosage: '0.75mg', quantity: 4, unit: '支', price: 280.00, vendor: 'Priceline', inStock: true, description: 'GLP-1受体激动剂，每周一次' },
    { name: '司美格鲁肽注射笔', brand: 'Ozempic', category: '糖尿病药物', dosage: '1mg', quantity: 4, unit: '支', price: 320.00, vendor: 'Terry White', inStock: true, description: 'GLP-1受体激动剂，减重效果显著' },
    
    // 胰岛素系列
    { name: '速效胰岛素', brand: 'NovoRapid', category: '糖尿病药物', dosage: '100IU/ml', quantity: 5, unit: '支', price: 89.99, vendor: 'Chemist Warehouse', inStock: true, description: '餐时胰岛素，起效快' },
    { name: '速效胰岛素', brand: 'Humalog', category: '糖尿病药物', dosage: '100IU/ml', quantity: 5, unit: '支', price: 92.50, vendor: 'Priceline', inStock: true, description: '餐时胰岛素，作用迅速' },
    { name: '长效胰岛素', brand: 'Lantus', category: '糖尿病药物', dosage: '100IU/ml', quantity: 5, unit: '支', price: 105.00, vendor: 'Terry White', inStock: true, description: '基础胰岛素，24小时持续' },
    { name: '长效胰岛素', brand: 'Levemir', category: '糖尿病药物', dosage: '100IU/ml', quantity: 5, unit: '支', price: 98.50, vendor: 'Chemist Warehouse', inStock: true, description: '基础胰岛素，平稳降糖' },
    { name: '预混胰岛素', brand: 'NovoMix 30', category: '糖尿病药物', dosage: '100IU/ml', quantity: 5, unit: '支', price: 95.99, vendor: 'Priceline', inStock: true, description: '速效+中效混合，方便使用' },
    
    // 其他降糖药
    { name: '格列齐特 80mg', brand: 'Diamicron', category: '糖尿病药物', dosage: '80mg', quantity: 60, unit: '片', price: 26.99, vendor: 'Chemist Warehouse', inStock: true, description: '磺脲类，低血糖风险较低' },
    { name: '格列齐特 30mg', brand: 'Diamicron MR', category: '糖尿病药物', dosage: '30mg', quantity: 60, unit: '片', price: 28.50, vendor: 'Priceline', inStock: true, description: '缓释配方' },
    { name: '阿卡波糖 50mg', brand: 'Glucobay', category: '糖尿病药物', dosage: '50mg', quantity: 90, unit: '片', price: 35.99, vendor: 'Terry White', inStock: true, description: 'α-糖苷酶抑制剂，延缓糖吸收' },
    { name: '阿卡波糖 100mg', brand: 'Glucobay', category: '糖尿病药物', dosage: '100mg', quantity: 90, unit: '片', price: 42.50, vendor: 'Chemist Warehouse', inStock: true, description: 'α-糖苷酶抑制剂，高剂量' },
    { name: '吡格列酮 15mg', brand: 'Actos', category: '糖尿病药物', dosage: '15mg', quantity: 30, unit: '片', price: 45.99, vendor: 'Priceline', inStock: true, description: '噻唑烷二酮类，改善胰岛素敏感性' },
    { name: '吡格列酮 30mg', brand: 'Actos', category: '糖尿病药物', dosage: '30mg', quantity: 30, unit: '片', price: 52.50, vendor: 'Terry White', inStock: true, description: '噻唑烷二酮类，高剂量' },
    
    // ========== 医疗器械 (30+个) ==========
    // 血糖仪和试纸
    { name: '血糖仪试纸', brand: 'OneTouch', category: '医疗器械', quantity: 50, unit: '片', price: 29.99, vendor: 'Chemist Warehouse', inStock: true, description: '兼容OneTouch血糖仪，准确快速' },
    { name: '血糖仪试纸', brand: 'OneTouch', category: '医疗器械', quantity: 100, unit: '片', price: 52.99, vendor: 'Priceline', inStock: true, description: 'OneTouch试纸，大容量装' },
    { name: '血糖仪试纸', brand: 'Accu-Chek', category: '医疗器械', quantity: 50, unit: '片', price: 31.99, vendor: 'Terry White', inStock: true, description: '适配Accu-Chek血糖仪' },
    { name: '血糖仪试纸', brand: 'Accu-Chek', category: '医疗器械', quantity: 100, unit: '片', price: 58.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Accu-Chek试纸，大包装' },
    { name: '血糖仪试纸', brand: 'Contour', category: '医疗器械', quantity: 50, unit: '片', price: 28.50, vendor: 'Amcal', inStock: true, description: 'Contour系列试纸' },
    { name: '血糖仪试纸', brand: 'FreeStyle', category: '医疗器械', quantity: 50, unit: '片', price: 30.99, vendor: 'Priceline', inStock: true, description: 'FreeStyle试纸，高精度' },
    
    // 血糖仪套装
    { name: '血糖仪套装', brand: 'Accu-Chek', category: '医疗器械', quantity: 1, unit: '套', price: 49.99, vendor: 'Chemist Warehouse', inStock: true, description: '含血糖仪、试纸10片、采血笔' },
    { name: '血糖仪套装', brand: 'OneTouch', category: '医疗器械', quantity: 1, unit: '套', price: 45.99, vendor: 'Priceline', inStock: true, description: 'OneTouch入门套装' },
    { name: '血糖仪套装', brand: 'Contour', category: '医疗器械', quantity: 1, unit: '套', price: 52.99, vendor: 'Terry White', inStock: true, description: '高精度血糖监测系统' },
    { name: '血糖仪套装', brand: 'FreeStyle Libre', category: '医疗器械', quantity: 1, unit: '套', price: 159.99, vendor: 'Chemist Warehouse', inStock: true, description: '扫描式血糖监测，无需采血' },
    
    // 采血针和采血笔
    { name: '采血针', brand: 'OneTouch', category: '医疗器械', quantity: 100, unit: '支', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: '无痛采血针，适配各种采血笔' },
    { name: '采血针', brand: 'BD', category: '医疗器械', quantity: 100, unit: '支', price: 14.50, vendor: 'Priceline', inStock: true, description: 'BD超细采血针，28G' },
    { name: '采血针', brand: 'Accu-Chek', category: '医疗器械', quantity: 100, unit: '支', price: 13.99, vendor: 'Terry White', inStock: true, description: '兼容多种采血笔' },
    { name: '采血针', brand: 'BD', category: '医疗器械', quantity: 200, unit: '支', price: 25.99, vendor: 'Amcal', inStock: true, description: 'BD采血针，大包装' },
    { name: '采血笔', brand: 'Accu-Chek', category: '医疗器械', quantity: 1, unit: '支', price: 18.99, vendor: 'Chemist Warehouse', inStock: true, description: '舒适型采血笔，可调深度' },
    { name: '采血笔', brand: 'OneTouch', category: '医疗器械', quantity: 1, unit: '支', price: 16.99, vendor: 'Priceline', inStock: true, description: '便携式采血笔' },
    
    // 胰岛素注射笔针头
    { name: '胰岛素注射笔针头', brand: 'BD', category: '医疗器械', quantity: 100, unit: '支', price: 34.99, vendor: 'Chemist Warehouse', inStock: true, description: '超细针头，减少注射疼痛，31G' },
    { name: '胰岛素注射笔针头', brand: 'NovoFine', category: '医疗器械', quantity: 100, unit: '支', price: 32.99, vendor: 'Priceline', inStock: true, description: '4mm超短针头' },
    { name: '胰岛素注射笔针头', brand: 'BD', category: '医疗器械', quantity: 100, unit: '支', price: 36.50, vendor: 'Terry White', inStock: true, description: 'Ultra-Fine针头，32G' },
    { name: '胰岛素注射笔针头', brand: 'NovoFine Plus', category: '医疗器械', quantity: 100, unit: '支', price: 35.50, vendor: 'Amcal', inStock: true, description: '5mm针头，适合各种体型' },
    
    // 连续血糖监测
    { name: 'FreeStyle Libre传感器', brand: 'Abbott', category: '医疗器械', quantity: 1, unit: '个', price: 89.99, vendor: 'Chemist Warehouse', inStock: true, description: '14天连续血糖监测传感器' },
    { name: 'FreeStyle Libre传感器', brand: 'Abbott', category: '医疗器械', quantity: 2, unit: '个', price: 169.99, vendor: 'Priceline', inStock: true, description: '2个装，优惠套装' },
    { name: 'Dexcom G6传感器', brand: 'Dexcom', category: '医疗器械', quantity: 3, unit: '个', price: 299.99, vendor: 'Terry White', inStock: true, description: '实时血糖监测，30天用量' },
    
    // 其他辅助设备
    { name: '血压计', brand: 'Omron', category: '医疗器械', quantity: 1, unit: '台', price: 79.99, vendor: 'Chemist Warehouse', inStock: true, description: '上臂式血压计，适合糖尿病患者' },
    { name: '体重秤', brand: 'Tanita', category: '医疗器械', quantity: 1, unit: '台', price: 59.99, vendor: 'Priceline', inStock: true, description: '体脂秤，监测体重变化' },
    { name: '胰岛素冷藏盒', brand: 'Frio', category: '医疗器械', quantity: 1, unit: '个', price: 45.00, vendor: 'Terry White', inStock: true, description: '便携式胰岛素保存盒，出行必备' },
    { name: '药盒', brand: '通用品牌', category: '医疗器械', quantity: 1, unit: '个', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: '7天分格药盒，方便管理' },
    
    // ========== 营养补充剂 (60+个) ==========
    // 维生素D3系列
    { name: '维生素D3', brand: 'Nature Made', category: '营养补充剂', dosage: '1000IU', quantity: 120, unit: '粒', price: 18.99, vendor: 'Chemist Warehouse', inStock: true, description: '骨骼健康和免疫系统，改善胰岛素敏感性' },
    { name: '维生素D3', brand: 'Blackmores', category: '营养补充剂', dosage: '1000IU', quantity: 120, unit: '粒', price: 22.50, vendor: 'Priceline', inStock: true, description: '澳洲本土品牌，高品质' },
    { name: '维生素D3', brand: 'Swisse', category: '营养补充剂', dosage: '1000IU', quantity: 150, unit: '粒', price: 19.99, vendor: 'Woolworths', inStock: true, description: '大容量装，更实惠' },
    { name: '维生素D3', brand: 'Nature\'s Own', category: '营养补充剂', dosage: '1000IU', quantity: 100, unit: '粒', price: 16.99, vendor: 'Amcal', inStock: true, description: '性价比之选' },
    { name: '维生素D3', brand: 'Ostelin', category: '营养补充剂', dosage: '1000IU', quantity: 130, unit: '粒', price: 21.99, vendor: 'Chemist Warehouse', inStock: true, description: '澳洲知名骨骼健康品牌' },
    { name: '维生素D3', brand: 'Now Foods', category: '营养补充剂', dosage: '2000IU', quantity: 120, unit: '粒', price: 24.99, vendor: 'iHerb', inStock: true, description: '高剂量配方' },
    
    // Omega-3鱼油系列
    { name: 'Omega-3 鱼油', brand: 'Nordic Naturals', category: '营养补充剂', dosage: '1000mg', quantity: 60, unit: '粒', price: 24.99, vendor: 'iHerb', inStock: true, description: '支持心血管健康，降低炎症' },
    { name: 'Omega-3 鱼油', brand: 'Blackmores', category: '营养补充剂', dosage: '1000mg', quantity: 60, unit: '粒', price: 21.99, vendor: 'Chemist Warehouse', inStock: true, description: '无腥味配方' },
    { name: 'Omega-3 鱼油', brand: 'Swisse', category: '营养补充剂', dosage: '1000mg', quantity: 60, unit: '粒', price: 23.50, vendor: 'Priceline', inStock: true, description: '高纯度鱼油' },
    { name: 'Omega-3 鱼油', brand: 'Nature Made', category: '营养补充剂', dosage: '1000mg', quantity: 90, unit: '粒', price: 26.99, vendor: 'Chemist Warehouse', inStock: true, description: '大容量装' },
    { name: 'Omega-3 鱼油', brand: 'Nature\'s Own', category: '营养补充剂', dosage: '1000mg', quantity: 60, unit: '粒', price: 19.99, vendor: 'Amcal', inStock: true, description: '经济实惠' },
    { name: 'Omega-3 鱼油', brand: 'Carlson', category: '营养补充剂', dosage: '1200mg', quantity: 100, unit: '粒', price: 32.99, vendor: 'iHerb', inStock: true, description: '高浓度EPA+DHA' },
    { name: 'Omega-3 鱼油', brand: 'Life Extension', category: '营养补充剂', dosage: '1400mg', quantity: 120, unit: '粒', price: 38.99, vendor: 'iHerb', inStock: true, description: '超高浓度配方' },
    
    // 镁补充剂系列
    { name: '镁补充剂', brand: 'Blackmores', category: '营养补充剂', dosage: '500mg', quantity: 100, unit: '片', price: 16.99, vendor: 'Priceline', inStock: true, description: '改善胰岛素敏感性，支持神经健康' },
    { name: '镁补充剂', brand: 'Nature Made', category: '营养补充剂', dosage: '500mg', quantity: 100, unit: '片', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: '有助于血糖控制' },
    { name: '镁补充剂', brand: 'Swisse', category: '营养补充剂', dosage: '500mg', quantity: 120, unit: '片', price: 18.50, vendor: 'Woolworths', inStock: true, description: '高吸收率配方' },
    { name: '镁补充剂', brand: 'Now Foods', category: '营养补充剂', dosage: '400mg', quantity: 180, unit: '片', price: 22.99, vendor: 'iHerb', inStock: true, description: '柠檬酸镁，易吸收' },
    { name: '镁补充剂', brand: 'Nature\'s Way', category: '营养补充剂', dosage: '500mg', quantity: 100, unit: '片', price: 15.99, vendor: 'Amcal', inStock: true, description: '支持肌肉和神经功能' },
    
    // α-硫辛酸系列
    { name: 'α-硫辛酸', brand: 'Life Extension', category: '营养补充剂', dosage: '600mg', quantity: 60, unit: '粒', price: 32.99, vendor: 'iHerb', inStock: true, description: '强抗氧化剂，预防糖尿病神经病变' },
    { name: 'α-硫辛酸', brand: 'Now Foods', category: '营养补充剂', dosage: '600mg', quantity: 60, unit: '粒', price: 29.99, vendor: 'iHerb', inStock: true, description: '改善神经功能' },
    { name: 'α-硫辛酸', brand: 'Jarrow Formulas', category: '营养补充剂', dosage: '300mg', quantity: 100, unit: '粒', price: 35.50, vendor: 'iHerb', inStock: true, description: 'R型硫辛酸，活性更高' },
    { name: 'α-硫辛酸', brand: 'Doctor\'s Best', category: '营养补充剂', dosage: '600mg', quantity: 180, unit: '粒', price: 52.99, vendor: 'iHerb', inStock: true, description: '大容量装，超值' },
    
    // 铬补充剂系列
    { name: '铬元素补充剂', brand: 'Now Foods', category: '营养补充剂', dosage: '200mcg', quantity: 100, unit: '粒', price: 14.99, vendor: 'iHerb', inStock: true, description: '帮助改善胰岛素功能' },
    { name: '铬元素补充剂', brand: 'Nature Made', category: '营养补充剂', dosage: '200mcg', quantity: 100, unit: '粒', price: 16.50, vendor: 'Chemist Warehouse', inStock: true, description: '支持血糖代谢' },
    { name: '铬元素补充剂', brand: 'Swanson', category: '营养补充剂', dosage: '200mcg', quantity: 200, unit: '粒', price: 18.99, vendor: 'iHerb', inStock: true, description: '吡啶甲酸铬，大包装' },
    { name: '铬元素补充剂', brand: 'Solgar', category: '营养补充剂', dosage: '500mcg', quantity: 120, unit: '粒', price: 24.99, vendor: 'iHerb', inStock: true, description: '高剂量配方' },
    
    // 肉桂提取物系列
    { name: '肉桂提取物', brand: 'Swanson', category: '营养补充剂', dosage: '500mg', quantity: 120, unit: '粒', price: 19.99, vendor: 'iHerb', inStock: true, description: '天然降血糖辅助品' },
    { name: '肉桂提取物', brand: 'Now Foods', category: '营养补充剂', dosage: '500mg', quantity: 120, unit: '粒', price: 18.50, vendor: 'iHerb', inStock: true, description: '有助于控制血糖' },
    { name: '肉桂提取物', brand: 'Nature\'s Way', category: '营养补充剂', dosage: '500mg', quantity: 100, unit: '粒', price: 22.99, vendor: 'Chemist Warehouse', inStock: true, description: '标准化提取物' },
    { name: '肉桂提取物', brand: 'Life Extension', category: '营养补充剂', dosage: '250mg', quantity: 60, unit: '粒', price: 25.99, vendor: 'iHerb', inStock: true, description: '高浓度CinSulin配方' },
    
    // B族维生素系列
    { name: '复合B族维生素', brand: 'Nature\'s Way', category: '营养补充剂', quantity: 100, unit: '片', price: 22.99, vendor: 'Chemist Warehouse', inStock: true, description: '支持神经健康和能量代谢' },
    { name: '复合B族维生素', brand: 'Blackmores', category: '营养补充剂', quantity: 100, unit: '片', price: 24.50, vendor: 'Priceline', inStock: true, description: '全面B族维生素补充' },
    { name: '复合B族维生素', brand: 'Swisse', category: '营养补充剂', quantity: 60, unit: '片', price: 19.99, vendor: 'Woolworths', inStock: true, description: '缓释配方' },
    { name: '维生素B12', brand: 'Nature Made', category: '营养补充剂', dosage: '1000mcg', quantity: 150, unit: '片', price: 16.99, vendor: 'Chemist Warehouse', inStock: true, description: '预防神经病变，特别适合服用二甲双胍的患者' },
    { name: '维生素B12', brand: 'Now Foods', category: '营养补充剂', dosage: '1000mcg', quantity: 100, unit: '粒', price: 14.99, vendor: 'iHerb', inStock: true, description: '甲基钴胺素形式' },
    { name: '维生素B1', brand: 'Blackmores', category: '营养补充剂', dosage: '100mg', quantity: 100, unit: '片', price: 18.50, vendor: 'Priceline', inStock: true, description: '硫胺素，支持神经健康' },
    { name: '维生素B6', brand: 'Nature\'s Own', category: '营养补充剂', dosage: '50mg', quantity: 100, unit: '片', price: 15.99, vendor: 'Amcal', inStock: true, description: '吡哆醇，支持蛋白质代谢' },
    
    // 辅酶Q10系列
    { name: '辅酶Q10', brand: 'Blackmores', category: '营养补充剂', dosage: '150mg', quantity: 30, unit: '粒', price: 32.99, vendor: 'Priceline', inStock: true, description: '保护心血管健康，抗氧化' },
    { name: '辅酶Q10', brand: 'Swisse', category: '营养补充剂', dosage: '150mg', quantity: 50, unit: '粒', price: 39.99, vendor: 'Chemist Warehouse', inStock: true, description: '支持心脏健康' },
    { name: '辅酶Q10', brand: 'Now Foods', category: '营养补充剂', dosage: '200mg', quantity: 60, unit: '粒', price: 42.50, vendor: 'iHerb', inStock: true, description: '高剂量配方' },
    { name: '辅酶Q10', brand: 'Life Extension', category: '营养补充剂', dosage: '100mg', quantity: 60, unit: '粒', price: 35.99, vendor: 'iHerb', inStock: true, description: '泛醇形式，更易吸收' },
    
    // 维生素C系列
    { name: '维生素C', brand: 'Nature\'s Way', category: '营养补充剂', dosage: '1000mg', quantity: 100, unit: '片', price: 19.99, vendor: 'Chemist Warehouse', inStock: true, description: '增强免疫力，抗氧化' },
    { name: '维生素C', brand: 'Blackmores', category: '营养补充剂', dosage: '1000mg', quantity: 150, unit: '片', price: 22.50, vendor: 'Priceline', inStock: true, description: '支持免疫系统' },
    { name: '维生素C', brand: 'Swisse', category: '营养补充剂', dosage: '1000mg', quantity: 120, unit: '片', price: 21.99, vendor: 'Woolworths', inStock: true, description: '高强度配方' },
    
    // 维生素E系列
    { name: '维生素E', brand: 'Blackmores', category: '营养补充剂', dosage: '500IU', quantity: 50, unit: '粒', price: 24.99, vendor: 'Priceline', inStock: true, description: '天然维生素E，抗氧化' },
    { name: '维生素E', brand: 'Swisse', category: '营养补充剂', dosage: '500IU', quantity: 50, unit: '粒', price: 23.50, vendor: 'Chemist Warehouse', inStock: true, description: '保护细胞免受氧化损伤' },
    { name: '维生素E', brand: 'Now Foods', category: '营养补充剂', dosage: '400IU', quantity: 100, unit: '粒', price: 26.99, vendor: 'iHerb', inStock: true, description: '天然d-α生育酚' },
    
    // 锌补充剂系列
    { name: '锌补充剂', brand: 'Blackmores', category: '营养补充剂', dosage: '25mg', quantity: 90, unit: '片', price: 16.99, vendor: 'Priceline', inStock: true, description: '支持免疫功能和伤口愈合' },
    { name: '锌补充剂', brand: 'Swisse', category: '营养补充剂', dosage: '25mg', quantity: 100, unit: '片', price: 18.50, vendor: 'Chemist Warehouse', inStock: true, description: '有助于血糖代谢' },
    { name: '锌补充剂', brand: 'Now Foods', category: '营养补充剂', dosage: '50mg', quantity: 250, unit: '片', price: 22.99, vendor: 'iHerb', inStock: true, description: '吡啶甲酸锌，高吸收' },
    
    // 硒补充剂系列
    { name: '硒补充剂', brand: 'Blackmores', category: '营养补充剂', dosage: '150mcg', quantity: 90, unit: '片', price: 18.99, vendor: 'Priceline', inStock: true, description: '抗氧化矿物质' },
    { name: '硒补充剂', brand: 'Now Foods', category: '营养补充剂', dosage: '200mcg', quantity: 180, unit: '粒', price: 16.99, vendor: 'iHerb', inStock: true, description: '有机硒，保护细胞' },
    
    // 葫芦巴系列
    { name: '葫芦巴提取物', brand: 'Now Foods', category: '营养补充剂', dosage: '500mg', quantity: 100, unit: '粒', price: 21.99, vendor: 'iHerb', inStock: true, description: '传统草药，辅助血糖控制' },
    { name: '葫芦巴提取物', brand: 'Nature\'s Way', category: '营养补充剂', dosage: '610mg', quantity: 100, unit: '粒', price: 24.50, vendor: 'Chemist Warehouse', inStock: true, description: '天然降糖辅助' },
    
    // 苦瓜提取物系列
    { name: '苦瓜提取物', brand: 'Now Foods', category: '营养补充剂', dosage: '500mg', quantity: 90, unit: '粒', price: 18.99, vendor: 'iHerb', inStock: true, description: '传统降糖植物' },
    { name: '苦瓜提取物', brand: 'Swanson', category: '营养补充剂', dosage: '500mg', quantity: 120, unit: '粒', price: 16.99, vendor: 'iHerb', inStock: true, description: '辅助血糖管理' },
    
    // 人参系列
    { name: '西洋参提取物', brand: 'Nature\'s Way', category: '营养补充剂', dosage: '500mg', quantity: 100, unit: '粒', price: 35.99, vendor: 'Chemist Warehouse', inStock: true, description: '提高能量，辅助血糖控制' },
    { name: '高丽参提取物', brand: 'Nature\'s Way', category: '营养补充剂', dosage: '500mg', quantity: 60, unit: '粒', price: 42.99, vendor: 'Priceline', inStock: true, description: '增强体力和免疫力' },
    
    // 复合配方
    { name: '糖尿病复合营养配方', brand: 'Nature Made', category: '营养补充剂', quantity: 60, unit: '片', price: 34.99, vendor: 'Chemist Warehouse', inStock: true, description: '含铬、镁、维生素B等多种营养素' },
    { name: '血糖支持配方', brand: 'Life Extension', category: '营养补充剂', quantity: 90, unit: '粒', price: 45.99, vendor: 'iHerb', inStock: true, description: '综合血糖管理营养素' },
    { name: '糖尿病多维配方', brand: 'Swisse', category: '营养补充剂', quantity: 100, unit: '片', price: 38.50, vendor: 'Priceline', inStock: true, description: '专为糖尿病患者设计' },
    
    // ========== 健康食品 (30+个) ==========
    // 蛋白粉系列
    { name: '无糖蛋白粉', brand: 'Optimum Nutrition', category: '健康食品', quantity: 900, unit: 'g', price: 45.99, vendor: 'GNC', inStock: true, description: '低碳高蛋白，适合糖尿病患者' },
    { name: '无糖蛋白粉', brand: 'BSN', category: '健康食品', quantity: 900, unit: 'g', price: 42.99, vendor: 'GNC', inStock: true, description: '乳清蛋白，易吸收' },
    { name: '植物蛋白粉', brand: 'Vega', category: '健康食品', quantity: 500, unit: 'g', price: 38.50, vendor: 'Health Store', inStock: true, description: '素食友好，豌豆蛋白' },
    { name: '无糖乳清蛋白', brand: 'Musashi', category: '健康食品', quantity: 900, unit: 'g', price: 49.99, vendor: 'Chemist Warehouse', inStock: true, description: '澳洲品牌，高品质' },
    
    // 低GI食品
    { name: '无糖燕麦', brand: 'Uncle Tobys', category: '健康食品', quantity: 500, unit: 'g', price: 6.99, vendor: 'Woolworths', inStock: true, description: '高纤维全谷物，升糖指数低' },
    { name: '无糖燕麦', brand: 'Quaker', category: '健康食品', quantity: 500, unit: 'g', price: 7.50, vendor: 'Coles', inStock: true, description: '传统燕麦，无添加糖' },
    { name: '藜麦', brand: 'Organic', category: '健康食品', quantity: 500, unit: 'g', price: 14.99, vendor: 'Health Store', inStock: true, description: '完全蛋白质，低GI' },
    { name: '糙米', brand: 'SunRice', category: '健康食品', quantity: 1000, unit: 'g', price: 5.99, vendor: 'Woolworths', inStock: true, description: '全谷物，纤维丰富' },
    
    // 超级食品
    { name: '奇亚籽', brand: 'Organic', category: '健康食品', quantity: 500, unit: 'g', price: 12.99, vendor: 'Health Store', inStock: true, description: '富含omega-3和纤维' },
    { name: '亚麻籽粉', brand: 'Bob\'s Red Mill', category: '健康食品', quantity: 453, unit: 'g', price: 11.99, vendor: 'Coles', inStock: true, description: '富含纤维和omega-3' },
    { name: '螺旋藻粉', brand: 'Nutrex', category: '健康食品', quantity: 500, unit: 'g', price: 35.99, vendor: 'Health Store', inStock: true, description: '超级食品，营养丰富' },
    { name: '小麦草粉', brand: 'Amazing Grass', category: '健康食品', quantity: 240, unit: 'g', price: 28.50, vendor: 'iHerb', inStock: true, description: '碱性食品，抗氧化' },
    
    // 坚果和种子
    { name: '杏仁粉', brand: 'Bob\'s Red Mill', category: '健康食品', quantity: 453, unit: 'g', price: 16.99, vendor: 'Coles', inStock: true, description: '低碳面粉替代品' },
    { name: '核桃仁', brand: 'Organic', category: '健康食品', quantity: 500, unit: 'g', price: 18.99, vendor: 'Woolworths', inStock: true, description: '富含omega-3' },
    { name: '杏仁', brand: 'Blue Diamond', category: '健康食品', quantity: 500, unit: 'g', price: 15.99, vendor: 'Coles', inStock: true, description: '无盐烘焙，健康零食' },
    { name: '南瓜籽', brand: 'Organic', category: '健康食品', quantity: 500, unit: 'g', price: 12.50, vendor: 'Health Store', inStock: true, description: '富含锌和镁' },
    
    // 健康零食
    { name: '无糖蛋白棒', brand: 'Quest', category: '健康食品', quantity: 12, unit: '条', price: 38.99, vendor: 'GNC', inStock: true, description: '低碳高蛋白零食' },
    { name: '无糖蛋白棒', brand: 'Atkins', category: '健康食品', quantity: 15, unit: '条', price: 35.50, vendor: 'Chemist Warehouse', inStock: true, description: '适合低碳饮食' },
    { name: '海苔脆片', brand: 'Calbee', category: '健康食品', quantity: 100, unit: 'g', price: 8.99, vendor: 'Woolworths', inStock: true, description: '低卡健康零食' },
    
    // 乳制品
    { name: '无糖酸奶', brand: 'Chobani', category: '健康食品', quantity: 500, unit: 'g', price: 5.99, vendor: 'Woolworths', inStock: true, description: '高蛋白低糖，富含益生菌' },
    { name: '无糖希腊酸奶', brand: 'Farmers Union', category: '健康食品', quantity: 500, unit: 'g', price: 6.50, vendor: 'Coles', inStock: true, description: '高蛋白，奶油质地' },
    { name: '无糖杏仁奶', brand: 'Almond Breeze', category: '健康食品', quantity: 1000, unit: 'ml', price: 4.99, vendor: 'Woolworths', inStock: true, description: '植物奶，低卡低糖' },
    { name: '无糖豆奶', brand: 'Sanitarium', category: '健康食品', quantity: 1000, unit: 'ml', price: 3.99, vendor: 'Coles', inStock: true, description: '植物蛋白，无乳糖' },
    
    // 调味料和甜味剂
    { name: '甜菊糖', brand: 'Natvia', category: '健康食品', quantity: 300, unit: 'g', price: 9.99, vendor: 'Woolworths', inStock: true, description: '天然零卡甜味剂' },
    { name: '赤藓糖醇', brand: 'Lakanto', category: '健康食品', quantity: 500, unit: 'g', price: 14.99, vendor: 'Health Store', inStock: true, description: '零卡糖替代品' },
    { name: '椰子油', brand: 'Organic', category: '健康食品', quantity: 500, unit: 'ml', price: 16.99, vendor: 'Woolworths', inStock: true, description: '健康烹饪油' },
    { name: '特级初榨橄榄油', brand: 'Cobram Estate', category: '健康食品', quantity: 750, unit: 'ml', price: 12.99, vendor: 'Coles', inStock: true, description: '健康脂肪，适合糖尿病饮食' },
    
    // 膳食纤维补充
    { name: '洋车前子壳粉', brand: 'Now Foods', category: '健康食品', quantity: 340, unit: 'g', price: 18.99, vendor: 'iHerb', inStock: true, description: '可溶性纤维，辅助血糖控制' },
    { name: '菊粉粉末', brand: 'Now Foods', category: '健康食品', quantity: 227, unit: 'g', price: 16.50, vendor: 'iHerb', inStock: true, description: '益生元纤维' },
    { name: '苹果果胶粉', brand: 'Now Foods', category: '健康食品', quantity: 340, unit: 'g', price: 22.99, vendor: 'iHerb', inStock: true, description: '可溶性纤维补充' },
  ];
  
  await prisma.product.deleteMany({});
  // Inject English names and descriptions into products for English-only display
  const productsWithEn = (products as any[]).map((p: any) => {
    const enName = translateProductNameToEn(p);
    const enDescription = translateDescription(p.description);
    return {
      ...p,
      // Force English-first naming to guarantee English display
      name: enName,
      nameEn: enName,
      description: enDescription,
      category: toEnglishCategory(p.category),
      unit: toEnglishUnit(p.unit),
      brand: p.brand === '通用品牌' ? 'Generic' : p.brand, // Translate generic brand
    };
  });
  await prisma.product.createMany({ data: productsWithEn });
  
  console.log(`  ✅ 已创建 ${products.length} 个产品`);
}

// ==================== 5. 补充剂数据 ====================
async function seedSupplements() {
  console.log('\n📦 5. 初始化补充剂数据...');
  
  const supplements = [
    // ========== 维生素系列 ==========
    {
      name: '维生素D3',
      nameEn: 'Vitamin D3',
      type: 'vitamin',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Vitamin D3', amount: 1000, unit: 'IU' }]),
      benefits: JSON.stringify(['Improve insulin sensitivity', 'Lower HbA1c levels', 'Enhance immunity', 'Improve bone health', 'Reduce inflammatory markers']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Vitamin D Deficiency', 'Osteoporosis']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in hypercalcemia patients', 'Use with caution in kidney stone patients', 'Contraindicated in hyperparathyroidism patients']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild nausea', 'Constipation'], rare: ['Hypercalcemia', 'Kidney stones'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetes Care 2018;41:1299-1305', 'BMJ 2017;357:j1535']),
      expectedImpact: JSON.stringify({ hba1c: -0.3, glucose: -10, timeframe: 90, confidence: 0.7 }),
      averagePrice: 19.99,
    },
    {
      name: '维生素B12',
      nameEn: 'Vitamin B12 (Methylcobalamin)',
      type: 'vitamin',
      category: 'Neuropathy Protection',
      activeIngredients: JSON.stringify([{ name: 'Methylcobalamin', amount: 1000, unit: 'mcg' }]),
      benefits: JSON.stringify(['Prevent neuropathy', 'Improve nerve function', 'Increase energy levels', 'Support red blood cell production', 'Prevent anemia']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Metformin users', 'Vitamin B12 Deficiency', 'Diabetic Neuropathy']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in cobalt allergy', 'Contraindicated in early Leber disease']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: [], rare: ['Allergic reaction', 'Diarrhea', 'Itching'] }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify(['Diabetes Care 2017;40:1077-1084', 'American Diabetes Association Guidelines 2024']),
      expectedImpact: JSON.stringify({ hba1c: -0.1, glucose: -3, timeframe: 60, confidence: 0.9 }),
      averagePrice: 12.99,
    },
    {
      name: '维生素B1 (硫胺素)',
      nameEn: 'Vitamin B1 (Thiamine)',
      type: 'vitamin',
      category: 'Neuropathy Protection',
      activeIngredients: JSON.stringify([{ name: 'Thiamine', amount: 100, unit: 'mg' }]),
      benefits: JSON.stringify(['Prevent neuropathy', 'Improve glucose metabolism', 'Support heart function', 'Reduce oxidative stress']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Diabetic Neuropathy', 'Thiamine Deficiency']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Very rare, except for allergies']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: [], rare: ['Allergic reaction'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetologia 2015;58:1949-1953']),
      expectedImpact: JSON.stringify({ hba1c: -0.2, glucose: -8, timeframe: 90, confidence: 0.65 }),
      averagePrice: 15.99,
    },
    {
      name: '维生素C',
      nameEn: 'Vitamin C (Ascorbic Acid)',
      type: 'vitamin',
      category: 'Antioxidant',
      activeIngredients: JSON.stringify([{ name: 'Ascorbic Acid', amount: 1000, unit: 'mg' }]),
      benefits: JSON.stringify(['Potent antioxidant', 'Enhance immunity', 'Improve vascular health', 'Promote wound healing', 'Reduce oxidative stress']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Low immunity', 'Slow wound healing']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in kidney stone patients', 'Use with caution in hemochromatosis patients', 'High doses may affect blood sugar testing']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Stomach discomfort', 'Diarrhea'], rare: ['Kidney stones'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Advances in Nutrition 2017;8:17-26']),
      expectedImpact: JSON.stringify({ hba1c: -0.12, glucose: -5, timeframe: 90, confidence: 0.68 }),
      averagePrice: 18.99,
    },
    {
      name: '维生素E',
      nameEn: 'Vitamin E (d-Alpha Tocopherol)',
      type: 'vitamin',
      category: 'Antioxidant',
      activeIngredients: JSON.stringify([{ name: 'd-Alpha Tocopherol', amount: 400, unit: 'IU' }]),
      benefits: JSON.stringify(['Protect cell membranes', 'Reduce oxidative stress', 'Improve vascular function', 'Lower cardiovascular risk']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Cardiovascular Disease', 'Peripheral Vascular Disease']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in patients taking anticoagulants', 'Use with caution in vitamin K deficiency']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Headache', 'Fatigue'], rare: ['Increased bleeding risk'] }),
      evidenceLevel: 'C',
      evidenceSources: JSON.stringify(['Free Radical Biology and Medicine 2017']),
      expectedImpact: JSON.stringify({ hba1c: -0.1, glucose: -4, timeframe: 120, confidence: 0.6 }),
      averagePrice: 22.99,
    },
    {
      name: '维生素B6',
      nameEn: 'Vitamin B6 (Pyridoxine)',
      type: 'vitamin',
      category: 'Neuropathy Protection',
      activeIngredients: JSON.stringify([{ name: 'Pyridoxine', amount: 50, unit: 'mg' }]),
      benefits: JSON.stringify(['Support nerve function', 'Improve protein metabolism', 'Prevent neuropathy', 'Lower homocysteine']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Diabetic Neuropathy']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Long-term high-dose use may cause nerve damage']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild nausea'], rare: ['Neuropathy (high dose)'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Journal of Diabetes Complications 2016']),
      expectedImpact: JSON.stringify({ hba1c: -0.15, glucose: -6, timeframe: 90, confidence: 0.65 }),
      averagePrice: 14.99,
    },
    {
      name: '复合B族维生素',
      nameEn: 'B-Complex Vitamins',
      type: 'vitamin',
      category: 'Comprehensive Nutrition',
      activeIngredients: JSON.stringify([
        { name: 'Vitamin B1', amount: 50, unit: 'mg' },
        { name: 'Vitamin B2', amount: 50, unit: 'mg' },
        { name: 'Vitamin B3', amount: 50, unit: 'mg' },
        { name: 'Vitamin B6', amount: 50, unit: 'mg' },
        { name: 'Vitamin B12', amount: 500, unit: 'mcg' },
        { name: 'Folic Acid', amount: 400, unit: 'mcg' }
      ]),
      benefits: JSON.stringify(['Comprehensive B-vitamin support', 'Energy metabolism', 'Nerve health', 'Cardiovascular protection', 'Lower homocysteine']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Fatigue', 'Neuropathy']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Very rare, except for allergies']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Yellow urine (normal phenomenon)'], rare: ['Allergic reaction'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Nutrients 2018;10:1199']),
      expectedImpact: JSON.stringify({ hba1c: -0.2, glucose: -8, timeframe: 90, confidence: 0.7 }),
      averagePrice: 22.99,
    },
    
    // ========== 矿物质系列 ==========
    {
      name: '镁补充剂',
      nameEn: 'Magnesium (Citrate/Glycinate)',
      type: 'mineral',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Magnesium (Citrate)', amount: 400, unit: 'mg' }]),
      benefits: JSON.stringify(['Improve insulin sensitivity', 'Lower blood sugar levels', 'Prevent diabetes complications', 'Improve sleep quality', 'Relieve muscle spasms', 'Support heart health']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Magnesium Deficiency', 'Insulin Resistance', 'Hypertension', 'Constipation']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in renal insufficiency', 'Use with caution in heart block patients', 'Use with caution in myasthenia patients']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'before_bed' }),
      sideEffects: JSON.stringify({ common: ['Diarrhea', 'Abdominal discomfort'], rare: ['Muscle weakness', 'Arrhythmia'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetes & Metabolism Journal 2020;44:436-448', 'Diabetes Care 2016;39:2116-2122']),
      expectedImpact: JSON.stringify({ hba1c: -0.4, glucose: -15, timeframe: 90, confidence: 0.75 }),
      averagePrice: 15.99,
    },
    {
      name: '铬补充剂',
      nameEn: 'Chromium Picolinate',
      type: 'mineral',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Chromium Picolinate', amount: 200, unit: 'mcg' }]),
      benefits: JSON.stringify(['Enhance insulin action', 'Improve blood sugar control', 'Lower fasting blood sugar', 'Reduce sugar cravings', 'Support lipid metabolism']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Insulin Resistance', 'Blood Sugar Fluctuations', 'Sugar Cravings']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 75 }),
      contraindications: JSON.stringify(['Use with caution in renal insufficiency', 'Use with caution in liver disease patients', 'Consult doctor for thyroid disease patients']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Headache', 'Insomnia', 'Irritability'], rare: ['Liver damage', 'Kidney damage'] }),
      evidenceLevel: 'C',
      evidenceSources: JSON.stringify(['Diabetes Technology & Therapeutics 2018;20:391-402', 'Journal of Trace Elements in Medicine 2019']),
      expectedImpact: JSON.stringify({ hba1c: -0.5, glucose: -20, timeframe: 90, confidence: 0.6 }),
      averagePrice: 18.99,
    },
    {
      name: '锌补充剂',
      nameEn: 'Zinc (Picolinate/Gluconate)',
      type: 'mineral',
      category: 'Immune Support',
      activeIngredients: JSON.stringify([{ name: 'Zinc (Picolinate)', amount: 25, unit: 'mg' }]),
      benefits: JSON.stringify(['Support immune function', 'Promote wound healing', 'Improve insulin secretion', 'Antioxidant', 'Support protein synthesis']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Zinc Deficiency', 'Low Immunity', 'Slow Wound Healing']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Long-term high-dose use may lead to copper deficiency', 'Interactions with certain antibiotics']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Stomach discomfort', 'Nausea'], rare: ['Copper deficiency', 'Immune function decline'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Journal of Diabetes Research 2018;2018:1-9']),
      expectedImpact: JSON.stringify({ hba1c: -0.2, glucose: -8, timeframe: 90, confidence: 0.68 }),
      averagePrice: 16.99,
    },
    {
      name: '硒补充剂',
      nameEn: 'Selenium (Selenomethionine)',
      type: 'mineral',
      category: 'Antioxidant',
      activeIngredients: JSON.stringify([{ name: 'Selenomethionine', amount: 200, unit: 'mcg' }]),
      benefits: JSON.stringify(['Strong antioxidant', 'Protect thyroid function', 'Support immune system', 'Reduce oxidative stress', 'Prevent complications']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Selenium Deficiency', 'Thyroid Problems']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Risk of selenium toxicity (do not exceed dosage)', 'Consult doctor for hyperthyroidism patients']),
      dosage: JSON.stringify({ amount: 1, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: [], rare: ['Selenium toxicity (high dose)', 'Hair loss', 'Nail changes'] }),
      evidenceLevel: 'C',
      evidenceSources: JSON.stringify(['Antioxidants 2019;8:210']),
      expectedImpact: JSON.stringify({ hba1c: -0.15, glucose: -6, timeframe: 120, confidence: 0.62 }),
      averagePrice: 17.99,
    },
    
    // ========== Omega-3脂肪酸 ==========
    {
      name: 'Omega-3鱼油',
      nameEn: 'Omega-3 Fish Oil (EPA+DHA)',
      type: 'other',
      category: 'Cardiovascular Health',
      activeIngredients: JSON.stringify([
        { name: 'EPA', amount: 500, unit: 'mg' },
        { name: 'DHA', amount: 250, unit: 'mg' }
      ]),
      benefits: JSON.stringify(['Lower triglycerides', 'Improve lipid metabolism', 'Protect cardiovascular health', 'Reduce inflammation', 'Lower cardiovascular event risk', 'Support brain health']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Hyperlipidemia', 'Cardiovascular Disease', 'High Triglycerides']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in fish allergy', 'Use with caution in patients taking anticoagulants', 'Use with caution in bleeding disorders']),
      dosage: JSON.stringify({ amount: 2, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild fishy taste', 'Indigestion', 'Belching'], rare: ['Increased bleeding tendency', 'Diarrhea'] }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify(['New England Journal of Medicine 2019;380:11-22', 'American Heart Association 2020', 'JAMA 2018;319:1808-1815']),
      expectedImpact: JSON.stringify({ hba1c: -0.15, glucose: -5, timeframe: 120, confidence: 0.85 }),
      averagePrice: 29.99,
    },
    {
      name: '高浓度Omega-3',
      nameEn: 'High-Potency Omega-3',
      type: 'other',
      category: 'Cardiovascular Health',
      activeIngredients: JSON.stringify([
        { name: 'EPA', amount: 1000, unit: 'mg' },
        { name: 'DHA', amount: 500, unit: 'mg' }
      ]),
      benefits: JSON.stringify(['More potent triglyceride reduction', 'Significantly improve lipid profile', 'Strong anti-inflammatory', 'Comprehensive cardiovascular protection']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Severe Hypertriglyceridemia', 'Cardiovascular Disease']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in fish allergy', 'Use with caution in patients taking anticoagulants']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild fishy taste', 'Digestive discomfort'], rare: ['Bleeding risk'] }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify(['Circulation 2019;140:618-625']),
      expectedImpact: JSON.stringify({ hba1c: -0.2, glucose: -7, timeframe: 120, confidence: 0.88 }),
      averagePrice: 45.99,
    },
    
    // ========== 抗氧化剂 ==========
    {
      name: 'α-硫辛酸',
      nameEn: 'Alpha-Lipoic Acid (ALA)',
      type: 'other',
      category: 'Neuropathy Protection',
      activeIngredients: JSON.stringify([{ name: 'Alpha-Lipoic Acid', amount: 600, unit: 'mg' }]),
      benefits: JSON.stringify(['Improve neuropathy symptoms', 'Potent antioxidant', 'Improve insulin sensitivity', 'Relieve neuropathic pain', 'Protect nerve cells', 'Improve blood sugar metabolism']),
      indications: JSON.stringify(['Diabetic Neuropathy', 'Oxidative Stress', 'Type 2 Diabetes', 'Peripheral Neuropathy']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in thyroid disease patients', 'May affect blood sugar medications']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Stomach discomfort', 'Rash', 'Headache'], rare: ['Hypoglycemia', 'Thyroid dysfunction'] }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify(['Diabetologia 2018;61:1282-1290', 'Diabetes Care 2015;38:1420-1427', 'Journal of Diabetes Complications 2019']),
      expectedImpact: JSON.stringify({ hba1c: -0.2, glucose: -8, timeframe: 120, confidence: 0.85 }),
      averagePrice: 34.99,
    },
    {
      name: '辅酶Q10',
      nameEn: 'Coenzyme Q10 (Ubiquinone)',
      type: 'other',
      category: 'Cardiovascular Health',
      activeIngredients: JSON.stringify([{ name: 'Coenzyme Q10', amount: 200, unit: 'mg' }]),
      benefits: JSON.stringify(['Protect cardiovascular health', 'Improve energy metabolism', 'Potent antioxidant', 'Improve blood sugar control', 'Reduce oxidative stress', 'Support mitochondrial function']),
      indications: JSON.stringify(['Diabetes', 'Cardiovascular Disease', 'Hypertension', 'Statin Users']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in warfarin users', 'May affect blood pressure medications']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild insomnia', 'Stomach discomfort', 'Loss of appetite'], rare: ['Rash', 'Dizziness'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetes & Metabolism 2018;44:1-8', 'Atherosclerosis 2016;251:282-289']),
      expectedImpact: JSON.stringify({ hba1c: -0.18, glucose: -7, timeframe: 90, confidence: 0.72 }),
      averagePrice: 39.99,
    },
    
    // ========== 草本提取物 ==========
    {
      name: '肉桂提取物',
      nameEn: 'Cinnamon Extract (Cinnamomum cassia)',
      type: 'herbal',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Cinnamon Extract (Standardized)', amount: 500, unit: 'mg' }]),
      benefits: JSON.stringify(['Lower fasting blood sugar', 'Improve insulin sensitivity', 'Natural blood sugar lowering', 'Antioxidant effects', 'Improve lipid profile', 'Anti-inflammatory effects']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Elevated Blood Sugar', 'Insulin Resistance', 'Metabolic Syndrome']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in liver disease patients', 'Use with caution in patients taking anticoagulants', 'Contraindicated in pregnancy']),
      dosage: JSON.stringify({ amount: 2, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild stomach discomfort', 'Mouth irritation'], rare: ['Liver damage (high dose)', 'Allergic reaction'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Annals of Family Medicine 2013;11:452-459', 'Journal of Medicinal Food 2016;19:171-176', 'Diabetes Care 2003;26:3215-3218']),
      expectedImpact: JSON.stringify({ hba1c: -0.25, glucose: -12, timeframe: 90, confidence: 0.7 }),
      averagePrice: 22.99,
    },
    {
      name: '葫芦巴提取物',
      nameEn: 'Fenugreek Seed Extract',
      type: 'herbal',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Fenugreek Seed Extract', amount: 500, unit: 'mg' }]),
      benefits: JSON.stringify(['Lower blood sugar', 'Improve insulin function', 'Delay carbohydrate absorption', 'Lower cholesterol', 'Support breastfeeding']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Hyperglycemia', 'High Cholesterol']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in pregnancy', 'Use with caution in peanut allergy (possible cross-allergy)']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'twice_daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Gas', 'Diarrhea', 'Maple syrup odor in urine or sweat'], rare: ['Hypoglycemia', 'Allergic reaction'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['International Journal for Vitamin and Nutrition Research 2009', 'Phytotherapy Research 2014']),
      expectedImpact: JSON.stringify({ hba1c: -0.35, glucose: -18, timeframe: 90, confidence: 0.68 }),
      averagePrice: 21.99,
    },
    {
      name: '苦瓜提取物',
      nameEn: 'Bitter Melon Extract (Momordica charantia)',
      type: 'herbal',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Bitter Melon Extract', amount: 500, unit: 'mg' }]),
      benefits: JSON.stringify(['Traditional blood sugar lowering herb', 'Improve glucose utilization', 'Stimulate insulin secretion', 'Lower blood sugar']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Blood Sugar Control', 'Insulin Resistance']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in pregnant and breastfeeding women', 'May interact with blood sugar medications']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'twice_daily', timing: 'before_meal' }),
      sideEffects: JSON.stringify({ common: ['Diarrhea', 'Abdominal discomfort', 'Bitter taste'], rare: ['Hypoglycemia', 'Headache'] }),
      evidenceLevel: 'C',
      evidenceSources: JSON.stringify(['Journal of Ethnopharmacology 2011', 'Journal of Clinical and Diagnostic Research 2015']),
      expectedImpact: JSON.stringify({ hba1c: -0.3, glucose: -15, timeframe: 90, confidence: 0.58 }),
      averagePrice: 18.99,
    },
    {
      name: '人参提取物',
      nameEn: 'American Ginseng Extract',
      type: 'herbal',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'American Ginseng Extract', amount: 500, unit: 'mg' }]),
      benefits: JSON.stringify(['Lower postprandial blood sugar', 'Improve insulin sensitivity', 'Increase energy', 'Enhance immunity', 'Anti-fatigue']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Fatigue', 'Low Immunity']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in hypertension patients', 'Use with caution in insomnia patients', 'Use with caution in patients taking anticoagulants']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'twice_daily', timing: 'before_meal' }),
      sideEffects: JSON.stringify({ common: ['Insomnia', 'Headache', 'Indigestion'], rare: ['Increased heart rate', 'Elevated blood pressure'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Archives of Internal Medicine 2000;160:1009-1013', 'Nutrition, Metabolism and Cardiovascular Diseases 2014']),
      expectedImpact: JSON.stringify({ hba1c: -0.28, glucose: -13, timeframe: 90, confidence: 0.72 }),
      averagePrice: 35.99,
    },
    {
      name: '姜黄素',
      nameEn: 'Curcumin (Turmeric Extract)',
      type: 'herbal',
      category: 'Anti-inflammatory',
      activeIngredients: JSON.stringify([{ name: 'Curcumin (Standardized 95%)', amount: 500, unit: 'mg' }]),
      benefits: JSON.stringify(['Strong anti-inflammatory', 'Improve insulin sensitivity', 'Antioxidant', 'Lower inflammatory markers', 'Protect beta cells', 'Improve lipid profile']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Inflammation', 'Arthritis', 'Metabolic Syndrome']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Contraindicated in biliary obstruction', 'Use with caution in patients taking anticoagulants', 'May affect iron absorption']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'twice_daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Stomach discomfort', 'Nausea', 'Diarrhea'], rare: ['Allergic reaction', 'Liver dysfunction'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetes Care 2012;35:2121-2127', 'Evidence-Based Complementary and Alternative Medicine 2013']),
      expectedImpact: JSON.stringify({ hba1c: -0.32, glucose: -14, timeframe: 90, confidence: 0.74 }),
      averagePrice: 28.99,
    },
    {
      name: '绿茶提取物',
      nameEn: 'Green Tea Extract (EGCG)',
      type: 'herbal',
      category: 'Antioxidant',
      activeIngredients: JSON.stringify([{ name: 'EGCG', amount: 400, unit: 'mg' }]),
      benefits: JSON.stringify(['Antioxidant', 'Improve insulin sensitivity', 'Promote fat metabolism', 'Reduce inflammation', 'Protect cardiovascular system']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Obesity', 'Metabolic Syndrome', 'Hyperlipidemia']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in liver disease patients (high dose)', 'Contains caffeine, use with caution in insomnia patients']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild insomnia', 'Stomach discomfort'], rare: ['Liver damage (high dose)'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetes & Metabolism Journal 2013;37:22-29']),
      expectedImpact: JSON.stringify({ hba1c: -0.2, glucose: -9, timeframe: 90, confidence: 0.68 }),
      averagePrice: 24.99,
    },
    {
      name: '白桑叶提取物',
      nameEn: 'Mulberry Leaf Extract',
      type: 'herbal',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([{ name: 'Mulberry Leaf Extract', amount: 500, unit: 'mg' }]),
      benefits: JSON.stringify(['Inhibit alpha-glucosidase', 'Lower postprandial blood sugar', 'Improve lipid profile', 'Antioxidant']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Blood Sugar Fluctuations', 'High Cholesterol']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Use with caution in hypoglycemia patients', 'Monitor blood sugar when used with blood sugar medications']),
      dosage: JSON.stringify({ amount: 1, unit: 'capsule', frequency: 'three_times_daily', timing: 'before_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild bloating', 'Diarrhea'], rare: ['Hypoglycemia'] }),
      evidenceLevel: 'C',
      evidenceSources: JSON.stringify(['American Journal of Chinese Medicine 2012;40:163-175']),
      expectedImpact: JSON.stringify({ hba1c: -0.26, glucose: -11, timeframe: 90, confidence: 0.65 }),
      averagePrice: 26.99,
    },
    
    // ========== 复合配方 ==========
    {
      name: '糖尿病综合营养配方',
      nameEn: 'Diabetes Support Formula',
      type: 'other',
      category: 'Comprehensive Nutrition',
      activeIngredients: JSON.stringify([
        { name: 'Chromium', amount: 200, unit: 'mcg' },
        { name: 'Magnesium', amount: 200, unit: 'mg' },
        { name: 'Vitamin B6', amount: 25, unit: 'mg' },
        { name: 'Vitamin B12', amount: 500, unit: 'mcg' },
        { name: 'Vitamin C', amount: 250, unit: 'mg' },
        { name: 'Vitamin D3', amount: 1000, unit: 'IU' },
        { name: 'Zinc', amount: 15, unit: 'mg' },
        { name: 'Alpha-Lipoic Acid', amount: 100, unit: 'mg' }
      ]),
      benefits: JSON.stringify(['Comprehensive nutritional support', 'Improve blood sugar control', 'Support nerve health', 'Enhance immunity', 'Antioxidant protection', 'Cardiovascular support']),
      indications: JSON.stringify(['Type 1 Diabetes', 'Type 2 Diabetes', 'Diabetes Complication Prevention']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Consult doctor for renal insufficiency', 'Consult doctor for multiple conditions']),
      dosage: JSON.stringify({ amount: 2, unit: 'tablet', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild stomach discomfort'], rare: ['Allergic reaction'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Diabetes Care Guidelines 2024', 'Nutrition Reviews 2019']),
      expectedImpact: JSON.stringify({ hba1c: -0.45, glucose: -18, timeframe: 90, confidence: 0.78 }),
      averagePrice: 34.99,
    },
    {
      name: '血糖平衡配方',
      nameEn: 'Glucose Balance Formula',
      type: 'other',
      category: 'Blood Sugar Control',
      activeIngredients: JSON.stringify([
        { name: 'Cinnamon Extract', amount: 250, unit: 'mg' },
        { name: 'Chromium', amount: 200, unit: 'mcg' },
        { name: 'Bitter Melon Extract', amount: 250, unit: 'mg' },
        { name: 'Alpha-Lipoic Acid', amount: 200, unit: 'mg' },
        { name: 'Magnesium', amount: 200, unit: 'mg' }
      ]),
      benefits: JSON.stringify(['Synergistic blood sugar lowering effect', 'Multi-target blood sugar control', 'Improve insulin sensitivity', 'Reduce blood sugar fluctuations']),
      indications: JSON.stringify(['Type 2 Diabetes', 'Poor Blood Sugar Control', 'Postprandial Hyperglycemia']),
      suitableFor: JSON.stringify({ diabetesType: ['type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Consult doctor if taking blood sugar medications', 'Use with caution in hypoglycemia patients']),
      dosage: JSON.stringify({ amount: 2, unit: 'capsule', frequency: 'twice_daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild gastrointestinal discomfort'], rare: ['Hypoglycemia'] }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify(['Journal of Diabetes Research 2018', 'Complementary Therapies in Medicine 2016']),
      expectedImpact: JSON.stringify({ hba1c: -0.55, glucose: -22, timeframe: 90, confidence: 0.72 }),
      averagePrice: 45.99,
    },
    {
      name: '心血管保护配方',
      nameEn: 'Cardiovascular Support Formula',
      type: 'other',
      category: 'Cardiovascular Health',
      activeIngredients: JSON.stringify([
        { name: 'Omega-3', amount: 500, unit: 'mg' },
        { name: 'Coenzyme Q10', amount: 100, unit: 'mg' },
        { name: 'Vitamin E', amount: 200, unit: 'IU' },
        { name: 'Magnesium', amount: 200, unit: 'mg' },
        { name: 'Vitamin C', amount: 250, unit: 'mg' }
      ]),
      benefits: JSON.stringify(['Comprehensive cardiovascular protection', 'Lower triglycerides', 'Improve vascular function', 'Antioxidant protection', 'Lower cardiovascular risk']),
      indications: JSON.stringify(['Diabetes', 'Cardiovascular Disease', 'Hyperlipidemia', 'Hypertension']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Consult doctor if taking anticoagulants', 'Use with caution if allergic']),
      dosage: JSON.stringify({ amount: 2, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild digestive discomfort'], rare: ['Increased bleeding risk'] }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify(['Circulation 2019', 'European Heart Journal 2018']),
      expectedImpact: JSON.stringify({ hba1c: -0.22, glucose: -8, timeframe: 120, confidence: 0.82 }),
      averagePrice: 52.99,
    },
    {
      name: '神经保护配方',
      nameEn: 'Neuropathy Support Formula',
      type: 'other',
      category: 'Neuropathy Protection',
      activeIngredients: JSON.stringify([
        { name: 'Alpha-Lipoic Acid', amount: 300, unit: 'mg' },
        { name: 'Vitamin B12', amount: 1000, unit: 'mcg' },
        { name: 'Vitamin B6', amount: 25, unit: 'mg' },
        { name: 'Vitamin B1', amount: 50, unit: 'mg' },
        { name: 'Folic Acid', amount: 400, unit: 'mcg' },
        { name: 'Magnesium', amount: 200, unit: 'mg' }
      ]),
      benefits: JSON.stringify(['Prevent neuropathy', 'Improve nerve function', 'Relieve nerve pain', 'Protect nerve cells', 'Improve nerve conduction']),
      indications: JSON.stringify(['Diabetic Neuropathy', 'Peripheral Neuropathy', 'Declining Nerve Function']),
      suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'], ageMin: 18, ageMax: 80 }),
      contraindications: JSON.stringify(['Very rare, except for allergies']),
      dosage: JSON.stringify({ amount: 2, unit: 'capsule', frequency: 'daily', timing: 'with_meal' }),
      sideEffects: JSON.stringify({ common: ['Mild stomach discomfort'], rare: ['Allergic reaction'] }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify(['Journal of Diabetes Complications 2019', 'Diabetes Care 2017']),
      expectedImpact: JSON.stringify({ hba1c: -0.18, glucose: -7, timeframe: 120, confidence: 0.88 }),
      averagePrice: 48.99,
    },
  ];
  
  await prisma.supplementWatchlist.deleteMany({});
  await prisma.recommendationItem.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.supplement.deleteMany({});
  
  await prisma.supplement.createMany({ data: supplements });
  
  console.log(`  ✅ 已创建 ${supplements.length} 个补充剂`);
}

// ==================== 6. 药物数据 ====================
async function seedMedications(userId: string) {
  console.log('\n📦 6. 初始化药物数据...');
  
  const medications = [
    {
      userId,
      name: 'Metformin',
      genericName: 'Metformin',
      brand: 'Glucophage',
      dosage: '500mg',
      form: 'tablet',
      prescribedDose: 1,
      frequency: 'twice_daily',
      timings: JSON.stringify(['08:00', '20:00']),
      currentQuantity: 90,
      refillThreshold: 7,
      prescribedBy: 'Dr. Smith',
      prescriptionDate: new Date('2024-01-15'),
      validUntil: new Date('2025-01-15'),
      isActive: true,
      startDate: new Date('2024-01-15'),
      notes: 'Take with meals, may cause mild gastrointestinal reactions'
    },
    {
      userId,
      name: 'Glimepiride',
      genericName: 'Glimepiride',
      brand: 'Amaryl',
      dosage: '2mg',
      form: 'tablet',
      prescribedDose: 1,
      frequency: 'once_daily',
      timings: JSON.stringify(['08:00']),
      currentQuantity: 25,
      refillThreshold: 7,
      prescribedBy: 'Dr. Smith',
      prescriptionDate: new Date('2024-03-01'),
      validUntil: new Date('2025-03-01'),
      isActive: true,
      startDate: new Date('2024-03-01'),
      notes: 'Take before breakfast'
    }
  ];
  
  await prisma.medication.createMany({ data: medications });
  
  console.log(`  ✅ 已创建 ${medications.length} 个药物记录`);
}

// ==================== 7. 提醒数据 ====================
async function seedReminders(userId: string) {
  console.log('\n📦 7. 初始化提醒数据...');
  
  const reminders = [
    {
      userId,
      type: 'medication',
      title: 'Take Metformin',
      message: 'Remember to take your Metformin (500mg) 💊',
      priority: 'high',
      scheduleType: 'daily',
      scheduleTime: '08:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
      startDate: new Date(),
      isActive: true
    },
    {
      userId,
      type: 'medication',
      title: 'Take Metformin',
      message: 'Remember to take your evening Metformin (500mg) 💊',
      priority: 'high',
      scheduleType: 'daily',
      scheduleTime: '20:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
      startDate: new Date(),
      isActive: true
    },
    {
      userId,
      type: 'glucose_check',
      title: 'Check Blood Sugar',
      message: 'Time to check your fasting blood sugar 📊',
      priority: 'medium',
      scheduleType: 'daily',
      scheduleTime: '07:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5,6,7]),
      startDate: new Date(),
      isActive: true
    },
    {
      userId,
      type: 'exercise',
      title: 'Exercise Reminder',
      message: 'Keep up with 30 minutes of daily exercise 🏃‍♂️',
      priority: 'medium',
      scheduleType: 'daily',
      scheduleTime: '17:00',
      daysOfWeek: JSON.stringify([1,2,3,4,5]),
      startDate: new Date(),
      isActive: true
    }
  ];
  
  await prisma.reminder.createMany({ data: reminders });
  
  console.log(`  ✅ 已创建 ${reminders.length} 个提醒`);
}

// ==================== 主函数 ====================
async function main() {
  console.log('🌱 开始初始化所有种子数据...\n');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // 1. 用户
    const { demoUser } = await seedUsers();
    
    // 2. 档案
    await seedProfiles(demoUser.id);
    
    // 3. 食谱
    await seedRecipes();
    
    // 4. 产品
    await seedProducts();
    
    // 5. 补充剂
    await seedSupplements();
    
    // 6. 药物
    await seedMedications(demoUser.id);
    
    // 7. 提醒
    await seedReminders(demoUser.id);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 所有种子数据初始化完成！\n');
    
    console.log('📝 测试账号信息:');
    console.log('   普通用户: demo@example.com / Demo123456!');
    console.log('   商户账号: merchant@example.com / Merchant123456!\n');
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

