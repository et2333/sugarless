/**
 * DietAgent - Intelligent Diet Planning
 * From Report: UC-A2.1 Generate Diet Plan for Patient
 * Implements A2 Intelligent Diet module
 */

import { BaseAgent, AgentContext, AgentResponse } from './core/BaseAgent';
import { Tool } from '@langchain/core/tools';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import prisma from '../utils/prisma';

interface DietPlanRequest {
  duration: number; // days
  caloriesTarget: number;
  dietaryRestrictions?: string[];
  preferences?: string[];
  mealTypes?: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
}

interface MealPlan {
  day: number;
  meals: {
    type: string;
    name: string;
    recipes: Array<{
      name: string;
      ingredients: string[];
      nutrition: {
        calories: number;
        carbs: number;
        protein: number;
        fat: number;
        fiber: number;
      };
      prepTime: number;
      servings: number;
    }>;
    totalNutrition: any;
  }[];
}

export class DietAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context);
    this.initializeTools();
  }

  private initializeTools() {
    this.tools = [
      new Tool({
        name: 'get_user_profile',
        description: 'Get user health profile including diabetes type and dietary restrictions',
        func: async () => {
          const profile = await this.getUserProfile();
          return JSON.stringify(profile);
        },
      }),
      
      new Tool({
        name: 'search_recipes',
        description: 'Search for diabetes-friendly recipes based on criteria',
        func: async (input: string) => {
          const criteria = JSON.parse(input);
          const recipes = await prisma.recipe.findMany({
            where: {
              category: criteria.category,
              diabetesTypes: {
                contains: criteria.diabetesType,
              },
            },
            take: 20,
          });
          return JSON.stringify(recipes);
        },
      }),

      new Tool({
        name: 'calculate_nutrition',
        description: 'Calculate nutritional values for meal combinations',
        func: async (input: string) => {
          const meals = JSON.parse(input);
          // Simple nutrition calculation logic
          const total = meals.reduce((acc: any, meal: any) => ({
            calories: acc.calories + (meal.nutrition?.calories || 0),
            carbs: acc.carbs + (meal.nutrition?.carbs || 0),
            protein: acc.protein + (meal.nutrition?.protein || 0),
            fat: acc.fat + (meal.nutrition?.fat || 0),
            fiber: acc.fiber + (meal.nutrition?.fiber || 0),
          }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 });
          
          return JSON.stringify(total);
        },
      }),

      new Tool({
        name: 'save_meal_plan',
        description: 'Save generated meal plan to database',
        func: async (input: string) => {
          const mealPlan = JSON.parse(input);
          const saved = await prisma.mealPlan.create({
            data: {
              userId: this.context.userId,
              planDate: new Date(),
              duration: mealPlan.duration,
              meals: JSON.stringify(mealPlan.meals),
              caloriesTarget: mealPlan.caloriesTarget,
              carbsMin: mealPlan.nutritionTargets?.carbsMin || 130,
              carbsMax: mealPlan.nutritionTargets?.carbsMax || 200,
              proteinMin: mealPlan.nutritionTargets?.proteinMin || 60,
              proteinMax: mealPlan.nutritionTargets?.proteinMax || 120,
              generatedBy: 'diet_agent',
            },
          });
          return JSON.stringify(saved);
        },
      }),
    ];
  }

  async execute(input: DietPlanRequest): Promise<AgentResponse> {
    try {
      await this.logActivity('diet_plan_generation_start', input);

      // 1. Perception - analyze user needs
      const perception = await this.perceive();
      
      // 2. Task decomposition
      const subtasks = await this.decomposeTask('Generate personalized diet plan');
      
      // 3. Get user profile
      const profile = await this.callTool('get_user_profile', '');
      const userProfile = JSON.parse(profile);

      // 4. Generate meal plan using LLM
      const mealPlan = await this.generateMealPlan(input, userProfile);
      
      // 5. Validate and save
      const validation = await this.validateMealPlan(mealPlan, input);
      if (!validation.isValid) {
        throw new Error(`Meal plan validation failed: ${validation.errors.join(', ')}`);
      }

      const saved = await this.callTool('save_meal_plan', JSON.stringify(mealPlan));
      
      // 6. Generate shopping list
      const shoppingList = await this.generateShoppingList(mealPlan);
      
      // 7. Reflection
      await this.reflect('meal_plan_generation', { 
        input, 
        output: mealPlan, 
        shoppingList 
      });

      await this.logActivity('diet_plan_generation_complete', { mealPlan, shoppingList });

      return {
        success: true,
        data: {
          mealPlan: JSON.parse(saved),
          shoppingList,
          nutritionSummary: mealPlan.nutritionSummary,
        },
        message: 'Personalized diet plan generated successfully',
        confidence: 0.9,
        nextActions: ['create_shopping_list', 'set_reminders', 'track_progress'],
      };

    } catch (error: any) {
      await this.logActivity('diet_plan_generation_error', { error: error.message });
      
      return {
        success: false,
        message: `Diet plan generation failed: ${error.message}`,
        confidence: 0.0,
      };
    }
  }

  private async generateMealPlan(request: DietPlanRequest, profile: any): Promise<any> {
    const dietPrompt = new PromptTemplate({
      template: `
        You are a specialized AI nutritionist for diabetes patients.
        
        User Profile:
        - Diabetes Type: {diabetesType}
        - Allergies: {allergies}
        - Dietary Preferences: {preferences}
        - Activity Level: {activityLevel}
        - Current HbA1c: {hba1c}
        
        Requirements:
        - Duration: {duration} days
        - Target Calories: {caloriesTarget} per day
        - Dietary Restrictions: {restrictions}
        
        Generate a detailed meal plan that:
        1. Is diabetes-friendly and considers blood sugar control
        2. Includes variety and balanced nutrition
        3. Respects dietary restrictions and preferences
        4. Provides clear nutritional information
        5. Includes prep time and serving sizes
        
        Format as JSON with this structure:
        {{
          "duration": {duration},
          "caloriesTarget": {caloriesTarget},
          "nutritionTargets": {{
            "carbsMin": 130,
            "carbsMax": 200,
            "proteinMin": 60,
            "proteinMax": 120,
            "fiberMin": 25
          }},
          "meals": [
            {{
              "day": 1,
              "meals": [
                {{
                  "type": "breakfast",
                  "name": "Diabetes-Friendly Oatmeal",
                  "recipes": [
                    {{
                      "name": "Steel-cut Oats with Berries",
                      "ingredients": ["steel-cut oats", "blueberries", "almonds", "cinnamon"],
                      "nutrition": {{
                        "calories": 320,
                        "carbs": 45,
                        "protein": 12,
                        "fat": 8,
                        "fiber": 8
                      }},
                      "prepTime": 15,
                      "servings": 1
                    }}
                  ],
                  "totalNutrition": {{
                    "calories": 320,
                    "carbs": 45,
                    "protein": 12,
                    "fat": 8,
                    "fiber": 8
                  }}
                }}
              ]
            }}
          ]
        }}
        `,
      inputVariables: [
        'diabetesType', 'allergies', 'preferences', 'activityLevel', 'hba1c',
        'duration', 'caloriesTarget', 'restrictions'
      ],
    });

    const chain = new LLMChain({
      llm: this.llm,
      prompt: dietPrompt,
    });

    const response = await chain.call({
      diabetesType: profile?.diabetesType || 'type_2',
      allergies: profile?.allergies || '[]',
      preferences: profile?.dietaryPrefs || '[]',
      activityLevel: profile?.activityLevel || 'moderate',
      hba1c: profile?.hba1c || '7.0',
      duration: request.duration,
      caloriesTarget: request.caloriesTarget,
      restrictions: JSON.stringify(request.dietaryRestrictions || []),
    });

    return JSON.parse(response.text);
  }

  private async validateMealPlan(mealPlan: any, request: DietPlanRequest): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    // Check calories target
    if (mealPlan.caloriesTarget !== request.caloriesTarget) {
      errors.push('Calories target mismatch');
    }

    // Check duration
    if (mealPlan.duration !== request.duration) {
      errors.push('Duration mismatch');
    }

    // Check meal structure
    if (!mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      errors.push('Invalid meals structure');
    }

    // Validate nutrition targets
    if (!mealPlan.nutritionTargets) {
      errors.push('Missing nutrition targets');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async generateShoppingList(mealPlan: any): Promise<any> {
    const ingredients = new Map<string, number>();
    
    mealPlan.meals.forEach((day: any) => {
      day.meals.forEach((meal: any) => {
        meal.recipes.forEach((recipe: any) => {
          recipe.ingredients.forEach((ingredient: string) => {
            ingredients.set(ingredient, (ingredients.get(ingredient) || 0) + 1);
          });
        });
      });
    });

    const shoppingItems = Array.from(ingredients.entries()).map(([ingredient, count]) => ({
      name: ingredient,
      quantity: count,
      category: this.categorizeIngredient(ingredient),
      estimated: true,
    }));

    // Save shopping list
    const shoppingList = await prisma.shoppingList.create({
      data: {
        userId: this.context.userId,
        name: `Meal Plan Shopping List - ${mealPlan.duration} days`,
        items: JSON.stringify(shoppingItems),
        estimatedCost: shoppingItems.length * 5, // Rough estimate
        currency: 'AUD',
      },
    });

    return shoppingList;
  }

  private categorizeIngredient(ingredient: string): string {
    const categories: {[key: string]: string} = {
      'oats': 'grains',
      'rice': 'grains',
      'bread': 'grains',
      'chicken': 'protein',
      'fish': 'protein',
      'beans': 'protein',
      'vegetables': 'vegetables',
      'fruits': 'fruits',
      'dairy': 'dairy',
    };

    for (const [key, category] of Object.entries(categories)) {
      if (ingredient.toLowerCase().includes(key)) {
        return category;
      }
    }
    return 'other';
  }
}
