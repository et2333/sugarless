/**
 * AI Assistant Page
 * AI Health Assistant Chat Interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Input,
  Button,
  List,
  Avatar,
  Typography,
  Space,
  Row,
  Col,
  message,
  Spin,
  Tag,
  Divider,
  Tooltip,
  Badge,
  Alert,
  Modal,
} from 'antd';
import {
  SendOutlined,
  SoundOutlined,
  AudioOutlined,
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
  PhoneOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import aiApi from '../api/ai';
import voiceService from '../services/voiceService';
import ImprovedSpeechRecognition from '../services/speechRecognition';
import IntentParser from '../services/intentParser';

// TypeScript type declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const { TextArea } = Input;
const { Text, Paragraph, Title } = Typography;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    isAudio?: boolean;
    isEmergency?: boolean;
    suggestions?: string[];
    actionResult?: any;
  };
}

const AIAssistant: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const queryClient = useQueryClient();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const improvedSpeechRecogRef = useRef<ImprovedSpeechRecognition | null>(null);
  const intentParserRef = useRef<IntentParser | null>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Initialize improved speech recognition
    if (ImprovedSpeechRecognition) {
      improvedSpeechRecogRef.current = new ImprovedSpeechRecognition();
      intentParserRef.current = new IntentParser();
    }

    // Fallback to old recognition for compatibility
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsRecording(false);
        message.success(t('aiAssistant.voiceRecognitionSuccess'));
        // Auto-send voice recognition result
        setTimeout(() => {
          sendMessage(transcript);
        }, 500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'no-speech') {
          message.warning(t('aiAssistant.noVoiceDetected'));
        } else if (event.error === 'network') {
          message.error(t('aiAssistant.networkError'));
        } else {
          message.error(t('aiAssistant.voiceRecognitionFailed'));
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    // Voice service is already initialized as a singleton

    // Check AI service status
    checkAIStatus();
    
    // Load quick replies
    loadQuickReplies();
    
    // Load chat history
    loadChatHistory();

    // Add welcome message
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: t('aiAssistant.welcomeMessage'),
        timestamp: new Date(),
        metadata: {
          suggestions: [t('aiAssistant.suggestion1'), t('aiAssistant.suggestion2'), t('aiAssistant.suggestion3')]
        }
      }
    ]);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check AI service status
  const checkAIStatus = async () => {
    try {
      const response = await aiApi.getStatus();
      if (response.success && response.data.overall === 'healthy') {
        setAiStatus('online');
      } else {
        setAiStatus('offline');
      }
    } catch (error) {
      console.error(t('aiAssistant.errorLoadingStatus'), error);
      setAiStatus('offline');
    }
  };

  // Default diabetes professional quick replies
  const defaultQuickReplies = [
    t('aiAssistant.quickReply1'),
    t('aiAssistant.quickReply2'),
    t('aiAssistant.quickReply3'),
    t('aiAssistant.quickReply4'),
    t('aiAssistant.quickReply5'),
    t('aiAssistant.quickReply6'),
    t('aiAssistant.quickReply7'),
    t('aiAssistant.quickReply8')
  ];

  // Load quick replies (supports multiple languages)
  const loadQuickReplies = async () => {
    try {
      const response = await aiApi.getQuickReplies(i18n.language);
      if (response.data && response.data.quickReplies && response.data.quickReplies.length > 0) {
        setQuickReplies(response.data.quickReplies);
      } else {
        // If no data returned, use default diabetes-related quick replies
        const defaultReplies = i18n.language === 'en' 
          ? [
              'What should I do if my blood sugar is consistently high?',
              'What should post-meal blood sugar be controlled at?',
              'What dietary precautions should diabetics take?',
              'What is a normal fasting blood sugar level?',
              'What should I eat when blood sugar is low?',
              'What if blood sugar is still high after medication?',
              'Can diabetics exercise?',
              'When should I have a follow-up check?'
            ]
          : defaultQuickReplies;
        setQuickReplies(defaultReplies);
      }
    } catch (error) {
      console.error(t('aiAssistant.loadQuickRepliesFailed'), error);
      // Use default replies on error
      const defaultReplies = i18n.language === 'en'
        ? ['What is the normal blood sugar range?', 'I need diet advice', 'Analyze my blood sugar trend']
        : defaultQuickReplies;
      setQuickReplies(defaultReplies);
    }
  };

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const response = await aiApi.getChatHistory();
      if (response.data && response.data.messages && response.data.messages.length > 0) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.warn(t('aiAssistant.loadChatHistoryFailed'), error);
      // Don't show error message here, as it's normal for first-time users to have no history
    }
  };

  // Check emergency keywords (improved - excludes normal operations)
  const checkEmergencyKeywords = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    
    // 排除正常操作的关键词（必须是明确的短语）
    const normalOperations = [
      'set a reminder', 'create a reminder', 'help me set', 'help me create',
      'can you help', 'set reminder', 'create reminder', 'remind me',
      'eat medical', 'take medical', 'eat medicine', 'take medicine',
      'log blood sugar', 'record blood sugar'
    ];
    
    const isNormalOperation = normalOperations.some(op => lowerText.includes(op));
    if (isNormalOperation) {
      return false; // 正常操作，不触发紧急情况
    }
    
    // 紧急关键词（更精确的匹配）
    const emergencyKeywords = [
      // 症状相关
      'chest pain', 'difficulty breathing', 'cannot breathe', 'trouble breathing',
      'unconscious', 'lost consciousness', 'loss of consciousness', 'passed out',
      'severe dizziness', 'continuous vomiting', 'severe pain', 'extreme pain',
      // 血糖危机
      'severe hypoglycemia', 'very low blood sugar', 'blood sugar below 3',
      'blood sugar below 2', 'blood sugar 1', 'blood sugar 2',
      'hyperglycemic crisis', 'blood sugar above 20', 'blood sugar over 25',
      'diabetic ketoacidosis', 'dka',
      // 明确的紧急请求
      'medical emergency', 'emergency situation', 'need emergency',
      'call 911', 'call emergency', 'call doctor now', 'need doctor now',
      'urgent', 'urgently', 'immediately', 'right now'
    ];
    
    const hasEmergencyKeyword = emergencyKeywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (keywordLower.length <= 3) {
        const regex = new RegExp(`\\b${keywordLower}\\b`, 'i');
        return regex.test(lowerText);
      }
      return lowerText.includes(keywordLower);
    });
    
    // 如果包含"help"但上下文是正常操作，不触发紧急
    if (lowerText.includes('help') && !hasEmergencyKeyword) {
      const helpInNormalContext = [
        'help me set', 'help me create', 'help me find', 'help me get',
        'help me log', 'help me record', 'can you help', 'could you help'
      ].some(context => lowerText.includes(context));
      
      if (helpInNormalContext) {
        return false;
      }
    }
    
    return hasEmergencyKeyword;
  };

  // Send message
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend) return;

    // Check emergency situation
    const isEmergency = checkEmergencyKeywords(textToSend);
    
    // If emergency, show warning
    if (isEmergency) {
      Modal.warning({
        title: t('aiAssistant.emergencyWarning'),
        content: (
          <div>
            <p>{t('aiAssistant.emergencyDetected')}</p>
            <ul>
              <li>{t('aiAssistant.callEmergency')}</li>
              <li>{t('aiAssistant.contactDoctor')}</li>
              <li>{t('aiAssistant.lowBloodSugarAction')}</li>
              <li>{t('aiAssistant.highBloodSugarAction')}</li>
            </ul>
            <p><strong>{t('aiAssistant.aiDisclaimer')}</strong></p>
          </div>
        ),
        icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
        width: 500,
        okText: t('aiAssistant.understood'),
        onOk() {
          // Continue sending message
        }
      });
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await aiApi.sendMessage(textToSend, false);

      if (response.success && response.data) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
          metadata: {
            suggestions: response.data.suggestions || [],
            isEmergency: response.data.isEmergency || isEmergency,
            actionResult: response.data.actionResult || null,
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Handle AI action results
        if (response.data.actionResult) {
          if (response.data.actionResult.reminder) {
            const successMsg = response.data.actionResult.message || t('aiAssistant.reminderCreated');
            message.success(successMsg);
            // Refresh reminder list data
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
          } else if (response.data.actionResult.glucoseRecord) {
            const successMsg = response.data.actionResult.message || t('aiAssistant.glucoseRecordSaved');
            message.success(successMsg);
            // Refresh glucose record data
            queryClient.invalidateQueries({ queryKey: ['bloodSugarRecords'] });
          } else if (response.data.actionResult.error) {
            message.error(t('aiAssistant.operationFailed') + ': ' + response.data.actionResult.error);
          }
        }
        
        // If emergency, don't auto voice broadcast to avoid interference
        if (response.data.response && !isEmergency) {
          speakText(response.data.response);
        }
        
        // If AI also identifies as emergency, show additional warning
        if (response.data.isEmergency) {
          message.error(t('aiAssistant.emergencyDetectedByAI'), 10);
        }
      } else {
        message.error(t('aiAssistant.aiReplyFailed'));
      }
    } catch (error: any) {
      console.error('Send message failed:', error);
      message.error(t('aiAssistant.sendMessageFailed') + ': ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle quick replies
  const handleQuickReply = (reply: string) => {
    setInputMessage(reply);
    sendMessage(reply);
  };

  // Start voice recording - Use improved speech recognition if available
  const startRecording = async () => {
    // Try improved speech recognition first
    if (improvedSpeechRecogRef.current && improvedSpeechRecogRef.current.getSupported()) {
      try {
        setIsRecording(true);
        message.info(t('aiAssistant.startSpeaking'), 1);
        
        const transcript = await improvedSpeechRecogRef.current.start();
        setIsRecording(false);
        
        if (transcript) {
          // Parse intent if parser is available
          if (intentParserRef.current) {
            const parsed = intentParserRef.current.parseIntent(transcript);
            console.log('Parsed intent:', parsed);
          }
          
          setInputMessage(transcript);
          message.success(t('aiAssistant.voiceRecognitionSuccess'));
          
          // Auto-send voice recognition result
          setTimeout(() => {
            sendMessage(transcript);
          }, 500);
        }
      } catch (error: any) {
        console.error('Improved speech recognition failed:', error);
        setIsRecording(false);
        
        if (error.message === 'No speech detected') {
          message.warning(t('aiAssistant.noVoiceDetected'));
        } else if (error.message === 'No microphone found') {
          message.error(t('aiAssistant.networkError'));
        } else {
          // Fallback to old recognition
          startRecordingFallback();
        }
      }
      return;
    }

    // Fallback to old recognition
    startRecordingFallback();
  };

  // Fallback to old speech recognition
  const startRecordingFallback = () => {
    if (!recognitionRef.current) {
      message.warning(t('aiAssistant.browserNotSupported'));
      return;
    }

    try {
      setIsRecording(true);
      recognitionRef.current.start();
      message.info(t('aiAssistant.startSpeaking'), 1);
    } catch (error) {
      console.error('Voice recognition startup failed:', error);
      message.error(t('aiAssistant.voiceRecognitionStartFailed'));
      setIsRecording(false);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (improvedSpeechRecogRef.current) {
      improvedSpeechRecogRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // Speech synthesis using EnglishVoiceService
  const speakText = (text: string) => {
    try {
      voiceService.speak(text, {
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          setIsPlaying(true);
        },
        onEnd: () => {
          setIsPlaying(false);
        },
        onError: (error: string) => {
          console.error('Speech synthesis error:', error);
          setIsPlaying(false);
          // Don't show error message for 'interrupted' error, this is normal
          if (error !== 'interrupted') {
            message.error(t('aiAssistant.speechPlaybackFailed') + ': ' + error);
          }
        }
      });
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      message.error(t('aiAssistant.speechPlaybackFailedRetry'));
      setIsPlaying(false);
    }
  };

  // Stop speech playback
  const stopSpeaking = () => {
    voiceService.stop();
    setIsPlaying(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={1} style={{ marginBottom: 8, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🤖 {t('aiAssistant.pageTitle')}
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          {t('aiAssistant.pageSubtitle')}
        </Text>
      </div>

      <Alert
        message={t('aiAssistant.alertTitle')}
        description={t('aiAssistant.alertDescription')}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        icon={<InfoCircleOutlined />}
      />

      <Row gutter={24}>
        {/* Chat Interface */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <RobotOutlined />
                {t('aiAssistant.title')}
                <Badge 
                  status={aiStatus === 'online' ? 'success' : aiStatus === 'offline' ? 'error' : 'processing'} 
                  text={
                    aiStatus === 'online' ? t('aiAssistant.statusOnline') : 
                    aiStatus === 'offline' ? t('aiAssistant.statusOffline') : 
                    t('aiAssistant.statusChecking')
                  } 
                />
              </Space>
            }
            style={{ 
              height: 'calc(100vh - 200px)',
              minHeight: '600px',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '16px'
            }}
          >
            {/* Message list */}
            <div 
              style={{ 
                flex: 1,
                overflowY: 'auto', 
                overflowX: 'hidden',
                padding: '16px 0',
                borderBottom: '1px solid #f0f0f0',
                marginBottom: 16,
                scrollBehavior: 'smooth',
                minHeight: 0
              }}
            >
              <List
                dataSource={messages}
                renderItem={(msg) => (
                  <List.Item style={{ border: 'none', padding: '8px 0', width: '100%' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: 8,
                        alignItems: 'flex-start'
                      }}>
                        <div style={{ 
                          maxWidth: '70%',
                          minWidth: '120px',
                          background: msg.metadata?.isEmergency 
                            ? (msg.role === 'user' ? '#ff7875' : '#fff2f0')
                            : (msg.role === 'user' ? '#1890ff' : '#f6f6f6'),
                          color: msg.metadata?.isEmergency 
                            ? '#ff4d4f'
                            : (msg.role === 'user' ? 'white' : 'black'),
                          padding: '12px 16px',
                          borderRadius: 18,
                          position: 'relative',
                          border: msg.metadata?.isEmergency ? '2px solid #ff4d4f' : 'none',
                          wordWrap: 'break-word',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                            <Avatar 
                              size={24} 
                              icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                              style={{ 
                                marginRight: 8,
                                background: msg.role === 'user' ? '#40a9ff' : '#722ed1'
                              }}
                            />
                            <Text style={{ 
                              fontSize: 12, 
                              opacity: 0.8,
                              color: msg.role === 'user' ? 'white' : '#666'
                            }}>
                              {msg.timestamp.toLocaleTimeString()}
                            </Text>
                          </div>
                          <Paragraph style={{ 
                            margin: 0, 
                            color: 'inherit',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            lineHeight: '1.6',
                            fontSize: '14px'
                          }}>
                            {msg.content}
                          </Paragraph>
                          
                          {/* Emergency indicator */}
                          {msg.metadata?.isEmergency && (
                            <div style={{ marginTop: 8 }}>
                              <Alert
                                message={t('aiAssistant.emergencySituation')}
                                description={t('aiAssistant.emergencyAction')}
                                type="error"
                                showIcon
                                style={{ fontSize: 12 }}
                                icon={<ExclamationCircleOutlined />}
                              />
                              <Tag color="red" style={{ marginTop: 4 }}>
                                <PhoneOutlined /> {t('aiAssistant.needImmediateMedicalCare')}
                              </Tag>
                            </div>
                          )}

                          {/* Voice play button */}
                          {msg.role === 'assistant' && (
                            <Button 
                              type="text" 
                              size="small"
                              icon={<SoundOutlined />}
                              onClick={() => speakText(msg.content)}
                              style={{ 
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: isPlaying ? '#1890ff' : '#999'
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Suggestion buttons */}
                      {msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
                        <div style={{ marginLeft: msg.role === 'user' ? 'auto' : 0, marginRight: msg.role === 'user' ? 0 : 'auto', maxWidth: '70%' }}>
                          <Space wrap>
                            {msg.metadata.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                size="small"
                                type="dashed"
                                onClick={() => handleQuickReply(suggestion)}
                                style={{ fontSize: 12 }}
                              >
                                <BulbOutlined />
                                {suggestion}
                              </Button>
                            ))}
                          </Space>
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
              {loading && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <Spin />
                  <Text type="secondary">{t('aiAssistant.aiThinking')}</Text>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ flexShrink: 0 }}>
              {/* Quick replies */}
              {quickReplies.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('aiAssistant.commonQuestions')}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {quickReplies.slice(0, 4).map((reply, index) => (
                        <Button
                          key={index}
                          size="small"
                          type="dashed"
                          onClick={() => handleQuickReply(reply)}
                          style={{ fontSize: 12 }}
                        >
                          {reply}
                        </Button>
                      ))}
                    </Space>
                  </div>
                </div>
              )}

              {/* Input box and buttons */}
              <Space.Compact style={{ width: '100%' }}>
                <TextArea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t('aiAssistant.inputPlaceholder')}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <Tooltip title={isRecording ? t('aiAssistant.clickToStopRecording') : t('aiAssistant.clickToStartVoiceInput')}>
                  <Button
                    type={isRecording ? "primary" : "default"}
                    icon={<AudioOutlined />}
                    onClick={isRecording ? stopRecording : startRecording}
                    loading={isRecording}
                    style={{ 
                      backgroundColor: isRecording ? '#ff4d4f' : undefined,
                      borderColor: isRecording ? '#ff4d4f' : undefined,
                      color: isRecording ? 'white' : undefined
                    }}
                  />
                </Tooltip>
                <Tooltip title={t('aiAssistant.replayAIResponse')}>
                  <Button
                    icon={<SoundOutlined />}
                    onClick={() => {
                      const lastMessage = messages.filter(msg => msg.role === 'assistant').pop();
                      if (lastMessage) {
                        speakText(lastMessage.content);
                      }
                    }}
                    disabled={messages.length === 0}
                  />
                </Tooltip>
                {isPlaying && (
                  <Tooltip title={t('aiAssistant.stopVoicePlayback')}>
                    <Button
                      icon={<SoundOutlined />}
                      onClick={stopSpeaking}
                      type="primary"
                      danger
                    />
                  </Tooltip>
                )}
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => sendMessage()}
                  loading={loading}
                  disabled={!inputMessage.trim()}
                >
                  {t('aiAssistant.sendButton')}
                </Button>
              </Space.Compact>
            </div>
          </Card>
        </Col>

        {/* Sidebar Information */}
        <Col xs={24} lg={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* AI Assistant Information */}
            <Card title={t('aiAssistant.functionsTitle')} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>{t('aiAssistant.healthConsultation')}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('aiAssistant.healthConsultationDesc')}
                  </Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text strong>{t('aiAssistant.dataQuery')}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('aiAssistant.dataQueryDesc')}
                  </Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text strong>{t('aiAssistant.actionCommands')}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('aiAssistant.actionCommandsDesc')}
                  </Text>
                </div>
              </Space>
            </Card>

            {/* Voice Control */}
            <Card title={t('aiAssistant.voiceFunctions')} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>{t('aiAssistant.voiceInput')}</Text>
                  <Button 
                    type={isRecording ? "primary" : "default"}
                    size="small"
                    icon={<AudioOutlined />}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? t('aiAssistant.stop') : t('aiAssistant.start')}
                  </Button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>{t('aiAssistant.voiceBroadcast')}</Text>
                  <Button 
                    size="small"
                    icon={<SoundOutlined />}
                    onClick={isPlaying ? stopSpeaking : () => {}}
                    disabled={!isPlaying}
                  >
                    {isPlaying ? t('aiAssistant.stop') : t('aiAssistant.auto')}
                  </Button>
                </div>
              </Space>
            </Card>

            {/* Safety Reminder */}
            <Card title={t('aiAssistant.importantReminder')} size="small" style={{ border: '1px solid #ff4d4f' }}>
              <Text type="danger" style={{ fontSize: 12 }}>
                ⚠️ {t('aiAssistant.disclaimer')}
              </Text>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AIAssistant;
