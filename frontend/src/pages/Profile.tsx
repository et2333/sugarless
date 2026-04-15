import React from 'react';
import { Form, Input, Button, Card, Select, DatePicker, message, Spin, Tag, Typography, Row, Col, Alert, Modal } from 'antd';
import { UserOutlined, HeartOutlined, CalendarOutlined, MedicineBoxOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import apiClient from '../api/client';
import { useAuthStore } from '../stores/authStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function Profile() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [selectedAvatar, setSelectedAvatar] = React.useState<string>('');
  const [isAvatarModalVisible, setIsAvatarModalVisible] = React.useState(false);
  const [updatingAvatar, setUpdatingAvatar] = React.useState(false);

  // Check if user is merchant
  const isMerchant = user?.role === 'merchant';

  // Preset avatar options with CSS-based designs
  const presetAvatars = [
    { 
      id: 'avatar1', 
      name: 'Avatar 1', 
      style: { 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.5)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '25%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar2', 
      name: 'Avatar 2', 
      style: { 
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '35%',
            height: '35%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '2px solid rgba(255,255,255,0.6)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50%',
            height: '20%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.4)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar3', 
      name: 'Avatar 3', 
      style: { 
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.7)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '45%',
            height: '18%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.5)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar4', 
      name: 'Avatar 4', 
      style: { 
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.5)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '25%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar5', 
      name: 'Avatar 5', 
      style: { 
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '35%',
            height: '35%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '2px solid rgba(255,255,255,0.6)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50%',
            height: '20%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.4)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar6', 
      name: 'Avatar 6', 
      style: { 
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.7)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '45%',
            height: '18%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.5)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar7', 
      name: 'Avatar 7', 
      style: { 
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.5)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '25%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar8', 
      name: 'Avatar 8', 
      style: { 
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '35%',
            height: '35%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '2px solid rgba(255,255,255,0.6)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50%',
            height: '20%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.4)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar9', 
      name: 'Avatar 9', 
      style: { 
        background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.7)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '45%',
            height: '18%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.5)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar10', 
      name: 'Avatar 10', 
      style: { 
        background: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.5)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '25%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar11', 
      name: 'Avatar 11', 
      style: { 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '35%',
            height: '35%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '2px solid rgba(255,255,255,0.6)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50%',
            height: '20%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.4)'
          }} />
        </>
      )
    },
    { 
      id: 'avatar12', 
      name: 'Avatar 12', 
      style: { 
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        position: 'relative' as const,
        overflow: 'hidden'
      },
      content: () => (
        <>
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.7)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '45%',
            height: '18%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.5)'
          }} />
        </>
      )
    },
  ];

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/profiles/me'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/profiles/me', data),
    onSuccess: () => {
      message.success(t('profile.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('profile.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/profiles/me', data),
    onSuccess: () => {
      message.success(t('profile.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('profile.updateFailed'));
    },
  });

  React.useEffect(() => {
    if (profile?.data) {
      form.setFieldsValue({
        ...profile.data,
        dateOfBirth: profile.data.dateOfBirth ? dayjs(profile.data.dateOfBirth) : null,
        diagnosisDate: profile.data.diagnosisDate ? dayjs(profile.data.diagnosisDate) : null,
      });
      setSelectedAvatar(profile.data.avatarId || 'avatar1');
    }
  }, [profile, form]);

  const handleAvatarSelect = async (avatarId: string) => {
    setUpdatingAvatar(true);
    try {
      await apiClient.put('/profiles/me', { avatarId });
      setSelectedAvatar(avatarId);
      message.success(t('profile.avatarUpdateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsAvatarModalVisible(false);
    } catch (error: any) {
      message.error(error.message || t('profile.avatarUpdateFailed'));
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const getSelectedAvatar = () => {
    return presetAvatars.find(avatar => avatar.id === selectedAvatar) || presetAvatars[0];
  };

  const onFinish = (values: any) => {
    const data = {
      ...values,
      dateOfBirth: values.dateOfBirth?.toISOString(),
      diagnosisDate: values.diagnosisDate?.toISOString(),
    };

    if (profile?.data) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" tip={t('profile.loading')} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          {isMerchant ? t('profile.merchantTitle') : t('profile.title')}
        </Title>
        <Text type="secondary">
          {isMerchant ? t('profile.merchantSubtitle') : t('profile.subtitle')}
        </Text>
        
        {/* Avatar Selection Section */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                ...getSelectedAvatar().style,
                border: '3px solid #1890ff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => setIsAvatarModalVisible(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
            >
              {getSelectedAvatar().content()}
            </div>
            <Button
              type="primary"
              shape="circle"
              icon={<SettingOutlined />}
              size="small"
              onClick={() => setIsAvatarModalVisible(true)}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {t('profile.avatarSelectHint')}
            </Text>
          </div>
        </div>
      </div>

      {!profile?.data && (
        <Alert
          message={isMerchant ? t('profile.merchantFirstTimeReminder') : t('profile.firstTimeReminder')}
          description={isMerchant ? t('profile.merchantFirstTimeDescription') : t('profile.firstTimeDescription')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <span>
                <HeartOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                {isMerchant ? t('profile.merchantPersonalInfo') : t('profile.personalInfo')}
              </span>
            }
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LanguageSwitcher />
                {profile?.data && <Tag color="green">{t('profile.completed')}</Tag>}
              </div>
            }
            style={{ borderRadius: '12px' }}
          >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label={t('profile.firstName')}
            name="firstName"
            rules={[{ required: true, message: t('profile.firstNameRequired') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={t('profile.lastName')}
            name="lastName"
            rules={[{ required: true, message: t('profile.lastNameRequired') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={t('profile.dateOfBirth')}
            name="dateOfBirth"
            rules={[{ required: true, message: t('profile.dateOfBirthRequired') }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label={t('profile.gender')}
            name="gender"
            rules={[{ required: true, message: t('profile.genderRequired') }]}
          >
            <Select>
              <Select.Option value="male">{t('profile.male')}</Select.Option>
              <Select.Option value="female">{t('profile.female')}</Select.Option>
              <Select.Option value="other">{t('profile.other')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={t('profile.phone')}
            name="phone"
          >
            <Input />
          </Form.Item>

          {!isMerchant && (
            <Form.Item
              label={t('profile.diabetesType')}
              name="diabetesType"
              rules={[{ required: true, message: t('profile.diabetesTypeRequired') }]}
            >
              <Select>
                <Select.Option value="type_1">{t('profile.type1')}</Select.Option>
                <Select.Option value="type_2">{t('profile.type2')}</Select.Option>
                <Select.Option value="gestational">{t('profile.gestational')}</Select.Option>
              </Select>
            </Form.Item>
          )}

          {!isMerchant && (
            <Form.Item
              label={t('profile.diagnosisDate')}
              name="diagnosisDate"
              rules={[{ required: true, message: t('profile.diagnosisDateRequired') }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}

          {!isMerchant && (
            <Form.Item
              label={t('profile.hba1c')}
              name="hba1c"
            >
              <Input type="number" step="0.1" />
            </Form.Item>
          )}

          {!isMerchant && (
            <Form.Item
              label={t('profile.fastingGlucose')}
              name="fastingGlucose"
            >
              <Input type="number" />
            </Form.Item>
          )}

          {!isMerchant && (
            <Form.Item
              label={t('profile.allergies')}
              name="allergies"
            >
              <Select mode="tags" placeholder={t('profile.allergiesPlaceholder')}>
                <Select.Option value="peanuts">{t('profile.peanuts')}</Select.Option>
                <Select.Option value="seafood">{t('profile.seafood')}</Select.Option>
                <Select.Option value="eggs">{t('profile.eggs')}</Select.Option>
              </Select>
            </Form.Item>
          )}

          {!isMerchant && (
            <Form.Item
              label={t('profile.dietaryPreferences')}
              name="dietaryPrefs"
            >
              <Select mode="tags" placeholder={t('profile.dietaryPreferencesPlaceholder')}>
                <Select.Option value="low-sugar">{t('profile.lowSugar')}</Select.Option>
                <Select.Option value="low-salt">{t('profile.lowSalt')}</Select.Option>
                <Select.Option value="vegetarian">{t('profile.vegetarian')}</Select.Option>
                <Select.Option value="halal">{t('profile.halal')}</Select.Option>
              </Select>
            </Form.Item>
          )}

          {!isMerchant && (
            <Form.Item
              label={t('profile.activityLevel')}
              name="activityLevel"
            >
              <Select>
                <Select.Option value="sedentary">{t('profile.sedentary')}</Select.Option>
                <Select.Option value="light">{t('profile.lightActivity')}</Select.Option>
                <Select.Option value="moderate">{t('profile.moderateActivity')}</Select.Option>
                <Select.Option value="active">{t('profile.activeActivity')}</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ height: '48px', borderRadius: '8px' }}
            >
              {profile?.data ? t('profile.updateProfile') : t('profile.createProfile')}
            </Button>
          </Form.Item>
        </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={
              <span>
                <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {t('profile.profileStatus')}
              </span>
            }
            style={{ borderRadius: '12px' }}
          >
            <div style={{ textAlign: 'center' }}>
              {profile?.data ? (
                <>
                  <Tag color="green" style={{ fontSize: '16px', padding: '8px 16px', marginBottom: 16 }}>
                    <HeartOutlined style={{ marginRight: 8 }} />
                    {t('profile.profileComplete')}
                  </Tag>
                  <div style={{ color: '#52c41a', fontSize: '14px' }}>
                    {t('profile.profileCompleteDescription')}
                  </div>
                </>
              ) : (
                <>
                  <Tag color="orange" style={{ fontSize: '16px', padding: '8px 16px', marginBottom: 16 }}>
                    <MedicineBoxOutlined style={{ marginRight: 8 }} />
                    {t('profile.profileIncomplete')}
                  </Tag>
                  <div style={{ color: '#faad14', fontSize: '14px' }}>
                    {t('profile.profileIncompleteDescription')}
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Avatar Selection Modal */}
      <Modal
        title={t('profile.selectAvatar')}
        open={isAvatarModalVisible}
        onCancel={() => setIsAvatarModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            {t('profile.avatarSelectDescription')}
          </Text>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
            gap: 16,
            maxWidth: 480,
            margin: '0 auto'
          }}>
            {presetAvatars.map((avatar) => (
              <div
                key={avatar.id}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  ...avatar.style,
                  cursor: 'pointer',
                  border: selectedAvatar === avatar.id ? '3px solid #1890ff' : '3px solid transparent',
                  transition: 'all 0.3s ease',
                  opacity: updatingAvatar ? 0.6 : 1,
                }}
                onClick={() => !updatingAvatar && handleAvatarSelect(avatar.id)}
                onMouseEnter={(e) => {
                  if (!updatingAvatar) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {avatar.content()}
              </div>
            ))}
          </div>
          
          {updatingAvatar && (
            <div style={{ marginTop: 24 }}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                {t('profile.updatingAvatar')}
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

