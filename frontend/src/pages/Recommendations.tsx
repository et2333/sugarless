/**
 * B2: OTC and Supplement Recommendations Page
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Tabs,
  Space,
  Typography,
  Alert,
  Spin,
  Empty,
  message,
  Tag,
  Progress,
  Modal,
  Rate,
  Input,
  Select,
} from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  ReloadOutlined,
  InfoCircleOutlined,
  ExperimentOutlined,
  WarningOutlined,
  TrophyOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import {
  generateRecommendations,
  getUserRecommendations,
  getSupplementDetail,
  addToWatchlist,
  removeFromWatchlist,
  getUserWatchlist,
  submitFeedback,
  formatEvidenceLevel,
  formatStrength,
  formatInteractionSeverity,
  parseJsonField,
  type Recommendation,
  type Supplement,
  type WatchlistItem,
} from '../api/recommendation';
import apiClient from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

export default function Recommendations() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [personalizedGenerating, setPersonalizedGenerating] = useState(false);
  const [currentRecommendation, setCurrentRecommendation] = useState<Recommendation | null>(null);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [usePersonalizedAPI, setUsePersonalizedAPI] = useState(true); // Use new personalized API by default
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    accepted: true,
    comment: '',
  });

  useEffect(() => {
    loadRecommendations();
    loadWatchlist();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await getUserRecommendations(10);
      console.log('Loaded recommendations:', data);
      setRecommendations(data || []);
      if (data && data.length > 0) {
        const firstRec = data[0];
        console.log('Setting current recommendation:', firstRec);
        console.log('Recommendation items:', firstRec.items);
        // Check if items exist and have supplements
        if (firstRec.items && firstRec.items.length > 0) {
          // Filter out items without supplement data
          const validItems = firstRec.items.filter(item => item.supplement);
          if (validItems.length > 0) {
            setCurrentRecommendation({ ...firstRec, items: validItems });
          } else {
            console.warn('Recommendation has no valid items with supplement data');
            setCurrentRecommendation(null);
          }
        } else {
          console.warn('Recommendation has no items');
          setCurrentRecommendation(null);
        }
      } else {
        setCurrentRecommendation(null);
      }
    } catch (error: any) {
      console.error('Failed to load recommendations:', error);
      message.error(error.message || t('recommendations.loadFailed'));
      setRecommendations([]);
      setCurrentRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlist = async () => {
    try {
      const data = await getUserWatchlist();
      setWatchlist(data);
    } catch (error: any) {
      console.error('Failed to load watchlist:', error);
    }
  };

  // Generate personalized recommendations using new AI-powered API
  const handleGeneratePersonalizedRecommendations = async (category?: string) => {
    setPersonalizedGenerating(true);
    setPersonalizedRecommendations(null);
    try {
      const categoryMap: Record<string, string> = {
        'blood_sugar': 'Blood Sugar Control',
        'energy': 'Boost Energy',
        'weight': 'Weight Management',
      };
      
      const categoryName = category ? categoryMap[category] || category : 'general';
      
      const response = await apiClient.post('/personalized-recommendations', {
        category: categoryName,
      });
      
      console.log('Personalized recommendations response:', response);
      console.log('Response structure check:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        hasRecommendations: !!response?.data?.recommendations,
        isArray: Array.isArray(response?.data?.recommendations),
        length: response?.data?.recommendations?.length
      });
      
      // Check if response has the expected structure
      if (!response) {
        throw new Error('No response from server');
      }
      
      // The axios interceptor returns response.data, so response is the entire backend response
      // Backend returns: { success, data: { recommendations, generalAdvice, userProfile }, message }
      // So we need to access response.data to get the actual recommendations
      
      if (response.data && response.data.recommendations && Array.isArray(response.data.recommendations) && response.data.recommendations.length > 0) {
        console.log('Setting personalized recommendations:', response.data);
        setPersonalizedRecommendations(response.data);
        message.success(`Generated ${response.data.recommendations.length} personalized recommendations!`);
      } else {
        console.warn('No recommendations in response. Full response:', response);
        console.warn('Response data:', response.data);
        message.warning('No personalized recommendations generated. Please try again.');
      }
    } catch (error: any) {
      console.error('Generate personalized recommendations error:', error);
      message.error(error?.message || 'Failed to generate personalized recommendations');
    } finally {
      setPersonalizedGenerating(false);
    }
  };

  // Legacy generate recommendations (keep for backward compatibility)
  const handleGenerateRecommendations = async (focus?: string) => {
    setGenerating(true);
    try {
      const newRecommendation = await generateRecommendations({ focus: focus as any });
      console.log('Generated recommendation:', newRecommendation);
      console.log('Generated items:', newRecommendation.items);
      
      if (newRecommendation && newRecommendation.items) {
        // Filter out items without supplement data
        const validItems = newRecommendation.items.filter(item => item.supplement);
        if (validItems.length > 0) {
          setCurrentRecommendation({ ...newRecommendation, items: validItems });
          message.success(t('recommendations.generateSuccess'));
        } else {
          console.warn('Generated recommendation has no valid items with supplement data');
          message.warning('Recommendation generated but no supplements available. Please try again.');
          setCurrentRecommendation(null);
        }
      } else {
        console.warn('Generated recommendation has no items');
        message.warning('Recommendation generated but contains no items. Please try again.');
        setCurrentRecommendation(null);
      }
      
      await loadRecommendations();
    } catch (error: any) {
      console.error('Generate recommendations error:', error);
      message.error(error.message || t('recommendations.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const isInWatchlist = (supplementId: string) => {
    return watchlist.some((item) => item.supplementId === supplementId);
  };

  const handleToggleWatchlist = async (supplementId: string) => {
    try {
      const isInWatchlistItem = watchlist.some((item) => item.supplementId === supplementId);

      if (isInWatchlistItem) {
        await removeFromWatchlist(supplementId);
        message.success(t('recommendations.removedFromWatchlist'));
      } else {
        await addToWatchlist({ supplementId });
        message.success(t('recommendations.addedToWatchlist'));
      }

      await loadWatchlist();
    } catch (error: any) {
      message.error(error.message || t('recommendations.operationFailed'));
    }
  };

  const handleViewDetail = async (supplement: Supplement | any) => {
    try {
      // If supplement already has complete data, use it
      if (supplement.basicInfo && supplement.precautions && supplement.scientificEvidence) {
        setSelectedSupplement(supplement);
        setDetailModalVisible(true);
        return;
      }

      // Try to get complete detail from API
      if (supplement.id) {
        try {
          const completeDetail = await apiClient.get(`/recommendations/supplements/${supplement.id}/complete`);
          setSelectedSupplement(completeDetail.data);
          setDetailModalVisible(true);
          return;
        } catch (completeError) {
          console.warn('Complete detail not available, using regular detail');
        }

        // Fallback to regular detail
        try {
          const detail = await getSupplementDetail(supplement.id);
          setSelectedSupplement(detail);
          setDetailModalVisible(true);
        } catch (error) {
          // If supplement object itself can be used
          setSelectedSupplement(supplement);
          setDetailModalVisible(true);
        }
      } else {
        // Use supplement object directly if it has data
        setSelectedSupplement(supplement);
        setDetailModalVisible(true);
      }
    } catch (error: any) {
      console.error('Failed to load supplement details:', error);
      message.error(error.message || 'Failed to load supplement details');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!currentRecommendation) return;

    try {
      await submitFeedback(currentRecommendation.id, feedbackForm);
      message.success(t('recommendations.feedbackSubmitted'));
      setFeedbackModalVisible(false);
      setFeedbackForm({ rating: 5, accepted: true, comment: '' });
      await loadRecommendations();
    } catch (error: any) {
      message.error(error.message || t('recommendations.submitFeedbackFailed'));
    }
  };

  // Helper function to translate Chinese text to English
  const translateChineseText = (text: string): string => {
    if (!text) return text;
    
    // Common Chinese to English translations for supplement recommendations
    const translations: Record<string, string> = {
      // Recommendation rationale
      '基于您当前的健康状况，我们重点关注了': 'Based on your current health status, we focused on',
      '方面的需求。': 'needs.',
      '为您推荐了': 'We recommend',
      '种经过科学验证的补充剂，这些补充剂在临床研究中显示出对糖尿病患者的积极作用。': 'scientifically validated supplements that have shown positive effects on diabetic patients in clinical studies.',
      '请注意，补充剂不能替代药物治疗，使用前请咨询您的医生。': 'Please note that supplements cannot replace drug treatment; please consult your doctor before use.',
      '适合2型糖尿病患者': 'Suitable for Type 2 Diabetes patients',
      '您的HbA1c偏高，此补充剂有助于改善血糖控制': 'Your HbA1c is high; this supplement helps improve blood sugar control',
      '具有高等级循证医学证据': 'Has high-level evidence-based medical evidence',
      
      // Supplement names
      'α-硫辛酸': 'Alpha-Lipoic Acid',
      '维生素D3': 'Vitamin D3',
      '维生素B12': 'Vitamin B12',
      '维生素C': 'Vitamin C',
      '维生素E': 'Vitamin E',
      '镁补充剂': 'Magnesium Supplement',
      '铬补充剂': 'Chromium Supplement',
      '肉桂提取物': 'Cinnamon Extract',
      '苦瓜提取物': 'Bitter Melon Extract',
      '白藜芦醇': 'Resveratrol',
      '辅酶Q10': 'Coenzyme Q10',
      '鱼油': 'Fish Oil',
      '益生菌': 'Probiotics',
      '强效抗氧化剂': 'Potent Antioxidant',
      '强效Antioxidant': 'Potent Antioxidant',
      '强效': 'Potent',
      '强效抗氧化': 'Potent Antioxidant',
      
      // Categories
      '神经保护': 'Neuroprotection',
      '血糖控制': 'Blood Sugar Control',
      '心血管健康': 'Cardiovascular Health',
      '免疫支持': 'Immune Support',
      '能量提升': 'Energy Boost',
      '体重管理': 'Weight Management',
      '抗氧化': 'Antioxidant',
      '抗炎': 'Anti-inflammatory',
      
      // Benefits
      '改善神经病变症状': 'Improve neuropathic symptoms',
      '强效抗氧化': 'Potent antioxidant',
      '改善胰岛素敏感性': 'Improve insulin sensitivity',
      '减轻神经疼痛': 'Relieve nerve pain',
      '保护神经细胞': 'Protect nerve cells',
      '改善血糖代谢': 'Improve blood sugar metabolism',
      '降低血糖水平': 'Lower blood sugar levels',
      '增强免疫力': 'Enhance immunity',
      '改善心血管功能': 'Improve cardiovascular function',
      '促进能量代谢': 'Promote energy metabolism',
      '减少炎症反应': 'Reduce inflammatory response',
      '保护细胞免受氧化损伤': 'Protect cells from oxidative damage',
      '改善胰岛素抵抗': 'Improve insulin resistance',
      '调节血糖': 'Regulate blood sugar',
      '增强抗氧化能力': 'Enhance antioxidant capacity',
      '促进钙吸收': 'Promote calcium absorption',
      '维持骨骼健康': 'Maintain bone health',
      '支持免疫系统': 'Support immune system',
      '改善肌肉功能': 'Improve muscle function',
      '减少疲劳': 'Reduce fatigue',
      '提高能量水平': 'Increase energy levels',
      '支持心脏健康': 'Support heart health',
      '改善认知功能': 'Improve cognitive function',
      '减少氧化应激': 'Reduce oxidative stress',
      '支持神经系统': 'Support nervous system',
      '改善睡眠质量': 'Improve sleep quality',
      '支持消化健康': 'Support digestive health',
      '减少炎症': 'Reduce inflammation',
      '支持关节健康': 'Support joint health',
      '改善皮肤健康': 'Improve skin health',
      '支持肝脏功能': 'Support liver function',
      '改善血液循环': 'Improve blood circulation',
      '支持肾脏健康': 'Support kidney health',
      '减少胆固醇': 'Reduce cholesterol',
      '支持甲状腺功能': 'Support thyroid function',
      '改善视力': 'Improve vision',
      '支持生殖健康': 'Support reproductive health',
      '减少焦虑': 'Reduce anxiety',
      '改善情绪': 'Improve mood',
      '支持记忆功能': 'Support memory function',
      '减少肌肉痉挛': 'Reduce muscle cramps',
      '改善神经传导': 'Improve nerve conduction',
      '支持细胞修复': 'Support cell repair',
      '减少自由基损伤': 'Reduce free radical damage',
      '改善蛋白质合成': 'Improve protein synthesis',
      '支持酶活性': 'Support enzyme activity',
      '减少DNA损伤': 'Reduce DNA damage',
      '改善细胞膜稳定性': 'Improve cell membrane stability',
      '支持激素平衡': 'Support hormone balance',
      '减少血糖波动': 'Reduce blood sugar fluctuations',
      '改善糖耐量': 'Improve glucose tolerance',
      '支持胰腺功能': 'Support pancreatic function',
      '减少胰岛素需求': 'Reduce insulin requirements',
      '改善脂质代谢': 'Improve lipid metabolism',
      '支持血管健康': 'Support vascular health',
      '减少动脉硬化': 'Reduce atherosclerosis',
      '改善内皮功能': 'Improve endothelial function',
      '支持血小板功能': 'Support platelet function',
      '减少血栓形成': 'Reduce thrombosis',
      '改善微循环': 'Improve microcirculation',
      '支持淋巴系统': 'Support lymphatic system',
      '减少水肿': 'Reduce edema',
      '改善电解质平衡': 'Improve electrolyte balance',
      '支持酸碱平衡': 'Support acid-base balance',
      '减少代谢性酸中毒': 'Reduce metabolic acidosis',
      '改善呼吸功能': 'Improve respiratory function',
      '支持肺功能': 'Support lung function',
      '减少气道炎症': 'Reduce airway inflammation',
      '改善氧合作用': 'Improve oxygenation',
      '支持血红蛋白合成': 'Support hemoglobin synthesis',
      '减少贫血风险': 'Reduce anemia risk',
      '改善铁吸收': 'Improve iron absorption',
      '支持维生素B12代谢': 'Support vitamin B12 metabolism',
      '减少同型半胱氨酸': 'Reduce homocysteine',
      '改善叶酸代谢': 'Improve folate metabolism',
      '支持DNA合成': 'Support DNA synthesis',
      '减少神经管缺陷': 'Reduce neural tube defects',
      '改善胎儿发育': 'Improve fetal development',
      '支持孕期健康': 'Support pregnancy health',
      '减少早产风险': 'Reduce preterm birth risk',
      '改善母乳质量': 'Improve breast milk quality',
      '支持婴儿发育': 'Support infant development',
      '减少儿童感染': 'Reduce childhood infections',
      '改善儿童生长': 'Improve child growth',
      '支持青少年发育': 'Support adolescent development',
      '减少青春期问题': 'Reduce adolescent issues',
      '改善成人健康': 'Improve adult health',
      '支持中年健康': 'Support middle-aged health',
      '减少更年期症状': 'Reduce menopausal symptoms',
      '改善老年健康': 'Improve elderly health',
      '支持长寿': 'Support longevity',
      '减少衰老': 'Reduce aging',
      '改善生活质量': 'Improve quality of life',
      '支持整体健康': 'Support overall health',
      '降低HbA1c水平': 'Lower HbA1c levels',
      '改善骨骼健康': 'Improve bone health',
      '降低炎症标志物': 'Lower inflammatory markers',
      '预防糖尿病并发症': 'Prevent diabetic complications',
      '缓解肌肉痉挛': 'Relieve muscle cramps',
      '镁（柠檬酸镁）': 'Magnesium (Magnesium Citrate)',
      '肾功能不全者禁用': 'Contraindicated in patients with renal insufficiency',
      '心脏传导阻滞患者慎用': 'Use with caution in patients with cardiac conduction block',
      '肌无力患者慎用': 'Use with caution in patients with myasthenia gravis',
      '腹部不适': 'Abdominal discomfort',
      '心律失常': 'Arrhythmia',
      
      // Contraindications
      '甲状腺疾病患者慎用': 'Use with caution in patients with thyroid disease',
      '可能影响血糖药物': 'May affect blood sugar medications',
      '孕妇及哺乳期妇女慎用': 'Use with caution in pregnant and breastfeeding women',
      '肝肾功能不全者慎用': 'Use with caution in patients with liver or kidney dysfunction',
      '对本品过敏者禁用': 'Contraindicated in patients allergic to this product',
      '出血性疾病患者慎用': 'Use with caution in patients with bleeding disorders',
      '手术前停用': 'Discontinue before surgery',
      '高钙血症患者禁用': 'Contraindicated in patients with hypercalcemia',
      '肾结石患者慎用': 'Use with caution in patients with kidney stones',
      '甲状旁腺功能亢进患者禁用': 'Contraindicated in patients with hyperparathyroidism',
      '高磷血症患者慎用': 'Use with caution in patients with hyperphosphatemia',
      '严重肾功能不全者禁用': 'Contraindicated in patients with severe renal dysfunction',
      
      // Side Effects
      '胃部不适': 'Gastrointestinal discomfort',
      '皮疹': 'Rash',
      '头痛': 'Headache',
      '低血糖': 'Hypoglycemia',
      '甲状腺功能异常': 'Thyroid dysfunction',
      '恶心': 'Nausea',
      '腹泻': 'Diarrhea',
      '便秘': 'Constipation',
      '失眠': 'Insomnia',
      '疲劳': 'Fatigue',
      '肌肉疼痛': 'Muscle pain',
      '关节疼痛': 'Joint pain',
      '皮肤过敏': 'Skin allergy',
      '血压升高': 'Elevated blood pressure',
      '心率不齐': 'Irregular heartbeat',
      '轻度Nausea': 'Mild Nausea',
      '轻度恶心': 'Mild Nausea',
      '高钙血症': 'Hypercalcemia',
      '肾结石': 'Kidney stones',
      '高磷血症': 'Hyperphosphatemia',
      '肾功能异常': 'Renal dysfunction',
      '骨痛': 'Bone pain',
      '肌肉无力': 'Muscle weakness',
      '食欲不振': 'Loss of appetite',
      '口干': 'Dry mouth',
      '多尿': 'Polyuria',
      '口渴': 'Thirst',
      
      // Dosage timing
      '餐前': 'before meals',
      '餐后': 'after meals',
      '餐中': 'with meals',
      '空腹': 'on empty stomach',
      '睡前': 'before bedtime',
      '每日': 'daily',
      '每周': 'weekly',
      '每月': 'monthly',
      
      // Evidence levels
      '适度推荐': 'Moderate Recommendation',
      'A级证据(强推荐)': 'Grade A Evidence (Strong Recommendation)',
      'B级证据(中度推荐)': 'Grade B Evidence (Moderate Recommendation)',
      'C级证据(弱推荐)': 'Grade C Evidence (Weak Recommendation)',
      'D级证据(专家意见)': 'Grade D Evidence (Expert Opinion)',
      
      // Supplement types
      'other': 'Other',
      'vitamin': 'Vitamin',
      'mineral': 'Mineral',
      'herbal': 'Herbal',
      'probiotic': 'Probiotic',
      'omega': 'Omega',
      'antioxidant': 'Antioxidant',
      'enzyme': 'Enzyme',
      'amino_acid': 'Amino Acid',
      'protein': 'Protein',
      
      // Other common terms
      '胶囊': 'capsule',
      '片剂': 'tablet',
      '软胶囊': 'soft capsule',
      '粉剂': 'powder',
      '液体': 'liquid',
      '毫克': 'mg',
      '克': 'g',
      '毫升': 'ml',
      '微克': 'mcg',
      '国际单位': 'IU',
      '每次': 'each time',
      '每天': 'daily',
      '每周': 'weekly',
      '每月': 'monthly'
    };

    let translatedText = text;
    for (const [chinese, english] of Object.entries(translations)) {
      translatedText = translatedText.replace(new RegExp(chinese, 'g'), english);
    }
    
    return translatedText;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" spinning={true}>
          <div style={{ padding: '50px' }}>{t('common.loading')}</div>
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ExperimentOutlined /> {t('recommendations.title')}
        </Title>
        <Paragraph type="secondary">
          {t('recommendations.subtitle')}
          <br />
          <Text type="warning">
            <WarningOutlined /> {t('recommendations.warning')}
          </Text>
        </Paragraph>
      </div>

      {/* Quick Generate Recommendations */}
      <Card style={{ marginBottom: '24px' }}>
        <Space wrap>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={personalizedGenerating}
            onClick={() => handleGeneratePersonalizedRecommendations()}
          >
            Generate Personalized Recommendations
          </Button>
          <Button
            icon={<TrophyOutlined />}
            loading={personalizedGenerating}
            onClick={() => handleGeneratePersonalizedRecommendations('blood_sugar')}
          >
            Blood Sugar Control
          </Button>
          <Button
            icon={<ExperimentOutlined />}
            loading={personalizedGenerating}
            onClick={() => handleGeneratePersonalizedRecommendations('energy')}
          >
            Boost Energy
          </Button>
          <Button
            loading={personalizedGenerating}
            onClick={() => handleGeneratePersonalizedRecommendations('weight')}
          >
            Weight Management
          </Button>
        </Space>
      </Card>

      {/* Personalized Recommendations Loading */}
      {personalizedGenerating && (
        <Card style={{ marginBottom: '24px', textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>AI is analyzing your health profile...</Text>
          </div>
        </Card>
      )}

      {/* Personalized Recommendations Results */}
      {personalizedRecommendations && personalizedRecommendations.recommendations && (
        <>
          {/* General Advice */}
          {personalizedRecommendations.generalAdvice && (
            <Alert
              message="General Advice"
              description={personalizedRecommendations.generalAdvice}
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: '24px' }}
            />
          )}

          {/* Personalized Recommendation Cards */}
          <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
            {personalizedRecommendations.recommendations.map((product: any, index: number) => (
              <Card
                key={`personalized-${product.id}-${index}`}
                hoverable
                style={{ position: 'relative' }}
                actions={[
                  <Button
                    type="link"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => {
                      message.info(`Adding ${product.name} to shopping cart...`);
                      // TODO: Implement add to cart functionality
                    }}
                  >
                    Add to Cart ${product.price ? `$${product.price.toFixed(2)}` : ''}
                  </Button>,
                  <Button
                    type="link"
                    onClick={() => {
                      message.info(`Viewing details for ${product.name}`);
                      // TODO: Implement view details
                    }}
                  >
                    View Details
                  </Button>,
                ]}
              >
                {/* Priority Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: product.priority === 'high' ? '#ff4d4f' : 
                               product.priority === 'medium' ? '#faad14' : '#52c41a',
                    color: 'white',
                    padding: '4px 12px',
                    borderBottomLeftRadius: '8px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                >
                  {product.priority}
                </div>

                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* Product Title */}
                  <div>
                    <Title level={4} style={{ marginBottom: '8px' }}>
                      {product.nameEn || product.name}
                    </Title>
                    <Space wrap>
                      <Tag color="blue">{product.category}</Tag>
                      {product.price && (
                        <Tag color="green">${product.price.toFixed(2)}</Tag>
                      )}
                      {product.inStock ? (
                        <Tag color="success">In Stock</Tag>
                      ) : (
                        <Tag color="error">Out of Stock</Tag>
                      )}
                    </Space>
                  </div>

                  {/* Basic Info */}
                  {product.basicInfo && (
                    <>
                      <div>
                        <Text strong>Active Ingredient: </Text>
                        <Text>{product.basicInfo.activeIngredient}</Text>
                      </div>
                      <div>
                        <Text strong>Recommended Dosage: </Text>
                        <Text>{product.basicInfo.dosage || product.dosage}</Text>
                      </div>
                      <div>
                        <Text strong>Form: </Text>
                        <Text>{product.basicInfo.form}</Text>
                      </div>
                      {product.basicInfo.manufacturer && (
                        <div>
                          <Text strong>Manufacturer: </Text>
                          <Text>{product.basicInfo.manufacturer}</Text>
                        </div>
                      )}
                    </>
                  )}

                  {/* Dosage (fallback) */}
                  {!product.basicInfo && product.dosage && (
                    <div>
                      <Text strong>Recommended Dosage: </Text>
                      <Text>{product.dosage}</Text>
                    </div>
                  )}

                  {/* AI Recommendation Reason */}
                  {product.reason && (
                    <Alert
                      message={
                        <span>
                          🤖 <Text strong>AI Recommendation Reason:</Text>
                        </span>
                      }
                      description={product.reason}
                      type="info"
                      showIcon={false}
                      style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}
                    />
                  )}

                  {/* Benefits */}
                  {product.diabetesInfo?.benefits && product.diabetesInfo.benefits.length > 0 && (
                    <div>
                      <Text strong>Benefits for You:</Text>
                      <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                        {product.diabetesInfo.benefits.map((benefit: string, idx: number) => (
                          <li key={idx}>
                            <Text>{benefit}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Description */}
                  {(product.basicInfo?.description || product.description) && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>
                        {product.basicInfo?.description || product.description}
                      </Text>
                    </div>
                  )}

                  {/* Warnings */}
                  {product.warnings && (
                    <Alert
                      message="⚠️ Important Warnings"
                      description={product.warnings}
                      type="warning"
                      showIcon
                    />
                  )}

                  {/* View Details Link */}
                  {(product.basicInfo || product.completeData) && (
                    <Button
                      type="link"
                      onClick={() => handleViewDetail(product)}
                      style={{ padding: 0, marginTop: '8px' }}
                    >
                      View Complete Details (Precautions & Scientific Evidence) →
                    </Button>
                  )}
                </Space>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Main Content Area - Legacy Recommendations */}
      {currentRecommendation ? (
        <>
          {/* Recommendation Description */}
          {currentRecommendation.rationale && (
            <Alert
              message={t('recommendations.rationale')}
              description={translateChineseText(currentRecommendation.rationale)}
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: '24px' }}
              action={
                <Button size="small" onClick={() => setFeedbackModalVisible(true)}>
                  {t('recommendations.evaluateRecommendation')}
                </Button>
              }
            />
          )}

          {/* Recommendation List */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {currentRecommendation.items && currentRecommendation.items.length > 0 ? currentRecommendation.items
              .filter((item) => item.supplement) // Filter out items without supplement data
              .map((item, index) => {
                const supplement = item.supplement!;
                if (!supplement) {
                  return null;
                }
                const reasons = parseJsonField<string[]>(item.reasons, []);
                const expectedImpact = parseJsonField<any>(item.expectedImpact, {});
                const interactions = parseJsonField<any[]>(item.interactions, []);
                const evidenceInfo = formatEvidenceLevel(item.evidenceLevel);
                const strengthInfo = formatStrength(item.strength);

                // Use a unique key: combine recommendation ID, item ID, supplement ID, and index
                // This ensures uniqueness even if supplement names are duplicated
                const uniqueKey = `${currentRecommendation.id}-${item.id || 'item'}-${supplement.id}-${index}`;

              return (
                <Card
                  key={uniqueKey}
                  hoverable
                  style={{ position: 'relative' }}
                  actions={[
                    <Button
                      type="link"
                      icon={
                        isInWatchlist(supplement.id) ? <HeartFilled /> : <HeartOutlined />
                      }
                      onClick={() => handleToggleWatchlist(supplement.id)}
                    >
                      {isInWatchlist(supplement.id) ? t('recommendations.following') : t('recommendations.follow')}
                    </Button>,
                    <Button type="link" onClick={() => handleViewDetail(supplement)}>
                      {t('recommendations.viewDetails')}
                    </Button>,
                  ]}
                >
                  {/* Ranking Marker */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: strengthInfo.color,
                      color: 'white',
                      padding: '4px 12px',
                      borderBottomLeftRadius: '8px',
                      fontWeight: 'bold',
                    }}
                  >
                    #{item.rank}
                  </div>

                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* Title Area */}
                    <div>
                      <Title level={4} style={{ marginBottom: '8px' }}>
                        {translateChineseText(supplement.name)}
                        {supplement.nameEn && (
                          <Text type="secondary" style={{ fontSize: '14px', marginLeft: '8px' }}>
                            {supplement.nameEn}
                          </Text>
                        )}
                      </Title>
                      <Space wrap>
                        <Tag color={strengthInfo.color}>{strengthInfo.label}</Tag>
                        <Tag color={evidenceInfo.color}>{evidenceInfo.label}</Tag>
                        <Tag>{translateChineseText(supplement.category)}</Tag>
                        {supplement.averagePrice && (
                          <Tag color="green">{t('recommendations.about')} ${supplement.averagePrice.toFixed(2)}</Tag>
                        )}
                      </Space>
                    </div>

                    {/* Recommendation Reasons */}
                    {reasons.length > 0 && (
                      <div>
                        <Text strong>{t('recommendations.recommendationReasons')}：</Text>
                        <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                          {reasons.map((reason, idx) => (
                            <li key={idx}>
                              <Text>{translateChineseText(reason)}</Text>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Expected Impact */}
                    {expectedImpact && Object.keys(expectedImpact).length > 0 && (
                      <Card size="small" title={t('recommendations.expectedImpact')} style={{ background: '#f5f5f5' }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {expectedImpact.hba1c && (
                            <div>
                              <Text>HbA1c: </Text>
                              <Text
                                strong
                                type={expectedImpact.hba1c < 0 ? 'success' : undefined}
                              >
                                {expectedImpact.hba1c > 0 ? '+' : ''}
                                {expectedImpact.hba1c.toFixed(1)}%
                              </Text>
                              <Text type="secondary"> ({t('recommendations.about')}{expectedImpact.timeframe}{t('recommendations.days')})</Text>
                              <Progress
                                percent={Math.abs(expectedImpact.hba1c) * 10}
                                size="small"
                                showInfo={false}
                                strokeColor={expectedImpact.hba1c < 0 ? '#52c41a' : '#faad14'}
                                style={{ marginTop: '4px' }}
                              />
                            </div>
                          )}
                          {expectedImpact.glucose && (
                            <div>
                              <Text>{t('recommendations.fastingBloodSugar')}: </Text>
                              <Text
                                strong
                                type={expectedImpact.glucose < 0 ? 'success' : undefined}
                              >
                                {expectedImpact.glucose > 0 ? '+' : ''}
                                {expectedImpact.glucose.toFixed(0)} mg/dL
                              </Text>
                            </div>
                          )}
                          {expectedImpact.confidence !== undefined && (
                            <div style={{ marginTop: '8px' }}>
                              <Text type="secondary">{t('recommendations.confidenceLevel')} </Text>
                              <Progress
                                percent={Math.round(expectedImpact.confidence * 100)}
                                size="small"
                                strokeColor="#1890ff"
                              />
                            </div>
                          )}
                        </Space>
                      </Card>
                    )}

                    {/* Interaction Warnings */}
                    {interactions.length > 0 && (
                      <Alert
                        type="warning"
                        message={t('recommendations.drugInteractionWarning')}
                        description={
                          <Space direction="vertical" size="small">
                            {interactions.map((interaction, idx) => {
                              const severityInfo = formatInteractionSeverity(
                                interaction.severity
                              );
                              return (
                                <div key={idx}>
                                  <Tag color={severityInfo.color}>
                                    {severityInfo.icon} {severityInfo.label}
                                  </Tag>
                                  <Text>{interaction.description}</Text>
                                </div>
                              );
                            })}
                          </Space>
                        }
                        showIcon
                      />
                    )}
                  </Space>
                </Card>
              );
            }) : (
              <Empty
                description={t('recommendations.noAvailableItems')}
                style={{ padding: '40px 0' }}
              />
            )}
          </div>
        </>
      ) : (
        <Empty
          description={t('recommendations.noRecommendationData')}
          style={{ padding: '60px 0' }}
        >
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={personalizedGenerating}
            onClick={() => handleGeneratePersonalizedRecommendations()}
          >
            {t('recommendations.generateNow')}
          </Button>
        </Empty>
      )}

      {/* Supplement Detail Modal */}
      <Modal
        title={selectedSupplement?.name || selectedSupplement?.basicInfo?.description ? (selectedSupplement.name || 'Supplement Details') : ''}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          selectedSupplement && (
            <Button
              key="watchlist"
              type="primary"
              icon={
                isInWatchlist(selectedSupplement.id) ? <HeartFilled /> : <HeartOutlined />
              }
              onClick={() => {
                handleToggleWatchlist(selectedSupplement.id);
                setDetailModalVisible(false);
              }}
            >
              {isInWatchlist(selectedSupplement.id) ? 'Unfollow' : 'Add to Watchlist'}
            </Button>
          ),
        ]}
        width={900}
      >
        {selectedSupplement && (
          <Tabs defaultActiveKey="1">
            {/* Basic Info Tab */}
            <TabPane tab="Basic Information" key="1">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {selectedSupplement.basicInfo ? (
                  <>
                    <div>
                      <Text strong>Product Name: </Text>
                      <Text style={{ fontSize: '16px' }}>{selectedSupplement.basicInfo.description || selectedSupplement.name}</Text>
                    </div>
                    <div>
                      <Text strong>Active Ingredient: </Text>
                      <Text>{selectedSupplement.basicInfo.activeIngredient}</Text>
                    </div>
                    <div>
                      <Text strong>Dosage: </Text>
                      <Text>{selectedSupplement.basicInfo.dosage}</Text>
                    </div>
                    <div>
                      <Text strong>Form: </Text>
                      <Text>{selectedSupplement.basicInfo.form}</Text>
                    </div>
                    {selectedSupplement.basicInfo.manufacturer && (
                      <div>
                        <Text strong>Manufacturer: </Text>
                        <Text>{selectedSupplement.basicInfo.manufacturer}</Text>
                      </div>
                    )}
                    {selectedSupplement.basicInfo.price && (
                      <div>
                        <Text strong>Price: </Text>
                        <Text style={{ fontSize: '18px', color: '#ff4d4f', fontWeight: 'bold' }}>
                          ${selectedSupplement.basicInfo.price.toFixed(2)}
                        </Text>
                      </div>
                    )}
                    {selectedSupplement.basicInfo.packSize && (
                      <div>
                        <Text strong>Pack Size: </Text>
                        <Text>{selectedSupplement.basicInfo.packSize}</Text>
                      </div>
                    )}
                    <div>
                      <Text strong>Description: </Text>
                      <Paragraph>{selectedSupplement.basicInfo.description}</Paragraph>
                    </div>
                    {selectedSupplement.diabetesInfo?.benefits && selectedSupplement.diabetesInfo.benefits.length > 0 && (
                      <div>
                        <Text strong>Benefits: </Text>
                        <ul>
                          {selectedSupplement.diabetesInfo.benefits.map((benefit: string, idx: number) => (
                            <li key={idx}><Text>{benefit}</Text></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  // Fallback for old data structure
                  <>
                    <div>
                      <Text strong>Type: </Text>
                      <Text>{selectedSupplement.type || 'N/A'}</Text>
                    </div>
                    <div>
                      <Text strong>Category: </Text>
                      <Text>{selectedSupplement.category || 'N/A'}</Text>
                    </div>
                  </>
                )}
              </Space>
            </TabPane>

            {/* Precautions Tab */}
            <TabPane tab="Precautions" key="2">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {selectedSupplement.precautions ? (
                  <>
                    {/* Contraindications */}
                    <div>
                      <Title level={5}>
                        ⛔ Contraindications (Who Should NOT Use):
                      </Title>
                      <ul>
                        {selectedSupplement.precautions.contraindications?.map((item: string, idx: number) => (
                          <li key={idx}>
                            <Text type="danger">{item}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Side Effects */}
                    <div>
                      <Title level={5}>
                        ⚠️ Possible Side Effects:
                      </Title>
                      <ul>
                        {selectedSupplement.precautions.possibleSideEffects?.map((item: string, idx: number) => (
                          <li key={idx}><Text>{item}</Text></li>
                        ))}
                      </ul>
                    </div>

                    {/* Drug Interactions */}
                    <div>
                      <Title level={5}>
                        💊 Drug Interactions:
                      </Title>
                      <ul>
                        {selectedSupplement.precautions.drugInteractions?.map((item: string, idx: number) => (
                          <li key={idx}>
                            <Text type="warning">{item}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Important Warnings */}
                    <div>
                      <Title level={5}>
                        ⚠️ Important Warnings:
                      </Title>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {selectedSupplement.precautions.warnings?.map((warning: string, idx: number) => (
                          <Alert
                            key={idx}
                            message={warning}
                            type="warning"
                            showIcon
                            style={{ marginBottom: '8px' }}
                          />
                        ))}
                      </Space>
                    </div>
                  </>
                ) : (
                  // Fallback for old data structure
                  <>
                    <div>
                      <Text strong>Contraindications: </Text>
                      <ul>
                        {parseJsonField<string[]>(selectedSupplement.contraindications || '[]', []).map(
                          (item, idx) => (
                            <li key={idx}>
                              <Text type="danger">{item}</Text>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <Text strong>Possible Side Effects: </Text>
                      {(() => {
                        const sideEffects = parseJsonField<any>(selectedSupplement.sideEffects || '{}', {});
                        return (
                          <>
                            {sideEffects.common && sideEffects.common.length > 0 && (
                              <div>
                                <Text type="secondary">Common: </Text>
                                <ul>
                                  {sideEffects.common.map((item: string, idx: number) => (
                                    <li key={idx}><Text>{item}</Text></li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {sideEffects.rare && sideEffects.rare.length > 0 && (
                              <div>
                                <Text type="secondary">Rare: </Text>
                                <ul>
                                  {sideEffects.rare.map((item: string, idx: number) => (
                                    <li key={idx}><Text>{item}</Text></li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </Space>
            </TabPane>

            {/* Scientific Evidence Tab */}
            <TabPane tab="Scientific Evidence" key="3">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {selectedSupplement.scientificEvidence ? (
                  <>
                    {/* Evidence Level */}
                    <div>
                      <Text strong>Evidence Level: </Text>
                      <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                        {selectedSupplement.scientificEvidence.evidenceLevel}
                      </Tag>
                    </div>

                    {/* Clinical Studies */}
                    {selectedSupplement.scientificEvidence.clinicalStudies && selectedSupplement.scientificEvidence.clinicalStudies.length > 0 && (
                      <div>
                        <Title level={5}>📊 Clinical Studies:</Title>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                          {selectedSupplement.scientificEvidence.clinicalStudies.map((study: any, idx: number) => (
                            <Card
                              key={idx}
                              size="small"
                              style={{ background: '#f9f9f9', marginBottom: '12px' }}
                            >
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Text strong style={{ fontSize: '15px' }}>{study.title}</Text>
                                {study.year && (
                                  <Text type="secondary">Year: {study.year}</Text>
                                )}
                                {study.participants && (
                                  <Text type="secondary">Participants: {study.participants}</Text>
                                )}
                                {study.duration && (
                                  <Text type="secondary">Duration: {study.duration}</Text>
                                )}
                                {study.results && (
                                  <div>
                                    <Text strong>Results: </Text>
                                    <Text>{study.results}</Text>
                                  </div>
                                )}
                                {study.findings && (
                                  <div>
                                    <Text strong>Findings: </Text>
                                    <Text>{study.findings}</Text>
                                  </div>
                                )}
                                {study.conclusion && (
                                  <div>
                                    <Text strong>Conclusion: </Text>
                                    <Text>{study.conclusion}</Text>
                                  </div>
                                )}
                                {study.source && (
                                  <div>
                                    <Text type="secondary" italic>Source: {study.source}</Text>
                                  </div>
                                )}
                              </Space>
                            </Card>
                          ))}
                        </Space>
                      </div>
                    )}

                    {/* Mechanism of Action */}
                    {selectedSupplement.scientificEvidence.mechanismOfAction && selectedSupplement.scientificEvidence.mechanismOfAction.length > 0 && (
                      <div>
                        <Title level={5}>🔬 Mechanism of Action:</Title>
                        <ul>
                          {selectedSupplement.scientificEvidence.mechanismOfAction.map((mechanism: string, idx: number) => (
                            <li key={idx}><Text>{mechanism}</Text></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Use */}
                    {selectedSupplement.scientificEvidence.recommendedUse && (
                      <div>
                        <Title level={5}>💡 Recommended Use:</Title>
                        <Alert
                          message={selectedSupplement.scientificEvidence.recommendedUse}
                          type="info"
                          showIcon
                        />
                      </div>
                    )}
                  </>
                ) : (
                  // Fallback for old data structure
                  <>
                    <div>
                      <Text strong>Evidence Level: </Text>
                      <Tag color={formatEvidenceLevel(selectedSupplement.evidenceLevel || 'C').color}>
                        {formatEvidenceLevel(selectedSupplement.evidenceLevel || 'C').label}
                      </Tag>
                    </div>
                    <div>
                      <Text strong>References: </Text>
                      <ul>
                        {parseJsonField<string[]>(selectedSupplement.evidenceSources || '[]', []).map(
                          (source, idx) => (
                            <li key={idx}><Text>{source}</Text></li>
                          )
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </Space>
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Feedback Modal */}
      <Modal
        title={t('recommendations.evaluateRecommendation')}
        open={feedbackModalVisible}
        onOk={handleSubmitFeedback}
        onCancel={() => setFeedbackModalVisible(false)}
        okText={t('common.submit')}
        cancelText={t('common.cancel')}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>{t('recommendations.overallRating')}：</Text>
            <div style={{ marginTop: '8px' }}>
              <Rate
                value={feedbackForm.rating}
                onChange={(value) => setFeedbackForm({ ...feedbackForm, rating: value })}
              />
            </div>
          </div>
          <div>
            <Text strong>{t('recommendations.acceptRecommendation')}：</Text>
            <div style={{ marginTop: '8px' }}>
              <Select
                value={feedbackForm.accepted}
                onChange={(value) => setFeedbackForm({ ...feedbackForm, accepted: value })}
                style={{ width: '100%' }}
              >
                <Select.Option value={true}>{t('recommendations.yesConsiderUsing')}</Select.Option>
                <Select.Option value={false}>{t('recommendations.noNotConsider')}</Select.Option>
              </Select>
            </div>
          </div>
          <div>
            <Text strong>{t('recommendations.additionalComments')}：</Text>
            <div style={{ marginTop: '8px' }}>
              <TextArea
                rows={4}
                placeholder={t('recommendations.shareYourThoughts')}
                value={feedbackForm.comment}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, comment: e.target.value })
                }
              />
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
}

