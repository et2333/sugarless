import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Space,
  Tag,
  message,
  Popconfirm,
  Alert,
  Badge,
  TimePicker,
  Progress,
} from 'antd';
import {
  MedicineBoxOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { medicationAPI, Medication, CreateMedicationDto, RefillAlert } from '../api/medication';

const { TextArea } = Input;
const { Option } = Select;

export const Medications: React.FC = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Get medication list
  const { data: medications, isLoading } = useQuery({
    queryKey: ['medications', showInactive],
    queryFn: () => medicationAPI.getMedications(showInactive),
  });

  // Get refill alerts
  const { data: alerts } = useQuery({
    queryKey: ['refillAlerts'],
    queryFn: medicationAPI.getRefillAlerts,
  });

  // Create medication
  const createMutation = useMutation({
    mutationFn: medicationAPI.createMedication,
    onSuccess: () => {
      message.success(t('medications.addSuccess'));
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      handleCloseModal();
    },
    onError: () => {
      message.error(t('medications.addFailed'));
    },
  });

  // Update medication
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMedicationDto> }) =>
      medicationAPI.updateMedication(id, data),
    onSuccess: () => {
      message.success(t('medications.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      handleCloseModal();
    },
    onError: () => {
      message.error(t('medications.updateFailed'));
    },
  });

  // Deactivate medication
  const deleteMutation = useMutation({
    mutationFn: medicationAPI.deleteMedication,
    onSuccess: () => {
      message.success(t('medications.deactivateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
    onError: () => {
      message.error(t('medications.deactivateFailed'));
    },
  });

  // Activate medication
  const activateMutation = useMutation({
    mutationFn: medicationAPI.activateMedication,
    onSuccess: () => {
      message.success(t('medications.activateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
    onError: () => {
      message.error(t('medications.activateFailed'));
    },
  });

  // Update quantity
  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, change }: { id: string; change: number }) =>
      medicationAPI.updateQuantity(id, change),
    onSuccess: () => {
      message.success(t('medications.quantityUpdated'));
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['refillAlerts'] });
    },
  });

  // Acknowledge alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: medicationAPI.acknowledgeAlert,
    onSuccess: () => {
      message.success(t('medications.alertAcknowledged'));
      queryClient.invalidateQueries({ queryKey: ['refillAlerts'] });
    },
  });

  const handleOpenModal = (medication?: Medication) => {
    if (medication) {
      setEditingMedication(medication);
      form.setFieldsValue({
        ...medication,
        prescriptionDate: medication.prescriptionDate ? dayjs(medication.prescriptionDate) : undefined,
        validUntil: medication.validUntil ? dayjs(medication.validUntil) : undefined,
        startDate: dayjs(medication.startDate),
        endDate: medication.endDate ? dayjs(medication.endDate) : undefined,
        timings: medication.timings.map(t => dayjs(t, 'HH:mm')),
      });
    } else {
      setEditingMedication(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMedication(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateMedicationDto = {
        ...values,
        prescriptionDate: values.prescriptionDate?.toISOString(),
        validUntil: values.validUntil?.toISOString(),
        startDate: values.startDate?.toISOString() || new Date().toISOString(),
        endDate: values.endDate?.toISOString(),
        timings: values.timings?.map((t: any) => t.format('HH:mm')) || [],
      };

      if (editingMedication) {
        updateMutation.mutate({ id: editingMedication.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const frequencyLabels: Record<string, string> = {
    once_daily: t('medications.onceDaily'),
    twice_daily: t('medications.twiceDaily'),
    three_times_daily: t('medications.threeTimesDaily'),
    four_times_daily: t('medications.fourTimesDaily'),
    as_needed: t('medications.asNeeded'),
    other: t('medications.other'),
  };

  const formLabels: Record<string, string> = {
    tablet: t('medications.tablet'),
    capsule: t('medications.capsule'),
    liquid: t('medications.liquid'),
    injection: t('medications.injection'),
    other: t('medications.other'),
  };

  const priorityColors: Record<string, string> = {
    low: 'blue',
    medium: 'orange',
    high: 'red',
    urgent: 'red',
  };

  // Diabetes-related medication check
  const getMedicationWarnings = (medication: Medication) => {
    const warnings = [];
    
    // Check if it's a common diabetes medication
    const diabetesMedications = ['二甲双胍', 'metformin', '胰岛素', 'insulin', '格列美脲', 'glimepiride', '瑞格列奈', 'repaglinide'];
    const isDiabetesMed = diabetesMedications.some(drug => 
      medication.name.toLowerCase().includes(drug.toLowerCase()) || 
      medication.genericName?.toLowerCase().includes(drug.toLowerCase())
    );
    
    if (isDiabetesMed) {
      warnings.push({
        type: 'info',
        message: t('medications.diabetesMedication'),
        description: t('medications.diabetesMedicationDesc')
      });
    }
    
    // Check inventory warning
    if (medication.currentQuantity <= medication.refillThreshold) {
      warnings.push({
        type: 'warning',
        message: t('medications.lowStock'),
        description: t('medications.lowStockDesc')
      });
    }
    
    // Check expiration date
    if (medication.validUntil && dayjs(medication.validUntil).diff(dayjs(), 'days') <= 30) {
      warnings.push({
        type: 'error',
        message: t('medications.expiringSoon'),
        description: t('medications.expiringSoonDesc', { days: dayjs(medication.validUntil).diff(dayjs(), 'days') })
      });
    }
    
    // Insulin special check
    if (medication.name.toLowerCase().includes('insulin') || medication.name.toLowerCase().includes('胰岛素')) {
      warnings.push({
        type: 'warning',
        message: t('medications.insulinReminder'),
        description: t('medications.insulinReminderDesc')
      });
    }
    
    return warnings;
  };

  const columns = [
    {
      title: t('medications.medicationName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Medication) => {
        const warnings = getMedicationWarnings(record);
        return (
          <div>
            <div className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {text}
              {warnings.some(w => w.type === 'error') && <WarningOutlined style={{ color: '#ff4d4f' }} />}
              {warnings.some(w => w.type === 'warning') && !warnings.some(w => w.type === 'error') && 
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              {warnings.some(w => w.type === 'info') && 
                <InfoCircleOutlined style={{ color: '#1890ff' }} />}
            </div>
            {record.genericName && (
              <div className="text-xs text-gray-500">{record.genericName}</div>
            )}
            {warnings.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {warnings.map((warning, index) => (
                  <Tag key={index} color={warning.type === 'error' ? 'red' : warning.type === 'warning' ? 'orange' : 'blue'} size="small">
                    {warning.message}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('medications.dosage'),
      dataIndex: 'dosage',
      key: 'dosage',
      render: (text: string, record: Medication) => (
        <div>
          <div>{text}</div>
          <div className="text-xs text-gray-500">{formLabels[record.form]}</div>
        </div>
      ),
    },
    {
      title: t('medications.usage'),
      key: 'usage',
      render: (record: Medication) => (
        <div>
          <div>{frequencyLabels[record.frequency]}</div>
          {record.timings.length > 0 && (
            <div className="text-xs text-gray-500">{record.timings.join(', ')}</div>
          )}
        </div>
      ),
    },
    {
      title: t('medications.inventory'),
      key: 'inventory',
      render: (record: Medication) => {
        const isLow = record.currentQuantity <= record.refillThreshold * 2;
        // Calculate progress percentage, assuming max inventory is 2x current quantity or 100, whichever is larger
        const maxQuantity = Math.max(record.currentQuantity * 2, 100);
        const percentage = Math.round((record.currentQuantity / maxQuantity) * 100);
        
        return (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Tag color={isLow ? 'red' : 'green'}>
                {t('medications.remaining')} {record.currentQuantity}
              </Tag>
            </div>
            <Progress 
              percent={percentage} 
              size="small"
              status={isLow ? 'exception' : 'normal'}
              strokeColor={isLow ? '#ff4d4f' : '#52c41a'}
            />
            <div className="mt-1">
              <Space size="small">
                <Button
                  size="small"
                  onClick={() => updateQuantityMutation.mutate({ id: record.id, change: -1 })}
                >
                  -
                </Button>
                <Button
                  size="small"
                  onClick={() => updateQuantityMutation.mutate({ id: record.id, change: 1 })}
                >
                  +
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    const quantity = prompt(t('medications.refillQuantityPrompt'));
                    if (quantity) {
                      updateQuantityMutation.mutate({ id: record.id, change: parseInt(quantity) });
                    }
                  }}
                >
                  {t('medications.refill')}
                </Button>
              </Space>
            </div>
          </div>
        );
      },
    },
    {
      title: t('medications.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? t('medications.inUse') : t('medications.disabled')}
        </Tag>
      ),
    },
    {
      title: t('medications.actions'),
      key: 'actions',
      render: (record: Medication) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenModal(record)}
          >
            {t('medications.edit')}
          </Button>
          {record.isActive ? (
            <Popconfirm
              title={t('medications.confirmDeactivate')}
              description={t('medications.deactivateDescription')}
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText={t('medications.confirm')}
              cancelText={t('medications.cancel')}
            >
              <Button icon={<DeleteOutlined />} size="small" danger>
                {t('medications.deactivate')}
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={t('medications.confirmActivate')}
              description={t('medications.activateDescription')}
              onConfirm={() => activateMutation.mutate(record.id)}
              okText={t('medications.confirm')}
              cancelText={t('medications.cancel')}
            >
              <Button icon={<BellOutlined />} size="small" type="primary">
                {t('medications.activate')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="text-2xl font-bold">
                <MedicineBoxOutlined className="mr-2" />
                {t('medications.center')}
              </h1>
              <LanguageSwitcher />
            </div>
            <p style={{ color: '#666', marginTop: 8, fontSize: '14px' }}>
              {t('medications.subtitle')}
            </p>
          </div>
          <Space>
            <span>{t('medications.showInactive')}：</span>
            <Switch
              checked={showInactive}
              onChange={setShowInactive}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              {t('medications.addMedication')}
            </Button>
          </Space>
        </div>
      </div>

      {/* Diabetes medication safety reminder */}
      <Alert
        message={t('medications.safetyReminder')}
        description={t('medications.safetyReminderDesc')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Refill alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="mb-6" title={<><BellOutlined className="mr-2" />{t('medications.urgentRefillAlerts')}</>}>
          {alerts.map((alert: RefillAlert) => (
            <Alert
              key={alert.id}
              message={
                <div className="flex justify-between items-center">
                  <div>
                    <Badge status="error" />
                    <span className="font-semibold">
                      {alert.medication?.name || t('medications.medication')}
                    </span>
                    {' '}{t('medications.daysRemaining', { days: alert.daysRemaining })}
                    {alert.daysRemaining <= 0 && ' - ' + t('medications.outOfStock') + '!'}
                    {alert.daysRemaining <= 0 && (
                      <span style={{ color: '#ff4d4f', fontWeight: 'bold', marginLeft: 8 }}>
                        🚨 {t('medications.refillImmediately')}!
                      </span>
                    )}
                  </div>
                  <Button
                    size="small"
                    onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                  >
                    {t('medications.acknowledged')}
                  </Button>
                </div>
              }
              type={alert.priority === 'urgent' ? 'error' : 'warning'}
              icon={<ExclamationCircleOutlined />}
              className="mb-2"
              closable
            />
          ))}
        </Card>
      )}

      {/* Medication list */}
      <Card>
        <Table
          columns={columns}
          dataSource={medications}
          rowKey="id"
          loading={isLoading}
          rowClassName={(record) => !record.isActive ? 'opacity-50 bg-gray-50' : ''}
          pagination={{
            pageSize: 10,
            showTotal: (total) => t('medications.totalMedications', { count: total }),
          }}
        />
      </Card>

      {/* Add/Edit medication modal */}
      <Modal
        title={editingMedication ? t('medications.editMedication') : t('medications.addMedication')}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={700}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label={t('medications.medicationName')}
            rules={[{ required: true, message: t('medications.medicationNameRequired') }]}
          >
            <Input placeholder={t('medications.medicationNamePlaceholder')} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="genericName" label={t('medications.genericName')}>
              <Input placeholder={t('medications.genericNamePlaceholder')} />
            </Form.Item>

            <Form.Item name="brand" label={t('medications.brand')}>
              <Input placeholder={t('medications.brandPlaceholder')} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="dosage"
              label={t('medications.dosage')}
              rules={[{ required: true, message: t('medications.dosageRequired') }]}
            >
              <Input placeholder={t('medications.dosagePlaceholder')} />
            </Form.Item>

            <Form.Item
              name="form"
              label={t('medications.form')}
              rules={[{ required: true, message: t('medications.formRequired') }]}
            >
              <Select placeholder={t('medications.formPlaceholder')}>
                <Option value="tablet">{t('medications.tablet')}</Option>
                <Option value="capsule">{t('medications.capsule')}</Option>
                <Option value="liquid">{t('medications.liquid')}</Option>
                <Option value="injection">{t('medications.injection')}</Option>
                <Option value="other">{t('medications.other')}</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="prescribedDose"
              label={t('medications.prescribedDose')}
              rules={[{ required: true, message: t('medications.prescribedDoseRequired') }]}
            >
              <InputNumber min={1} placeholder={t('medications.prescribedDosePlaceholder')} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="frequency"
              label={t('medications.frequency')}
              rules={[{ required: true, message: t('medications.frequencyRequired') }]}
            >
              <Select placeholder={t('medications.frequencyPlaceholder')}>
                <Option value="once_daily">{t('medications.onceDaily')}</Option>
                <Option value="twice_daily">{t('medications.twiceDaily')}</Option>
                <Option value="three_times_daily">{t('medications.threeTimesDaily')}</Option>
                <Option value="four_times_daily">{t('medications.fourTimesDaily')}</Option>
                <Option value="as_needed">{t('medications.asNeeded')}</Option>
                <Option value="other">{t('medications.other')}</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="timings" label={t('medications.timings')}>
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="currentQuantity"
              label={t('medications.currentQuantity')}
              rules={[{ required: true, message: t('medications.currentQuantityRequired') }]}
            >
              <InputNumber min={0} placeholder={t('medications.currentQuantityPlaceholder')} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="refillThreshold" label={t('medications.refillThreshold')} initialValue={7}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="prescribedBy" label={t('medications.prescribedBy')}>
            <Input placeholder={t('medications.prescribedByPlaceholder')} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="prescriptionDate" label={t('medications.prescriptionDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="validUntil" label={t('medications.validUntil')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="startDate" label={t('medications.startDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="endDate" label={t('medications.endDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="notes" label={t('medications.notes')}>
            <TextArea rows={3} placeholder={t('medications.notesPlaceholder')} />
          </Form.Item>

          <Form.Item name="isActive" label={t('medications.isActive')} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Medications;

