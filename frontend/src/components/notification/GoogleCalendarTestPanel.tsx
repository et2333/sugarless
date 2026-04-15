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
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  source: string;
  externalId?: string;
}

interface CalendarStatus {
  google: boolean;
  outlook: boolean;
  apple: boolean;
}

const GoogleCalendarTestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CalendarStatus>({
    google: false,
    outlook: false,
    apple: false,
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 检查日历连接状态
  const checkCalendarStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notifications/calendar/status');
      setStatus(response.data);
    } catch (error: any) {
      message.error(`获取日历状态失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取日历事件
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const response = await apiClient.get('/notifications/calendar/events', {
        params: {
          startDate: now.toISOString(),
          endDate: thirtyDaysLater.toISOString(),
        },
      });
      setEvents(response.data);
    } catch (error: any) {
      message.error(`获取日历事件失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCalendarStatus();
    fetchEvents();
  }, []);

  // 连接Google Calendar
  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notifications/calendar/google/auth-url');
      const { authUrl } = response.data;
      
      // 打开Google授权页面
      window.open(authUrl, '_blank', 'width=600,height=600');
    } catch (error: any) {
      message.error(`获取Google授权URL失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 同步日历
  const syncCalendar = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/notifications/calendar/sync', {
        calendarType: 'google',
        credentials: {}, // 服务会自动从数据库获取凭据
      });
      
      message.success('日历同步成功！');
      await fetchEvents(); // 重新获取事件
    } catch (error: any) {
      message.error(`日历同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 创建日历事件
  const createEvent = async (values: any) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/notifications/calendar/events', {
        title: values.title,
        description: values.description,
        startTime: values.startTime.toISOString(),
        endTime: values.endTime.toISOString(),
        location: values.location,
      });
      
      message.success('日历事件创建成功！');
      setCreateModalVisible(false);
      form.resetFields();
      await fetchEvents(); // 重新获取事件
    } catch (error: any) {
      message.error(`创建日历事件失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const eventColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={source === 'google' ? 'blue' : 'default'}>
          {source === 'google' ? 'Google' : source}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          Google Calendar 集成测试
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<SyncOutlined />} 
            onClick={syncCalendar} 
            loading={loading}
            disabled={!status.google}
          >
            同步日历
          </Button>
          <Button 
            icon={<CheckCircleOutlined />} 
            onClick={checkCalendarStatus} 
            loading={loading}
          >
            刷新状态
          </Button>
        </Space>
      }
    >
      {/* 连接状态 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>日历连接状态</Title>
        <Row gutter={[16, 8]}>
          <Col>
            <Tag color={status.google ? 'success' : 'default'}>
              Google Calendar: {status.google ? '已连接' : '未连接'}
            </Tag>
          </Col>
          <Col>
            <Tag color={status.outlook ? 'success' : 'default'}>
              Outlook: {status.outlook ? '已连接' : '未连接'}
            </Tag>
          </Col>
          <Col>
            <Tag color={status.apple ? 'success' : 'default'}>
              Apple Calendar: {status.apple ? '已连接' : '未连接'}
            </Tag>
          </Col>
        </Row>
      </div>

      {!status.google && (
        <Alert
          message="Google Calendar 未连接"
          description="请先连接您的Google Calendar账户以使用日历功能。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" type="primary" onClick={connectGoogleCalendar} loading={loading}>
              连接 Google Calendar
            </Button>
          }
        />
      )}

      <Divider />

      {/* 操作按钮 */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            disabled={!status.google}
          >
            创建日历事件
          </Button>
          <Button icon={<SyncOutlined />} onClick={fetchEvents} loading={loading}>
            刷新事件列表
          </Button>
        </Space>
      </div>

      {/* 事件列表 */}
      <div>
        <Title level={5}>日历事件 ({events.length})</Title>
        <Table
          dataSource={events}
          columns={eventColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          loading={loading}
        />
      </div>

      {/* 创建事件模态框 */}
      <Modal
        title="创建日历事件"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createEvent}
          initialValues={{
            startTime: dayjs().add(1, 'hour'),
            endTime: dayjs().add(2, 'hour'),
          }}
        >
          <Form.Item
            label="事件标题"
            name="title"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input placeholder="请输入事件标题" />
          </Form.Item>

          <Form.Item label="事件描述" name="description">
            <TextArea rows={3} placeholder="请输入事件描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始时间"
                name="startTime"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束时间"
                name="endTime"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="位置" name="location">
            <Input placeholder="请输入事件位置" />
          </Form.Item>
        </Form>
      </Modal>

      <div style={{ marginTop: 24, padding: 16, backgroundColor: '#e6f7ff', borderRadius: 6 }}>
        <Title level={5}>使用说明</Title>
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>点击"连接 Google Calendar"按钮进行Google账户授权</li>
          <li>授权成功后可以同步和创建日历事件</li>
          <li>创建的本地事件会自动同步到Google Calendar</li>
          <li>支持查看、创建和管理日历事件</li>
        </ul>
      </div>
    </Card>
  );
};

export default GoogleCalendarTestPanel;


