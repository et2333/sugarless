/**
 * BloodSugarTracker - Blood Sugar Tracking and Visualization
 * From Report: UC-A1.1 Update Profile - Blood sugar monitoring
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  Card, 
  Row, 
  Col, 
  Form, 
  Input, 
  InputNumber,
  Select, 
  DatePicker, 
  Button, 
  message, 
  Tabs, 
  Statistic,
  Alert,
  List,
  Tag,
  Space,
  Typography,
  Tooltip,
  Badge
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusOutlined, 
  LineChartOutlined, 
  AlertOutlined,
  HistoryOutlined,
  RiseOutlined,
  FallOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import apiClient from '../api/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// 配置dayjs插件
dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface BloodSugarRecord {
  id: string;
  value: number;
  unit: string;
  type: 'fasting' | 'post_prandial' | 'random' | 'hba1c';
  measurementTime: string;
  mealContext?: any;
  symptoms?: string[];
  notes?: string;
  device?: any;
  location?: string;
  tags?: string[];
}

interface BloodSugarTrend {
  period: string;
  average: number;
  min: number;
  max: number;
  readings: number;
  targetRange: { min: number; max: number };
  inRangePercentage: number;
  timeInRange: number;
  variability: number;
}

interface BloodSugarInsight {
  type: 'high' | 'low' | 'trend' | 'pattern' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
  confidence: number;
  timestamp: string;
  data?: any;
}

export default function BloodSugarTracker() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('record');
  const [formValues, setFormValues] = useState<any>({});

  // Get trends data
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['bloodSugarTrends', 'week'],
    queryFn: () => apiClient.get('/blood-sugar/trends?period=week'),
  });

  // Get insights
  const { data: insightsData } = useQuery({
    queryKey: ['bloodSugarInsights'],
    queryFn: () => apiClient.get('/blood-sugar/insights'),
  });

  // Get alerts
  const { data: alertsData } = useQuery({
    queryKey: ['bloodSugarAlerts'],
    queryFn: () => apiClient.get('/blood-sugar/alerts'),
  });

  // Get records
  const { data: recordsData } = useQuery({
    queryKey: ['bloodSugarRecords'],
    queryFn: () => apiClient.get('/blood-sugar/records?limit=50'),
  });

  // Record new reading mutation
  const recordMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/blood-sugar/record', data),
    onSuccess: () => {
      message.success(t('bloodSugar.recordSuccess'));
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['bloodSugarTrends'] });
      queryClient.invalidateQueries({ queryKey: ['bloodSugarInsights'] });
      queryClient.invalidateQueries({ queryKey: ['bloodSugarRecords'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('bloodSugar.recordFailed'));
    },
  });

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: () => apiClient.get('/blood-sugar/insights'),
    onSuccess: () => {
      message.success(t('bloodSugar.aiAnalysisSuccess'));
      queryClient.invalidateQueries({ queryKey: ['bloodSugarInsights'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('bloodSugar.aiAnalysisFailed'));
    },
  });

  const onFinish = (values: any) => {
    // 确保数据类型正确
    const data = {
      value: Number(values.value),
      unit: values.unit,
      type: values.type,
      measurementTime: values.measurementTime ? values.measurementTime.toISOString() : new Date().toISOString(),
      // 修复device字段格式，后端期望的是对象而不是字符串
      device: values.device ? {
        type: values.device,
        model: undefined,
        serialNumber: undefined,
      } : undefined,
      // 确保symptoms是数组格式
      symptoms: Array.isArray(values.symptoms) ? values.symptoms : [],
      notes: values.notes || undefined,
    };
    console.log('发送的血糖记录数据:', data); // 调试日志
    recordMutation.mutate(data);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fasting': return 'blue';
      case 'post_prandial': return 'green';
      case 'random': return 'purple';
      case 'hba1c': return 'gold';
      default: return 'default';
    }
  };

  // 症状翻译助手函数
  const translateSymptom = (symptom: string): string => {
    const symptomTranslations: Record<string, string> = {
      '口渴': 'Thirsty',
      '视力模糊': 'Blurred Vision',
      '疲劳': 'Fatigue',
      '多尿': 'Frequent Urination',
      '多饮': 'Excessive Thirst',
      '体重下降': 'Weight Loss',
      '饥饿感': 'Hunger',
      '头痛': 'Headache',
      '恶心': 'Nausea',
      '呕吐': 'Vomiting',
      '腹痛': 'Abdominal Pain',
      '心悸': 'Palpitations',
      '出汗': 'Sweating',
      '颤抖': 'Trembling',
      '焦虑': 'Anxiety',
      '失眠': 'Insomnia',
      '皮肤瘙痒': 'Skin Itching',
      '伤口愈合慢': 'Slow Wound Healing',
      '感染': 'Infection',
      '手脚麻木': 'Numbness in Hands and Feet',
      '头晕': 'Dizziness',
      '无症状': 'No Symptoms'
    };
    return symptomTranslations[symptom] || symptom;
  };

  // AI分析内容翻译助手函数 - 全面版本
  const translateAIContent = (content: string): string => {
    if (!content) return content;
    
    const aiTranslations: Record<string, string> = {
      // Overall Assessment translations
      '您的血糖控制整体情况尚可': 'Your overall blood sugar control is acceptable',
      '但空腹血糖略高于理想范围': 'but fasting blood sugar is slightly higher than the ideal range',
      '餐后血糖控制需要进一步关注': 'post-meal blood sugar control needs further attention',
      '需要进一步观察餐后血糖是否持续偏高': 'Further observation is needed to see if post-meal blood sugar remains high',
      '并采取相应措施': 'and corresponding measures should be taken',
      '根据您提供的血糖数据': 'Based on your provided blood sugar data',
      '空腹血糖略高于理想范围': 'fasting blood sugar is slightly higher than the ideal range',
      '餐后血糖也偏高': 'and post-meal blood sugar is also elevated',
      '整体血糖控制需要进一步改善': 'Overall blood sugar control needs further improvement',
      '特别是空腹血糖的稳定性': 'especially the stability of fasting blood sugar',
      '总体来看': 'Overall',
      '您的血糖控制情况尚可': 'your blood sugar control is acceptable',
      '但存在轻微波动': 'but there are slight fluctuations',
      '空腹血糖略有偏高': 'fasting blood sugar is slightly high',
      '餐后血糖基本正常': 'and post-meal blood sugar is basically normal',
      '需要进一步关注空腹血糖的控制': 'Further attention is needed for fasting blood sugar control',
      '以及可能影响血糖的其他因素': 'as well as other factors that may affect blood sugar',
      '如睡眠': 'such as sleep',
      '如睡眠不足': 'such as insufficient sleep',
      
      // Pattern Analysis translations
      '存在空腹血糖偏高的趋势': 'There is a trend of elevated fasting blood sugar',
      '餐后血糖也在偏高边缘': 'Post-meal blood sugar is also at the high end',
      '需要更多餐后数据来判断是否需要干预': 'more post-meal data is needed to determine if intervention is required',
      '数据量较少': 'The amount of data is small',
      '难以判断长期血糖控制情况': 'making it difficult to judge long-term blood sugar control',
      '空腹血糖偏高': 'Fasting blood sugar is high',
      '可能存在胰岛素抵抗或夜间血糖控制不佳': 'possibly indicating insulin resistance or poor nighttime blood sugar control',
      '餐后血糖略高': 'Post-meal blood sugar is slightly high',
      '提示碳水化合物摄入可能需要调整': 'suggesting carbohydrate intake may need adjustment',
      '或运动不足': 'or insufficient exercise',
      '空腹血糖数值波动': 'Fasting blood sugar values fluctuate',
      '提示血糖控制的稳定性有待提高': 'indicating that the stability of blood sugar control needs improvement',
      '空腹血糖值略高于目标范围': 'Fasting blood sugar is slightly higher than the target range',
      '餐后血糖值基本在目标范围内': 'Post-meal blood sugar is basically within the target range',
      '血糖数据中记录了影响因素': 'Factors affecting blood sugar are recorded in the blood sugar data',
      
      // Recommendation translations
      '复查空腹血糖': 'Recheck fasting blood sugar',
      '确认是否持续偏高': 'to confirm if it remains high',
      '建议至少每周监测三次空腹血糖': 'It is recommended to monitor fasting blood sugar at least three times a week',
      '记录每日饮食': 'Record daily diet',
      '特别是碳水化合物的摄入量和类型': 'especially the intake and type of carbohydrates',
      '以便分析血糖波动与饮食的关系': 'to analyze the relationship between blood sugar fluctuations and diet',
      '增加规律的体力活动': 'Increase regular physical activity',
      '例如每天步行30分钟以上': 'such as walking for more than 30 minutes daily',
      '注意避免剧烈运动': 'Be careful to avoid strenuous exercise',
      '监控餐后血糖变化': 'Monitor post-meal blood sugar changes',
      '建议在进餐后2小时测量血糖': 'It is recommended to measure blood sugar 2 hours after a meal',
      '观察餐后血糖峰值': 'to observe post-meal blood sugar peaks',
      '如果空腹血糖持续高于目标范围': 'If fasting blood sugar consistently exceeds the target range',
      '餐后血糖持续高于目标范围': 'and post-meal blood sugar consistently exceeds the target range',
      '请咨询医生或营养师': 'please consult a doctor or nutritionist',
      '调整治疗方案': 'to adjust the treatment plan',
      '包括饮食、运动或药物': 'including diet, exercise, or medication',
      '注意睡眠质量': 'Pay attention to sleep quality',
      '保证充足的睡眠时间': 'ensure sufficient sleep time',
      '避免熬夜': 'avoid staying up late',
      '有助于稳定血糖': 'which helps stabilize blood sugar',
      '监测更长时间的血糖数据': 'Monitor blood sugar data for a longer period',
      '包括睡前血糖': 'including blood sugar before bed',
      '凌晨3点的血糖': 'and blood sugar at 3 AM',
      '以了解夜间血糖变化': 'to understand nighttime blood sugar changes',
      '调整饮食结构': 'Adjust dietary structure',
      '减少精制碳水化合物的摄入': 'reduce refined carbohydrate intake',
      '增加膳食纤维的摄入': 'and increase dietary fiber intake',
      '比如多吃蔬菜': 'such as eating more vegetables',
      '全谷物': 'and whole grains',
      '增加规律的运动': 'Increase regular exercise',
      '每周至少进行150分钟的中等强度有氧运动': 'such as at least 150 minutes of moderate-intensity aerobic exercise per week',
      '如快走': 'like brisk walking',
      '游泳等': 'swimming, etc.',
      '并注意餐后散步': 'and pay attention to post-meal walks',
      '注意饮水': 'Pay attention to water intake',
      '特别是睡前': 'especially before bed',
      '可以避免夜间因脱水导致血糖升高': 'to avoid elevated blood sugar due to dehydration at night',
      '尝试': 'Try to',
      '减少睡前高碳水化合物的摄入': 'reduce the intake of high-carbohydrate foods before bed',
      '观察是否能降低空腹血糖': 'and observe if it can lower fasting blood sugar',
      '保持规律作息': 'Maintain a regular routine',
      '保证充足睡眠': 'ensure adequate sleep',
      '这有助于血糖稳定': 'which helps stabilize blood sugar',
      '定期进行适度运动': 'Regularly engage in moderate exercise',
      '如散步': 'such as walking',
      '太极拳等': 'Tai Chi, etc.',
      '提高身体对胰岛素的敏感性': 'to improve the body\'s sensitivity to insulin',
      '记录详细的饮食': 'Record detailed dietary',
      '运动': 'exercise',
      '睡眠等生活习惯': 'sleep, and other lifestyle habits',
      '以便更好地了解血糖变化规律': 'to better understand blood sugar fluctuation patterns',
      '并与医生分享': 'and share with your doctor',
      '如果空腹血糖持续偏高': 'If fasting blood sugar remains consistently high',
      '建议咨询医生': 'it is recommended to consult a doctor',
      '考虑是否需要药物干预': 'to consider whether medication intervention is needed',
      '规律作息': 'Regular routine',
      '保证充足ofsleep': 'ensure sufficient sleep',
      'Try to固定作息时间': 'try to maintain regular sleep schedule',
      '提升sleep质量': 'improve sleep quality',
      '减少碳水化合物': 'reduce carbohydrate',
      '尤其is精制碳水化合物': 'especially refined carbohydrates',
      'of摄入': 'intake',
      '选择低GI': 'choose low GI',
      'blood sugar生成指数': 'glycemic index',
      'of食物': 'foods',
      'ofsleep': 'sleep',
      'ofhave氧exercise': 'aerobic exercise',
      'of水分': 'water',
      'isinexercise': 'after exercise',
      'ofhave': 'aerobic',
      'of': 'of',
      'is': 'is',
      'have': 'have',
      '数value': 'value',
      'high': 'high',
      '多次超过': 'multiple times exceeding',
      'control较好': 'control is good',
      '均in理想within range': 'all within ideal range',
      '个体mayexistsleepinsufficient': 'individuals may have insufficient sleep',
      '或口渴等情况': 'or feel thirsty',
      '这些factorsmayaffectblood sugar': 'these factors may affect blood sugar',
      '减少晚餐碳水化合物摄入量': 'reduce dinner carbohydrate intake',
      '增加蛋白质and纤维of摄入': 'increase protein and fiber intake',
      'have助于降低fastingblood sugar': 'which helps lower fasting blood sugar',
      '增加exercise量': 'increase exercise',
      '进行适度ofhave氧exercise': 'engage in moderate aerobic exercise',
      'such as walking': 'such as walking',
      '慢跑等': 'jogging, etc.',
      'have助于提高胰岛素敏感性': 'which helps improve insulin sensitivity',
      '降低blood sugar': 'lower blood sugar',
      '水分补充': 'Water intake',
      '确保每天摄入足够of水分': 'ensure sufficient water intake daily',
      '尤其isinexercise后或感到口渴时': 'especially after exercise or when feeling thirsty',
      '总体而言': 'Overall',
      'blood sugarcontrol情况尚可': 'blood sugar control is acceptable',
      '但exist一定fluctuation': 'but there are some fluctuations',
      'fasting blood sugar is slightly higher than the ideal range': 'fasting blood sugar is slightly higher than the ideal range',
      'post-mealblood sugarcontrol相对较好': 'post-meal blood sugar control is relatively good',
      'needfurtherattentionfastingblood sugar': 'further attention is needed for fasting blood sugar',
      '并Try to找出导致其升高of原因': 'and try to find the reasons for its elevation',
      'fastingblood sugar数valuehigh': 'fasting blood sugar value is high',
      'post-mealblood sugarcontrol较好': 'post-meal blood sugar control is good',
      '个体mayexistsleepinsufficient或口渴等情况': 'individuals may have insufficient sleep or feel thirsty',
      'Adjust dietary structure': 'Adjust dietary structure',
      'and increase dietary fiber intake': 'and increase dietary fiber intake',
      '减少碳水化合物 (尤其is精制碳水化合物)of摄入': 'reduce carbohydrates (especially refined carbohydrates) intake',
      '选择低GI (blood sugar生成指数)of食物': 'choose low GI (glycemic index) foods',
      '整体blood sugarcontrol情况尚可': 'Overall blood sugar control is acceptable',
      '但Fasting blood sugar is high': 'but fasting blood sugar is high',
      'needattentionfastingblood sugarofstabilityandcontrol': 'attention is needed for fasting blood sugar stability and control',
      'fastingblood sugar普遍higher than推荐范围': 'fasting blood sugar is generally higher than the recommended range',
      '一般<100mg/dL': '(generally <100mg/dL)',
      'exist持续high现象': 'there is a sustained high phenomenon',
      'post-mealblood sugar多数in理想within range': 'post-meal blood sugar is mostly within ideal range',
      '一般<140mg/dL': '(generally <140mg/dL)',
      'fluctuation较小': 'fluctuation is small',
      '部分recordinexist备注信息': 'Some records have notes',
      '如': 'such as',
      'want more drink': 'want more drink',
      'just feel tired since i didn\'t get nap': 'just feel tired since i didn\'t get nap',
      'may与blood sugar水平相关': 'may be related to blood sugar levels',
      'needfurther分析': 'need further analysis',
      '与医生沟通': 'Communicate with your doctor',
      '重新评估fastingblood sugarcontrol目标': 're-evaluate fasting blood sugar control goals',
      'mayneed调整药物或生活方式': 'may need to adjust medication or lifestyle',
      'Try toin睡前进行轻度exercise': 'Try to do light exercise before sleep',
      '或Adjust dietary structure': 'or adjust dietary structure',
      '以improvementfastingblood sugar': 'to improve fasting blood sugar',
      '详细record饮食andexercise情况': 'Detailed record diet and exercise conditions',
      '尤其isinblood sugar明显升高或降低时': 'especially when blood sugar significantly rises or falls',
      '以便找出affectblood sugaroffactors': 'in order to find out factors affecting blood sugar',
      '保持规律of作息时间': 'Maintain regular work and rest times',
      '避免因疲劳affectblood sugarcontrol': 'avoid fatigue affecting blood sugar control',
      'attention备注信息': 'Pay attention to notes',
      '例如': 'such as',
      '考虑饮料类型and含糖量对blood sugarofaffect': 'consider the type of beverage and sugar content affecting blood sugar',
      '尽量选择无糖或低糖饮品': 'try to choose sugar-free or low-sugar drinks',
      '普遍': 'generally',
      'than': 'than',
      '推荐范围': 'recommended range',
      'exist': 'there is',
      '持续': 'sustained',
      '现象': 'phenomenon',
      '多数': 'mostly',
      '理想': 'ideal',
      'within range': 'within range',
      '较小': 'is small',
      '部分': 'Some',
      '备注': 'notes',
      '信息': 'information',
      'may': 'may',
      '与': 'be',
      '水平': 'levels',
      '相关': 'related to',
      'further': 'further',
      '分析': 'analysis',
      '沟通': 'Communicate with',
      '重新': 're-',
      '评估': 'evaluate',
      '目标': 'goals',
      '调整': 'adjust',
      '药物': 'medication',
      '生活方式': 'lifestyle',
      '睡前': 'before sleep',
      '进行': 'do',
      '轻度': 'light',
      '饮食': 'diet',
      '情况': 'conditions',
      '明显': 'significantly',
      '升高': 'rises',
      '降低': 'falls',
      '找出': 'find out',
      'factors': 'factors',
      '作息': 'work and rest',
      '时间': 'times',
      '避免': 'avoid',
      '因': 'due to',
      '疲劳': 'fatigue',
      '考虑': 'consider',
      '饮料': 'beverage',
      '类型': 'type',
      '含糖量': 'sugar content',
      '对': 'affecting',
      '尽量': 'try to',
      '选择': 'choose',
      '无糖': 'sugar-free',
      '或': 'or',
      '低糖': 'low-sugar',
      '饮品': 'drinks',
      '记录': 'records',
      '备注信息': 'notes',
      '与医生': 'with your doctor',
      '或调整': 'or adjust',
      '食物': 'food',
      '改善': 'improve',
      '详细': 'Detailed',
      '条件': 'conditions',
      '特别': 'especially',
      '当': 'when',
      '显著': 'significantly',
      '上升': 'rises',
      '下降': 'falls',
      '为了': 'in order to',
      '因素': 'factors',
      '维持': 'Maintain',
      '规律': 'regular',
      '确保': 'ensure',
      '足够': 'sufficient',
      '防止': 'prevent',
      '由于': 'due to',
      '疲惫': 'fatigue',
      
      // Common phrases and patterns
      '通常为': 'usually',
      '小于': 'less than',
      'mg/dL': 'mg/dL',
      'mmol/L': 'mmol/L',
      '和': 'and',
      '，': ', ',
      '。': '.',
      '：': ': ',
      '（': ' (',
      '）': ')',
      '、': ', ',
      '基本': 'basically',
      '略': 'slightly',
      '偏高': 'high',
      '正常': 'normal',
      '目标范围': 'target range',
      '范围内': 'within range',
      '控制': 'control',
      '血糖': 'blood sugar',
      '空腹': 'fasting',
      '餐后': 'post-meal',
      '波动': 'fluctuation',
      '稳定': 'stable',
      '稳定性': 'stability',
      '需要': 'need',
      '进一步': 'further',
      '关注': 'attention',
      '影响': 'affect',
      '可能': 'may',
      '睡眠': 'sleep',
      '不足': 'insufficient',
      '数据': 'data',
      '中': 'in',
      '的': 'of',
      '了': '',
      '是': 'is',
      '在': 'in',
      '有': 'have',
      '存在': 'exist',
      '值': 'value',
      '略高': 'slightly high',
      '高于': 'higher than',
      '基本在': 'basically within'
    };

    // 按长度排序，先翻译较长的短语，避免短短语覆盖长短语的部分内容
    const sortedTranslations = Object.entries(aiTranslations).sort((a, b) => b[0].length - a[0].length);

    let translatedContent = content;
    for (const [chinese, english] of sortedTranslations) {
      translatedContent = translatedContent.replace(new RegExp(chinese, 'g'), english);
    }
    
    return translatedContent;
  };

  // 血糖正常范围检查函数
  const getBloodSugarStatus = (value: number, type: string, unit: string) => {
    if (!value) return null;
    
    // 转换为mg/dL进行比较 (如果输入是mmol/L，转换为mg/dL)
    const valueInMgDl = unit === 'mmol/L' ? value * 18 : value;
    
    let normalMin: number, normalMax: number, targetMin: number, targetMax: number;
    
    switch (type) {
      case 'fasting':
        normalMin = 70; normalMax = 100; // 正常范围 3.9-5.6 mmol/L
        targetMin = 80; targetMax = 130; // 目标范围 4.4-7.2 mmol/L
        break;
      case 'post_prandial':
        normalMin = 80; normalMax = 140; // 正常范围 4.4-7.8 mmol/L  
        targetMin = 80; targetMax = 180; // 目标范围 4.4-10.0 mmol/L
        break;
      case 'hba1c':
        return { status: value < 7 ? 'good' : value < 8 ? 'warning' : 'danger', 
                 text: value < 7 ? t('bloodSugar.hba1cGood') : value < 8 ? t('bloodSugar.hba1cWarning') : t('bloodSugar.hba1cDanger'),
                 color: value < 7 ? '#52c41a' : value < 8 ? '#faad14' : '#ff4d4f' };
      default: // random
        normalMin = 70; normalMax = 200;
        targetMin = 80; targetMax = 180;
    }
    
    if (valueInMgDl < normalMin) {
      return { status: 'low', text: t('bloodSugar.statusLow'), color: '#1890ff' };
    } else if (valueInMgDl > normalMax) {
      return { status: 'high', text: t('bloodSugar.statusHigh'), color: '#ff4d4f' };
    } else {
      return { status: 'normal', text: t('bloodSugar.statusNormal'), color: '#52c41a' };
    }
  };

  const formatChartData = (records: BloodSugarRecord[]) => {
    if (!records) return [];
    
    return records
      .sort((a, b) => new Date(a.measurementTime).getTime() - new Date(b.measurementTime).getTime())
      .map(record => ({
        time: dayjs(record.measurementTime).format('MM-DD HH:mm'),
        value: record.value,
        type: record.type,
        date: record.measurementTime,
      }));
  };

  const trends: BloodSugarTrend = trendsData?.data;
  // 修复：正确提取insights数据，合并AI分析和传统洞察
  const rawInsightsData = insightsData?.data;
  const insights: BloodSugarInsight[] = rawInsightsData?.traditionalInsights || [];
  const aiAnalysis = rawInsightsData?.aiAnalysis;
  const alerts: any[] = alertsData?.data || [];
  const records: BloodSugarRecord[] = recordsData?.data?.records || [];

  const tabItems = [
    {
      key: 'record',
      label: (
        <span>
          <PlusOutlined />
          {t('bloodSugar.addRecord')}
        </span>
      ),
      children: (
        <Card title={t('bloodSugar.title')} style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={(changedValues, allValues) => {
              setFormValues(allValues);
            }}
            initialValues={{
              unit: 'mg/dL',
              measurementTime: dayjs(),
            }}
          >
            {/* 正常范围提示 */}
            {formValues.type && formValues.type !== 'hba1c' && (
              <Alert
                message={`${formValues.type === 'fasting' ? t('bloodSugar.fasting') : formValues.type === 'postprandial' ? t('bloodSugar.postprandial') : t('bloodSugar.random')}${t('bloodSugar.normalRange')}`}
                description={
                  formValues.type === 'fasting' 
                    ? t('bloodSugar.fastingRange')
                    : formValues.type === 'postprandial'
                    ? t('bloodSugar.postprandialRange')
                    : t('bloodSugar.randomRange')
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 实时状态显示 */}
            {formValues.value && formValues.type && formValues.unit && (
              (() => {
                const status = getBloodSugarStatus(formValues.value, formValues.type, formValues.unit);
                return status && (
                  <Alert
                    message={`${t('bloodSugar.bloodSugarStatus')}: ${status.text}`}
                    description={
                      formValues.type === 'hba1c' 
                        ? t('bloodSugar.hba1cTarget')
                        : `${t('bloodSugar.currentValue')}: ${formValues.value} ${formValues.unit} - ${status.text}`
                    }
                    type={status.status === 'normal' ? 'success' : status.status === 'low' ? 'info' : 'warning'}
                    showIcon
                    style={{ marginBottom: 16, borderLeft: `4px solid ${status.color}` }}
                  />
                );
              })()
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={
                    <Space>
                      <span>{t('bloodSugar.bloodSugarValue')}</span>
                      <Tooltip title={t('bloodSugar.pleaseEnterAccurateBloodSugarValue')}>
                        <AlertOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    </Space>
                  }
                  name="value"
                  rules={[
                    { required: true, message: t('bloodSugar.pleaseEnterBloodSugarValue') },
                    { type: 'number', min: 0, max: 1000, message: t('bloodSugar.pleaseEnterValidBloodSugarValue') }
                  ]}
                >
                  <InputNumber 
                    style={{ width: '100%' }}
                    min={0}
                    max={1000}
                    step={0.1}
                    placeholder={formValues.unit === 'mmol/L' ? `${t('bloodSugar.example')}: 6.5` : `${t('bloodSugar.example')}: 120`}
                    addonAfter={formValues.unit || 'mg/dL'}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label={t('bloodSugar.unit')}
                  name="unit"
                  rules={[{ required: true, message: t('bloodSugar.pleaseSelectUnit') }]}
                >
                  <Select onChange={() => form.validateFields(['value'])}>
                    <Option value="mg/dL">mg/dL</Option>
                    <Option value="mmol/L">mmol/L</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label={t('bloodSugar.measurementType')}
                  name="type"
                  rules={[{ required: true, message: t('bloodSugar.pleaseSelectMeasurementType') }]}
                >
                  <Select>
                    <Option value="fasting">🍳 {t('bloodSugar.fastingBloodSugar')}</Option>
                    <Option value="post_prandial">🍽️ {t('bloodSugar.postprandialBloodSugar')}</Option>
                    <Option value="random">⏰ {t('bloodSugar.randomBloodSugar')}</Option>
                    <Option value="hba1c">🩸 {t('bloodSugar.hba1c')}</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={t('bloodSugar.measurementTime')}
                  name="measurementTime"
                  rules={[{ required: true, message: t('bloodSugar.pleaseSelectMeasurementTime') }]}
                >
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('bloodSugar.deviceType')}
                  name="device"
                >
                  <Select placeholder={t('bloodSugar.selectMeasurementDevice')}>
                    <Option value="glucometer">{t('bloodSugar.glucometer')}</Option>
                    <Option value="cgm">{t('bloodSugar.cgm')}</Option>
                    <Option value="manual">{t('bloodSugar.manual')}</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={
                <Space>
                  <span>{t('bloodSugar.symptomRecord')}</span>
                  <Tooltip title={t('bloodSugar.recordSymptomsForDoctorAnalysis')}>
                    <AlertOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
              name="symptoms"
            >
              <Select mode="tags" placeholder={t('bloodSugar.selectOrEnterSymptoms')}>
                <Option value="无症状">✅ {t('bloodSugar.noSymptoms')}</Option>
                <Option value="头晕">😵 {t('bloodSugar.dizziness')}</Option>
                <Option value="口渴">💧 {t('bloodSugar.thirst')}</Option>
                <Option value="多尿">🚽 {t('bloodSugar.polyuria')}</Option>
                <Option value="疲劳">😴 {t('bloodSugar.fatigue')}</Option>
                <Option value="视力模糊">👁️ {t('bloodSugar.blurredVision')}</Option>
                <Option value="心悸">💓 {t('bloodSugar.palpitations')}</Option>
                <Option value="出汗">💦 {t('bloodSugar.sweating')}</Option>
                <Option value="饥饿感">🍽️ {t('bloodSugar.hunger')}</Option>
                <Option value="恶心">🤢 {t('bloodSugar.nausea')}</Option>
                <Option value="手脚麻木">🤲 {t('bloodSugar.numbness')}</Option>
                <Option value="伤口愈合慢">🩹 {t('bloodSugar.slowHealing')}</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={t('bloodSugar.notes')}
              name="notes"
            >
              <TextArea 
                rows={3} 
                placeholder={t('bloodSugar.recordOtherInfo')} 
                maxLength={500}
                showCount
              />
            </Form.Item>

            {/* 紧急情况提醒 */}
            {formValues.value && formValues.type && formValues.unit && 
             getBloodSugarStatus(formValues.value, formValues.type, formValues.unit)?.status === 'high' &&
             formValues.value > (formValues.unit === 'mg/dL' ? 300 : 16.7) && (
              <Alert
                message={`🚨 ${t('bloodSugar.bloodSugarTooHighWarning')}`}
                description={t('bloodSugar.bloodSugarHighDescription')}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {formValues.value && formValues.type && formValues.unit && 
             getBloodSugarStatus(formValues.value, formValues.type, formValues.unit)?.status === 'low' &&
             formValues.value < (formValues.unit === 'mg/dL' ? 70 : 3.9) && (
              <Alert
                message={`⚠️ ${t('bloodSugar.bloodSugarTooLowWarning')}`}
                description={t('bloodSugar.bloodSugarLowDescription')}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={recordMutation.isPending}
                size="large"
              >
                {t('bloodSugar.saveRecord')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'trends',
      label: (
        <span>
          <LineChartOutlined />
          {t('bloodSugar.trendAnalysis')}
        </span>
      ),
      children: (
        <div>
          {trends && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('bloodSugar.averageBloodSugar')}
                    value={trends.average}
                    suffix="mg/dL"
                    precision={1}
                    valueStyle={{ color: trends.average > 180 ? '#cf1322' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('bloodSugar.timeInRange')}
                    value={trends.timeInRange}
                    suffix="%"
                    precision={1}
                    valueStyle={{ color: trends.timeInRange > 70 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('bloodSugar.bloodSugarVariability')}
                    value={trends.variability}
                    suffix="%"
                    precision={1}
                    valueStyle={{ color: trends.variability < 30 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('bloodSugar.totalRecords')}
                    value={trends.readings}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card title={t('bloodSugar.bloodSugarTrendChart')}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={formatChartData(records)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: any, name: string, props: any) => [
                    `${value} mg/dL`, 
                    props.payload.type === 'fasting' ? t('bloodSugar.fasting') : 
                    props.payload.type === 'post_prandial' ? t('bloodSugar.postprandial') : 
                    props.payload.type === 'random' ? t('bloodSugar.random') : t('bloodSugar.hba1c')
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#1890ff" 
                  fill="#1890ff" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      ),
    },
    {
      key: 'insights',
      label: (
        <span>
          <RiseOutlined />
          {t('bloodSugar.smartInsights')}
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<RobotOutlined />}
              loading={aiAnalysisMutation.isPending}
              onClick={() => aiAnalysisMutation.mutate()}
            >
              {aiAnalysisMutation.isPending ? t('bloodSugar.analyzing') : t('bloodSugar.aiAnalysis')}
            </Button>
          </div>
          
          {aiAnalysisMutation.isPending && (
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <RobotOutlined spin style={{ fontSize: 32, color: '#1890ff' }} />
                <Text>{t('bloodSugar.aiAnalyzing')}</Text>
              </Space>
            </Card>
          )}
          
          {aiAnalysis && (
            <Card 
              title={<><RobotOutlined /> {t('bloodSugar.aiAnalysisResult')}</>}
              style={{ marginBottom: 16 }}
              styles={{ header: { backgroundColor: '#e6f7ff' } }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {aiAnalysis.assessment && (
                  <div>
                    <Title level={5}>{t('bloodSugar.overallAssessment')}</Title>
                    <Alert
                      message={
                        <Space>
                          <Text strong>{t('bloodSugar.bloodSugarControlScore')}：{aiAnalysis.overallScore}/100</Text>
                          <Tag color={
                            aiAnalysis.riskLevel === 'low' ? 'success' :
                            aiAnalysis.riskLevel === 'medium' ? 'warning' : 'error'
                          }>
                            {aiAnalysis.riskLevel === 'low' ? t('bloodSugar.lowRisk') :
                             aiAnalysis.riskLevel === 'medium' ? t('bloodSugar.mediumRisk') : t('bloodSugar.highRisk')}
                          </Tag>
                        </Space>
                      }
                      description={translateAIContent(aiAnalysis.assessment)}
                      type={
                        aiAnalysis.riskLevel === 'low' ? 'success' :
                        aiAnalysis.riskLevel === 'medium' ? 'warning' : 'error'
                      }
                      showIcon
                    />
                  </div>
                )}
                
                {aiAnalysis.patterns && aiAnalysis.patterns.length > 0 && (
                  <div>
                    <Title level={5}>{t('bloodSugar.bloodSugarPatternAnalysis')}</Title>
                    <List
                      size="small"
                      dataSource={aiAnalysis.patterns}
                      renderItem={(pattern: string) => (
                        <List.Item>
                          <Text>• {translateAIContent(pattern)}</Text>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
                
                {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                  <div>
                    <Title level={5}>{t('bloodSugar.aiRecommendations')}</Title>
                    <List
                      size="small"
                      dataSource={aiAnalysis.recommendations}
                      renderItem={(rec: string, index: number) => (
                        <List.Item>
                          <Alert
                            message={`${t('bloodSugar.recommendation')} ${index + 1}`}
                            description={translateAIContent(rec)}
                            type="info"
                            showIcon
                            style={{ width: '100%' }}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </Space>
            </Card>
          )}
          
          {insights.length > 0 && (
            <Card title={t('bloodSugar.traditionalAnalysisInsights')} style={{ marginBottom: 16 }}>
              <List
                dataSource={insights}
                renderItem={(insight) => (
                  <List.Item>
                    <Card style={{ width: '100%' }} size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Tag color={getSeverityColor(insight.severity)}>
                            {insight.type === 'high' ? t('bloodSugar.highBloodSugar') :
                             insight.type === 'low' ? t('bloodSugar.lowBloodSugar') :
                             insight.type === 'trend' ? t('bloodSugar.trend') :
                             insight.type === 'pattern' ? t('bloodSugar.pattern') : t('bloodSugar.suggestion')}
                          </Tag>
                          <Text type="secondary">
                            {dayjs(insight.timestamp).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </div>
                        <Text>{translateAIContent(insight.message)}</Text>
                        {insight.recommendation && (
                          <Alert
                            message={t('bloodSugar.recommendation')}
                            description={translateAIContent(insight.recommendation)}
                            type="info"
                            showIcon
                          />
                        )}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          )}
          
          {!aiAnalysis && insights.length === 0 && !aiAnalysisMutation.isPending && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <RobotOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                <Title level={4}>{t('bloodSugar.startAiAnalysis')}</Title>
                <Text type="secondary">{t('bloodSugar.clickAiAnalysis')}</Text>
                <br />
                <Text type="secondary">{t('bloodSugar.needAtLeast3Records')}</Text>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'alerts',
      label: (
        <span>
          <AlertOutlined />
          {t('bloodSugar.alertCenter')}
          {alerts.length > 0 && <Tag color="red" style={{ marginLeft: 8 }}>{alerts.length}</Tag>}
        </span>
      ),
      children: (
        <div>
          {alerts.length > 0 ? (
            <List
              dataSource={alerts}
              renderItem={(alert) => (
                <List.Item>
                  <Alert
                    message={alert.message}
                    description={alert.value ? `${t('bloodSugar.currentValue')}: ${alert.value} mg/dL` : undefined}
                    type={alert.severity === 'critical' ? 'error' : 
                          alert.severity === 'high' ? 'warning' : 'info'}
                    showIcon
                    action={
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => {
                          apiClient.put(`/blood-sugar/alerts/${alert.id}/acknowledge`);
                          queryClient.invalidateQueries({ queryKey: ['bloodSugarAlerts'] });
                        }}
                      >
                        {t('bloodSugar.confirm')}
                      </Button>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">{t('bloodSugar.noAlerts')}</Text>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          {t('bloodSugar.historyRecords')}
        </span>
      ),
      children: (
        <div>
          {records.length > 0 ? (
            <List
              dataSource={records}
              renderItem={(record) => (
                <List.Item>
                  <Card style={{ width: '100%' }}>
                    <Row gutter={16} align="middle">
                      <Col span={4}>
                        <Statistic
                          value={record.value}
                          suffix={record.unit}
                          valueStyle={{
                            fontSize: '20px',
                            color: record.value > 180 ? '#cf1322' : 
                                   record.value < 70 ? '#fa8c16' : '#3f8600'
                          }}
                        />
                      </Col>
                      <Col span={4}>
                        <Tag color={getTypeColor(record.type)}>
                          {record.type === 'fasting' ? t('bloodSugar.fasting') :
                           record.type === 'post_prandial' ? t('bloodSugar.postprandial') :
                           record.type === 'random' ? t('bloodSugar.random') : t('bloodSugar.hba1c')}
                        </Tag>
                      </Col>
                      <Col span={8}>
                        <Text>{dayjs(record.measurementTime).format('YYYY-MM-DD HH:mm')}</Text>
                      </Col>
                      <Col span={8}>
                        {record.symptoms && record.symptoms.length > 0 && (
                          <div>
                            {record.symptoms.map(symptom => (
                              <Tag key={symptom}>{translateSymptom(symptom)}</Tag>
                            ))}
                          </div>
                        )}
                      </Col>
                    </Row>
                    {record.notes && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">{record.notes}</Text>
                      </div>
                    )}
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">{t('bloodSugar.noHistoryRecords')}</Text>
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>{t('bloodSugar.trackerTitle')}</Title>
        <LanguageSwitcher />
      </div>
      <Text type="secondary">
        {t('bloodSugar.trackerSubtitle')}
      </Text>
      
      <div style={{ marginTop: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </div>
    </div>
  );
}

