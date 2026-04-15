/**
 * Reminder Popup Component
 * 提醒弹窗组件 - 显示浮动提醒通知
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { CheckOutlined, ClockCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './ReminderPopup.css';

const { Title, Text } = Typography;

interface ReminderPopupProps {
  reminder: {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    scheduleTime: string;
  };
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

const ReminderPopup: React.FC<ReminderPopupProps> = ({
  reminder,
  onComplete,
  onSnooze,
  onDismiss
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 30秒后自动关闭
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const getTypeIcon = () => {
    switch (reminder.type) {
      case 'medication':
        return '💊';
      case 'glucose_check':
        return '🩸';
      case 'appointment':
        return '📅';
      default:
        return '⏰';
    }
  };

  return (
    <div className="reminder-popup-overlay">
      <Card className="reminder-popup" style={{ animation: 'slideIn 0.3s ease' }}>
        <div className="reminder-header">
          <span className="reminder-icon">{getTypeIcon()}</span>
          <div style={{ flex: 1, marginLeft: '8px' }}>
            <Title level={4} style={{ margin: 0, marginBottom: '6px' }}>{reminder.title}</Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              {reminder.scheduleTime}
              {reminder.priority === 'high' && (
                <span style={{ marginLeft: '8px', color: '#ff4d4f', fontWeight: 500 }}>
                  • {t('reminders.urgent')}
                </span>
              )}
            </Text>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            size="small"
          />
        </div>
        
        <div className="reminder-body">
          <Text style={{ fontSize: '15px', lineHeight: '1.6' }}>{reminder.message}</Text>
        </div>
        
        <div className="reminder-actions">
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              setVisible(false);
              onComplete();
            }}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Mark Complete
          </Button>
          <Button
            icon={<ClockCircleOutlined />}
            onClick={() => {
              setVisible(false);
              onSnooze(1);
            }}
          >
            Snooze 1 min
          </Button>
          <Button
            icon={<ClockCircleOutlined />}
            onClick={() => {
              setVisible(false);
              onSnooze(10);
            }}
          >
            Snooze 10 min
          </Button>
          <Button
            icon={<ClockCircleOutlined />}
            onClick={() => {
              setVisible(false);
              onSnooze(60);
            }}
          >
            Snooze 1 hour
          </Button>
          <Button
            type="text"
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
          >
            Dismiss
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReminderPopup;

