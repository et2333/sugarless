/**
 * Community - Community Forum and Social Features
 * From Report: UC-C2.1 Community Interaction, UC-C2.2 Community Follow-Up
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Tabs,
  List,
  Avatar,
  Typography,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Statistic,
  Divider,
  Empty,
  Badge
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusOutlined,
  HeartOutlined,
  MessageOutlined,
  ShareAltOutlined,
  SearchOutlined,
  FireOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EyeOutlined,
  LikeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// 配置dayjs插件
dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Search } = Input;

interface Post {
  id: string;
  userId: string;
  authorName: string;
  type: 'story' | 'question' | 'tip' | 'achievement' | 'support';
  title: string;
  content: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isAnonymous: boolean;
  createdAt: string;
  author?: {
    id: string;
    profile?: {
      firstName: string;
      lastName: string;
      diabetesType: string;
    };
  };
}

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  isAnonymous: boolean;
  replies?: Comment[];
}

export default function Community() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentForm] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState('');

  // Get posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['communityPosts', activeTab, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('type', activeTab);
      if (searchQuery) params.append('search', searchQuery);
      return apiClient.get(`/community/posts?${params.toString()}`);
    },
  });

  // Get community stats
  const { data: statsData } = useQuery({
    queryKey: ['communityStats'],
    queryFn: () => apiClient.get('/community/stats'),
  });

  // Get popular tags
  const { data: tagsData } = useQuery({
    queryKey: ['popularTags'],
    queryFn: () => apiClient.get('/community/popular-tags'),
  });

  // Get recent activity
  const { data: activityData } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: () => apiClient.get('/community/recent-activity'),
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/community/posts', data),
    onSuccess: () => {
      message.success(t('community.postPublishedSuccessfully'));
      setCreatePostVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityStats'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('community.publishFailed'));
    },
  });

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: (postId: string) => apiClient.post(`/community/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityStats'] });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: any }) => 
      apiClient.post(`/community/posts/${postId}/comments`, data),
    onSuccess: () => {
      message.success(t('community.commentPublishedSuccessfully'));
      commentForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityStats'] });
    },
    onError: (error: any) => {
      message.error(error.message || t('community.commentFailed'));
    },
  });

  const onPostSubmit = (values: any) => {
    createPostMutation.mutate(values);
  };

  const onCommentSubmit = (values: any) => {
    if (selectedPost) {
      addCommentMutation.mutate({
        postId: selectedPost.id,
        data: values,
      });
    }
  };

  const handleLike = (postId: string) => {
    likeMutation.mutate(postId);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'story': return 'blue';
      case 'question': return 'green';
      case 'tip': return 'orange';
      case 'achievement': return 'gold';
      case 'support': return 'purple';
      default: return 'default';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'story': return t('community.shareStory');
      case 'question': return t('community.askForHelp');
      case 'tip': return t('community.shareExperience');
      case 'achievement': return t('community.shareAchievement');
      case 'support': return t('community.mutualSupport');
      default: return type;
    }
  };

  const translateChineseTag = (tag: string) => {
    const tagTranslations: Record<string, string> = {
      '1型糖尿病': 'Type 1 Diabetes',
      '2型糖尿病': 'Type 2 Diabetes',
      '血糖管理': 'Blood Sugar Management',
      '饮食控制': 'Diet Control',
      '运动': 'Exercise',
      '药物': 'Medication',
      '并发症': 'Complications',
      '心理健康': 'Mental Health',
      '胰岛素': 'Insulin',
      '血糖监测': 'Blood Sugar Monitoring',
      '糖尿病教育': 'Diabetes Education',
      '生活方式': 'Lifestyle',
      '营养': 'Nutrition',
      '体重管理': 'Weight Management',
      '心血管': 'Cardiovascular',
      '肾脏': 'Kidney',
      '眼部': 'Eye',
      '足部护理': 'Foot Care',
      '血糖仪': 'Blood Glucose Meter',
      '连续血糖监测': 'Continuous Glucose Monitoring',
      'HbA1c': 'HbA1c',
      '低血糖': 'Hypoglycemia',
      '高血糖': 'Hyperglycemia',
      '糖尿病酮症酸中毒': 'Diabetic Ketoacidosis',
      '糖尿病神经病变': 'Diabetic Neuropathy',
      '糖尿病肾病': 'Diabetic Nephropathy',
      '糖尿病视网膜病变': 'Diabetic Retinopathy',
      '糖尿病足': 'Diabetic Foot',
      '妊娠糖尿病': 'Gestational Diabetes',
      '糖尿病前期': 'Prediabetes',
      '胰岛素抵抗': 'Insulin Resistance',
      '代谢综合征': 'Metabolic Syndrome'
    };
    
    return tagTranslations[tag] || tag;
  };

  const posts: Post[] = postsData?.data?.posts || [];
  const stats = statsData?.data;
  const popularTags = tagsData?.data || [];
  const recentActivity = activityData?.data || [];

  const tabItems = [
    {
      key: 'all',
      label: t('community.all'),
    },
    {
      key: 'story',
      label: t('community.shareStory'),
    },
    {
      key: 'question',
      label: t('community.askForHelp'),
    },
    {
      key: 'tip',
      label: t('community.shareExperience'),
    },
    {
      key: 'achievement',
      label: t('community.shareAchievement'),
    },
    {
      key: 'support',
      label: t('community.mutualSupport'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={24}>
        <Col span={18}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Title level={2} style={{ margin: 0 }}>{t('community.title')}</Title>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreatePostVisible(true)}
                size="large"
              >
                {t('community.publishPost')}
              </Button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={16}>
                  <Search
                    placeholder={t('community.searchPosts')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onSearch={() => {
                      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
                    }}
                    enterButton
                  />
                </Col>
                <Col span={8}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('community.selectSortOrder')}
                    defaultValue="newest"
                  >
                    <Option value="newest">{t('community.newestPosts')}</Option>
                    <Option value="popular">{t('community.mostPopular')}</Option>
                    <Option value="trending">{t('community.trendingDiscussion')}</Option>
                  </Select>
                </Col>
              </Row>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />

            <List
              loading={postsLoading}
              dataSource={posts}
              renderItem={(post) => (
                <List.Item>
                  <Card
                    hoverable
                    style={{ width: '100%' }}
                    actions={[
                      <Button
                        type="text"
                        icon={<LikeOutlined />}
                        onClick={() => handleLike(post.id)}
                      >
                        {post.likesCount}
                      </Button>,
                      <Button
                        type="text"
                        icon={<MessageOutlined />}
                        onClick={() => setSelectedPost(post)}
                      >
                        {post.commentsCount}
                      </Button>,
                      <Button type="text" icon={<ShareAltOutlined />}>
                        {t('community.share')}
                      </Button>,
                    ]}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <Tag color={getTypeColor(post.type)}>
                          {getTypeText(post.type)}
                        </Tag>
                        {post.tags.map(tag => (
                          <Tag key={tag} size="small">{translateChineseTag(tag)}</Tag>
                        ))}
                      </Space>
                    </div>
                    
                    <Title level={4} style={{ marginBottom: 8 }}>
                      {post.title}
                    </Title>
                    
                    <Paragraph ellipsis={{ rows: 3 }}>
                      {post.content}
                    </Paragraph>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        <Text>{post.authorName}</Text>
                        <Text type="secondary">
                          <ClockCircleOutlined /> {dayjs(post.createdAt).fromNow()}
                        </Text>
                      </Space>
                      <Space>
                        <Text type="secondary">
                          <EyeOutlined /> {post.viewsCount || 0} {t('community.views')}
                        </Text>
                      </Space>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Community Statistics */}
            <Card title={t('community.communityStats')} size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title={t('community.posts')} value={stats?.totalPosts || 0} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('community.comments')} value={stats?.totalComments || 0} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('community.likes')} value={stats?.totalLikes || 0} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('community.activeUsers')} value={stats?.activeUsers || 0} />
                </Col>
              </Row>
            </Card>

            {/* Popular Tags */}
            <Card title={t('community.popularTags')} size="small">
              <Space wrap>
                {popularTags.slice(0, 10).map((tag: any) => (
                  <Tag key={tag.tag} color="blue">
                    {translateChineseTag(tag.tag)} ({tag.count})
                  </Tag>
                ))}
              </Space>
            </Card>

            {/* Recent Activity */}
            <Card title={t('community.recentActivity')} size="small">
              <List
                size="small"
                dataSource={recentActivity.slice(0, 5)}
                renderItem={(activity: any) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <Text ellipsis style={{ fontSize: '12px' }}>
                        {activity.authorName} {activity.type === 'post' ? t('community.published') : t('community.commented')} 
                      </Text>
                      <br />
                      <Text ellipsis type="secondary" style={{ fontSize: '11px' }}>
                        {activity.content}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Create Post Modal */}
      <Modal
        title={t('community.publishNewPost')}
        open={createPostVisible}
        onCancel={() => setCreatePostVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onPostSubmit}
        >
          <Form.Item
            label={t('community.postType')}
            name="type"
            rules={[{ required: true, message: t('community.pleaseSelectPostType') }]}
          >
            <Select>
              <Option value="story">{t('community.shareStory')}</Option>
              <Option value="question">{t('community.askForHelp')}</Option>
              <Option value="tip">{t('community.shareExperience')}</Option>
              <Option value="achievement">{t('community.shareAchievement')}</Option>
              <Option value="support">{t('community.mutualSupport')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={t('community.title')}
            name="title"
            rules={[{ required: true, message: t('community.pleaseEnterTitle') }]}
          >
            <Input placeholder={t('community.enterPostTitle')} />
          </Form.Item>

          <Form.Item
            label={t('community.content')}
            name="content"
            rules={[{ required: true, message: t('community.pleaseEnterContent') }]}
          >
            <TextArea rows={6} placeholder={t('community.shareYourStory')} />
          </Form.Item>

          <Form.Item
            label={t('community.tags')}
            name="tags"
          >
            <Select mode="tags" placeholder={t('community.addRelatedTags')}>
              <Option value="1型糖尿病">{t('community.type1Diabetes')}</Option>
              <Option value="2型糖尿病">{t('community.type2Diabetes')}</Option>
              <Option value="血糖管理">{t('community.bloodSugarManagement')}</Option>
              <Option value="饮食控制">{t('community.dietControl')}</Option>
              <Option value="运动">{t('community.exercise')}</Option>
              <Option value="药物">{t('community.medication')}</Option>
              <Option value="并发症">{t('community.complications')}</Option>
              <Option value="心理健康">{t('community.mentalHealth')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createPostMutation.isPending}>
                {t('community.publish')}
              </Button>
              <Button onClick={() => setCreatePostVisible(false)}>
                {t('community.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Post Detail Modal */}
      <Modal
        title={selectedPost?.title}
        open={!!selectedPost}
        onCancel={() => setSelectedPost(null)}
        footer={null}
        width={800}
      >
        {selectedPost && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color={getTypeColor(selectedPost.type)}>
                  {getTypeText(selectedPost.type)}
                </Tag>
                {selectedPost.tags.map(tag => (
                  <Tag key={tag} size="small">{translateChineseTag(tag)}</Tag>
                ))}
              </Space>
            </div>
            
            <Paragraph>{selectedPost.content}</Paragraph>
            
            <Divider />
            
            <Form
              form={commentForm}
              layout="inline"
              onFinish={onCommentSubmit}
            >
              <Form.Item
                name="content"
                rules={[{ required: true, message: t('community.pleaseEnterComment') }]}
                style={{ flex: 1 }}
              >
                <Input placeholder={t('community.writeYourComment')} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={addCommentMutation.isPending}>
                  {t('community.comment')}
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}

