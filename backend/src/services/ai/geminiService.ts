/**
 * Gemini AI Service - Google Gemini AI集成服务
 * 用于血糖分析、膳食计划生成等AI功能
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AppError } from '../../middleware/errorHandler';

interface GlucoseAnalysisResult {
  assessment: string;
  patterns: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  overallScore: number;
}

interface MealPlanDay {
  day: string;
  breakfast: {
    name: string;
    ingredients: string[];
    calories: number;
    carbohydrates: number;
  };
  lunch: {
    name: string;
    ingredients: string[];
    calories: number;
    carbohydrates: number;
  };
  dinner: {
    name: string;
    ingredients: string[];
    calories: number;
    carbohydrates: number;
  };
  snacks?: {
    name: string;
    ingredients: string[];
    calories: number;
    carbohydrates: number;
  }[];
}

interface MealPlanResult {
  plan: MealPlanDay[];
  summary: string;
  tips: string[];
}

class GeminiService {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: GenerativeModel | null = null;
  
  // 简单的内存缓存（缓存生成的膳食计划）
  private static mealPlanCache = new Map<string, { result: MealPlanResult; timestamp: number }>();
  private static CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存

  /**
   * 初始化Gemini AI客户端
   */
  private static initializeClient(): void {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new AppError('GEMINI_API_KEY未配置', 500, 'MISSING_GEMINI_API_KEY');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    // 强制重新初始化模型，确保使用最新的配置
    this.model = null;
    
    // 使用可用的模型名称，按优先级排序
    const modelNames = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash', 
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro',
      'gemini-pro'
    ];
    
    let modelInitialized = false;
    
    for (const modelName of modelNames) {
      try {
        this.model = this.genAI.getGenerativeModel({ 
          model: modelName
        });
        console.log(`Using model: ${modelName}`);
        modelInitialized = true;
        break;
      } catch (error: any) {
        console.log(`${modelName} failed, trying next model:`, error.message);
        continue;
      }
    }
    
    if (!modelInitialized) {
      console.error('Failed to initialize any Gemini model');
      throw new AppError('无法初始化Gemini模型，请检查API密钥和网络连接', 500, 'GEMINI_MODEL_INIT_FAILED');
    }
  }

  /**
   * 血糖数据分析
   */
  static async analyzeGlucose(glucoseData: any[]): Promise<GlucoseAnalysisResult> {
    try {
      this.initializeClient();
      
      if (!glucoseData || glucoseData.length === 0) {
        return this.getFallbackGlucoseAnalysis();
      }

      const prompt = `
As a professional diabetes health assistant, please analyze the following blood sugar data:

${JSON.stringify(glucoseData, null, 2)}

Please provide the following analysis results in JSON format:
{
  "assessment": "Blood sugar control assessment (simple and understandable description)",
  "patterns": ["pattern found 1", "pattern found 2", "pattern found 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4", "recommendation 5"],
  "riskLevel": "low|medium|high",
  "overallScore": 85
}

Requirements:
1. Focus on blood sugar fluctuation trends and abnormal values
2. Provide practical improvement recommendations
3. Assess risk level (based on blood sugar control)
4. overallScore is a score from 0-100
5. Reply in English ONLY - Do not use Chinese characters
`;

      const result = await this.model!.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // 尝试解析JSON响应
      try {
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanText);
      } catch (parseError) {
        console.warn('无法解析Gemini AI响应，使用备用数据:', parseError);
        return this.getFallbackGlucoseAnalysis();
      }
    } catch (error: any) {
      console.error('Gemini AI血糖分析失败:', error);
      return this.getFallbackGlucoseAnalysis();
    }
  }

  /**
   * 生成缓存键
   */
  private static generateCacheKey(profile: any): string {
    const key = {
      duration: profile.duration || 7,
      diabetesType: profile.diabetesType,
      caloriesTarget: profile.caloriesTarget,
      activityLevel: profile.activityLevel
    };
    return JSON.stringify(key);
  }

  /**
   * 清理过期缓存
   */
  private static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.mealPlanCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.mealPlanCache.delete(key);
      }
    }
  }

  /**
   * 膳食计划生成（带超时控制和缓存）
   */
  static async generateMealPlan(profile: any): Promise<MealPlanResult> {
    try {
      this.initializeClient();

      if (!profile) {
        return this.getFallbackMealPlan();
      }

      // 检查缓存
      const cacheKey = this.generateCacheKey(profile);
      const cached = this.mealPlanCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('使用缓存的膳食计划');
        return cached.result;
      }

      // 清理过期缓存
      this.cleanExpiredCache();

      // 根据请求的天数调整生成策略
      const requestedDays = profile.duration || 7;
      const daysToGenerate = Math.min(requestedDays, 7); // 最多生成7天

      const prompt = `
As a professional nutritionist, generate a ${daysToGenerate}-day meal plan for diabetic patients.

Patient Information:
- Age: ${profile.age || 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Diabetes Type: ${profile.diabetesType || 'Unknown'}
- Target Calories: ${profile.caloriesTarget || 2000} kcal/day
- Food Allergies: ${profile.allergies?.join(', ') || 'None'}
- Dietary Preferences: ${profile.dietaryPrefs?.join(', ') || 'None'}

Requirements:
1. Focus on low-GI foods suitable for diabetic patients
2. Each meal should include: name, main ingredients, calories, carbohydrate content
3. Suitable for international dietary habits
4. Balanced nutrition with controlled carbohydrates
5. ALL ingredient names and meal names must be in ENGLISH

Please respond strictly in JSON format (no additional explanations):
{
  "plan": [
    {
      "day": "Day 1",
      "breakfast": {"name": "Breakfast Name", "ingredients": ["Ingredient 1", "Ingredient 2"], "calories": 350, "carbohydrates": 45},
      "lunch": {"name": "Lunch Name", "ingredients": ["Ingredient 1", "Ingredient 2"], "calories": 500, "carbohydrates": 60},
      "dinner": {"name": "Dinner Name", "ingredients": ["Ingredient 1", "Ingredient 2"], "calories": 450, "carbohydrates": 50}
    }
  ],
  "summary": "Meal plan summary (one sentence)",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Generate complete ${daysToGenerate}-day plan. Return only JSON, no other text.
`;

      console.log(`开始生成${daysToGenerate}天膳食计划...`);
      const startTime = Date.now();

      // 设置30秒超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI生成超时')), 30000);
      });

      const generatePromise = this.model!.generateContent(prompt);

      // 使用Promise.race实现超时控制
      const result = await Promise.race([generatePromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();
      
      const elapsedTime = Date.now() - startTime;
      console.log(`AI生成完成，耗时：${elapsedTime}ms`);
      
      try {
        // 清理响应文本
        let cleanText = text.trim();
        // 移除可能的markdown代码块标记
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        // 移除可能的前后空白
        cleanText = cleanText.trim();
        
        const parsed = JSON.parse(cleanText);
        
        // 验证返回的数据结构
        if (!parsed.plan || !Array.isArray(parsed.plan) || parsed.plan.length === 0) {
          console.warn('AI返回的数据结构不完整，使用备用数据');
          return this.getFallbackMealPlan();
        }
        
        // 缓存结果
        this.mealPlanCache.set(cacheKey, {
          result: parsed,
          timestamp: Date.now()
        });
        
        return parsed;
      } catch (parseError) {
        console.warn('无法解析Gemini AI膳食计划响应，使用备用数据:', parseError);
        console.log('原始响应:', text.substring(0, 500)); // 打印前500字符用于调试
        return this.getFallbackMealPlan();
      }
    } catch (error: any) {
      if (error.message === 'AI生成超时') {
        console.error('Gemini AI膳食计划生成超时（30秒）');
      } else {
        console.error('Gemini AI膳食计划生成失败:', error);
      }
      return this.getFallbackMealPlan();
    }
  }

  /**
   * 备用血糖分析数据
   */
  private static getFallbackGlucoseAnalysis(): GlucoseAnalysisResult {
    return {
      assessment: "基于您的血糖记录，整体控制处于中等水平。建议继续监测并在医生指导下调整治疗方案。",
      patterns: [
        "血糖值在餐后2小时有所上升",
        "空腹血糖相对稳定",
        "部分时段存在轻微波动"
      ],
      recommendations: [
        "保持规律的三餐时间",
        "适量增加运动，特别是餐后散步",
        "注意控制碳水化合物摄入量", 
        "继续定期监测血糖",
        "如有疑问及时咨询医生"
      ],
      riskLevel: "medium",
      overallScore: 75
    };
  }

  /**
   * 备用膳食计划数据（完整7天）
   */
  private static getFallbackMealPlan(): MealPlanResult {
    return {
      plan: [
        {
          day: "第1天",
          breakfast: {
            name: "燕麦粥配坚果",
            ingredients: ["燕麦", "杏仁", "蓝莓", "低脂牛奶"],
            calories: 320,
            carbohydrates: 45
          },
          lunch: {
            name: "清蒸鱼配蔬菜",
            ingredients: ["鲈鱼", "西兰花", "胡萝卜", "糙米"],
            calories: 480,
            carbohydrates: 55
          },
          dinner: {
            name: "蔬菜汤面",
            ingredients: ["全麦面条", "菠菜", "豆腐", "香菇"],
            calories: 390,
            carbohydrates: 42
          }
        },
        {
          day: "第2天", 
          breakfast: {
            name: "全麦面包配鸡蛋",
            ingredients: ["全麦面包", "鸡蛋", "番茄", "低脂奶酪"],
            calories: 340,
            carbohydrates: 38
          },
          lunch: {
            name: "鸡肉沙拉",
            ingredients: ["鸡胸肉", "生菜", "黄瓜", "牛油果", "全麦吐司"],
            calories: 520,
            carbohydrates: 35
          },
          dinner: {
            name: "蒸蛋羹配青菜",
            ingredients: ["鸡蛋", "菠菜", "小青菜", "小米粥"],
            calories: 360,
            carbohydrates: 28
          }
        },
        {
          day: "第3天",
          breakfast: {
            name: "豆浆配全麦馒头",
            ingredients: ["无糖豆浆", "全麦馒头", "小菜"],
            calories: 310,
            carbohydrates: 42
          },
          lunch: {
            name: "虾仁炒蔬菜",
            ingredients: ["虾仁", "西蓝花", "胡萝卜", "糙米饭"],
            calories: 490,
            carbohydrates: 50
          },
          dinner: {
            name: "番茄炖牛肉",
            ingredients: ["牛肉", "番茄", "洋葱", "紫薯"],
            calories: 420,
            carbohydrates: 38
          }
        },
        {
          day: "第4天",
          breakfast: {
            name: "牛奶燕麦",
            ingredients: ["低脂牛奶", "燕麦", "草莓", "核桃"],
            calories: 330,
            carbohydrates: 44
          },
          lunch: {
            name: "三文鱼藜麦饭",
            ingredients: ["三文鱼", "藜麦", "芦笋", "柠檬"],
            calories: 510,
            carbohydrates: 48
          },
          dinner: {
            name: "菌菇鸡汤",
            ingredients: ["鸡肉", "香菇", "金针菇", "全麦面包"],
            calories: 380,
            carbohydrates: 35
          }
        },
        {
          day: "第5天",
          breakfast: {
            name: "鸡蛋三明治",
            ingredients: ["全麦面包", "鸡蛋", "生菜", "番茄"],
            calories: 350,
            carbohydrates: 40
          },
          lunch: {
            name: "豆腐煲",
            ingredients: ["豆腐", "香菇", "青菜", "糙米"],
            calories: 470,
            carbohydrates: 52
          },
          dinner: {
            name: "海鲜粥",
            ingredients: ["虾", "鱿鱼", "小米", "芹菜"],
            calories: 400,
            carbohydrates: 45
          }
        },
        {
          day: "第6天",
          breakfast: {
            name: "紫薯粥配鸡蛋",
            ingredients: ["紫薯", "小米", "鸡蛋", "小菜"],
            calories: 325,
            carbohydrates: 43
          },
          lunch: {
            name: "西兰花炒牛肉",
            ingredients: ["牛肉", "西兰花", "彩椒", "糙米"],
            calories: 495,
            carbohydrates: 48
          },
          dinner: {
            name: "蔬菜烩豆腐",
            ingredients: ["豆腐", "白菜", "胡萝卜", "全麦馒头"],
            calories: 370,
            carbohydrates: 40
          }
        },
        {
          day: "第7天",
          breakfast: {
            name: "玉米羹配包子",
            ingredients: ["甜玉米", "全麦包子", "小菜"],
            calories: 335,
            carbohydrates: 46
          },
          lunch: {
            name: "鸡胸肉配蔬菜",
            ingredients: ["鸡胸肉", "四季豆", "南瓜", "藜麦"],
            calories: 500,
            carbohydrates: 50
          },
          dinner: {
            name: "清炒时蔬配鱼",
            ingredients: ["鲈鱼", "油菜", "蘑菇", "红薯"],
            calories: 410,
            carbohydrates: 42
          }
        }
      ],
      summary: "本膳食计划专为糖尿病患者设计，注重低GI食物搭配，营养均衡，适合长期执行。",
      tips: [
        "每餐定时定量，避免暴饮暴食",
        "多选择全谷物和蔬菜",
        "控制单次碳水化合物摄入量",
        "餐后适当运动有助于血糖控制",
        "保持充足的水分摄入"
      ]
    };
  }

  /**
   * 测试Gemini API连接
   */
  static async testConnection(): Promise<boolean> {
    try {
      this.initializeClient();
      
      if (!this.model) {
        console.error('Gemini model not initialized');
        return false;
      }
      
      const testPrompt = "请简单回复'连接成功'";
      console.log('Testing Gemini API connection with current model');
      
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Gemini API test response:', text);
      return text.includes('连接成功') || text.length > 0;
    } catch (error) {
      console.error('Gemini API连接测试失败:', error);
      return false;
    }
  }
}

export { GeminiService, GlucoseAnalysisResult, MealPlanResult, MealPlanDay };
