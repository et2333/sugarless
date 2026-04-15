import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Card, Button, List, Tag, Empty, Modal, Form, InputNumber, message, Descriptions, Collapse, Typography, Popconfirm, Spin, Alert, Row, Col, Statistic, Progress, Tooltip, Select } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusOutlined, EyeOutlined, DeleteOutlined, ShoppingCartOutlined, RobotOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, FireOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { shoppingListAPI } from '../api/shoppingList';

const { Panel } = Collapse;
const { Text, Title } = Typography;
const { Option } = Select;

// 计算血糖影响指数 (Glycemic Index impact)
const calculateGlycemicImpact = (carbs: number, fiber: number) => {
  // 简单计算：碳水化合物减去纤维的一半，再考虑血糖影响
  const netCarbs = carbs - (fiber * 0.5);
  let impact = 'low';
  let color = 'green';
  
  if (netCarbs > 45) {
    impact = 'high';
    color = 'red';
  } else if (netCarbs > 30) {
    impact = 'medium';
    color = 'orange';
  }
  
  return { impact, color, netCarbs: Math.round(netCarbs) };
};

// 获取营养建议
const getNutritionAdvice = (carbs: number, protein: number, fat: number, t: any) => {
  const advice = [];
  
  if (carbs > 60) {
    advice.push(t('mealPlans.carbTooHigh'));
  } else if (carbs < 20) {
    advice.push(t('mealPlans.carbTooLow'));
  }
  
  if (protein < 15) {
    advice.push(t('mealPlans.proteinInsufficient'));
  }
  
  if (fat > 30) {
    advice.push(t('mealPlans.fatTooHigh'));
  }
  
  return advice;
};

export default function MealPlans() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => apiClient.get('/meal-plans'),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/meal-plans/generate', data),
    onSuccess: () => {
      message.success(t('mealPlans.mealPlanGeneratedSuccessfully'));
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('mealPlans.generationFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/meal-plans/${id}`),
    onSuccess: () => {
      message.success(t('mealPlans.mealPlanDeleted'));
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('mealPlans.deleteFailed'));
    },
  });

  // 生成购物清单
  const generateShoppingListMutation = useMutation({
    mutationFn: (mealPlanId: string) => shoppingListAPI.generateFromMealPlan(mealPlanId),
    onSuccess: () => {
      message.success(t('mealPlans.shoppingListGeneratedSuccessfully'));
      // 先刷新购物清单缓存，再跳转
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
      // 跳转到购物清单页面
      setTimeout(() => {
        navigate('/shopping-lists');
      }, 100);
    },
    onError: (error: any) => {
      message.error(error.message || t('mealPlans.generateShoppingListFailed'));
    },
  });

  const onGenerate = (values: any) => {
    generateMutation.mutate(values);
  };

  const onGenerateShoppingList = (mealPlanId: string) => {
    generateShoppingListMutation.mutate(mealPlanId);
  };

  const onDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const viewDetails = (plan: any) => {
    // 处理数据格式，确保兼容AI生成和传统生成的数据
    let processedPlan = { ...plan };
    let isAiGenerated = false;
    
    // 如果meals数据包含AI生成的结构，需要转换格式
    if (plan.meals && plan.meals.plan && Array.isArray(plan.meals.plan)) {
      // AI生成的数据格式：{ aiGenerated: true, plan: [{ day, breakfast, lunch, dinner }], ... }
      isAiGenerated = plan.meals.aiGenerated || true; // 如果有plan数组，就认为是AI生成的
      const aiGeneratedMeals: any = {};
      plan.meals.plan.forEach((dayPlan: any, index: number) => {
        const dayKey = `day${index + 1}`;
        aiGeneratedMeals[dayKey] = {
          date: dayPlan.date || new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          breakfast: dayPlan.breakfast || null,
          lunch: dayPlan.lunch || null,
          dinner: dayPlan.dinner || null,
          totalCalories: (dayPlan.breakfast?.calories || 0) + (dayPlan.lunch?.calories || 0) + (dayPlan.dinner?.calories || 0),
          totalCarbs: (dayPlan.breakfast?.carbohydrates || 0) + (dayPlan.lunch?.carbohydrates || 0) + (dayPlan.dinner?.carbohydrates || 0),
          totalProtein: (dayPlan.breakfast?.protein || 0) + (dayPlan.lunch?.protein || 0) + (dayPlan.dinner?.protein || 0)
        };
      });
      processedPlan.meals = aiGeneratedMeals;
      processedPlan.isAiGenerated = true; // 标记为AI生成
    } else {
      // 检查其他可能的AI生成标识
      isAiGenerated = plan.isAiGenerated || false;
      processedPlan.isAiGenerated = isAiGenerated;
    }
    
    setSelectedPlan(processedPlan);
    setIsDetailModalOpen(true);
  };

  const renderMealDetails = (meal: any, isAiGenerated: boolean = false) => {
    if (!meal) return <Text type="secondary">{t('mealPlans.noRecipe')}</Text>;
    
    // 兼容AI生成的数据格式 (carbohydrates vs carbs)
    const carbs = meal.carbs || meal.carbohydrates || 0;
    const protein = meal.protein || 0;
    const fat = meal.fat || 0;
    const fiber = meal.fiber || 0;
    const calories = meal.calories || 0;
    const name = meal.name || t('mealPlans.unnamedMeal');
    
    const glycemicImpact = calculateGlycemicImpact(carbs, fiber);
    
    // AI生成的膳食计划不显示警告，因为AI已经考虑了糖尿病管理需求
    const nutritionAdvice = isAiGenerated ? [] : getNutritionAdvice(carbs, protein, fat, t);
    
    // 对于AI生成的数据，使用更积极的标签
    let impactText;
    let impactColor;
    let tagColor;
    if (isAiGenerated) {
      // AI生成的数据使用更积极的描述
      impactText = glycemicImpact.impact === 'high' ? t('mealPlans.needsAttention') : 
                  glycemicImpact.impact === 'medium' ? t('mealPlans.moderate') : t('mealPlans.good');
      impactColor = glycemicImpact.impact === 'high' ? '#faad14' : 
                   glycemicImpact.impact === 'medium' ? '#1890ff' : '#52c41a';
      tagColor = glycemicImpact.impact === 'high' ? 'orange' : 
                glycemicImpact.impact === 'medium' ? 'blue' : 'green';
    } else {
      impactText = glycemicImpact.impact === 'high' ? t('mealPlans.highBloodSugarRisk') : 
                  glycemicImpact.impact === 'medium' ? t('mealPlans.mediumImpact') : t('mealPlans.lowBloodSugarImpact');
      impactColor = glycemicImpact.color === 'red' ? '#ff4d4f' : 
                   glycemicImpact.color === 'orange' ? '#faad14' : '#52c41a';
      tagColor = glycemicImpact.color === 'red' ? 'red' : 
                glycemicImpact.color === 'orange' ? 'orange' : 'green';
    }
    
    return (
      <Card size="small" style={{ marginBottom: 8, borderLeft: `4px solid ${impactColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Title level={5} style={{ margin: 0 }}>{name}</Title>
          <Tooltip title={`${t('mealPlans.netCarbs')}: ${glycemicImpact.netCarbs}g`}>
            <Tag color={tagColor} icon={<FireOutlined />}>
              {impactText}
            </Tag>
          </Tooltip>
        </div>
        <Text type="secondary">{meal.description || ''}</Text>
        
        <Row gutter={[16, 8]} style={{ marginTop: 12 }}>
          <Col span={12}>
            <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
              <Descriptions.Item label={<span>🔥 {t('mealPlans.calories')}</span>}>{calories} kcal</Descriptions.Item>
              <Descriptions.Item label={<span>🍞 {t('mealPlans.carbs')}</span>}>{carbs}g</Descriptions.Item>
              <Descriptions.Item label={<span>🥩 {t('mealPlans.protein')}</span>}>{protein}g</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
              <Descriptions.Item label={<span>🥑 {t('mealPlans.fat')}</span>}>{fat}g</Descriptions.Item>
              <Descriptions.Item label={<span>🌾 {t('mealPlans.fiber')}</span>}>{fiber}g</Descriptions.Item>
              <Descriptions.Item label={<span>⏰ {t('mealPlans.cookingTime')}</span>}>
                {meal.prepTime || 0}{meal.cookTime ? ` + ${meal.cookTime}` : ''}{t('mealPlans.minutes')}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        {/* 血糖影响指标 */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #dbeafe' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <ExclamationCircleOutlined style={{ color: '#1890ff', marginRight: 4 }} />
            <Text strong style={{ fontSize: 12 }}>{t('mealPlans.bloodSugarImpactAssessment')}</Text>
          </div>
          <Row gutter={8}>
            <Col>
              <Text style={{ fontSize: 11, color: '#666' }}>{t('mealPlans.netCarbs')}: </Text>
              <Text strong style={{ color: impactColor }}>
                {glycemicImpact.netCarbs}g
              </Text>
            </Col>
            <Col>
              <Progress 
                percent={Math.min((glycemicImpact.netCarbs / 45) * 100, 100)} 
                size="small" 
                showInfo={false}
                strokeColor={impactColor}
                style={{ width: 80 }}
              />
            </Col>
          </Row>
          {nutritionAdvice.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {nutritionAdvice.map((advice, index) => (
                <Text key={index} type="warning" style={{ display: 'block', fontSize: 11 }}>
                  ⚠️ {advice}
                </Text>
              ))}
            </div>
          )}
        </div>
        
        {meal.ingredients && (
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 12 }}>🥘 {t('mealPlans.ingredientList')}：</Text>
            <div style={{ marginTop: 4 }}>
              {(() => {
                try {
                  // 尝试解析JSON格式的ingredients (传统格式)
                  const parsed = JSON.parse(meal.ingredients);
                  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                    // 传统格式：对象数组 [{"name": "...", "quantity": "...", "unit": "..."}]
                    return parsed.map((ing: any, idx: number) => (
                      <Tag key={idx} size="small" style={{ marginBottom: 2 }}>{ing.name} {ing.quantity}{ing.unit}</Tag>
                    ));
                  } else {
                    // 可能是字符串数组，按字符串数组处理
                    const ingredients = Array.isArray(parsed) ? parsed : [meal.ingredients];
                    return ingredients.map((ing: string, idx: number) => (
                      <Tag key={idx} size="small" style={{ marginBottom: 2 }}>{ing}</Tag>
                    ));
                  }
                } catch (e) {
                  // 如果不是JSON格式，可能是AI生成的字符串数组格式
                  let ingredients;
                  try {
                    ingredients = typeof meal.ingredients === 'string' ? JSON.parse(meal.ingredients) : meal.ingredients;
                  } catch {
                    ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [meal.ingredients];
                  }
                  return ingredients.map((ing: any, idx: number) => {
                    const text = typeof ing === 'string' ? ing : (ing.name || ing.toString());
                    return <Tag key={idx} size="small" style={{ marginBottom: 2 }}>{text}</Tag>;
                  });
                }
              })()}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={1} style={{ marginBottom: 8, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🍎 {t('mealPlans.center')}
          </Title>
          <LanguageSwitcher />
        </div>
        <Text type="secondary" style={{ fontSize: 16 }}>
          {t('mealPlans.subtitle')}
        </Text>
      </div>

      <Alert
        message={t('mealPlans.guidance')}
        description={t('mealPlans.guidanceDescription')}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        icon={<InfoCircleOutlined />}
      />

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            {t('mealPlans.myMealPlans')}
          </div>
        }
        extra={
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            {t('mealPlans.aiGeneratePlan')}
          </Button>
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" tip={t('mealPlans.loadingPlans')} />
          </div>
        ) : mealPlans?.data && mealPlans.data.length > 0 ? (
            <List
            dataSource={mealPlans.data}
            renderItem={(plan: any) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => viewDetails(plan)}
                  >
                    {t('mealPlans.viewDetails')}
                  </Button>,
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => onGenerateShoppingList(plan.id)}
                    loading={generateShoppingListMutation.isPending}
                  >
                    {t('mealPlans.generateShoppingList')}
                  </Button>,
                  <Popconfirm
                    title={t('mealPlans.confirmDelete')}
                    onConfirm={() => onDelete(plan.id)}
                    okText={t('mealPlans.confirm')}
                    cancelText={t('mealPlans.cancel')}
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      {t('mealPlans.delete')}
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={`${plan.duration} ${t('mealPlans.daysMealPlan')}`}
                  description={
                    <>
                      <div>{t('mealPlans.targetCalories')}: {plan.caloriesTarget} {t('mealPlans.kcalPerDay')}</div>
                      <div>{t('mealPlans.carbs')}: {plan.carbsMin}-{plan.carbsMax}g</div>
                      <div>{t('mealPlans.protein')}: {plan.proteinMin}-{plan.proteinMax}g</div>
                      <div>{t('mealPlans.generationTime')}: {new Date(plan.createdAt).toLocaleDateString()}</div>
                    </>
                  }
                />
                <div>
                  <Tag color="blue">{plan.duration} {t('mealPlans.days')}</Tag>
                  <Tag color="green">{t('mealPlans.systemGenerated')}</Tag>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty 
            description={t('mealPlans.noMealPlans')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 生成计划弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            {t('mealPlans.aiGenerateDiabetesMealPlan')}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Alert
          message={t('mealPlans.diabetesSpecificParameters')}
          description={t('mealPlans.diabetesSpecificDescription')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onGenerate}
          initialValues={{ 
            duration: 7, 
            caloriesTarget: 1800,
            carbsTarget: 45,
            diabetesType: 'type2'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('mealPlans.planDaysLabel')}
                name="duration"
                rules={[{ required: true, message: t('mealPlans.pleaseEnterPlanDays') }]}
              >
                <InputNumber 
                  min={1} 
                  max={30} 
                  style={{ width: '100%' }}
                  addonAfter={t('mealPlans.days')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('mealPlans.diabetesType')}
                name="diabetesType"
                rules={[{ required: true, message: t('mealPlans.pleaseSelectDiabetesType') }]}
              >
                <Select>
                  <Option value="type1">{t('mealPlans.type1Diabetes')}</Option>
                  <Option value="type2">{t('mealPlans.type2Diabetes')}</Option>
                  <Option value="gestational">{t('mealPlans.gestationalDiabetes')}</Option>
                  <Option value="prediabetes">{t('mealPlans.prediabetes')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>{t('mealPlans.targetCaloriesLabel')}</span>
                <Tooltip title={t('mealPlans.caloriesTip')}>
                  <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                </Tooltip>
              </div>
            }
            name="caloriesTarget"
            rules={[{ required: true, message: t('mealPlans.pleaseEnterTargetCalories') }]}
          >
            <InputNumber 
              min={1200} 
              max={2500} 
              step={50} 
              style={{ width: '100%' }}
              addonAfter="kcal"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{t('mealPlans.carbsTargetPerMeal')}</span>
                    <Tooltip title={t('mealPlans.carbsTip')}>
                      <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                    </Tooltip>
                  </div>
                }
                name="carbsTarget"
                rules={[{ required: true, message: t('mealPlans.pleaseEnterCarbsTarget') }]}
              >
                <InputNumber 
                  min={15} 
                  max={75} 
                  step={5} 
                  style={{ width: '100%' }}
                  addonAfter={t('mealPlans.gPerMeal')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('mealPlans.bloodSugarControlTarget')}
                name="glucoseControl"
              >
                <Select defaultValue="normal">
                  <Option value="strict">{t('mealPlans.strictControl')}</Option>
                  <Option value="normal">{t('mealPlans.standardControl')}</Option>
                  <Option value="flexible">{t('mealPlans.flexibleControl')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              size="large"
              icon={<RobotOutlined />}
              loading={generateMutation.isPending}
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                height: 48,
                fontSize: 16
              }}
            >
              {generateMutation.isPending 
                ? t('mealPlans.aiGenerating') 
                : t('mealPlans.aiGenerateDiabetesSpecificMealPlan')}
            </Button>
          </Form.Item>
          
          {generateMutation.isPending && (
            <Alert
              message={t('mealPlans.aiGeneratingProfessionalMealPlan')}
              description={
                <div>
                  <div>✅ {t('mealPlans.analyzingHealthProfile')}</div>
                  <div>✅ {t('mealPlans.selectingLowGiIngredients')}</div>
                  <div>✅ {t('mealPlans.calculatingNutritionRatio')}</div>
                  <div style={{ marginTop: 8, color: '#999' }}>
                    {t('mealPlans.pleaseWaitPatiently')}
                  </div>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </Modal>

      {/* 计划详情弹窗 */}
      <Modal
        title={`${selectedPlan?.duration} ${t('mealPlans.daysMealPlan')} ${t('mealPlans.viewDetails')}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            {t('mealPlans.close')}
          </Button>,
          <Button
            key="shopping"
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => {
              if (selectedPlan) {
                onGenerateShoppingList(selectedPlan.id);
                setIsDetailModalOpen(false);
              }
            }}
            loading={generateShoppingListMutation.isPending}
          >
            {t('mealPlans.generateShoppingList')}
          </Button>,
        ]}
        width={800}
      >
        {selectedPlan && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('mealPlans.targetCalories')}>{selectedPlan.caloriesTarget} {t('mealPlans.kcalPerDay')}</Descriptions.Item>
              <Descriptions.Item label={t('mealPlans.planDays')}>{selectedPlan.duration}{t('mealPlans.days')}</Descriptions.Item>
              <Descriptions.Item label={t('mealPlans.carbohydrates')}>{selectedPlan.carbsMin}-{selectedPlan.carbsMax}g</Descriptions.Item>
              <Descriptions.Item label={t('mealPlans.protein')}>{selectedPlan.proteinMin}-{selectedPlan.proteinMax}g</Descriptions.Item>
              <Descriptions.Item label={t('mealPlans.generationTime')} span={2}>
                {new Date(selectedPlan.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Title level={4} style={{ marginTop: 16 }}>{t('mealPlans.dailyMealSchedule')}</Title>
            <Collapse accordion>
              {selectedPlan.meals && Object.entries(selectedPlan.meals).map(([day, meals]: [string, any]) => (
                <Panel 
                  header={
                    <div>
                      <strong>{day.replace('day', 'Day ')}</strong>
                      {' - '}
                      <Text type="secondary">{meals.date}</Text>
                      {' - '}
                      <Tag color="blue">{meals.totalCalories} kcal</Tag>
                    </div>
                  } 
                  key={day}
                >
                  <div>
                    <Title level={5}>🌅 {t('mealPlans.breakfast')}</Title>
                    {renderMealDetails(meals.breakfast, selectedPlan.isAiGenerated)}
                    
                    <Title level={5}>🌞 {t('mealPlans.lunch')}</Title>
                    {renderMealDetails(meals.lunch, selectedPlan.isAiGenerated)}
                    
                    <Title level={5}>🌙 {t('mealPlans.dinner')}</Title>
                    {renderMealDetails(meals.dinner, selectedPlan.isAiGenerated)}
                    
                    <Card size="small" style={{ marginTop: 16, background: '#f0f2f5' }}>
                      <Text strong>{t('mealPlans.dailyNutritionSummary')}：</Text>
                      <div style={{ marginTop: 8 }}>
                        <Tag color="magenta">{t('mealPlans.totalCalories')}: {meals.totalCalories} kcal</Tag>
                        <Tag color="cyan">{t('mealPlans.totalCarbs')}: {meals.totalCarbs}g</Tag>
                        <Tag color="green">{t('mealPlans.totalProtein')}: {meals.totalProtein}g</Tag>
                      </div>
                    </Card>
                  </div>
                </Panel>
              ))}
            </Collapse>
          </>
        )}
      </Modal>
    </div>
  );
}

