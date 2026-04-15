import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  message,
  Typography,
  Space,
  Divider,
  Tag,
  Row,
  Col,
  Alert,
  Form,
  Input,
} from 'antd';
import {
  NotificationOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { pushService } from '../../services/pushService';
import { notificationApi } from '../../api/notification';

const { Title, Text } = Typography;

interface WebPushStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscription?: any;
}

const WebPushTestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WebPushStatus>({
    supported: false,
    permission: 'default',
    subscribed: false,
  });
  const [testMessage, setTestMessage] = useState('这是一条测试推送通知');

  // 检查Web Push状态
  const checkStatus = async () => {
    const supported = pushService.isSupported();
    const permission = pushService.getPermissionState();
    const subscription = await pushService.getCurrentSubscription();
    
    setStatus({
      supported,
      permission,
      subscribed: !!subscription,
      subscription,
    });
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // 请求权限并订阅
  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      // 请求权限
      const permission = await pushService.requestPermission();
      if (permission !== 'granted') {
        message.error('通知权限被拒绝，无法启用推送通知');
        return;
      }

      // 订阅推送
      const subscription = await pushService.subscribeToPush();
      
      // 将订阅信息发送到后端
      try {
        await notificationApi.push.saveSubscription({
          deviceToken: JSON.stringify(subscription),
          platform: 'web',
        });
        
        console.log('Subscription saved to backend:', subscription);
        message.success('推送通知订阅成功！');
      } catch (error) {
        console.warn('Failed to save subscription to backend:', error);
        message.warning('订阅成功，但保存到服务器失败');
      }

      await checkStatus();
    } catch (error: any) {
      message.error(`订阅失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 取消订阅
  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      const success = await pushService.unsubscribeFromPush();
      if (success) {
        message.success('已取消推送通知订阅');
        await checkStatus();
      } else {
        message.error('取消订阅失败');
      }
    } catch (error: any) {
      message.error(`取消订阅失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 发送测试通知
  const handleSendTest = () => {
    pushService.showLocalNotification('测试通知', {
      body: testMessage,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      requireInteraction: true,
      tag: 'test-notification',
    });
    message.success('本地测试通知已发送');
  };

  const getPermissionColor = (permission: NotificationPermission) => {
    switch (permission) {
      case 'granted':
        return 'success';
      case 'denied':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getPermissionText = (permission: NotificationPermission) => {
    switch (permission) {
      case 'granted':
        return '已授权';
      case 'denied':
        return '已拒绝';
      default:
        return '未设置';
    }
  };

  return (
    <Card
      title={
        <Space>
          <NotificationOutlined />
          Web Push 推送通知测试
        </Space>
      }
      extra={
        <Button icon={<CheckCircleOutlined />} onClick={checkStatus}>
          刷新状态
        </Button>
      }
    >
      {/* 支持状态 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>浏览器支持状态</Title>
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Space wrap>
              <Tag color={status.supported ? 'success' : 'error'}>
                浏览器支持: {status.supported ? '支持' : '不支持'}
              </Tag>
              <Tag color={getPermissionColor(status.permission)}>
                通知权限: {getPermissionText(status.permission)}
              </Tag>
              <Tag color={status.subscribed ? 'success' : 'default'}>
                订阅状态: {status.subscribed ? '已订阅' : '未订阅'}
              </Tag>
            </Space>
          </Col>
        </Row>
      </div>

      {!status.supported && (
        <Alert
          message="浏览器不支持"
          description="您的浏览器不支持Web Push通知功能。请使用Chrome、Firefox、Safari或Edge等现代浏览器。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {status.supported && (
        <>
          <Divider />

          {/* 订阅/取消订阅 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>推送订阅管理</Title>
            <Space>
              {!status.subscribed ? (
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleSubscribe}
                  icon={<BellOutlined />}
                  disabled={status.permission === 'denied'}
                >
                  {status.permission === 'denied' ? '权限被拒绝' : '启用推送通知'}
                </Button>
              ) : (
                <Button
                  loading={loading}
                  onClick={handleUnsubscribe}
                  icon={<ExclamationCircleOutlined />}
                >
                  禁用推送通知
                </Button>
              )}
            </Space>
            
            {status.permission === 'denied' && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  请在浏览器设置中手动启用通知权限
                </Text>
              </div>
            )}
          </div>

          <Divider />

          {/* 测试通知 */}
          <div>
            <Title level={5}>测试通知</Title>
            <Row gutter={16}>
              <Col span={16}>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="输入测试消息内容"
                />
              </Col>
              <Col span={8}>
                <Button
                  icon={<SendOutlined />}
                  onClick={handleSendTest}
                  block
                  disabled={status.permission !== 'granted'}
                >
                  发送测试通知
                </Button>
              </Col>
            </Row>
            
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                这将在浏览器中显示一条本地通知，用于测试通知功能
              </Text>
            </div>
          </div>

          {/* 订阅信息 */}
          {status.subscription && (
            <>
              <Divider />
              <div>
                <Title level={5}>当前订阅信息</Title>
                <div style={{ 
                  padding: 12, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  wordBreak: 'break-all'
                }}>
                  <div><strong>Endpoint:</strong> {status.subscription.endpoint?.substring(0, 50)}...</div>
                  <div><strong>P256DH Key:</strong> {status.subscription.keys?.p256dh?.substring(0, 30)}...</div>
                  <div><strong>Auth Key:</strong> {status.subscription.keys?.auth?.substring(0, 30)}...</div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 24, padding: 16, backgroundColor: '#e6f7ff', borderRadius: 6 }}>
        <Title level={5}>使用说明</Title>
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>Web Push需要HTTPS环境或localhost才能正常工作</li>
          <li>首次使用需要用户授权通知权限</li>
          <li>推送订阅信息会自动保存到后端，用于发送推送通知</li>
          <li>支持血糖警报、药物提醒、预约通知等多种推送类型</li>
        </ul>
      </div>
    </Card>
  );
};

export default WebPushTestPanel;
