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
} from '@ant-design/icons';
import apiClient from '../api/client';
import WelcomeGuide from '../components/WelcomeGuide';

const { Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showGuide, setShowGuide] = React.useState(false);

  // 检查是否是首次使用
  React.useEffect(() => {
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

  // 显示加载状态
  if (profileLoading && mealPlansLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>加载中...</p>
      </div>
    );
  }

  const hasProfile = !!profileData?.data;
  const mealPlansCount = mealPlansData?.data?.length || 0;
  const remindersCount = remindersData?.data?.length || 0;
  const activeRemindersCount = remindersData?.data?.filter((r: any) => r.isActive)?.length || 0;
  const medicationsCount = medicationsData?.data?.length || 0;
  const profile = profileData?.data;

  // 血糖数据统计
  const bloodSugarRecords = bloodSugarData?.data || [];
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = bloodSugarRecords.filter((record: any) => 
    record.measurementTime && record.measurementTime.startsWith(today)
  );
  const latestRecord = bloodSugarRecords[0];
  
  // 计算血糖状态
  const getBloodSugarStatus = (value: number, type: string) => {
    if (!value) return null;
    
    // 根据测量类型判断正常范围
    let normalMin, normalMax;
    if (type === 'fasting') {
      normalMin = 4.0; normalMax = 6.1; // 空腹血糖正常范围 (mmol/L)
    } else if (type === 'postprandial') {
      normalMin = 4.4; normalMax = 7.8; // 餐后2小时正常范围
    } else {
      normalMin = 3.9; normalMax = 10.0; // 随机血糖
    }
    
    if (value < normalMin) return { status: 'low', color: '#1890ff', text: '偏低' };
    if (value > normalMax) return { status: 'high', color: '#ff4d4f', text: '偏高' };
    return { status: 'normal', color: '#52c41a', text: '正常' };
  };

  // 显示错误状态
  if (profileError || mealPlansError) {
    console.error('Dashboard API错误:', { profileError, mealPlansError });
  }

  // 计算健康状态
  const getHealthStatus = () => {
    if (!profile?.hba1c) return { text: '待评估', color: '#999' };
    if (profile.hba1c < 5.7) return { text: '正常', color: '#52c41a' };
    if (profile.hba1c < 6.5) return { text: '注意', color: '#faad14' };
    return { text: '需控制', color: '#ff4d4f' };
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
          description="为了获得更好的使用体验，建议您先完善个人健康档案信息。"
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
                  suffix="个"
                  valueStyle={{ color: mealPlansCount > 0 ? '#1890ff' : '#999' }}
                />
                {mealPlansCount > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    最近一次生成于今天
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
              value="可用"
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              搜索药品和营养品
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
              搜索产品 →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            {profileLoading ? (
              <Spin />
            ) : (
              <>
                <Statistic
                  title="健康状态"
                  value={healthStatus.text}
                  prefix={<HeartOutlined />}
                  valueStyle={{ color: healthStatus.color }}
                />
                {hasProfile && profile?.hba1c && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    <div>HbA1c: {profile.hba1c}%</div>
                    {profile.fastingGlucose && (
                      <div>空腹血糖: {profile.fastingGlucose} mg/dL</div>
                    )}
                  </div>
                )}
                <Progress 
                  percent={hasProfile ? 85 : 40} 
                  size="small" 
                  showInfo={false}
                  strokeColor={healthStatus.color}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* 新增统计行 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="活跃提醒"
              value={activeRemindersCount}
              prefix={<ClockCircleOutlined />}
              suffix={`/ ${remindersCount}`}
              valueStyle={{ color: activeRemindersCount > 0 ? '#1890ff' : '#999' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {activeRemindersCount > 0 ? '需要关注的提醒' : '暂无提醒'}
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/reminders')}
              style={{ padding: 0, marginTop: 8 }}
            >
              管理提醒 →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="药物管理"
              value={medicationsCount}
              prefix={<MedicineBoxOutlined />}
              suffix="种"
              valueStyle={{ color: medicationsCount > 0 ? '#722ed1' : '#999' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              {medicationsCount > 0 ? '正在使用的药物' : '暂无药物记录'}
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/medications')}
              style={{ padding: 0, marginTop: 8 }}
            >
              查看药物 →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            {bloodSugarLoading ? (
              <Spin />
            ) : (
              <>
                <Statistic
                  title="今日血糖记录"
                  value={todayRecords.length}
                  prefix={<HeartOutlined />}
                  suffix="次"
                  valueStyle={{ color: todayRecords.length > 0 ? '#ff4d4f' : '#999' }}
                />
                {latestRecord && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    <div>最新: {latestRecord.value} mmol/L</div>
                    <div style={{ color: getBloodSugarStatus(latestRecord.value, latestRecord.type)?.color || '#666' }}>
                      状态: {getBloodSugarStatus(latestRecord.value, latestRecord.type)?.text || '未知'}
                    </div>
                  </div>
                )}
                {todayRecords.length === 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#faad14' }}>
                    <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                    今日尚未记录血糖
                  </div>
                )}
                <Progress 
                  percent={Math.min((todayRecords.length / 3) * 100, 100)} 
                  size="small" 
                  showInfo={false}
                  strokeColor={todayRecords.length >= 3 ? '#52c41a' : todayRecords.length > 0 ? '#faad14' : '#ff4d4f'}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
            <Button 
              type="link" 
              onClick={() => navigate('/blood-sugar')}
              style={{ padding: 0, marginTop: 8 }}
            >
              {todayRecords.length === 0 ? '立即记录' : '查看记录'} →
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="AI助手"
              value="在线"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              智能健康咨询
            </div>
            <Button 
              type="link" 
              onClick={() => navigate('/ai-assistant')}
              style={{ padding: 0, marginTop: 8 }}
            >
              开始对话 →
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="快速操作" extra={<span style={{ fontSize: 12, color: '#666' }}>常用功能</span>}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Button 
                  type="primary" 
                  block 
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/meal-plans')}
                >
                  AI生成膳食计划
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button 
                  block 
                  size="large"
                  icon={<ShoppingOutlined />}
                  onClick={() => navigate('/products')}
                >
                  搜索药品补充剂
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button 
                  block 
                  size="large"
                  icon={<ClockCircleOutlined />}
                  onClick={() => navigate('/reminders')}
                >
                  管理健康提醒
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button 
                  block 
                  size="large"
                  icon={<HeartOutlined />}
                  onClick={() => navigate('/blood-sugar')}
                >
                  记录血糖数据
                </Button>
              </Col>
            </Row>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Button 
                  block 
                  size="large"
                  icon={<UserOutlined />}
                  onClick={() => navigate('/profile')}
                >
                  更新健康档案
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button 
                  block 
                  size="large"
                  icon={<CalendarOutlined />}
                  onClick={() => navigate('/ai-assistant')}
                >
                  AI健康助手
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                糖尿病专业指导
              </Space>
            } 
            extra={<span style={{ fontSize: 12, color: '#666' }}>{new Date().toLocaleDateString()}</span>}
          >
            <div style={{ marginBottom: 16 }}>
              {todayRecords.length === 0 && (
                <Alert
                  message="⚠️ 血糖监测提醒"
                  description="建议今日至少记录2-3次血糖，包括餐前、餐后2小时"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              )}
              {latestRecord && getBloodSugarStatus(latestRecord.value, latestRecord.type)?.status === 'high' && (
                <Alert
                  message="🔴 血糖偏高提醒"
                  description="最近一次血糖偏高，建议注意饮食控制和适量运动"
                  type="error"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              )}
              {latestRecord && getBloodSugarStatus(latestRecord.value, latestRecord.type)?.status === 'low' && (
                <Alert
                  message="🔵 血糖偏低提醒"
                  description="最近一次血糖偏低，请注意补充血糖，避免低血糖"
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              )}
              <Alert
                message="💡 今日监测建议"
                description="建议餐前、餐后2小时、睡前各测量一次血糖"
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
              />
            </div>
            <div>
              <Title level={5} style={{ marginBottom: 12, color: '#1890ff' }}>糖尿病管理要点</Title>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  血糖监测: 保持规律监测，记录变化趋势
                </li>
                <li style={{ marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  饮食控制: 低GI食物，控制碳水化合物摄入量
                </li>
                <li style={{ marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  运动锻炼: 每天30分钟有氧运动，增强胰岛素敏感性
                </li>
                <li style={{ marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  药物治疗: 按时按量服药，不随意调整剂量
                </li>
                <li style={{ marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  足部护理: 每日检查足部，预防糖尿病足
                </li>
                <li>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  定期复查: 每月检查HbA1c，及时调整治疗方案
                </li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

