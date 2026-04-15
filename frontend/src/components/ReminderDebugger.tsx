import React, { useState } from 'react';
import { Button, Card, Descriptions, Tag, Alert, Space, Spin, message } from 'antd';
import { BugOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import { diagnoseReminder } from '../utils/reminderDiagnostic';

interface ReminderDebuggerProps {
  reminderId: string;
  onClose?: () => void;
}

export const ReminderDebugger: React.FC<ReminderDebuggerProps> = ({ reminderId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkReminder = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[ReminderDebugger] Fetching reminder info for:', reminderId);
      
      // Use frontend diagnostic directly (more reliable)
      console.log('[ReminderDebugger] Using frontend diagnostic');
      
      try {
        const reminderResponse = await apiClient.get(`/reminders/${reminderId}`);
        const reminder = reminderResponse.data?.data || reminderResponse.data;
        
        if (!reminder) {
          throw new Error('Unable to fetch reminder information');
        }
        
        console.log('[ReminderDebugger] Reminder data:', reminder);
        
        // Use frontend diagnostic function
        const diagnosticResult = diagnoseReminder(reminder);
        console.log('[ReminderDebugger] Diagnostic result:', diagnosticResult);
        
        // Convert to display format
        const debugData = {
          success: true,
          reminder: {
            id: reminder.id,
            title: reminder.title,
            message: reminder.message,
            type: reminder.type,
            priority: reminder.priority,
          },
          checks: diagnosticResult,
          suggestion: diagnosticResult.suggestion
        };
        
        console.log('[ReminderDebugger] Setting debug data:', debugData);
        setDebugInfo(debugData);
        console.log('[ReminderDebugger] Debug info set successfully');
      } catch (fetchError: any) {
        console.error('[ReminderDebugger] Failed to fetch reminder:', fetchError);
        throw fetchError;
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      console.error('[ReminderDebugger] Error:', error);
      setError(errorMsg);
      message.error('Failed to get diagnostic information: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetReminder = async () => {
    setLoading(true);
    try {
      // Note: This function requires backend support, if it fails, notify the user
      try {
        await apiClient.post(`/reminders/reset/${reminderId}`);
        message.success('Reminder status has been reset! You can now trigger it again.');
      } catch (resetError: any) {
        if (resetError.response?.status === 401 || resetError.response?.status === 404) {
          message.warning('Reset function is temporarily unavailable. You can modify the reminder time to test again.');
        } else {
          throw resetError;
        }
      }
      // Re-check
      await checkReminder();
    } catch (error: any) {
      message.error('Reset failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (reminderId) {
      checkReminder();
    }
  }, [reminderId]);

  if (loading && !debugInfo && !error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Diagnosing reminder issue...</p>
        </div>
      </Card>
    );
  }

  if (error && !debugInfo) {
    return (
      <Card>
        <Alert
          message="Diagnostic Failed"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>Unable to get reminder diagnostic information: {error}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Reminder ID: {reminderId}
              </div>
              <Button onClick={checkReminder} loading={loading}>
                Retry
              </Button>
            </Space>
          }
          type="error"
          showIcon
        />
      </Card>
    );
  }

  console.log('[ReminderDebugger] Render check - loading:', loading, 'error:', error, 'debugInfo:', debugInfo);

  if (!debugInfo) {
    return (
      <Card>
        <Alert
          message="Loading"
          description={
            <Space direction="vertical">
              <div>Fetching diagnostic information...</div>
              <div style={{ fontSize: 12, color: '#999' }}>Reminder ID: {reminderId}</div>
              <div style={{ fontSize: 12, color: '#999' }}>
                Loading: {loading.toString()}, Error: {error || 'none'}
              </div>
            </Space>
          }
          type="info"
        />
      </Card>
    );
  }

  console.log('[ReminderDebugger] Rendering with debugInfo:', debugInfo);

  const { reminder, checks, suggestion } = debugInfo;
  const StatusIcon = checks.shouldTrigger ? CheckCircleOutlined : CloseCircleOutlined;
  const statusColor = checks.shouldTrigger ? 'success' : 'error';

  return (
    <div>
      <Card 
        title={
          <Space>
            <BugOutlined />
            Reminder Diagnostic Tool
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={checkReminder}
              loading={loading}
            >
              Recheck
            </Button>
            {onClose && (
              <Button onClick={onClose}>Close</Button>
            )}
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Overall status */}
          <Alert
            message={
              <Space>
                <StatusIcon style={{ fontSize: 18 }} />
                {checks.shouldTrigger ? '✅ Reminder configuration is normal' : '❌ Reminder cannot be triggered'}
              </Space>
            }
            description={suggestion}
            type={statusColor}
            showIcon={false}
          />

          {/* Reminder basic information */}
          <Card type="inner" title="Reminder Information" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Title">{reminder.title}</Descriptions.Item>
              <Descriptions.Item label="Message">{reminder.message}</Descriptions.Item>
              <Descriptions.Item label="Type">{reminder.type}</Descriptions.Item>
              <Descriptions.Item label="Priority">{reminder.priority}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Check details */}
          <Card type="inner" title="Diagnostic Details" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <CheckItem 
                label="Active Status" 
                value={checks.isActive} 
                expected={true}
              />
              <CheckItem 
                label="Time Match" 
                value={checks.timeMatches} 
                expected={true}
                details={`Scheduled time: ${checks.scheduleTime}, Current time: ${checks.currentTime}`}
              />
              <CheckItem 
                label="Date Range" 
                value={checks.isInDateRange} 
                expected={true}
                details={`Start: ${new Date(checks.startDate).toLocaleDateString()}, End: ${checks.endDate ? new Date(checks.endDate).toLocaleDateString() : 'Indefinite'}`}
              />
              <CheckItem 
                label="Day Match" 
                value={checks.isDayIncluded} 
                expected={true}
                details={`Schedule type: ${checks.scheduleType}, Configured days: [${checks.daysOfWeek.join(', ')}], Today is: ${checks.currentDayOfWeek}`}
              />
              <CheckItem 
                label="Not Triggered Today" 
                value={!checks.lastRemindedToday} 
                expected={true}
                details={checks.lastRemindedAt ? `Last reminded at: ${new Date(checks.lastRemindedAt).toLocaleString()}` : 'Never triggered'}
              />
            </Space>
          </Card>

          {/* Action buttons */}
          {checks.lastRemindedToday && (
            <Alert
              message="Already Triggered Today"
              description={
                <Space direction="vertical">
                  <div>The system only triggers once per day to avoid repeated reminders. If you want to test the reminder function, you can reset the reminder status.</div>
                  <Button 
                    type="primary" 
                    onClick={resetReminder}
                    loading={loading}
                  >
                    Reset Reminder Status (Allow Re-trigger)
                  </Button>
                </Space>
              }
              type="warning"
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

interface CheckItemProps {
  label: string;
  value: boolean;
  expected: boolean;
  details?: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ label, value, expected, details }) => {
  const isOk = value === expected;
  return (
    <div style={{ 
      padding: '8px 12px', 
      background: isOk ? '#f6ffed' : '#fff2e8',
      border: `1px solid ${isOk ? '#b7eb8f' : '#ffbb96'}`,
      borderRadius: 4
    }}>
      <Space direction="vertical" style={{ width: '100%' }} size={2}>
        <Space>
          <Tag color={isOk ? 'success' : 'error'}>
            {isOk ? '✓' : '✗'}
          </Tag>
          <strong>{label}</strong>
        </Space>
        {details && (
          <div style={{ marginLeft: 32, fontSize: 12, color: '#666' }}>
            {details}
          </div>
        )}
      </Space>
    </div>
  );
};

export default ReminderDebugger;
