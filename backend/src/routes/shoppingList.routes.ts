import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// 购物清单项接口
interface ShoppingItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  suggestedVendor?: {
    vendorName: string;
    price: number;
    productUrl?: string;
  };
}

// 创建空的购物清单
const createSchema = z.object({
  name: z.string().optional(),
  items: z.array(z.any()).optional()
});

router.post('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const data = createSchema.parse(req.body);

  const name = data.name || 'Shopping List';
  const items = data.items || [];

  // 计算预估成本
  const estimatedCost = items.reduce((sum: number, item: any) => {
    if (item.suggestedVendor && item.quantity) {
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
      const price = Number(item.suggestedVendor.price) || 0;
      if (!isNaN(quantity) && !isNaN(price)) {
        return sum + (price * quantity);
      }
    }
    return sum;
  }, 0);

  const shoppingList = await prisma.shoppingList.create({
    data: {
      userId,
      name,
      items: JSON.stringify(items),
      estimatedCost,
      currency: 'AUD',
      status: 'active'
    }
  });

  console.log(`✅ Shopping list created successfully: ${name} (contains ${items.length} items)`);

  res.status(201).json({
    success: true,
    data: {
      ...shoppingList,
      items
    }
  });
});

// 从膳食计划生成购物清单
router.post('/generate-from-meal-plan/:mealPlanId', async (req: AuthRequest, res) => {
  const { mealPlanId } = req.params;
  const userId = req.user!.userId;

  // 1. 获取膳食计划
  const mealPlan = await prisma.mealPlan.findFirst({
    where: {
      id: mealPlanId,
      userId
    }
  });

  if (!mealPlan) {
    throw new AppError('Meal plan not found', 404, 'MEAL_PLAN_NOT_FOUND');
  }

  // 2. Parse meals data from meal plan
  const meals = JSON.parse(mealPlan.meals as string);
  
  // 3. Aggregate all ingredients
  const ingredientMap = new Map<string, ShoppingItem>();
  
  // Handle two data formats:
  // Format 1: AI generated format { aiGenerated: true, plan: [{day, breakfast, lunch, dinner}], ... }
  // Format 2: Traditional format { day1: {breakfast, lunch, dinner}, day2: {...}, ... }
  let daysData: any[];
  
  if (meals.plan && Array.isArray(meals.plan)) {
    // AI generated format
    daysData = meals.plan;
    console.log(`📋 Detected AI-generated meal plan format with ${daysData.length} days`);
  } else if (Array.isArray(meals)) {
    // Direct array
    daysData = meals;
  } else {
    // Object format, convert to array
    daysData = Object.values(meals);
  }
  
  daysData.forEach((day: any, dayIndex: number) => {
    // Direct access to day.breakfast, day.lunch, etc.
    const dayMeals = day;
    
    // Iterate through breakfast, lunch, dinner, snacks for each day
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
      const meal = dayMeals[mealType];
      if (meal) {
        // snacks is array, others are single meal objects
        const mealsArray = Array.isArray(meal) ? meal : [meal];
        
        mealsArray.forEach((recipe: any) => {
          if (recipe && recipe.ingredients) {
            // ingredients might be JSON string, need to parse
            let ingredients = typeof recipe.ingredients === 'string' 
              ? JSON.parse(recipe.ingredients) 
              : recipe.ingredients;
            
            if (Array.isArray(ingredients)) {
              ingredients.forEach((ing: any) => {
                // Handle two formats:
                // 1. AI generated format: string array ["Oats", "Almonds"]
                // 2. Traditional format: object array [{name: "Oats", quantity: 100, unit: "g"}]
                
                let name: string;
                let quantity: number;
                let unit: string;
                
                if (typeof ing === 'string') {
                  // AI生成的格式：纯字符串
                  name = ing;
                  quantity = 1; // 默认数量
                  unit = 'serving'; // Default unit
                } else if (typeof ing === 'object' && ing.name) {
                  // 传统格式：对象
                  name = ing.name;
                  quantity = ing.quantity || 1;
                  unit = ing.unit || 'serving';
                } else {
                  // 无法识别的格式，跳过
                  return;
                }
                
                const key = `${name}_${unit}`;
                const existing = ingredientMap.get(key);
                
                if (existing) {
                  existing.quantity += quantity;
                } else {
                  ingredientMap.set(key, {
                    ingredientId: `ing_${Date.now()}_${Math.random()}`,
                    name,
                    quantity,
                    unit,
                    category: categorizeIngredient(name),
                    checked: false
                  });
                }
              });
            }
          }
        });
      }
    });
  });

  const items = Array.from(ingredientMap.values());
  
  // Debug info: check extracted ingredients
  console.log(`📋 Extracted ${items.length} ingredients from meal plan`);
  if (items.length === 0) {
    console.warn('⚠️  Warning: No ingredients extracted from meal plan');
    console.log('Meal plan data structure:', JSON.stringify(meals, null, 2).substring(0, 500));
  } else {
    console.log(`📦 Ingredient examples: ${items.slice(0, 3).map(i => i.name).join(', ')}...`);
  }

  // 4. Try to add price information (query from products table)
  const itemsWithPrices = await Promise.all(
    items.map(async (item) => {
      try {
        const product = await prisma.product.findFirst({
          where: {
            name: {
              contains: item.name
            },
            inStock: true
          },
          orderBy: {
            price: 'asc' // 选择最便宜的
          }
        });

        if (product) {
          return {
            ...item,
            suggestedVendor: {
              vendorName: product.vendor,
              price: product.price,
              productUrl: product.imageUrl || undefined
            }
          };
        }
        
        // 如果没有找到产品，使用默认估算价格
        const estimatedPrice = estimateIngredientPrice(item.name, item.category);
        return {
          ...item,
          suggestedVendor: {
            vendorName: 'Estimated Price',
            price: estimatedPrice,
            productUrl: undefined
          }
        };
      } catch (error) {
        console.error(`Error finding product for ${item.name}:`, error);
        // 出错时也提供估算价格
        const estimatedPrice = estimateIngredientPrice(item.name, item.category);
        return {
          ...item,
          suggestedVendor: {
            vendorName: 'Estimated Price',
            price: estimatedPrice,
            productUrl: undefined
          }
        };
      }
    })
  );

  // 5. 计算预估成本
  const estimatedCost = itemsWithPrices.reduce((sum, item) => {
    if (item.suggestedVendor && item.quantity) {
      // 确保quantity是数字类型
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
      const price = Number(item.suggestedVendor.price) || 0;
      if (!isNaN(quantity) && !isNaN(price)) {
        return sum + (price * quantity);
      }
    }
    return sum;
  }, 0);

  // 6. 创建购物清单
  // 生成购物清单名称
  const planDate = new Date(mealPlan.planDate);
  const formattedDate = planDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const listName = `${formattedDate} ${mealPlan.duration}-day Meal Plan - Shopping List`;
  
  const shoppingList = await prisma.shoppingList.create({
    data: {
      userId,
      mealPlanId,
      name: listName,
      items: JSON.stringify(itemsWithPrices),
      estimatedCost: estimatedCost,
      currency: 'AUD',
      status: 'active'
    }
  });

  // Count price sources
  const withActualPrice = itemsWithPrices.filter(i => i.suggestedVendor && i.suggestedVendor.vendorName !== 'Estimated Price').length;
  const withEstimatedPrice = itemsWithPrices.filter(i => i.suggestedVendor && i.suggestedVendor.vendorName === 'Estimated Price').length;
  
  console.log(`✅ Shopping list created successfully: ${listName}`);
  console.log(`   - Total items: ${itemsWithPrices.length}`);
  console.log(`   - Actual prices: ${withActualPrice} items`);
  console.log(`   - Estimated prices: ${withEstimatedPrice} items`);
  console.log(`   - Estimated total: $${estimatedCost.toFixed(2)} AUD`);
  
  res.status(201).json({
    success: true,
    data: {
      ...shoppingList,
      items: itemsWithPrices
    },
    message: itemsWithPrices.length > 0 
      ? `Shopping list generated with ${itemsWithPrices.length} ingredients (${withActualPrice} actual prices, ${withEstimatedPrice} estimated prices)`
      : 'Shopping list created, but no ingredient information found in meal plan'
  });
});

// Get all shopping lists for user
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { status } = req.query;

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const shoppingLists = await prisma.shoppingList.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    }
  });

  const listsWithParsedItems = shoppingLists.map(list => ({
    ...list,
    items: JSON.parse(list.items)
  }));

  res.json({
    success: true,
    data: listsWithParsedItems
  });
});

// 获取单个购物清单
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const shoppingList = await prisma.shoppingList.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!shoppingList) {
    throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      ...shoppingList,
      items: JSON.parse(shoppingList.items)
    }
  });
});

// 更新购物清单
const updateSchema = z.object({
  name: z.string().optional(),
  items: z.array(z.any()).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional()
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const data = updateSchema.parse(req.body);

  const existing = await prisma.shoppingList.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
  }

  // 如果更新了items，重新计算成本
  let estimatedCost = existing.estimatedCost;
  if (data.items) {
    estimatedCost = data.items.reduce((sum: number, item: any) => {
      if (item.suggestedVendor) {
        return sum + (item.suggestedVendor.price * item.quantity);
      }
      return sum;
    }, 0);
  }

  const updated = await prisma.shoppingList.update({
    where: { id },
    data: {
      ...data,
      items: data.items ? JSON.stringify(data.items) : undefined,
      estimatedCost: data.items ? estimatedCost : undefined
    }
  });

  res.json({
    success: true,
    data: {
      ...updated,
      items: JSON.parse(updated.items)
    }
  });
});

// 删除购物清单
router.delete('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const existing = await prisma.shoppingList.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
  }

  await prisma.shoppingList.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Shopping list deleted'
  });
});

// Mark list item as purchased/unpurchased
router.post('/:id/toggle-item', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { ingredientId } = z.object({
    ingredientId: z.string()
  }).parse(req.body);
  
  const userId = req.user!.userId;

  const shoppingList = await prisma.shoppingList.findFirst({
    where: { id, userId }
  });

  if (!shoppingList) {
    throw new AppError('Shopping list not found', 404, 'SHOPPING_LIST_NOT_FOUND');
  }

  const items: ShoppingItem[] = JSON.parse(shoppingList.items);
  const item = items.find(i => i.ingredientId === ingredientId);
  
  if (item) {
    item.checked = !item.checked;
    
    await prisma.shoppingList.update({
      where: { id },
      data: {
        items: JSON.stringify(items)
      }
    });
  }

  res.json({
    success: true,
    data: {
      ...shoppingList,
      items
    }
  });
});

// Helper function: ingredient categorization
function categorizeIngredient(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('chicken') || lowerName.includes('meat') || lowerName.includes('fish') || 
      lowerName.includes('shrimp') || lowerName.includes('beef') || lowerName.includes('pork') ||
      lowerName.includes('鸡') || lowerName.includes('肉') || lowerName.includes('鱼') || 
      lowerName.includes('虾') || lowerName.includes('牛') || lowerName.includes('猪')) {
    return 'Meat/Seafood';
  }
  
  if (lowerName.includes('vegetable') || lowerName.includes('broccoli') || lowerName.includes('carrot') ||
      lowerName.includes('菜') || lowerName.includes('瓜') || lowerName.includes('芹') ||
      lowerName.includes('笋') || lowerName.includes('菇') || lowerName.includes('豆')) {
    return 'Vegetables';
  }
  
  if (lowerName.includes('fruit') || lowerName.includes('berry') || lowerName.includes('apple') ||
      lowerName.includes('orange') || lowerName.includes('pear') ||
      lowerName.includes('果') || lowerName.includes('莓') || lowerName.includes('桃') ||
      lowerName.includes('橙') || lowerName.includes('梨')) {
    return 'Fruits';
  }
  
  if (lowerName.includes('rice') || lowerName.includes('noodle') || lowerName.includes('wheat') ||
      lowerName.includes('flour') || lowerName.includes('oats') ||
      lowerName.includes('米') || lowerName.includes('面') || lowerName.includes('麦') ||
      lowerName.includes('粉')) {
    return 'Grains/Cereals';
  }
  
  if (lowerName.includes('milk') || lowerName.includes('egg') || lowerName.includes('cheese') ||
      lowerName.includes('yogurt') ||
      lowerName.includes('奶') || lowerName.includes('蛋') || lowerName.includes('酪') ||
      lowerName.includes('酸奶')) {
    return 'Dairy/Eggs';
  }
  
  if (lowerName.includes('oil') || lowerName.includes('salt') || lowerName.includes('sugar') ||
      lowerName.includes('sauce') || lowerName.includes('vinegar') || lowerName.includes('spice') ||
      lowerName.includes('油') || lowerName.includes('盐') || lowerName.includes('糖') ||
      lowerName.includes('酱') || lowerName.includes('醋') || lowerName.includes('料')) {
    return 'Seasonings';
  }
  
  return 'Other';
}

// Helper function: estimate ingredient price (based on category)
function estimateIngredientPrice(name: string, category: string): number {
  const lowerName = name.toLowerCase();
  
  // Estimate price based on ingredient category and name (AUD, per serving)
  switch (category) {
    case 'Meat/Seafood':
      if (lowerName.includes('salmon') || lowerName.includes('shrimp') || lowerName.includes('seafood') ||
          lowerName.includes('三文鱼') || lowerName.includes('虾') || lowerName.includes('海鲜')) {
        return 12.50; // Seafood is more expensive
      }
      if (lowerName.includes('beef') || lowerName.includes('牛肉')) {
        return 10.00;
      }
      if (lowerName.includes('chicken') || lowerName.includes('pork') ||
          lowerName.includes('鸡') || lowerName.includes('猪')) {
        return 7.50;
      }
      return 8.00; // Default meat price
    
    case 'Vegetables':
      if (lowerName.includes('broccoli') || lowerName.includes('asparagus') ||
          lowerName.includes('西兰花') || lowerName.includes('芦笋')) {
        return 4.50;
      }
      if (lowerName.includes('mushroom') || lowerName.includes('菇') || lowerName.includes('菌')) {
        return 5.00;
      }
      return 3.50; // Regular vegetables
    
    case 'Fruits':
      if (lowerName.includes('berry') || lowerName.includes('莓')) {
        return 6.00; // Berries are more expensive
      }
      if (lowerName.includes('avocado') || lowerName.includes('牛油果')) {
        return 5.50;
      }
      return 4.00; // Regular fruits
    
    case 'Grains/Cereals':
      if (lowerName.includes('quinoa') || lowerName.includes('藜麦')) {
        return 8.00;
      }
      if (lowerName.includes('oats') || lowerName.includes('wheat') ||
          lowerName.includes('燕麦') || lowerName.includes('全麦')) {
        return 5.00;
      }
      if (lowerName.includes('rice') || lowerName.includes('noodle') ||
          lowerName.includes('米') || lowerName.includes('面')) {
        return 3.00;
      }
      return 4.00; // Default grain price
    
    case 'Dairy/Eggs':
      if (lowerName.includes('cheese') || lowerName.includes('奶酪') || lowerName.includes('酪')) {
        return 6.00;
      }
      if (lowerName.includes('milk') || lowerName.includes('yogurt') ||
          lowerName.includes('牛奶') || lowerName.includes('酸奶')) {
        return 3.50;
      }
      if (lowerName.includes('egg') || lowerName.includes('蛋')) {
        return 2.50;
      }
      return 4.00; // Default dairy price
    
    case 'Seasonings':
      return 2.50; // Seasonings are generally cheaper
    
    default:
      return 4.50; // Default price
  }
}

export default router;

