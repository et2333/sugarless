import React from 'react';
import { Card, Row, Col, Statistic, Button, Space, Typography, Spin, Alert, Progress, Divider, Badge } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  UserOutlined,
  HeartOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BellOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import apiClient from '../api/client';
import WelcomeGuide from '../components/WelcomeGuide';

const { Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showGuide, setShowGuide] = React.useState(false);

  // 检查是否是首次使用
  React.useState(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem('hasSeenGuide', 'true');
    }
  }, []);

  // 获取用户档案
  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/profiles/me'),
    retry: false,
  });

  // 获取膳食计划统计
  const { data: mealPlansData, isLoading: mealPlansLoading, error: mealPlansError } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => apiClient.get('/meal-plans'),
    retry: false,
  });

  // 获取提醒统计
  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => apiClient.get('/reminders'),
    retry: false,
  });

  // 获取药物统计
  const { data: medicationsData, isLoading: medicationsLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: () => apiClient.get('/medications'),
    retry: false,
  });

  // 获取血糖记录统计
  const { data: bloodSugarData, isLoading: bloodSugarLoading } = useQuery({
    queryKey: ['bloodSugar'],
    queryFn: () => apiClient.get('/blood-sugar'),
    retry: false,
  });

  const profile = profileData?.data;
  const hasProfile = !!profile;
  const mealPlansCount = mealPlansData?.data?.length || 0;
  const remindersCount = remindersData?.data?.length || 0;
  const medicationsCount = medicationsData?.data?.length || 0;
  const bloodSugarCount = bloodSugarData?.data?.length || 0;
  const latestRecord = bloodSugarData?.data?.[0];

  // 血糖状态判断
  const getBloodSugarStatus = (value: number, type: string) => {
    if (type === 'fasting') {
      if (value < 70) return { text: t('bloodSugar.low'), status: 'low', color: '#1890ff' };
      if (value > 126) return { text: t('bloodSugar.high'), status: 'high', color: '#ff4d4f' };
      return { text: t('bloodSugar.normal'), status: 'normal', color: '#52c41a' };
    } else if (type === 'postprandial') {
      if (value < 80) return { text: t('bloodSugar.low'), status: 'low', color: '#1890ff' };
      if (value > 200) return { text: t('bloodSugar.high'), status: 'high', color: '#ff4d4f' };
      return { text: t('bloodSugar.normal'), status: 'normal', color: '#52c41a' };
    }
    return { text: t('bloodSugar.normal'), status: 'normal', color: '#52c41a' };
  };

  // 显示错误状态
  if (profileError || mealPlansError) {
    console.error('Dashboard API错误:', { profileError, mealPlansError });
  }

  // 计算健康状态
  const getHealthStatus = () => {
    if (!profile?.hba1c) return { text: t('common.loading'), color: '#999' };
    if (profile.hba1c < 5.7) return { text: t('bloodSugar.normal'), color: '#52c41a' };
    if (profile.hba1c < 6.5) return { text: t('common.warning'), color: '#faad14' };
    return { text: t('bloodSugar.high'), color: '#ff4d4f' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <WelcomeGuide visible={showGuide} onClose={() => setShowGuide(false)} />
      
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            {t('dashboard.welcome')}
          </Title>
          <LanguageSwitcher />
        </div>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: 16 }}>
          {t('dashboard.todayOverview')}
        </p>
        {latestRecord && (
          <Alert
            message={`${t('bloodSugar.title')}: ${latestRecord.value} mmol/L - ${getBloodSugarStatus(latestRecord.value, latestRecord.type)?.text || t('common.loading')}`}
            type={getBloodSugarStatus(latestRecord.value, latestRecord.type)?.status === 'high' ? 'warning' : 
                  getBloodSugarStatus(latestRecord.value, latestRecord.type)?.status === 'low' ? 'info' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => navigate('/blood-sugar')}>
                {t('common.view')}
              </Button>
            }
          />
        )}
      </div>

      {!hasProfile && (
        <Alert
          message={t('profile.personalInfo')}
          description={t('dashboard.completeProfileHint')}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          action={
            <Button size="small" type="primary" onClick={() => navigate('/profile')}>
              {t('common.add')}
            </Button>
          }
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            {profileLoading ? (
              <Spin />
            ) : (
              <>
                <Statistic
                  title={t('navigation.profile')}
                  value={hasProfile ? t('common.success') : t('common.error')}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: hasProfile ? '#3f8600' : '#ff4d4f' }}
                />
                {hasProfile && profile && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    <div>{profile.firstName} {profile.lastName}</div>
                    <div>{t('profile.diabetesType')}: {profile.diabetesType === 'type_1' ? t('profile.type1') : profile.diabetesType === 'type_2' ? t('profile.type2') : t('profile.gestational')}</div>
                  </div>
                )}
                <Progress 
                  percent={hasProfile ? 100 : 30} 
                  size="small" 
                  showInfo={false}
                  strokeColor={hasProfile ? '#3f8600' : '#ff4d4f'}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
            <Button 
              type="link" 
              onClick={() => navigate('/profile')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {t('common.view')} →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            {mealPlansLoading ? (
              <Spin />
            ) : (
              <>
                <Statistic
                  title={t('navigation.mealPlans')}
                  value={mealPlansCount}
                  prefix={<FileTextOutlined />}
                  suffix=""
                  valueStyle={{ color: mealPlansCount > 0 ? '#1890ff' : '#999' }}
                />
                {mealPlansCount > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    {t('dashboard.lastGeneratedToday')}
                  </div>
                )}
                <Progress 
                  percent={mealPlansCount > 0 ? 100 : 0} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#1890ff"
                  style={{ marginTop: 8 }}
                />
              </>
            )}
            <Button 
              type="link" 
              onClick={() => navigate('/meal-plans')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {mealPlansCount > 0 ? t('common.view') : t('mealPlans.generatePlan')} →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title={t('navigation.products')}
              value={t('products.available')}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {t('products.searchHint')}
            </div>
            <Progress 
              percent={100} 
              size="small" 
              showInfo={false}
              strokeColor="#1890ff"
              style={{ marginTop: 8 }}
            />
            <Button 
              type="link" 
              onClick={() => navigate('/products')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {t('common.search')} →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title={t('dashboard.healthMetrics')}
              value={healthStatus.text}
              prefix={<HeartOutlined />}
              valueStyle={{ color: healthStatus.color }}
            />
            {profile?.hba1c && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                <div>HbA1c: {profile.hba1c}%</div>
                <div>{t('profile.fastingGlucose')}: {profile.fastingGlucose} mg/dL</div>
              </div>
            )}
            <Progress 
              percent={profile?.hba1c ? 100 : 0} 
              size="small" 
              showInfo={false}
              strokeColor={healthStatus.color}
              style={{ marginTop: 8 }}
            />
            <Button 
              type="link" 
              onClick={() => navigate('/profile')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {t('common.view')} →
            </Button>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Reminder"
              value={`${remindersCount}/4`}
              prefix={<BellOutlined />}
              valueStyle={{ color: remindersCount > 0 ? '#faad14' : '#999' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {t('dashboard.remindersNeedingAttention')}
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/reminders')}
              style={{ padding: 0, marginTop: 8 }}
            >
              Reminder →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title={t('medications.title')}
              value={`${medicationsCount} ${t('dashboard.types')}`}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: medicationsCount > 0 ? '#52c41a' : '#999' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {t('dashboard.activeMedications')}
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/medications')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {t('common.view')} →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title={t('bloodSugar.title')}
              value={`${bloodSugarCount} ${t('dashboard.times')}`}
              prefix={<HeartOutlined />}
              valueStyle={{ color: bloodSugarCount > 0 ? '#1890ff' : '#999' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {t('dashboard.noBloodSugarToday')}
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/blood-sugar')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {t('bloodSugar.addRecord')} →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title={t('navigation.aiAssistant')}
              value={t('aiAssistant.statusOnline')}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {t('dashboard.aiHealthConsultation')}
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/ai-assistant')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {t('aiAssistant.title')} →
            </Button>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title={t('dashboard.quickActions')} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                block 
                onClick={() => navigate('/meal-plans')}
                icon={<FileTextOutlined />}
              >
                {t('mealPlans.generatePlan')}
              </Button>
              <Button 
                block 
                onClick={() => navigate('/reminders')}
                icon={<BellOutlined />}
              >
                Reminder
              </Button>
              <Button 
                block 
                onClick={() => navigate('/profile')}
                icon={<UserOutlined />}
              >
                {t('profile.personalInfo')}
              </Button>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title={t('dashboard.recentActivities')} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                onClick={() => navigate('/products')}
                icon={<ShoppingOutlined />}
              >
                {t('common.search')}
              </Button>
              <Button 
                block 
                onClick={() => navigate('/blood-sugar')}
                icon={<HeartOutlined />}
              >
                {t('bloodSugar.addRecord')}
              </Button>
              <Button 
                block 
                onClick={() => navigate('/ai-assistant')}
                icon={<RobotOutlined />}
              >
                {t('navigation.aiAssistant')}
              </Button>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title={t('dashboard.medicationReminders')} size="small">
            <Alert
              message={t('bloodSugar.title')}
              description={t('dashboard.bloodSugarRecommendation')}
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
            />
            <Alert
              message={t('dashboard.todayOverview')}
              description={t('dashboard.bloodSugarMeasurement')}
              type="info"
              showIcon
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
