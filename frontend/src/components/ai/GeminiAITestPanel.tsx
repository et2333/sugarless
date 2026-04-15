import React, { useState } from 'react';
import {
  Card,
  Button,
  message,
  Typography,
  Space,
  Divider,
  Tag,
  Alert,
  Form,
  InputNumber,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  RobotOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import apiClient from '../../api/client';

const { Title, Text, Paragraph } = Typography;

interface AIAnalysisResult {
  assessment: string;
  patterns: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  overallScore: number;
}

interface MealPlanResult {
  plan: Array<{
    day: string;
    breakfast: any;
    lunch: any;
    dinner: any;
  }>;
  summary: string;
  tips: string[];
}

const GeminiAITestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [glucoseAnalysis, setGlucoseAnalysis] = useState<AIAnalysisResult | null>(null);
  const [mealPlanResult, setMealPlanResult] = useState<MealPlanResult | null>(null);

  // 测试Gemini AI连接
  const testConnection = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notifications/ai/gemini/test');
      setConnectionStatus(response.data.connected);
      
      if (response.data.connected) {
        message.success('Gemini AI连接正常！');
      } else {
        message.warning('Gemini AI连接失败');
      }
    } catch (error: any) {
      setConnectionStatus(false);
      message.error(`连接测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试血糖分析功能
  const testGlucoseAnalysis = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/blood-sugar/insights');
      
      if (response.data.data.aiAnalysis) {
        setGlucoseAnalysis(response.data.data.aiAnalysis);
        message.success('血糖AI分析完成！');
      } else {
        message.warning('AI分析服务暂时不可用，显示传统分析结果');
      }
    } catch (error: any) {
      message.error(`血糖分析测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试膳食计划生成
  const testMealPlanGeneration = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/meal-plans/generate', {
        duration: 3, // 生成3天计划用于测试
        caloriesTarget: 1800,
      });
      
      if (response.data.data.plan) {
        setMealPlanResult(response.data.data.plan);
        message.success('膳食计划AI生成完成！');
      } else {
        message.warning('使用了传统方法生成膳食计划');
      }
    } catch (error: any) {
      message.error(`膳食计划生成测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          Gemini AI 功能测试
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<ExperimentOutlined />} 
          onClick={testConnection} 
          loading={loading}
        >
          测试连接
        </Button>
      }
    >
      {/* 连接状态 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>AI服务状态</Title>
        <Space>
          {connectionStatus === null && (
            <Tag color="default">未测试</Tag>
          )}
          {connectionStatus === true && (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Gemini AI 连接正常
            </Tag>
          )}
          {connectionStatus === false && (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              Gemini AI 连接失败
            </Tag>
          )}
        </Space>
      </div>

      <Divider />

      {/* 功能测试按钮 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>AI功能测试</Title>
        <Space wrap>
          <Button
            icon={<MedicineBoxOutlined />}
            onClick={testGlucoseAnalysis}
            loading={loading}
            type="default"
          >
            测试血糖AI分析
          </Button>
          <Button
            icon={<ExperimentOutlined />}
            onClick={testMealPlanGeneration}
            loading={loading}
            type="default"
          >
            测试膳食计划AI生成
          </Button>
        </Space>
      </div>

      {/* 血糖分析结果 */}
      {glucoseAnalysis && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>血糖AI分析结果</Title>
          <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text strong>整体评估：</Text>
                <Paragraph style={{ marginTop: 8 }}>
                  {glucoseAnalysis.assessment}
                </Paragraph>
              </Col>
              
              <Col span={12}>
                <Text strong>风险等级：</Text>
                <Tag color={
                  glucoseAnalysis.riskLevel === 'low' ? 'green' :
                  glucoseAnalysis.riskLevel === 'medium' ? 'orange' : 'red'
                }>
                  {glucoseAnalysis.riskLevel === 'low' ? '低风险' :
                   glucoseAnalysis.riskLevel === 'medium' ? '中风险' : '高风险'}
                </Tag>
              </Col>
              
              <Col span={12}>
                <Text strong>综合评分：</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                  {glucoseAnalysis.overallScore}/100
                </Text>
              </Col>
              
              <Col span={24}>
                <Text strong>发现的模式：</Text>
                <ul style={{ marginTop: 8 }}>
                  {glucoseAnalysis.patterns.map((pattern, index) => (
                    <li key={index}>{pattern}</li>
                  ))}
                </ul>
              </Col>
              
              <Col span={24}>
                <Text strong>AI建议：</Text>
                <ul style={{ marginTop: 8 }}>
                  {glucoseAnalysis.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* 膳食计划结果 */}
      {mealPlanResult && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>AI生成的膳食计划</Title>
          <Card size="small" style={{ backgroundColor: '#f6ffed' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text strong>计划总结：</Text>
                <Paragraph style={{ marginTop: 8 }}>
                  {mealPlanResult.summary}
                </Paragraph>
              </Col>
              
              <Col span={24}>
                <Text strong>营养建议：</Text>
                <ul style={{ marginTop: 8 }}>
                  {mealPlanResult.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </Col>
              
              <Col span={24}>
                <Text strong>计划预览（前3天）：</Text>
                {mealPlanResult.plan.slice(0, 3).map((day, index) => (
                  <Card key={index} size="small" style={{ marginTop: 12 }}>
                    <Title level={6}>{day.day}</Title>
                    <Row gutter={[8, 8]}>
                      <Col span={8}>
                        <Text strong>早餐：</Text>
                        <div>{day.breakfast.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {day.breakfast.calories}卡路里, {day.breakfast.carbohydrates}g碳水
                        </Text>
                      </Col>
                      <Col span={8}>
                        <Text strong>午餐：</Text>
                        <div>{day.lunch.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {day.lunch.calories}卡路里, {day.lunch.carbohydrates}g碳水
                        </Text>
                      </Col>
                      <Col span={8}>
                        <Text strong>晚餐：</Text>
                        <div>{day.dinner.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {day.dinner.calories}卡路里, {day.dinner.carbohydrates}g碳水
                        </Text>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* 说明信息 */}
      <Alert
        message="Gemini AI集成说明"
        description={
          <div>
            <p>✅ 已集成Google Gemini AI API</p>
            <p>🤖 支持智能血糖数据分析和建议</p>
            <p>🍽️ 支持AI生成个性化膳食计划</p>
            <p>🔄 具备完善的错误处理和备用机制</p>
            <p>📊 提供传统方法作为fallback保障</p>
          </div>
        }
        type="info"
        showIcon
      />
    </Card>
  );
};

export default GeminiAITestPanel;
