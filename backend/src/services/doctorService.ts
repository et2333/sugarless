/**
 * DoctorService - Doctor and Consultation Management
 * From Report: UC-A1.1 Update Profile - Doctor features
 */

import prisma from '../utils/prisma';

export interface DoctorProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialization: string;
  qualifications: string[];
  experience: number;
  clinicName?: string;
  clinicAddress?: string;
  phone?: string;
  email?: string;
  consultationFee?: number;
  availableSlots: string[];
  languages: string[];
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  type: 'video' | 'phone' | 'in_person';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: Date;
  duration: number;
  actualStartAt?: Date;
  actualEndAt?: Date;
  reason?: string;
  symptoms: string[];
  medications: string[];
  notes?: string;
  prescription?: any;
  fee?: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  doctor?: DoctorProfile;
}

export class DoctorService {

  /**
   * Create or update doctor profile
   */
  static async createOrUpdateDoctorProfile(data: {
    userId: string;
    licenseNumber: string;
    specialization: string;
    qualifications: string[];
    experience: number;
    clinicName?: string;
    clinicAddress?: string;
    phone?: string;
    email?: string;
    consultationFee?: number;
    availableSlots: string[];
    languages: string[];
  }): Promise<DoctorProfile> {
    const doctorProfile = await prisma.doctorProfile.upsert({
      where: { userId: data.userId },
      update: {
        licenseNumber: data.licenseNumber,
        specialization: data.specialization,
        qualifications: JSON.stringify(data.qualifications),
        experience: data.experience,
        clinicName: data.clinicName,
        clinicAddress: data.clinicAddress,
        phone: data.phone,
        email: data.email,
        consultationFee: data.consultationFee,
        availableSlots: JSON.stringify(data.availableSlots),
        languages: JSON.stringify(data.languages),
        isActive: true,
      },
      create: {
        userId: data.userId,
        licenseNumber: data.licenseNumber,
        specialization: data.specialization,
        qualifications: JSON.stringify(data.qualifications),
        experience: data.experience,
        clinicName: data.clinicName,
        clinicAddress: data.clinicAddress,
        phone: data.phone,
        email: data.email,
        consultationFee: data.consultationFee,
        availableSlots: JSON.stringify(data.availableSlots),
        languages: JSON.stringify(data.languages),
        isActive: true,
        isVerified: false,
      },
    });

    return this.mapToDoctorProfileModel(doctorProfile);
  }

  /**
   * Get doctor profile by user ID
   */
  static async getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctorProfile) return null;

    return this.mapToDoctorProfileModel(doctorProfile);
  }

  /**
   * Search doctors
   */
  static async searchDoctors(filters: {
    specialization?: string;
    experience?: number;
    languages?: string[];
    location?: string;
    maxFee?: number;
  } = {}): Promise<DoctorProfile[]> {
    const where: any = {
      isActive: true,
      isVerified: true,
    };

    if (filters.specialization) {
      where.specialization = {
        contains: filters.specialization,
      };
    }

    if (filters.experience) {
      where.experience = {
        gte: filters.experience,
      };
    }

    if (filters.languages && filters.languages.length > 0) {
      where.languages = {
        contains: filters.languages[0], // Simple language filtering
      };
    }

    if (filters.location) {
      where.clinicAddress = {
        contains: filters.location,
      };
    }

    if (filters.maxFee) {
      where.consultationFee = {
        lte: filters.maxFee,
      };
    }

    const doctors = await prisma.doctorProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return doctors.map(doctor => this.mapToDoctorProfileModel(doctor));
  }

  /**
   * Book consultation
   */
  static async bookConsultation(data: {
    patientId: string;
    doctorId: string;
    type: 'video' | 'phone' | 'in_person';
    scheduledAt: Date;
    duration: number;
    reason?: string;
    symptoms: string[];
    medications: string[];
  }): Promise<Consultation> {
    // Check doctor availability
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: data.doctorId },
    });

    if (!doctor || !doctor.isActive) {
      throw new Error('Doctor not available');
    }

    // Check for conflicts
    const conflict = await prisma.consultation.findFirst({
      where: {
        doctorId: data.doctorId,
        status: {
          in: ['scheduled', 'confirmed', 'in_progress'],
        },
        scheduledAt: {
          gte: new Date(data.scheduledAt.getTime() - data.duration * 60000),
          lte: new Date(data.scheduledAt.getTime() + data.duration * 60000),
        },
      },
    });

    if (conflict) {
      throw new Error('Time slot not available');
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        type: data.type,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        reason: data.reason,
        symptoms: JSON.stringify(data.symptoms),
        medications: JSON.stringify(data.medications),
        fee: doctor.consultationFee,
        status: 'scheduled',
        paymentStatus: 'pending',
      },
    });

    return this.mapToConsultationModel(consultation);
  }

  /**
   * Get consultations for doctor
   */
  static async getDoctorConsultations(
    doctorId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ consultations: Consultation[]; total: number }> {
    const where: any = { doctorId };
    if (status) {
      where.status = status;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          patient: {
            include: { profile: true },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.consultation.count({ where }),
    ]);

    return {
      consultations: consultations.map(consultation => this.mapToConsultationModel(consultation)),
      total,
    };
  }

  /**
   * Get consultations for patient
   */
  static async getPatientConsultations(
    patientId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ consultations: Consultation[]; total: number }> {
    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          doctor: true,
        },
        orderBy: { scheduledAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.consultation.count({ where }),
    ]);

    return {
      consultations: consultations.map(consultation => this.mapToConsultationModel(consultation)),
      total,
    };
  }

  /**
   * Update consultation status
   */
  static async updateConsultationStatus(
    consultationId: string,
    status: string,
    userId: string,
    role: string
  ): Promise<Consultation> {
    // Verify user has access to this consultation
    const where: any = { id: consultationId };
    if (role === 'doctor') {
      where.doctorId = userId;
    } else {
      where.patientId = userId;
    }

    const consultation = await prisma.consultation.findFirst({ where });
    if (!consultation) {
      throw new Error('Consultation not found or access denied');
    }

    const updateData: any = { status };
    
    if (status === 'in_progress') {
      updateData.actualStartAt = new Date();
    } else if (status === 'completed') {
      updateData.actualEndAt = new Date();
    }

    const updated = await prisma.consultation.update({
      where: { id: consultationId },
      data: updateData,
    });

    return this.mapToConsultationModel(updated);
  }

  /**
   * Add consultation notes
   */
  static async addConsultationNotes(
    consultationId: string,
    notes: string,
    userId: string,
    prescription?: any
  ): Promise<Consultation> {
    // Only doctors can add notes
    const consultation = await prisma.consultation.findFirst({
      where: {
        id: consultationId,
        doctorId: userId,
      },
    });

    if (!consultation) {
      throw new Error('Consultation not found or access denied');
    }

    const updated = await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        notes,
        prescription: prescription ? JSON.stringify(prescription) : null,
      },
    });

    return this.mapToConsultationModel(updated);
  }

  /**
   * Get consultation statistics for doctor
   */
  static async getDoctorStats(doctorId: string): Promise<{
    totalConsultations: number;
    completedConsultations: number;
    pendingConsultations: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    const [
      totalConsultations,
      completedConsultations,
      pendingConsultations,
      revenueData,
    ] = await Promise.all([
      prisma.consultation.count({
        where: { doctorId },
      }),
      prisma.consultation.count({
        where: { doctorId, status: 'completed' },
      }),
      prisma.consultation.count({
        where: { 
          doctorId, 
          status: { in: ['scheduled', 'confirmed'] },
        },
      }),
      prisma.consultation.aggregate({
        where: { 
          doctorId, 
          status: 'completed',
          paymentStatus: 'paid',
        },
        _sum: { fee: true },
      }),
    ]);

    return {
      totalConsultations,
      completedConsultations,
      pendingConsultations,
      totalRevenue: revenueData._sum.fee || 0,
      averageRating: 4.5, // Mock rating - would need rating system
    };
  }

  /**
   * Map database doctor profile to model
   */
  private static mapToDoctorProfileModel(doctor: any): DoctorProfile {
    return {
      id: doctor.id,
      userId: doctor.userId,
      licenseNumber: doctor.licenseNumber,
      specialization: doctor.specialization,
      qualifications: JSON.parse(doctor.qualifications || '[]'),
      experience: doctor.experience,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      phone: doctor.phone,
      email: doctor.email,
      consultationFee: doctor.consultationFee,
      availableSlots: JSON.parse(doctor.availableSlots || '[]'),
      languages: JSON.parse(doctor.languages || '[]'),
      isActive: doctor.isActive,
      isVerified: doctor.isVerified,
      verifiedAt: doctor.verifiedAt,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }

  /**
   * Map database consultation to model
   */
  private static mapToConsultationModel(consultation: any): Consultation {
    return {
      id: consultation.id,
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      type: consultation.type,
      status: consultation.status,
      scheduledAt: consultation.scheduledAt,
      duration: consultation.duration,
      actualStartAt: consultation.actualStartAt,
      actualEndAt: consultation.actualEndAt,
      reason: consultation.reason,
      symptoms: JSON.parse(consultation.symptoms || '[]'),
      medications: JSON.parse(consultation.medications || '[]'),
      notes: consultation.notes,
      prescription: consultation.prescription ? JSON.parse(consultation.prescription) : undefined,
      fee: consultation.fee,
      paymentStatus: consultation.paymentStatus,
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt,
      doctor: consultation.doctor ? this.mapToDoctorProfileModel(consultation.doctor) : undefined,
    };
  }
}
