import { Modal, Steps, Button, Space } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

interface WelcomeGuideProps {
  visible: boolean;
  onClose: () => void;
}

export default function WelcomeGuide({ visible, onClose }: WelcomeGuideProps) {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      title: '欢迎使用',
      icon: <CheckCircleOutlined />,
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <h2>欢迎来到糖尿病患者支持平台！</h2>
          <p style={{ fontSize: 16, color: '#666', marginTop: 16 }}>
            我们将帮助您更好地管理您的健康
          </p>
          <p style={{ fontSize: 14, color: '#999' }}>
            让我们开始一个简短的引导，了解平台的主要功能
          </p>
        </div>
      ),
    },
    {
      title: '完善档案',
      icon: <UserOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <h3>第一步：完善个人健康档案</h3>
          <p style={{ color: '#666', marginTop: 16 }}>
            建议您先完善个人健康档案，包括：
          </p>
          <ul style={{ marginTop: 12, fontSize: 14 }}>
            <li>基本信息（姓名、性别、出生日期等）</li>
            <li>糖尿病类型和诊断日期</li>
            <li>血糖指标（HbA1c、空腹血糖等）</li>
            <li>过敏史和饮食偏好</li>
            <li>活动水平</li>
          </ul>
          <p style={{ color: '#999', marginTop: 16, fontSize: 13 }}>
            这些信息将帮助系统为您生成更个性化的膳食计划
          </p>
        </div>
      ),
    },
    {
      title: '膳食计划',
      icon: <FileTextOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <h3>第二步：生成个性化膳食计划</h3>
          <p style={{ color: '#666', marginTop: 16 }}>
            系统会根据您的健康档案，生成适合您的膳食计划：
          </p>
          <ul style={{ marginTop: 12, fontSize: 14 }}>
            <li>自定义计划天数（1-30天）</li>
            <li>设置目标热量</li>
            <li>查看详细的营养成分</li>
            <li>获取每日食谱和烹饪建议</li>
          </ul>
          <p style={{ color: '#999', marginTop: 16, fontSize: 13 }}>
            您可以随时生成新的膳食计划或查看历史记录
          </p>
        </div>
      ),
    },
    {
      title: '产品搜索',
      icon: <ShoppingOutlined />,
      content: (
        <div style={{ padding: '20px 0' }}>
          <h3>第三步：搜索相关产品</h3>
          <p style={{ color: '#666', marginTop: 16 }}>
            您可以搜索和了解各种糖尿病相关产品：
          </p>
          <ul style={{ marginTop: 12, fontSize: 14 }}>
            <li>糖尿病药物（如二甲双胍）</li>
            <li>医疗器械（如血糖仪、试纸）</li>
            <li>营养补充剂（如维生素D、鱼油）</li>
          </ul>
          <p style={{ color: '#999', marginTop: 16, fontSize: 13 }}>
            产品信息仅供参考，请在医生指导下使用
          </p>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    setCurrent(current + 1);
  };

  const handlePrev = () => {
    setCurrent(current - 1);
  };

  const handleFinish = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <Modal
      title="平台使用指南"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={null}
    >
      <Steps current={current} items={steps} style={{ marginBottom: 24 }} />
      
      <div style={{ minHeight: 200 }}>
        {steps[current].content}
      </div>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          {current > 0 && (
            <Button onClick={handlePrev}>
              上一步
            </Button>
          )}
          {current < steps.length - 1 ? (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          ) : (
            <Button type="primary" onClick={handleFinish}>
              开始使用
            </Button>
          )}
          <Button onClick={onClose}>
            跳过
          </Button>
        </Space>
      </div>
    </Modal>
  );
}

