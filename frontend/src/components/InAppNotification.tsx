/**
 * In-App Notification Component
 * Shows notification modal overlay (works even without browser notification permission)
 */

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, Typography, Tag, Select } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseOutlined, SoundOutlined } from '@ant-design/icons';
import { reminderSound } from '../utils/soundManager';
import { stopVisualAlert } from '../utils/visualAlertManager';
import './InAppNotification.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Reminder {
  id: string;
  content?: string;
  message?: string;
  title?: string;
  time?: string;
  scheduleTime?: string;
  type?: string;
  priority?: string;
  category?: string;
  snoozedUntil?: string;
  snoozeCount?: number;
  status?: string;
}

// Reminder content templates
const reminderTemplates: Record<string, string[]> = {
  Medication: [
    "Time to take your diabetes medication",
    "Don't forget your Metformin dose",
    "Take your insulin as prescribed",
    "Remember to take your medication with food"
  ],
  'Blood Sugar Check': [
    "Time to check your blood sugar level",
    "Monitor your glucose now",
    "Daily blood sugar check reminder",
    "Test your blood sugar before meals"
  ],
  Exercise: [
    "Time for your daily exercise",
    "30 minutes of physical activity",
    "Go for a walk to help manage blood sugar",
    "Exercise helps control diabetes"
  ],
  Followup: [
    "Doctor appointment reminder",
    "Time to schedule your check-up",
    "Review your health progress",
    "Check your medication supply"
  ]
};

// Helper functions
const getColorByType = (type?: string): string => {
  const typeMap: Record<string, string> = {
    'medication': 'blue',
    'glucose_check': 'red',
    'meal': 'orange',
    'exercise': 'green',
    'appointment': 'purple',
    'review': 'cyan',
    'other': 'default'
  };
  return typeMap[type || 'other'] || 'default';
};

const getPriorityColor = (priority?: string): string => {
  const priorityMap: Record<string, string> = {
    'high': 'red',
    'medium': 'orange',
    'low': 'green'
  };
  return priorityMap[priority?.toLowerCase() || 'medium'] || 'orange';
};

const getDefaultContent = (category?: string): string => {
  if (!category) return 'Time to take your medication!';
  const templates = reminderTemplates[category] || reminderTemplates['Medication'];
  return templates[0] || 'Reminder time!';
};

interface InAppNotificationProps {
  reminder: Reminder;
  onComplete: (reminder: Reminder) => void;
  onSnooze: (reminder: Reminder, minutes: number) => void;
  onDismiss: () => void;
  onClose?: () => void; // Optional close handler
}

export default function InAppNotification({
  reminder,
  onComplete,
  onSnooze,
  onDismiss,
  onClose,
}: InAppNotificationProps) {
  const [visible, setVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent multiple modals - use CSS only, don't manually remove React-managed DOM nodes
  useEffect(() => {
    // Only use Modal.destroyAll() for Ant Design modals - but be careful not to destroy form modals
    // We'll rely on CSS to hide duplicate reminder modals instead of manually removing them
    
    // Mark this modal so CSS can identify it
    const timeout = setTimeout(() => {
      const modalRoots = document.querySelectorAll('.ant-modal-root');
      modalRoots.forEach((root) => {
        const hasInAppNotification = root.querySelector('.in-app-notification-modal');
        if (hasInAppNotification) {
          const modalContent = root.querySelector('.ant-modal-content');
          if (modalContent && modalContent.querySelector(`[data-reminder-id="${reminder.id}"]`)) {
            (root as HTMLElement).setAttribute('data-reminder-modal-id', `reminder-modal-${reminder.id}`);
          }
        }
      });
    }, 100);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [reminder.id]);
  
  // Stop sounds and visual alerts when component unmounts
  useEffect(() => {
    return () => {
      if (!isMuted) {
        reminderSound.stop();
      }
      stopVisualAlert();
    };
  }, [isMuted]);

  const [snoozeMinutes, setSnoozeMinutes] = useState(10);

  // Test sound button handler
  const handleTestSound = () => {
    reminderSound.playMultipleTimes(3, 800);
  };

  // Toggle mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      // Unmute: play gentle sound
      reminderSound.playPattern('gentle');
    } else {
      // Mute: stop all sounds
      reminderSound.stop();
    }
  };

  // Auto-dismiss after 60 seconds if user doesn't interact
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 60000); // 60 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const handleComplete = () => {
    reminderSound.stop();
    stopVisualAlert();
    setVisible(false);
    onComplete(reminder);
  };

  const handleSnooze = (minutes: number) => {
    reminderSound.stop();
    stopVisualAlert();
    setVisible(false);
    onSnooze(reminder, minutes);
  };

  const handleDismiss = () => {
    reminderSound.stop();
    stopVisualAlert();
    setVisible(false);
    onDismiss();
  };

  // Calculate next reminder time for snoozed reminders
  const getNextReminderTime = () => {
    if (reminder.snoozedUntil) {
      return new Date(reminder.snoozedUntil).toTimeString().slice(0, 5);
    }
    return reminder.time || reminder.scheduleTime || 'Now';
  };

  const reminderCategory = reminder.category || reminder.type || 'Medication';
  const reminderPriority = reminder.priority || 'medium';
  const reminderContent = reminder.content || reminder.message || reminder.title || getDefaultContent(reminderCategory);

  return (
      <Modal
        open={visible}
        onCancel={handleDismiss}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={500}
        className="in-app-notification-modal"
        zIndex={10000}
        data-reminder-id={reminder.id}
        getContainer={() => document.body}
      styles={{
        mask: { 
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999
        },
        body: { 
          padding: 24 
        },
        header: { 
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px'
        }
      }}
      title={
        <div className="alert-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="alert-icon" style={{ fontSize: 24 }}>⏰</span>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Reminder Alert</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="text"
              size="small"
              icon={<SoundOutlined />}
              onClick={handleTestSound}
              title="Test Sound"
            />
            <Button
              type="text"
              size="small"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="reminder-alert-content" style={{ marginBottom: 24 }}>
        {/* Reminder Type and Priority Tags */}
        <div className="reminder-type" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Tag color={getColorByType(reminder.type || reminder.category)}>
            {reminderCategory}
          </Tag>
          <Tag color={getPriorityColor(reminderPriority)}>
            {reminderPriority.toUpperCase()}
          </Tag>
        </div>

        {/* Reminder Message */}
        <h2 className="reminder-message" style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          marginBottom: 12,
          color: '#262626',
          lineHeight: 1.5
        }}>
          {reminderContent}
        </h2>

        {/* Reminder Time */}
        <p className="reminder-time" style={{ 
          color: '#8c8c8c', 
          marginBottom: 8,
          fontSize: 14
        }}>
          Scheduled for: {reminder.status === 'snoozed' ? getNextReminderTime() : (reminder.time || reminder.scheduleTime || 'Now')}
        </p>

        {/* Snooze Status */}
        {reminder.status === 'snoozed' && reminder.snoozedUntil && (
          <p className="snooze-info" style={{ 
            color: '#faad14', 
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500
          }}>
            💤 Snoozed until {getNextReminderTime()}
          </p>
        )}

        {/* Snooze Count */}
        {(reminder.snoozeCount && reminder.snoozeCount > 0) && (
          <p className="snooze-count" style={{ 
            color: '#8c8c8c', 
            marginBottom: 0,
            fontSize: 12
          }}>
            Already snoozed {reminder.snoozeCount} {reminder.snoozeCount === 1 ? 'time' : 'times'}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="alert-actions" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12 
      }}>
        {/* Complete Button */}
        <Button 
          type="primary" 
          size="large"
          onClick={handleComplete}
          icon={<CheckCircleOutlined />}
          block
          style={{ height: 48, fontSize: 16 }}
        >
          Mark as Complete
        </Button>

        {/* Snooze Group */}
        <div className="snooze-group" style={{ 
          display: 'flex', 
          gap: 8, 
          alignItems: 'center' 
        }}>
          <Select 
            value={snoozeMinutes}
            onChange={setSnoozeMinutes}
            style={{ width: 100 }}
          >
            <Option value={5}>5 min</Option>
            <Option value={10}>10 min</Option>
            <Option value={15}>15 min</Option>
            <Option value={30}>30 min</Option>
            <Option value={60}>1 hour</Option>
          </Select>
          <Button 
            onClick={() => handleSnooze(snoozeMinutes)}
            icon={<ClockCircleOutlined />}
            style={{ flex: 1 }}
          >
            Snooze
          </Button>
        </div>

        {/* Dismiss Button */}
        <Button 
          danger
          onClick={handleDismiss}
          block
        >
          Dismiss
        </Button>

        {/* Sound Test Button */}
        <div className="sound-test" style={{ 
          marginTop: 12, 
          paddingTop: 12, 
          borderTop: '1px dashed #e0e0e0',
          textAlign: 'center'
        }}>
          <Button
            type="text"
            size="small"
            icon={<SoundOutlined />}
            onClick={handleTestSound}
            style={{ color: '#666' }}
          >
            🔊 Test Sound
          </Button>
        </div>
      </div>
    </Modal>
  );
}

