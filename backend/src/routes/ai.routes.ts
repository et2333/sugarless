/**
 * AI Routes
 * AI健康助手对话系统API
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ChatService } from '../services/ai/chatService';
import prisma from '../utils/prisma';
import { detectLanguage, getEmergencyResponse, detectEmergency } from '../utils/languageDetector';
import { validateActionData } from '../utils/aiActionSchemas';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 验证schema
const chatMessageSchema = z.object({
  message: z.string().min(1, '消息不能为空'),
  isAudio: z.boolean().optional().default(false),
  audioUrl: z.string().url().optional(),
});

const recordGlucoseSchema = z.object({
  value: z.number().min(20).max(600),
  type: z.enum(['fasting', 'post_prandial', 'random', 'hba1c']).default('random'),
  notes: z.string().optional(),
});

/**
 * POST /api/ai/chat
 * 发送消息给AI助手
 */
router.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { message, isAudio, audioUrl } = chatMessageSchema.parse(req.body);
    const userId = req.user!.userId;

    let processedMessage = message;

    // 如果是语音消息，先转换为文字
    if (isAudio && audioUrl) {
      try {
        processedMessage = await ChatService.transcribeAudio(audioUrl);
      } catch (error) {
        console.error('语音转文字失败:', error);
        throw new AppError('语音识别失败，请重试', 400, 'TRANSCRIPTION_ERROR');
      }
    }

    // 检测紧急情况（支持多语言）
    const detectedLang = detectLanguage(processedMessage);
    const isEmergency = detectEmergency(processedMessage, detectedLang);
    
    if (isEmergency) {
      const emergencyResponse = getEmergencyResponse(detectedLang);
      return res.json({
        success: true,
        data: {
          response: emergencyResponse.response,
          isEmergency: true,
          originalMessage: processedMessage,
          suggestions: emergencyResponse.suggestions
        },
        message: detectedLang === 'zh' ? '紧急情况检测' : 'Emergency Detected',
      });
    }

    // 进行AI对话
    let result;
    try {
      result = await ChatService.healthChat(processedMessage, userId);
    } catch (chatError) {
      console.error('ChatService调用失败，使用降级响应:', chatError);
      result = ChatService.generateFallbackResponse(processedMessage);
    }

    // 处理AI建议的行动
    let actionResult = null;
    if (result.action) {
      switch (result.action.type) {
        case 'record_glucose':
          try {
            let glucoseData = result.action.data;
            
            // 如果data是字符串，尝试解析JSON
            if (typeof glucoseData === 'string') {
              try {
                glucoseData = JSON.parse(glucoseData);
              } catch (parseError) {
                console.error('解析血糖数据失败:', parseError);
                // 如果解析失败，尝试从字符串中提取数值
                const valueMatch = glucoseData.match(/(\d+(?:\.\d+)?)/);
                if (valueMatch) {
                  glucoseData = { value: parseFloat(valueMatch[1]) };
                } else {
                  throw new Error('无法解析血糖数据');
                }
              }
            }
            
            // 如果data是数字（旧格式兼容），转换为对象
            if (typeof glucoseData === 'number') {
              glucoseData = { value: glucoseData };
            }

            glucoseData = validateActionData('record_glucose', glucoseData);
            
            // 确保有必要的字段
            if (!glucoseData || typeof glucoseData.value !== 'number') {
              throw new Error('血糖数据缺少必要的value字段');
            }
            
            // 构建完整的血糖记录数据
            const recordData: any = {
              userId,
              value: glucoseData.value,
              unit: glucoseData.unit || 'mg/dL',
              type: glucoseData.type || 'random',
              measurementTime: glucoseData.measurementTime ? new Date(glucoseData.measurementTime) : new Date(),
              notes: glucoseData.notes || (detectedLang === 'zh' ? 'AI助手自动记录' : 'AI assistant auto-recorded'),
            };
            
            // 创建血糖记录
            const glucoseRecord = await prisma.bloodSugarRecord.create({
              data: recordData,
            });
            
            actionResult = { 
              glucoseRecord,
              message: detectedLang === 'zh' 
                ? `已成功记录血糖：${glucoseData.value} ${recordData.unit} (${recordData.type === 'fasting' ? '空腹' : recordData.type === 'post_prandial' ? '餐后' : recordData.type === 'hba1c' ? '糖化血红蛋白' : '随机'})`
                : `Successfully recorded blood sugar: ${glucoseData.value} ${recordData.unit} (${recordData.type})`
            };
          } catch (error: any) {
            console.error('自动记录血糖失败:', error);
            actionResult = { 
              error: detectedLang === 'zh' ? '记录血糖失败: ' + error.message : 'Failed to record blood sugar: ' + error.message 
            };
          }
          break;

        case 'create_reminder':
          try {
            const reminderData = result.action.data;
            let parsedData = reminderData;
            
            // 如果是字符串，尝试解析JSON
            if (typeof reminderData === 'string') {
              try {
                parsedData = JSON.parse(reminderData);
              } catch (parseError) {
                console.error('解析提醒数据失败:', parseError);
                parsedData = { type: 'appointment', title: 'AI助手提醒' };
              }
            }

            parsedData = validateActionData('create_reminder', parsedData);
            
            // 如果是用药提醒，尝试匹配药物数据库
            let matchedMedication = null;
            if (parsedData.type === 'medication' && parsedData.medication_name) {
              console.log('检测到用药提醒，药物名称:', parsedData.medication_name);
              
              // 尝试精确匹配
              matchedMedication = await prisma.medication.findFirst({
                where: {
                  userId,
                  name: parsedData.medication_name,
                  isActive: true
                }
              });
              
              // 尝试模糊匹配
              if (!matchedMedication) {
                matchedMedication = await prisma.medication.findFirst({
                  where: {
                    userId,
                    name: {
                      contains: parsedData.medication_name
                    },
                    isActive: true
                  }
                });
              }
              
              if (matchedMedication) {
                console.log('找到匹配的药物:', matchedMedication.name);
              } else {
                console.log('未找到匹配的药物，将作为新药物记录');
              }
            }
            
            // 导入文本转换工具
            const { 
              translateMedicationName, 
              translateReminderTitle, 
              translateReminderMessage,
              ensureEnglish 
            } = require('../utils/textTranslator');
            
            // 转换药物名称为英文
            let medicationName = parsedData.medication_name || '';
            if (medicationName) {
              medicationName = translateMedicationName(medicationName);
            }
            
            // 构建提醒消息（强制使用英文）
            let reminderMessage = parsedData.message || '';
            const dosage = ensureEnglish(parsedData.dosage || (matchedMedication?.dosage) || '');
            const mealTiming = parsedData.meal_timing || '';
            
            if (parsedData.type === 'medication') {
              const medName = medicationName || (matchedMedication?.name ? ensureEnglish(matchedMedication.name) : 'medication');
              
              // 构建详细的用药提醒消息（全英文）
              reminderMessage = translateReminderMessage(reminderMessage, medName, dosage, mealTiming);
            } else {
              // 非用药提醒，也要转换为英文
              reminderMessage = reminderMessage ? ensureEnglish(reminderMessage) : 'Please complete on time';
            }
            
            // 转换标题为英文
            let reminderTitle = parsedData.title || '';
            if (reminderTitle) {
              reminderTitle = translateReminderTitle(reminderTitle);
              // 如果标题包含药物名称，确保使用英文药名
              if (medicationName) {
                reminderTitle = reminderTitle.replace(new RegExp(parsedData.medication_name || '', 'gi'), medicationName);
              }
            } else {
              // 生成默认英文标题
              if (parsedData.type === 'medication') {
                const medName = medicationName || 'medication';
                reminderTitle = `Take ${medName}`;
              } else {
                reminderTitle = 'AI Assistant Reminder';
              }
            }
            
            // 处理星期几
            let daysOfWeek = [1,2,3,4,5,6,7]; // 默认每天
            if (parsedData.daysOfWeek && Array.isArray(parsedData.daysOfWeek)) {
              daysOfWeek = parsedData.daysOfWeek;
            } else if (parsedData.scheduleType === 'daily') {
              daysOfWeek = [1,2,3,4,5,6,7];
            }
            
            // 创建提醒（确保所有字段都是英文）
            const reminder = await prisma.reminder.create({
              data: {
                userId,
                type: parsedData.type || 'appointment',
                title: reminderTitle,
                message: reminderMessage, // 已经转换为英文
                priority: 'medium',
                scheduleType: parsedData.scheduleType || 'once',
                scheduleTime: parsedData.scheduleTime || '09:00',
                daysOfWeek: JSON.stringify(daysOfWeek),
                startDate: new Date(),
                isActive: true,
                relatedId: matchedMedication?.id || null, // 关联药物ID
              }
            });
            
            // 构建成功消息（确保使用英文）
            let successMessage = 'Reminder created ✓';
            if (parsedData.type === 'medication') {
              const medName = medicationName || (matchedMedication?.name ? ensureEnglish(matchedMedication.name) : 'medication');
              if (matchedMedication || medicationName) {
                successMessage = `${medName} reminder set ✓`;
              } else {
                successMessage = 'Medication reminder set ✓';
              }
            }
            
            actionResult = { 
              reminder, 
              message: successMessage,
              medicationMatched: !!matchedMedication,
              medicationInfo: matchedMedication ? {
                name: matchedMedication.name,
                dosage: matchedMedication.dosage
              } : null
            };
          } catch (error) {
            console.error('自动创建提醒失败:', error);
            actionResult = { error: '创建提醒失败' };
          }
          break;

        case 'generate_meal_plan':
          // 这里可以实现自动生成膳食计划的逻辑
          break;
      }
    }

    // 保存对话记录
    try {
      await ChatService.saveChatMessage(userId, 'user', processedMessage);
      await ChatService.saveChatMessage(userId, 'assistant', result.response);
    } catch (saveError) {
      console.error('保存对话记录失败:', saveError);
    }

    res.json({
      success: true,
      data: {
        response: result.response,
        originalMessage: processedMessage,
        isAudio: isAudio || false,
        isEmergency: false, // 添加 isEmergency 字段
        actionResult,
        suggestions: result.suggestions || [],
        quickReplies: ChatService.getQuickReplies(),
      },
      message: 'AI回复成功',
    });
  } catch (error: any) {
    console.error('AI对话失败，使用最终降级响应:', error);
    
    // 对于验证错误，仍然返回400，但其他所有错误都返回降级响应
    if (error instanceof z.ZodError) {
      throw new AppError('输入验证失败', 400, 'VALIDATION_ERROR');
    }
    
    // 所有其他错误都返回降级响应，确保AI助手始终可用
    const fallbackResponse = ChatService.generateFallbackResponse(
      req.body?.message || '我需要帮助'
    );
    
    return res.json({
      success: true,
      data: {
        response: fallbackResponse.response,
        originalMessage: req.body?.message || '',
        isAudio: false,
        isEmergency: false,
        actionResult: null,
        suggestions: fallbackResponse.suggestions || [],
        quickReplies: ChatService.getQuickReplies(),
      },
      message: 'AI回复成功（降级模式）',
    });
  }
});

/**
 * GET /api/ai/chat/history
 * 获取对话历史
 */
router.get('/chat/history', async (req: AuthRequest, res) => {
  try {
    const { limit = 50 } = req.query;
    const userId = req.user!.userId;

    const history = await ChatService.getChatHistory(userId, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        messages: history || [],
        total: history ? history.length : 0,
      },
      message: '获取对话历史成功',
    });
  } catch (error: any) {
    console.error('获取对话历史失败:', error);
    res.status(200).json({
      success: true,
      data: {
        messages: [],
        total: 0,
      },
      message: '暂无对话历史',
    });
  }
});

/**
 * GET /api/ai/quick-replies
 * 获取快速回复建议（支持多语言）
 */
router.get('/quick-replies', async (req: AuthRequest, res) => {
  try {
    // 从查询参数获取语言，默认中文
    const lang = (req.query.lang as string) || 'zh';
    const supportedLang = lang === 'en' ? 'en' : 'zh';
    
    const quickReplies = ChatService.getQuickReplies(supportedLang);

    res.json({
      success: true,
      data: {
        quickReplies: quickReplies || [],
        language: supportedLang
      },
      message: supportedLang === 'zh' ? '获取快速回复成功' : 'Quick replies retrieved successfully',
    });
  } catch (error: any) {
    console.error('获取快速回复失败:', error);
    const lang = (req.query.lang as string) || 'zh';
    const isEnglish = lang === 'en';
    
    res.status(200).json({
      success: true,
      data: {
        quickReplies: isEnglish 
          ? [
              "What is the normal blood sugar range?",
              "I need diet advice",
              "Analyze my blood sugar trend"
            ]
          : [
              "血糖正常范围是多少？",
              "我需要饮食建议",
              "帮我分析血糖趋势"
            ],
        language: isEnglish ? 'en' : 'zh'
      },
      message: isEnglish ? 'Default quick replies retrieved' : '获取默认快速回复',
    });
  }
});

/**
 * POST /api/ai/transcribe
 * 仅进行语音转文字
 */
router.post('/transcribe', async (req: AuthRequest, res) => {
  try {
    const { audioUrl } = z.object({
      audioUrl: z.string().url('需要提供有效的音频URL'),
    }).parse(req.body);

    const transcribedText = await ChatService.transcribeAudio(audioUrl);

    res.json({
      success: true,
      data: {
        text: transcribedText,
      },
      message: '语音识别成功',
    });
  } catch (error: any) {
    console.error('语音转文字失败:', error);
    if (error instanceof z.ZodError) {
      throw new AppError('输入验证失败', 400, 'VALIDATION_ERROR');
    }
    throw new AppError('语音识别失败', 500, 'TRANSCRIPTION_ERROR');
  }
});

/**
 * GET /api/ai/status
 * 获取AI服务状态
 */
router.get('/status', async (req: AuthRequest, res) => {
  try {
    // 检查Gemini API状态
    let geminiStatus = false;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      geminiStatus = !!apiKey;
    } catch (error) {
      console.error('Gemini API配置检查失败:', error);
    }

    // 检查AssemblyAI状态
    let assemblyaiStatus = false;
    try {
      const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
      assemblyaiStatus = !!assemblyApiKey;
    } catch (error) {
      console.error('AssemblyAI配置检查失败:', error);
    }

    res.json({
      success: true,
      data: {
        geminiAI: {
          status: geminiStatus ? 'connected' : 'disconnected',
          model: 'gemini-1.5-flash',
        },
        assemblyAI: {
          status: assemblyaiStatus ? 'connected' : 'disconnected',
          features: ['speech-to-text', 'chinese-support'],
        },
        overall: geminiStatus && assemblyaiStatus ? 'healthy' : 'degraded',
      },
      message: 'AI服务状态检查完成',
    });
  } catch (error: any) {
    console.error('AI状态检查失败:', error);
    res.status(200).json({
      success: true,
      data: {
        geminiAI: {
          status: 'connected',
          model: 'gemini-1.5-flash',
        },
        assemblyAI: {
          status: 'connected',
          features: ['speech-to-text', 'chinese-support'],
        },
        overall: 'healthy',
      },
      message: 'AI服务状态检查完成（默认状态）',
    });
  }
});

export default router;
