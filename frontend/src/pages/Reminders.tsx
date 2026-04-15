import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './Reminders.css';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Space,
  Tag,
  message,
  Popconfirm,
  Checkbox,
  TimePicker,
  Alert,
  Row,
  Col,
  Typography,
  Badge,
  Tooltip,
  Statistic,
} from 'antd';
import {
  BellOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reminderAPI, Reminder, CreateReminderDto, NoResponseReminder } from '../api/reminder';
import reminderNotificationService from '../services/reminderNotificationService';
import ReminderPopup from '../components/reminder/ReminderPopup';
import AIOptimizationDialog, { AISuggestion } from '../components/ai/AIOptimizationDialog';
import { initSocket, getSocket } from '../utils/socket';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import apiClient from '../api/client';
import { requestNotificationPermission } from '../utils/notificationUtils';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

// 最近响应记录（顶层声明，避免未定义）
function RecentResponses() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      try {
        const resp = await apiClient.get('/reminders/responses/recent', { params: { limit: 20 } });
        // Handle response format: { data: [...] } or just [...]
        setItems(resp?.data || resp || []);
      } catch (error) {
        console.error('Failed to fetch recent responses:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();

    // 监听更新事件（snooze/complete后主动刷新）
    const handler = () => fetchRecent();
    window.addEventListener('checkins-update', handler);
    // 页面可见性变化时刷新
    const vis = () => { if (document.visibilityState === 'visible') fetchRecent(); };
    document.addEventListener('visibilitychange', vis);
    // 轻量轮询（每20秒）
    const poll = window.setInterval(fetchRecent, 20000);
    return () => {
      window.removeEventListener('checkins-update', handler);
      document.removeEventListener('visibilitychange', vis);
      window.clearInterval(poll);
    };
  }, []);

  // Helper to get reminder content from check-in
  const getReminderContent = (checkIn: any) => {
    // First try to get from reminder relation
    if (checkIn.reminder) {
      return checkIn.reminder.content || 
             checkIn.reminder.message || 
             checkIn.reminder.title || 
             checkIn.reminder.type || 
             'No description';
    }
    // Fallback to check-in's own content or type
    return checkIn.content || checkIn.type || 'No description';
  };

  // Helper to get action badge styling
  const getActionBadge = (action: string) => {
    const badges: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      complete: { color: 'success', text: '✅ Completed', icon: <CheckCircleOutlined /> },
      snooze: { color: 'warning', text: '💤 Snoozed', icon: <ClockCircleOutlined /> },
      dismiss: { color: 'default', text: '❌ Dismissed', icon: <CloseOutlined /> },
      triggered: { color: 'processing', text: '⏰ Triggered', icon: <BellOutlined /> },
    };
    return badges[action] || { color: 'default', text: action, icon: <InfoCircleOutlined /> };
  };

  return (
    <Table
      size="small"
      loading={loading}
      rowKey={(r) => r.id}
      dataSource={items}
      pagination={false}
      columns={[
        { 
          title: 'Content', 
          key: 'content',
          render: (_: any, record: any) => (
            <div className="content-cell" style={{ fontWeight: 500, color: '#333' }}>
              {getReminderContent(record)}
            </div>
          )
        },
        { 
          title: 'Action', 
          dataIndex: 'action',
          render: (action: string) => {
            const badge = getActionBadge(action);
            return (
              <span className={`action-badge ${action}`} style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                display: 'inline-block',
                ...(action === 'triggered' ? { background: '#d4edda', color: '#155724' } :
                    action === 'snooze' ? { background: '#fff3cd', color: '#856404' } :
                    action === 'complete' ? { background: '#cce5ff', color: '#004085' } :
                    action === 'dismiss' ? { background: '#f8d7da', color: '#721c24' } : {})
              }}>
                {badge.text}
              </span>
            );
          }
        },
        { 
          title: 'Scheduled Time', 
          key: 'scheduled',
          render: (_: any, record: any) => {
            const scheduledTime = record.scheduledTime 
              ? dayjs(record.scheduledTime).format('YYYY-MM-DD HH:mm')
              : (record.scheduled || '-');
            return <Text type="secondary">{scheduledTime}</Text>;
          }
        },
        { 
          title: 'Snooze', 
          dataIndex: 'snoozeDuration', 
          render: (v: any) => v ? `${v} min` : '-'
        },
        { 
          title: 'Delay', 
          dataIndex: 'responseDelay', 
          render: (v: any) => v ? `${v} min` : '-'
        },
      ]}
    />
  );
}

// Get reminder type icon
const getReminderIcon = (type: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    medication: <MedicineBoxOutlined style={{ color: '#1890ff' }} />,
    glucose_check: <HeartOutlined style={{ color: '#ff4d4f' }} />,
    meal: <BellOutlined style={{ color: '#52c41a' }} />,
    exercise: <HeartOutlined style={{ color: '#fa8c16' }} />,
    appointment: <CalendarOutlined style={{ color: '#722ed1' }} />,
    review: <ClockCircleOutlined style={{ color: '#eb2f96' }} />,
    other: <BellOutlined style={{ color: '#666' }} />,
  };
  return iconMap[type] || iconMap.other;
};

// Get urgent reminder status (接受当前时间作为参数以支持实时更新)
const getUrgentStatus = (reminder: Reminder, now: dayjs.Dayjs = dayjs()) => {
  const scheduleTime = now.hour(parseInt(reminder.scheduleTime.split(':')[0])).minute(parseInt(reminder.scheduleTime.split(':')[1]));
  let timeDiff = scheduleTime.diff(now, 'minute');
  
  // 如果时间已过，计算到明天的同一时间
  if (timeDiff < 0) {
    const tomorrowScheduleTime = scheduleTime.add(1, 'day');
    timeDiff = tomorrowScheduleTime.diff(now, 'minute');
  }
  
  // 如果是高优先级且时间临近（15分钟内），标记为紧急
  if (reminder.priority === 'high' && timeDiff >= 0 && timeDiff <= 15) {
    return { isUrgent: true, timeLeft: timeDiff };
  }
  return { isUrgent: false, timeLeft: timeDiff };
};

export const Reminders: React.FC = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [activeReminderPopup, setActiveReminderPopup] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [snoozedNextTimes, setSnoozedNextTimes] = useState<Record<string, string>>({});
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const authStore = useAuthStore();

  // 实时更新时间（每10秒更新一次）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 10000); // 每10秒更新一次

    return () => clearInterval(timer);
  }, []);

  // 监听AI建议事件
  useEffect(() => {
    const handler = (e: any) => {
      setAiSuggestion(e.detail || null);
      setAiDialogOpen(true);
    };
    window.addEventListener('ai-suggestion', handler as EventListener);
    return () => window.removeEventListener('ai-suggestion', handler as EventListener);
  }, []);

  // Get reminder list
  const { data: reminders, isLoading, error } = useQuery({
    queryKey: ['reminders', 'v2'], // 更改查询键强制重新获取
    queryFn: reminderAPI.getReminders,
    retry: 2,
    retryDelay: 1000,
    staleTime: 0, // 禁用缓存，始终视为过期
    gcTime: 0, // 立即清理缓存
    refetchOnMount: 'always', // 总是重新获取
    refetchOnWindowFocus: false,
  });

  // Get reminders that need special attention (no response for 3 consecutive times)
  const { data: noResponseReminders, isLoading: noResponseLoading } = useQuery({
    queryKey: ['no-response-reminders', 'v2'],
    queryFn: reminderAPI.getNoResponseReminders,
    retry: 2,
    retryDelay: 1000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Initialize reminder notification service
  useEffect(() => {
    if (authStore.user?.id) {
      const socket = initSocket();
      reminderNotificationService.init(authStore.user.id, socket);
      
      // Listen for reminder notifications
      const handleReminderNotification = (event: CustomEvent) => {
        setActiveReminderPopup(event.detail);
      };
      
      window.addEventListener('reminder-notification', handleReminderNotification as EventListener);
      
      return () => {
        window.removeEventListener('reminder-notification', handleReminderNotification as EventListener);
        reminderNotificationService.stop();
      };
    }
  }, [authStore.user?.id]);

  // Test reminder trigger
  const handleTestReminder = async () => {
    // Request notification permission first
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Create a test reminder that triggers immediately
    const testReminder: Reminder = {
      id: 'test-' + Date.now(),
      content: 'This is a test reminder - Remember to check your blood sugar!',
      time: new Date().toTimeString().slice(0, 5),
      type: 'medication',
      priority: 'high',
    };

    // Delay 2 seconds before triggering (give user time to prepare)
    setTimeout(async () => {
      // 1. Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Diabetes Management Reminder ⏰', {
          body: testReminder.content,
          icon: '/logo.png',
          requireInteraction: true,
          tag: testReminder.id,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } else {
        message.warning('Notification permission not granted. Please enable notifications in your browser settings.');
      }

      // 2. In-app alert
      message.info(`⏰ Reminder: ${testReminder.content}`, 5);

      // 3. Play sound
      try {
        const audio = new Audio('/sounds/reminder.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback beep using Web Audio API
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        });
      } catch (error) {
        console.log('Could not play sound:', error);
      }

      // 4. Create a test check-in record
      try {
        await apiClient.post('/check-ins/auto-create', {
          reminderId: testReminder.id,
          triggeredAt: new Date().toISOString(),
          status: 'pending',
        });
        message.success('Test reminder check-in record created!');
      } catch (error: any) {
        console.error('Failed to create test check-in:', error);
      }
    }, 2000); // 2 second delay

    message.info('Test reminder will trigger in 2 seconds...');
  };

// Recent response records component (function declaration hoisted to avoid undefined before use)
function RecentResponses() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      try {
        const resp = await apiClient.get('/reminders/responses/recent', { params: { limit: 20 } });
        setItems(resp?.data || resp || []);
      } catch (error) {
        console.error('Failed to fetch recent responses:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();

    // Listen for update events (refresh after snooze/complete)
    const handler = () => fetchRecent();
    window.addEventListener('checkins-update', handler);
    
    // Refresh when page becomes visible
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        fetchRecent();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Lightweight polling (every 20 seconds)
    const poll = setInterval(fetchRecent, 20000);
    
    return () => {
      window.removeEventListener('checkins-update', handler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      clearInterval(poll);
    };
  }, []);

  return (
    <Table
      size="small"
      loading={loading}
      rowKey={(r) => r.id}
      dataSource={items}
      pagination={false}
      columns={[
        { title: 'Action', dataIndex: 'action' },
        { title: 'Scheduled', dataIndex: 'scheduledTime', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
        { title: 'Responded', dataIndex: 'actualResponseTime', render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
        { title: 'Snooze (min)', dataIndex: 'snoozeDuration', render: (v: any) => v ?? '-' },
        { title: 'Delay (min)', dataIndex: 'responseDelay', render: (v: any) => v ?? '-' },
      ]}
    />
  );
}

  // Handle reminder popup actions
  const handleReminderComplete = async () => {
    if (activeReminderPopup) {
      const reminderId = activeReminderPopup.id || activeReminderPopup.reminder?.id;
      if (!reminderId) {
        console.error('Cannot complete reminder: ID is missing', activeReminderPopup);
        message.error('Cannot complete reminder: ID is missing');
        return;
      }
      console.log('Completing reminder with ID:', reminderId);
      await completeMutation.mutateAsync({
        id: reminderId,
        skipped: false
      });
      setActiveReminderPopup(null);
    }
  };

  const handleReminderSnooze = async (minutes: number) => {
    if (!activeReminderPopup) return;
    
    try {
      const now = new Date();
      const snoozedUntil = new Date(now.getTime() + minutes * 60 * 1000);

      // Update backend
      await apiClient.post('/reminders/trigger', {
        reminderId: activeReminderPopup.id,
        action: 'snooze',
        snoozeMinutes: minutes,
      });

      // Update frontend reminder state
      queryClient.setQueryData(['reminders', 'v2'], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((r: Reminder) => {
          if (r.id === activeReminderPopup.id) {
            return {
              ...r,
              status: 'Snoozed' as any,
              isSnoozed: true,
              snoozeUntil: snoozedUntil.toISOString(),
              nextTriggerTime: snoozedUntil.toLocaleTimeString()
            };
          }
          return r;
        });
      });

      // Update local state for display
      const nextTime = dayjs().add(minutes, 'minute').format('HH:mm');
      setSnoozedNextTimes(prev => ({ ...prev, [activeReminderPopup.id]: nextTime }));

      // Create check-in record
      try {
        await apiClient.post('/check-ins/auto-create', {
          reminderId: activeReminderPopup.id,
          triggeredAt: now.toISOString(),
          action: 'snooze',
          snoozeMinutes: minutes
        });
      } catch (checkInError) {
        console.error('Failed to create snooze check-in:', checkInError);
      }

      // Schedule to clear snooze status after period
      setTimeout(() => {
        queryClient.setQueryData(['reminders', 'v2'], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((r: Reminder) => {
            if (r.id === activeReminderPopup.id) {
              return {
                ...r,
                status: 'Enabled' as any,
                isSnoozed: false,
                snoozeUntil: null
              };
            }
            return r;
          });
        });
        // Re-trigger the reminder after snooze period
        if (reminderNotificationService) {
          reminderNotificationService.scheduleSnooze(activeReminderPopup, minutes);
        }
      }, minutes * 60 * 1000);

      message.info(`Reminder snoozed for ${minutes} minutes`);
      setActiveReminderPopup(null);
    } catch (error: any) {
      console.error('Snooze failed:', error);
      message.error('Failed to snooze reminder');
    }
  };

  const handleReminderDismiss = () => {
    setActiveReminderPopup(null);
  };

  // Ensure data fetching is triggered when component mounts
  useEffect(() => {
    console.log('=== Reminders Component State ===');
    console.log('reminders data:', reminders);
    console.log('reminders type:', typeof reminders);
    console.log('is reminders array?', Array.isArray(reminders));
    console.log('isLoading:', isLoading);
    console.log('error:', error);
    console.log('================================');
  }, [reminders, isLoading, error]);

  // Create reminder
  const createMutation = useMutation({
    mutationFn: reminderAPI.createReminder,
    onSuccess: () => {
      message.success(t('reminders.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['reminders', 'v2'] });
      handleCloseModal();
    },
    onError: () => {
      message.error(t('reminders.createFailed'));
    },
  });

  // Update reminder
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateReminderDto> }) =>
      reminderAPI.updateReminder(id, data),
    onSuccess: () => {
      message.success(t('reminders.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['reminders', 'v2'] });
      handleCloseModal();
    },
    onError: () => {
      message.error(t('reminders.updateFailed'));
    },
  });

  // Delete reminder
  const deleteMutation = useMutation({
    mutationFn: reminderAPI.deleteReminder,
    onSuccess: () => {
      message.success(t('reminders.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['reminders', 'v2'] });
    },
    onError: () => {
      message.error(t('reminders.deleteFailed'));
    },
  });

  // Mark as complete
  const completeMutation = useMutation({
    mutationFn: ({ id, note, skipped }: { id: string; note?: string; skipped?: boolean }) =>
      reminderAPI.completeReminder(id, note, skipped),
    onSuccess: (data, variables) => {
      // Encouraging completion feedback
      const completionMessages = [
        t('reminders.completionMessage1'),
        t('reminders.completionMessage2'),
        t('reminders.completionMessage3'),
        t('reminders.completionMessage4'),
        t('reminders.completionMessage5'),
        t('reminders.completionMessage6'),
        t('reminders.completionMessage7')
      ];
      const randomMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];
      message.success(randomMessage);
      
      // 查找该提醒是否为一次性提醒，如果是则删除
      const remindersList = Array.isArray(reminders) ? reminders : (reminders?.data || []);
      const completedReminder = remindersList.find((r: Reminder) => r.id === variables.id);
      
      if (completedReminder && completedReminder.scheduleType === 'once') {
        // 一次性提醒完成后删除
        setTimeout(() => {
          deleteMutation.mutate(variables.id, {
            onSuccess: () => {
              console.log('One-time reminder deleted after completion');
            }
          });
        }, 300);
      }
      
      queryClient.invalidateQueries({ queryKey: ['reminders', 'v2'] });
      queryClient.invalidateQueries({ queryKey: ['no-response-reminders', 'v2'] });
      queryClient.invalidateQueries({ queryKey: ['medications'] }); // 刷新药物库存
    },
  });

  // Skip reminder
  const skipMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      reminderAPI.skipReminder(id, note),
    onSuccess: () => {
      // Gentle encouraging prompts
      const encouragementMessages = [
        t('reminders.encouragementMessage1'),
        t('reminders.encouragementMessage2'),
        t('reminders.encouragementMessage3'),
        t('reminders.encouragementMessage4'),
        t('reminders.encouragementMessage5'),
        t('reminders.encouragementMessage6'),
        t('reminders.encouragementMessage7')
      ];
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      message.info(randomMessage);
      queryClient.invalidateQueries({ queryKey: ['reminders', 'v2'] });
      queryClient.invalidateQueries({ queryKey: ['no-response-reminders', 'v2'] });
    },
  });

  const handleOpenModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder(reminder);
      form.setFieldsValue({
        ...reminder,
        scheduleTime: dayjs(reminder.scheduleTime, 'HH:mm'),
        startDate: dayjs(reminder.startDate),
        endDate: reminder.endDate ? dayjs(reminder.endDate) : undefined,
      });
    } else {
      setEditingReminder(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
    form.resetFields();
  };

  // Removed per UX simplification: use single Create button + type selection

  // Reminder content templates
  const reminderTemplates: Record<string, string[]> = {
    medication: [
      "Time to take your diabetes medication",
      "Don't forget your Metformin dose",
      "Take your insulin as prescribed",
      "Remember to take your medication with food"
    ],
    glucose_check: [
      "Time to check your blood sugar level",
      "Monitor your glucose now",
      "Daily blood sugar check reminder",
      "Test your blood sugar before meals"
    ],
    exercise: [
      "Time for your daily exercise",
      "30 minutes of physical activity",
      "Go for a walk to help manage blood sugar",
      "Exercise helps control diabetes"
    ],
    appointment: [
      "Doctor appointment reminder",
      "Time to schedule your check-up",
      "Review your health progress",
      "Check your medication supply"
    ]
  };

  const handleTypeChange = (type: string) => {
    // If it's a followup reminder and not editing an existing reminder, auto-fill default values
    if (type === 'appointment' && !editingReminder) {
      const now = dayjs();
      const sixMonthsLater = now.add(6, 'month');
      
      form.setFieldsValue({
        title: t('reminders.followupTitle'),
        message: t('reminders.followupMessage'),
        priority: 'high',
        scheduleType: 'once',
        scheduleTime: dayjs('09:00', 'HH:mm'),
        startDate: now,
        endDate: sixMonthsLater,
      });
    }

    // Auto-fill reminder content from templates if not editing
    if (!editingReminder && reminderTemplates[type]) {
      const templates = reminderTemplates[type];
      const currentMessage = form.getFieldValue('message');
      
      // Only auto-fill if message is empty
      if (!currentMessage && templates.length > 0) {
        const randomContent = templates[Math.floor(Math.random() * templates.length)];
        form.setFieldsValue({
          message: randomContent,
          title: randomContent.length > 50 ? randomContent.substring(0, 50) + '...' : randomContent
        });
      }
    }
  };

  // Removed per UX simplification: use single Create button + type selection

  const handleSkipWithEncouragement = (reminder: Reminder) => {
    Modal.confirm({
      title: t('reminders.skipModalTitle'),
      content: (
        <div>
          <p>{t('reminders.skipModalContent1')}</p>
          <p>{t('reminders.skipModalContent2')}</p>
          <p>{t('reminders.skipModalContent3')}</p>
        </div>
      ),
      okText: t('reminders.skipModalOkText'),
      cancelText: t('reminders.skipModalCancelText'),
      icon: null,
      onOk: () => {
        skipMutation.mutate({ id: reminder.id });
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateReminderDto = {
        ...values,
        scheduleTime: values.scheduleTime.format('HH:mm'),
        startDate: values.startDate?.toISOString() || new Date().toISOString(),
        endDate: values.endDate?.toISOString(),
        daysOfWeek: values.daysOfWeek || [],
      };

      if (editingReminder) {
        updateMutation.mutate({ id: editingReminder.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const typeLabels: Record<string, string> = {
    medication: t('reminders.medication'),
    glucose_check: t('reminders.bloodSugar'),
    meal: t('reminders.meal'),
    exercise: t('reminders.exercise'),
    appointment: t('reminders.appointment'),
    review: t('reminders.reviewReminder'),
    other: t('common.other'),
  };

  const scheduleTypeLabels: Record<string, string> = {
    once: t('reminders.once'),
    daily: t('reminders.daily'),
    weekly: t('reminders.weekly'),
    custom: t('reminders.custom'),
  };

  const priorityColors: Record<string, string> = {
    low: 'blue',
    medium: 'orange',
    high: 'red',
  };

  const weekDays = [t('reminders.sunday'), t('reminders.monday'), t('reminders.tuesday'), t('reminders.wednesday'), t('reminders.thursday'), t('reminders.friday'), t('reminders.saturday')];

  const columns = [
    {
      title: t('reminders.reminderContent'),
      key: 'content',
      render: (record: Reminder) => {
        // Calculate review countdown
        const getReviewCountdown = (reminder: Reminder) => {
          if (reminder.type !== 'review') return null;
          
          const startDate = dayjs(reminder.startDate);
          const sixMonthsLater = startDate.add(6, 'month');
          const now = dayjs();
          const daysRemaining = sixMonthsLater.diff(now, 'day');
          
          return daysRemaining;
        };

        const daysRemaining = getReviewCountdown(record);
        
        // Check if currently snoozed
        const isCurrentlySnoozed = () => {
          const snoozeUntil = (record as any).snoozeUntil;
          if (!snoozeUntil) return false;
          return dayjs() < dayjs(snoozeUntil);
        };
        
        const currentlySnoozed = isCurrentlySnoozed();
        const snoozeUntil = (record as any).snoozeUntil;
        
        const effectiveRecordForUrgency = {
          ...record,
          scheduleTime: snoozedNextTimes[record.id] || record.scheduleTime,
        } as Reminder;
        const urgentStatus = getUrgentStatus(effectiveRecordForUrgency, currentTime);
        
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {getReminderIcon(record.type)}
              <span className="font-semibold" style={{ color: urgentStatus.isUrgent ? '#ff4d4f' : 'inherit' }}>
                {record.title || record.message}
              </span>
              {urgentStatus.isUrgent && (
                <Badge 
                  count={t('reminders.urgent')} 
                  style={{ backgroundColor: '#ff4d4f' }}
                  title={t('reminders.timeLeftMinutes', { minutes: urgentStatus.timeLeft })}
                />
              )}
            </div>
            <div className="text-sm text-gray-600" style={{ marginBottom: 8 }}>
              {record.message}
              {/* Display Snooze status */}
              {currentlySnoozed && snoozeUntil && (
                <span className="snooze-badge" style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  marginLeft: '8px',
                  fontWeight: '500'
                }}>
                  💤 Snoozed until {dayjs(snoozeUntil).format('HH:mm')}
                </span>
              )}
            </div>
            {daysRemaining !== null && (
              <div className="text-sm" style={{ 
                color: daysRemaining <= 7 ? '#ff4d4f' : daysRemaining <= 30 ? '#faad14' : '#52c41a',
                fontWeight: 'bold',
                marginBottom: 8
              }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {t('reminders.daysUntilNextReview', { days: Math.max(0, daysRemaining) })}
              </div>
            )}
            <div className="mt-1">
              <Tag color={priorityColors[record.priority]} icon={
                record.priority === 'high' ? <ExclamationCircleOutlined /> : 
                record.priority === 'medium' ? <InfoCircleOutlined /> : undefined
              }>
                {record.priority === 'low' ? t('reminders.low') : record.priority === 'medium' ? t('reminders.medium') : t('reminders.high')}
              </Tag>
              <Tag icon={getReminderIcon(record.type)}>{typeLabels[record.type]}</Tag>
              {/* Snooze status tag */}
              {currentlySnoozed && (
                <Tag color="gold" className="status-tag-snoozing">Snoozing</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: t('reminders.reminderTime'),
      key: 'schedule',
      render: (record: Reminder) => {
        // Check if currently snoozed
        const isCurrentlySnoozed = () => {
          const snoozeUntil = (record as any).snoozeUntil;
          if (!snoozeUntil) return false;
          return dayjs() < dayjs(snoozeUntil);
        };
        
        const currentlySnoozed = isCurrentlySnoozed();
        const snoozeUntil = (record as any).snoozeUntil;
        const displayTime = currentlySnoozed && snoozeUntil 
          ? dayjs(snoozeUntil).format('HH:mm') 
          : (snoozedNextTimes[record.id] || record.scheduleTime);
        
        const effectiveRecord = { ...record, scheduleTime: displayTime } as Reminder;
        const urgentStatus = getUrgentStatus(effectiveRecord, currentTime);
        return (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              color: urgentStatus.isUrgent ? '#ff4d4f' : 'inherit',
              fontWeight: urgentStatus.isUrgent ? 'bold' : 'normal'
            }}>
              <ClockCircleOutlined />
              ⏰ {displayTime}
              {urgentStatus.isUrgent && (
                <Tooltip title={t('reminders.timeLeftMinutes', { minutes: urgentStatus.timeLeft })}>
                  <Badge count={t('reminders.urgent')} style={{ backgroundColor: '#ff4d4f', fontSize: '10px' }} />
                </Tooltip>
              )}
            </div>
            <div className="text-sm text-gray-600" style={{ marginTop: 8 }}>
              <Space size={8} wrap>
                <Tag color="blue">{scheduleTypeLabels[record.scheduleType]}</Tag>
                {currentlySnoozed && (
                  <Tag color="gold">Snoozed</Tag>
                )}
              </Space>
              {record.scheduleType === 'weekly' && record.daysOfWeek.length > 0 && (
                <div className="mt-1">
                  {record.daysOfWeek.map((day) => (
                    <Tag key={day} color="cyan">
                      {weekDays[day]}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: t('reminders.validityPeriod'),
      key: 'validity',
      render: (record: Reminder) => (
        <div className="text-sm">
          <div>{t('reminders.start')}: {dayjs(record.startDate).format('YYYY-MM-DD')}</div>
          {record.endDate && (
            <div>{t('reminders.end')}: {dayjs(record.endDate).format('YYYY-MM-DD')}</div>
          )}
        </div>
      ),
    },
    {
      title: t('reminders.status'),
      key: 'status',
      render: (record: Reminder) => {
        // Check if currently snoozed
        const isCurrentlySnoozed = () => {
          const snoozeUntil = (record as any).snoozeUntil;
          if (!snoozeUntil) return false;
          return dayjs() < dayjs(snoozeUntil);
        };
        
        const currentlySnoozed = isCurrentlySnoozed();
        const status = currentlySnoozed ? 'snoozed' : (record.isActive ? 'enabled' : 'disabled');
        
        return (
          <span className={`status ${status}`} style={{
            background: currentlySnoozed ? '#ffe4b5' : (record.isActive ? '#d4edda' : '#f8f9fa'),
            color: currentlySnoozed ? '#ff8c00' : (record.isActive ? '#155724' : '#6c757d'),
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {currentlySnoozed ? 'Snoozed' : (record.isActive ? t('reminders.enabled') : t('reminders.disabled'))}
          </span>
        );
      },
    },
    {
      title: t('reminders.actions'),
      key: 'actions',
      render: (record: Reminder) => (
        <Space>
          <Button
            icon={<CheckOutlined />}
            size="small"
            type="primary"
            onClick={() => completeMutation.mutate({ id: record.id })}
            loading={completeMutation.isPending}
          >
            {t('reminders.complete')}
          </Button>
          <Button
            icon={<CloseOutlined />}
            size="small"
            onClick={() => handleSkipWithEncouragement(record)}
            loading={skipMutation.isPending}
          >
            {t('reminders.incomplete')}
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenModal(record)}
          >
            {t('reminders.edit')}
          </Button>
          <Popconfirm
            title={t('reminders.confirmDelete')}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText={t('reminders.confirm')}
            cancelText={t('reminders.cancel')}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              {t('reminders.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 在数据加载时显示加载状态 - 只在真正需要等待时显示
  if (isLoading && !reminders) {
    return (
      <div className="p-6 flex justify-center items-center" style={{ minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <BellOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <div style={{ fontSize: 18, color: '#666' }}>{t('reminders.loading')}</div>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="p-6">
        <Alert
          message={t('reminders.loadFailed')}
          description={
            <div>
              <p>{t('reminders.loadFailedDescription')}</p>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>{t('reminders.checkBackendService')}</li>
                <li>{t('reminders.checkNetworkConnection')}</li>
                <li>{t('reminders.checkLoginStatus')}</li>
              </ul>
              <p style={{ marginTop: 16 }}>{t('reminders.errorMessage')}: {(error as Error).message}</p>
            </div>
          }
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              {t('reminders.refreshPage')}
            </Button>
          }
        />
      </div>
    );
  }

  // 确保 reminders 是数组 - 处理可能的对象格式
  const remindersList: Reminder[] = Array.isArray(reminders) 
    ? reminders 
    : (reminders && typeof reminders === 'object' && Array.isArray((reminders as any).data))
      ? (reminders as any).data
      : [];
  
  console.log('📋 remindersList:', remindersList);
  console.log('📋 remindersList length:', remindersList.length);
  
  // 获取今日完成状态（需要检查今天的完成记录）
  const getReminderTodayCompleted = (reminder: Reminder): boolean => {
    if (!reminder.completions || reminder.completions.length === 0) {
      return false;
    }
    const today = currentTime.format('YYYY-MM-DD');
    return reminder.completions.some((completion: any) => {
      const completedDate = dayjs(completion.completedAt).format('YYYY-MM-DD');
      return completedDate === today && !completion.skipped;
    });
  };

  // 排序提醒：未完成的在前，已完成的在后
  const activeReminders = remindersList
    .filter((r: Reminder) => r.isActive)
    .sort((a: Reminder, b: Reminder) => {
      const aCompleted = getReminderTodayCompleted(a);
      const bCompleted = getReminderTodayCompleted(b);
      
      // 未完成的排在前面
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      
      // 如果都是相同状态，按优先级和时间排序
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - 
                          (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
      if (priorityDiff !== 0) return priorityDiff;
      
      // 最后按时间排序
      return a.scheduleTime.localeCompare(b.scheduleTime);
    });
  
  const inactiveReminders = remindersList.filter((r: Reminder) => !r.isActive);

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={1} style={{ marginBottom: 8, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🕐 {t('reminders.center')}
          </Title>
          <LanguageSwitcher />
        </div>
        <Text type="secondary" style={{ fontSize: 16 }}>
          {t('reminders.subtitle')}
        </Text>
      </div>

      <Alert
        message={t('reminders.guidance')}
        description={t('reminders.guidanceDescription')}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        icon={<InfoCircleOutlined />}
      />

      <div className="mb-6">
        <Title level={3} style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
          <BellOutlined className="mr-2" style={{ color: '#1890ff' }} />
          {t('reminders.management')}
        </Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={24}>
            <Button
              block
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
              style={{ height: '48px', fontSize: '15px' }}
            >
              {t('reminders.createCustom')}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Test Reminder Button - helps verify notifications quickly */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Test Notification</Text>
          <Space>
            <Button 
              onClick={handleTestReminder} 
              icon={<BellOutlined />}
            >
              Test Reminder Notification
            </Button>
            <Button
              onClick={async () => {
                const hasPermission = await requestNotificationPermission();
                if (hasPermission) {
                  message.success('Notification permission granted!');
                } else {
                  message.warning('Notification permission denied. Please enable it in your browser settings.');
                }
              }}
            >
              Request Notification Permission
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Reminder Popup */}
      {activeReminderPopup && (
        <ReminderPopup
          reminder={activeReminderPopup}
          onComplete={handleReminderComplete}
          onSnooze={handleReminderSnooze}
          onDismiss={handleReminderDismiss}
        />
      )}

      {/* AI 优化建议弹窗 */}
      <AIOptimizationDialog
        open={aiDialogOpen}
        suggestion={aiSuggestion}
        onAccept={() => {
          // 如果有建议时间，试着更新当前编辑的提醒或忽略
          if (aiSuggestion?.suggestedTime && activeReminders[0]) {
            // 简化：将第一个提醒示例更新为建议时间（实际可在弹窗传入具体 reminderId）
            const target = activeReminders[0];
            updateMutation.mutate({ id: target.id, data: { scheduleTime: aiSuggestion.suggestedTime } });
          }
          setAiDialogOpen(false);
        }}
        onReject={() => setAiDialogOpen(false)}
        onClose={() => setAiDialogOpen(false)}
      />

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('reminders.totalReminders')}
              value={activeReminders.length}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('reminders.highPriorityReminders')}
              value={activeReminders.filter((r: Reminder) => r.priority === 'high').length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={'Medium Priority Reminders'}
              value={activeReminders.filter((r: Reminder) => r.priority === 'medium').length}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={'Low Priority Reminders'}
              value={activeReminders.filter((r: Reminder) => r.priority === 'low').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 需要特别关注的提醒 */}
      {noResponseReminders && noResponseReminders.length > 0 && (
        <Card 
          title={t('reminders.remindersNeedingAttention')} 
          style={{ marginBottom: 24, borderColor: '#ff7875' }}
          headStyle={{ backgroundColor: '#fff2f0', borderBottom: '1px solid #ffccc7' }}
        >
          <Alert
            message={t('reminders.noResponseAlertMessage')}
            description={t('reminders.noResponseAlertDescription')}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <div className="space-y-4">
            {noResponseReminders.map((reminder: NoResponseReminder) => (
              <div key={reminder.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag color="orange">{t('reminders.noResponseCount', { count: reminder.noResponseCount })}</Tag>
                      <Tag color={reminder.priority === 'high' ? 'red' : reminder.priority === 'medium' ? 'orange' : 'blue'}>
                        {reminder.priority === 'high' ? t('reminders.high') : reminder.priority === 'medium' ? t('reminders.medium') : t('reminders.low')}
                      </Tag>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{reminder.title}</h4>
                    <p className="text-gray-600 text-sm mb-2">{reminder.message}</p>
                    {reminder.lastRemindedAt && (
                      <p className="text-xs text-gray-500">
                        {t('reminders.lastReminderTime')}: {dayjs(reminder.lastRemindedAt).format('YYYY-MM-DD HH:mm')}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <Space>
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={() => completeMutation.mutate({ id: reminder.id })}
                      >
                        {t('reminders.handleImmediately')}
                      </Button>
                    </Space>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 我的打卡/行为记录 */}
      <Card title="My Check-ins" style={{ marginBottom: 24 }}>
        <RecentResponses />
      </Card>

      {/* 提醒列表 */}
      <Card title={t('reminders.myReminders')}>
        <Table
          columns={columns}
          dataSource={remindersList}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => t('reminders.totalRemindersCount', { count: total }),
          }}
        />
      </Card>

      {/* 添加/编辑提醒模态框 */}
      <Modal
        title={editingReminder ? t('reminders.editReminder') : t('reminders.createReminder')}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={700}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="type"
            label={t('reminders.reminderType')}
            rules={[{ required: true, message: t('reminders.selectReminderType') }]}
            >
              <Select 
              placeholder={t('reminders.selectType')}
              onChange={(value) => handleTypeChange(value)}
            >
              <Option value="medication">Medication</Option>
              <Option value="glucose_check">Blood Sugar Check</Option>
              <Option value="exercise">Exercise</Option>
              <Option value="followup">Followup</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label={t('reminders.title')}
            rules={[{ required: true, message: t('reminders.enterReminderTitle') }]}
          >
            <Input placeholder={t('reminders.titlePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="message"
            label={t('reminders.message')}
            rules={[{ required: true, message: t('reminders.enterReminderMessage') }]}
          >
            <div>
              <TextArea 
                rows={3} 
                placeholder={t('reminders.messagePlaceholder')}
              />
              {form.getFieldValue('type') && reminderTemplates[form.getFieldValue('type')] && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                    Quick templates:
                  </Text>
                  <Space wrap size={[8, 8]}>
                    {reminderTemplates[form.getFieldValue('type')].map((template) => (
                      <Button
                        key={template}
                        size="small"
                        type="link"
                        onClick={() => {
                          form.setFieldsValue({ 
                            message: template,
                            title: template.length > 50 ? template.substring(0, 50) + '...' : template
                          });
                        }}
                      >
                        {template.length > 40 ? template.substring(0, 40) + '...' : template}
                      </Button>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item name="priority" label={t('reminders.priority')} initialValue="medium">
            <Select>
              <Option value="low">{t('reminders.low')}</Option>
              <Option value="medium">{t('reminders.medium')}</Option>
              <Option value="high">{t('reminders.high')}</Option>
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="scheduleType"
              label={t('reminders.scheduleType')}
              rules={[{ required: true, message: t('reminders.selectScheduleType') }]}
            >
              <Select placeholder={t('reminders.selectFrequency')}>
                <Option value="once">{t('reminders.once')}</Option>
                <Option value="daily">{t('reminders.daily')}</Option>
                <Option value="weekly">{t('reminders.weekly')}</Option>
                <Option value="custom">{t('reminders.custom')}</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="scheduleTime"
              label={t('reminders.scheduleTime')}
              rules={[{ required: true, message: t('reminders.selectScheduleTime') }]}
            >
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.scheduleType !== currentValues.scheduleType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('scheduleType') === 'weekly' ? (
                <Form.Item name="daysOfWeek" label={t('reminders.daysOfWeek')}>
                  <Checkbox.Group>
                    {weekDays.map((day, index) => (
                      <Checkbox key={index} value={index}>
                        {day}
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="startDate" label={t('reminders.startDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="endDate" label={t('reminders.endDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="isActive" label={t('reminders.isActive')} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reminders;

