import React from 'react';
import { Modal, Typography, Divider, Space, Tag } from 'antd';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export interface AISuggestion {
  reminderType?: string;
  currentTime?: string; // HH:mm
  suggestedTime?: string; // HH:mm
  reason?: string;
  snoozeRate?: number; // %
  avgDelay?: number; // minutes
  patternType?: string;
}

interface Props {
  open: boolean;
  suggestion: AISuggestion | null;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

const AIOptimizationDialog: React.FC<Props> = ({ open, suggestion, onAccept, onReject, onClose }) => {
  if (!suggestion) return null;

  const format = (t?: string) => t || '--:--';
  // Use browser's local time for "Current"
  const nowTime = dayjs().format('HH:mm');

  return (
    <Modal open={open} onOk={onAccept} onCancel={onClose} okText="Update time" cancelText="Close" title="AI Reminder Optimization">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text>We noticed frequent snoozes on this reminder.</Text>
        </div>
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>Suggested change</Title>
          <Text>Current: </Text>
          <Tag>{nowTime}</Tag>
          <Text> -&gt; New: </Text>
          <Tag color="green">{format(suggestion.suggestedTime)}</Tag>
        </div>
        <Divider style={{ margin: '8px 0' }} />
        <div>
          <Space size={12} wrap>
            <Tag color="red">Snooze rate: {suggestion.snoozeRate ?? 0}%</Tag>
            <Tag color="orange">Avg delay: {suggestion.avgDelay ?? 0} min</Tag>
            {suggestion.patternType && <Tag color="blue">Pattern: {suggestion.patternType}</Tag>}
          </Space>
        </div>
        {suggestion.reason && (
          <div>
            <Title level={5} style={{ marginTop: 8 }}>Why</Title>
            <Text>{suggestion.reason}</Text>
          </div>
        )}
      </Space>
      <Divider />
      <Space>
        <a onClick={onReject}>No, keep current time</a>
      </Space>
    </Modal>
  );
};

export default AIOptimizationDialog;


