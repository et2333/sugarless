/**
 * Doctor Routes
 * From Report: UC-A1.1 Update Profile - Doctor features
 */

import { Router } from 'express';
import { z } from 'zod';
import { DoctorService } from '../services/doctorService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 医生档案验证schema
const doctorProfileSchema = z.object({
  licenseNumber: z.string().min(1, '执业证号不能为空'),
  specialization: z.string().min(1, '专业不能为空'),
  qualifications: z.array(z.string()).min(1, '至少需要一个资质'),
  experience: z.number().min(0, '经验年数不能为负'),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  consultationFee: z.number().min(0).optional(),
  availableSlots: z.array(z.string()).min(1, '至少需要一个可用时间段'),
  languages: z.array(z.string()).min(1, '至少需要一种语言'),
});

// 预约咨询验证schema
const consultationSchema = z.object({
  doctorId: z.string().min(1, '医生ID不能为空'),
  type: z.enum(['video', 'phone', 'in_person']),
  scheduledAt: z.string().transform(str => new Date(str)),
  duration: z.number().min(15).max(120).default(30),
  reason: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

/**
 * POST /api/doctor/profile
 * 创建或更新医生档案
 */
router.post('/profile', async (req: AuthRequest, res) => {
  try {
    const data = doctorProfileSchema.parse(req.body);
    
    const doctorProfile = await DoctorService.createOrUpdateDoctorProfile({
      userId: req.user!.userId,
      ...data,
    });

    res.status(201).json({
      success: true,
      data: doctorProfile,
      message: '医生档案保存成功',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError('输入验证失败', 400, 'VALIDATION_ERROR');
    }
    throw error;
  }
});

/**
 * GET /api/doctor/profile
 * 获取医生档案
 */
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const doctorProfile = await DoctorService.getDoctorProfile(req.user!.userId);

    if (!doctorProfile) {
      throw new AppError('医生档案未找到', 404, 'PROFILE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: doctorProfile,
    });
  } catch (error: any) {
    throw new AppError('获取医生档案失败', 500, 'GET_PROFILE_ERROR');
  }
});

/**
 * GET /api/doctor/search
 * 搜索医生
 */
router.get('/search', async (req: AuthRequest, res) => {
  try {
    const { 
      specialization, 
      experience, 
      languages, 
      location, 
      maxFee 
    } = req.query;

    const filters: any = {};
    if (specialization) filters.specialization = specialization as string;
    if (experience) filters.experience = parseInt(experience as string);
    if (languages) filters.languages = (languages as string).split(',');
    if (location) filters.location = location as string;
    if (maxFee) filters.maxFee = parseFloat(maxFee as string);

    const doctors = await DoctorService.searchDoctors(filters);

    res.json({
      success: true,
      data: doctors,
    });
  } catch (error: any) {
    throw new AppError('搜索医生失败', 500, 'SEARCH_DOCTORS_ERROR');
  }
});

/**
 * POST /api/doctor/consultation
 * 预约咨询
 */
router.post('/consultation', async (req: AuthRequest, res) => {
  try {
    const data = consultationSchema.parse(req.body);
    
    const consultation = await DoctorService.bookConsultation({
      patientId: req.user!.userId,
      ...data,
      symptoms: data.symptoms || [],
      medications: data.medications || [],
    });

    res.status(201).json({
      success: true,
      data: consultation,
      message: '咨询预约成功',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new AppError('输入验证失败', 400, 'VALIDATION_ERROR');
    }
    throw error;
  }
});

/**
 * GET /api/doctor/consultations
 * 获取医生的咨询列表
 */
router.get('/consultations', async (req: AuthRequest, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // 检查用户是否有医生档案
    const doctorProfile = await DoctorService.getDoctorProfile(req.user!.userId);
    if (!doctorProfile) {
      throw new AppError('医生档案未找到', 404, 'PROFILE_NOT_FOUND');
    }

    const result = await DoctorService.getDoctorConsultations(
      doctorProfile.id,
      status as string,
      parseInt(limit as string),
      (parseInt(page as string) - 1) * parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        consultations: result.consultations,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    throw new AppError('获取咨询列表失败', 500, 'GET_CONSULTATIONS_ERROR');
  }
});

/**
 * PUT /api/doctor/consultations/:consultationId/status
 * 更新咨询状态
 */
router.put('/consultations/:consultationId/status', async (req: AuthRequest, res) => {
  try {
    const { consultationId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError('状态不能为空', 400, 'MISSING_STATUS');
    }

    const consultation = await DoctorService.updateConsultationStatus(
      consultationId,
      status,
      req.user!.userId,
      'doctor'
    );

    res.json({
      success: true,
      data: consultation,
      message: '咨询状态更新成功',
    });
  } catch (error: any) {
    throw new AppError('更新咨询状态失败', 500, 'UPDATE_STATUS_ERROR');
  }
});

/**
 * PUT /api/doctor/consultations/:consultationId/notes
 * 添加咨询笔记
 */
router.put('/consultations/:consultationId/notes', async (req: AuthRequest, res) => {
  try {
    const { consultationId } = req.params;
    const { notes, prescription } = req.body;

    if (!notes) {
      throw new AppError('笔记内容不能为空', 400, 'MISSING_NOTES');
    }

    const consultation = await DoctorService.addConsultationNotes(
      consultationId,
      notes,
      prescription,
      req.user!.userId
    );

    res.json({
      success: true,
      data: consultation,
      message: '咨询笔记保存成功',
    });
  } catch (error: any) {
    throw new AppError('保存咨询笔记失败', 500, 'SAVE_NOTES_ERROR');
  }
});

/**
 * GET /api/doctor/stats
 * 获取医生统计信息
 */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const doctorProfile = await DoctorService.getDoctorProfile(req.user!.userId);
    if (!doctorProfile) {
      throw new AppError('医生档案未找到', 404, 'PROFILE_NOT_FOUND');
    }

    const stats = await DoctorService.getDoctorStats(doctorProfile.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    throw new AppError('获取统计信息失败', 500, 'GET_STATS_ERROR');
  }
});

/**
 * GET /api/doctor/patient-consultations
 * 获取患者的咨询列表
 */
router.get('/patient-consultations', async (req: AuthRequest, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const result = await DoctorService.getPatientConsultations(
      req.user!.userId,
      status as string,
      parseInt(limit as string),
      (parseInt(page as string) - 1) * parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        consultations: result.consultations,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    throw new AppError('获取咨询列表失败', 500, 'GET_CONSULTATIONS_ERROR');
  }
});

export default router;
