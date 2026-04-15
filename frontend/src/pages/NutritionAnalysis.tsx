import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Select,
  Spin,
  Empty,
  Tag,
} from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  LineChartOutlined,
  FireOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { nutritionAPI } from '../api/nutrition';

const { Option } = Select;

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snacks: '零食',
};

export const NutritionAnalysis: React.FC = () => {
  const [period, setPeriod] = useState(7);

  // 获取营养统计数据
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['nutritionStats', period],
    queryFn: () => nutritionAPI.getStats(period),
  });

  // 获取营养分布数据
  const { data: distribution, isLoading: distLoading } = useQuery({
    queryKey: ['nutritionDistribution', 30],
    queryFn: () => nutritionAPI.getDistribution(30),
  });

  if (statsLoading || distLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats || !distribution) {
    return (
      <div className="p-6">
        <Card>
          <Empty description="暂无营养数据，请先创建膳食计划" />
        </Card>
      </div>
    );
  }

  // 准备趋势图表数据
  const trendData = stats.dailyNutrition.map(day => ({
    date: day.date.substring(5), // 只显示月-日
    热量: day.calories,
    碳水: day.carbs,
    蛋白质: day.protein,
    脂肪: day.fat,
    纤维: day.fiber,
  }));

  // 准备宏量营养素对比数据
  const macroData = [
    { name: '碳水化合物', 摄入: stats.averageStats.carbs, 目标: stats.nutritionGoals.carbs },
    { name: '蛋白质', 摄入: stats.averageStats.protein, 目标: stats.nutritionGoals.protein },
    { name: '脂肪', 摄入: stats.averageStats.fat, 目标: stats.nutritionGoals.fat },
    { name: '纤维', 摄入: stats.averageStats.fiber, 目标: stats.nutritionGoals.fiber },
  ];

  // 准备餐次分布数据
  const mealDistData = distribution.distribution.map(item => ({
    name: MEAL_TYPE_LABELS[item.type] || item.type,
    value: item.calories,
    percentage: item.percentage,
  }));

  return (
    <div className="p-6">
      {/* 标题和时间选择 */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <LineChartOutlined className="mr-2" />
          营养分析
        </h1>
        <div className="flex items-center gap-2">
          <span>时间范围：</span>
          <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
            <Option value={7}>最近7天</Option>
            <Option value={14}>最近14天</Option>
            <Option value={30}>最近30天</Option>
          </Select>
        </div>
      </div>

      {/* 概览卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均每日热量"
              value={stats.averageStats.calories}
              suffix="kcal"
              prefix={<FireOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <Progress
              percent={stats.goalsAchievement.calories}
              strokeColor={stats.goalsAchievement.calories > 100 ? '#ff4d4f' : '#3f8600'}
              size="small"
            />
            <div className="text-xs text-gray-500 mt-1">
              目标：{stats.nutritionGoals.calories} kcal
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均碳水化合物"
              value={stats.averageStats.carbs}
              suffix="g"
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress
              percent={stats.goalsAchievement.carbs}
              strokeColor={stats.goalsAchievement.carbs > 100 ? '#ff4d4f' : '#1890ff'}
              size="small"
            />
            <div className="text-xs text-gray-500 mt-1">
              目标：{stats.nutritionGoals.carbs} g
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均蛋白质"
              value={stats.averageStats.protein}
              suffix="g"
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Progress
              percent={stats.goalsAchievement.protein}
              strokeColor={stats.goalsAchievement.protein > 100 ? '#ff4d4f' : '#722ed1'}
              size="small"
            />
            <div className="text-xs text-gray-500 mt-1">
              目标：{stats.nutritionGoals.protein} g
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均纤维"
              value={stats.averageStats.fiber}
              suffix="g"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <Progress
              percent={stats.goalsAchievement.fiber}
              strokeColor={stats.goalsAchievement.fiber < 80 ? '#ff4d4f' : '#52c41a'}
              size="small"
            />
            <div className="text-xs text-gray-500 mt-1">
              目标：{stats.nutritionGoals.fiber} g
            </div>
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="营养摄入趋势" className="mb-6">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="热量" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="碳水" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="蛋白质" stroke="#ffc658" />
                  <Line type="monotone" dataKey="脂肪" stroke="#ff7c7c" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>

          <Card title="宏量营养素对比" className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={macroData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="摄入" fill="#8884d8" />
                <Bar dataKey="目标" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="餐次热量分布" className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mealDistData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mealDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4">
              {mealDistData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value} kcal</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="统计摘要">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">分析周期</span>
                <Tag color="blue">{period} 天</Tag>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">膳食计划数</span>
                <span className="font-semibold">{stats.mealPlansCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总热量摄入</span>
                <span className="font-semibold">{stats.totalStats.calories.toLocaleString()} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">目标达成率</span>
                <div className="flex gap-1">
                  <Tag color={stats.goalsAchievement.calories >= 90 ? 'success' : 'warning'}>
                    热量 {stats.goalsAchievement.calories}%
                  </Tag>
                  <Tag color={stats.goalsAchievement.protein >= 80 ? 'success' : 'warning'}>
                    蛋白 {stats.goalsAchievement.protein}%
                  </Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NutritionAnalysis;

