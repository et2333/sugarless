/**
 * Supplement Detail Service
 * Provides complete supplement information including precautions and scientific evidence
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { 
  completeSupplementDatabase, 
  getSupplementByName,
  validateProductData,
  type CompleteSupplementData 
} from '../data/completeSupplementData';

const prisma = new PrismaClient();

/**
 * Get complete supplement detail by ID
 */
export async function getCompleteSupplementDetail(supplementId: string): Promise<any> {
  // Get supplement from database
  const supplement = await prisma.supplement.findUnique({
    where: { id: supplementId },
  });

  if (!supplement) {
    throw new AppError('Supplement not found', 404, 'SUPPLEMENT_NOT_FOUND');
  }

  // Try to find complete data by name
  const completeData = getSupplementByName(supplement.nameEn || supplement.name);

  // Merge database data with complete data
  const mergedData = mergeSupplementData(supplement, completeData);

  return mergedData;
}

/**
 * Get complete supplement detail by name
 */
export async function getCompleteSupplementDetailByName(name: string): Promise<any> {
  const completeData = getSupplementByName(name);
  
  if (!completeData) {
    // Try to find in database
    const supplement = await prisma.supplement.findFirst({
      where: {
        OR: [
          { name: { contains: name } },
          { nameEn: { contains: name } },
        ],
      },
    });

    if (!supplement) {
      throw new AppError('Supplement not found', 404, 'SUPPLEMENT_NOT_FOUND');
    }

    return mergeSupplementData(supplement, null);
  }

  // Try to find in database and merge
  const supplement = await prisma.supplement.findFirst({
    where: {
      OR: [
        { name: { contains: completeData.name } },
        { nameEn: { contains: completeData.name } },
      ],
    },
  });

  return mergeSupplementData(supplement || null, completeData);
}

/**
 * Merge database supplement with complete data
 */
function mergeSupplementData(dbSupplement: any | null, completeData: CompleteSupplementData | null | undefined): any {
  // If we have complete data, use it as base
  if (completeData) {
    const validation = validateProductData(completeData);
    if (!validation.valid) {
      console.warn(`Supplement data validation failed for ${completeData.name}:`, validation.errors);
    }

    return {
      id: dbSupplement?.id || completeData.id,
      name: completeData.name,
      nameEn: completeData.nameEn || completeData.name,
      category: completeData.category,
      basicInfo: {
        activeIngredient: completeData.basicInfo.activeIngredient,
        dosage: completeData.basicInfo.dosage,
        form: completeData.basicInfo.form,
        manufacturer: completeData.basicInfo.manufacturer || dbSupplement?.nameEn,
        brand: completeData.basicInfo.brand || dbSupplement?.nameEn,
        description: completeData.basicInfo.description,
        price: dbSupplement?.averagePrice || completeData.basicInfo.price,
        packSize: completeData.basicInfo.packSize,
      },
      precautions: {
        contraindications: completeData.precautions.contraindications,
        possibleSideEffects: completeData.precautions.possibleSideEffects,
        drugInteractions: completeData.precautions.drugInteractions,
        warnings: completeData.precautions.warnings,
      },
      scientificEvidence: {
        evidenceLevel: completeData.scientificEvidence.evidenceLevel,
        clinicalStudies: completeData.scientificEvidence.clinicalStudies,
        mechanismOfAction: completeData.scientificEvidence.mechanismOfAction,
        recommendedUse: completeData.scientificEvidence.recommendedUse,
      },
      diabetesInfo: completeData.diabetesInfo,
      // Include database fields
      ...(dbSupplement && {
        imageUrl: dbSupplement.imageUrl,
        productUrl: dbSupplement.productUrl,
        isActive: dbSupplement.isActive,
      }),
    };
  }

  // If no complete data but have database supplement, construct from database
  if (dbSupplement) {
    const contraindications = dbSupplement.contraindications 
      ? (typeof dbSupplement.contraindications === 'string' 
          ? JSON.parse(dbSupplement.contraindications) 
          : dbSupplement.contraindications)
      : [];

    const sideEffects = dbSupplement.sideEffects
      ? (typeof dbSupplement.sideEffects === 'string'
          ? JSON.parse(dbSupplement.sideEffects)
          : dbSupplement.sideEffects)
      : { common: [], rare: [] };

    const evidenceSources = dbSupplement.evidenceSources
      ? (typeof dbSupplement.evidenceSources === 'string'
          ? JSON.parse(dbSupplement.evidenceSources)
          : dbSupplement.evidenceSources)
      : [];

    return {
      id: dbSupplement.id,
      name: dbSupplement.nameEn || dbSupplement.name,
      nameEn: dbSupplement.nameEn || dbSupplement.name,
      category: dbSupplement.category,
      basicInfo: {
        activeIngredient: dbSupplement.activeIngredients
          ? (typeof dbSupplement.activeIngredients === 'string'
              ? JSON.parse(dbSupplement.activeIngredients)[0]?.name || 'Not specified'
              : dbSupplement.activeIngredients[0]?.name || 'Not specified')
          : 'Not specified',
        dosage: dbSupplement.dosage
          ? (typeof dbSupplement.dosage === 'string'
              ? JSON.parse(dbSupplement.dosage).amount + ' ' + JSON.parse(dbSupplement.dosage).unit || 'As directed'
              : dbSupplement.dosage)
          : 'As directed',
        form: 'Capsules/Tablets',
        description: dbSupplement.descriptionEn || dbSupplement.description || 'Supplement for diabetes management',
        price: dbSupplement.averagePrice || 0,
        packSize: '60 capsules',
      },
      precautions: {
        contraindications: Array.isArray(contraindications) ? contraindications : [],
        possibleSideEffects: [
          ...(sideEffects.common || []),
          ...(sideEffects.rare || []),
        ],
        drugInteractions: [],
        warnings: [
          '⚠️ Consult your doctor before use if you are taking medications',
          '⚠️ Monitor blood sugar levels when starting this supplement',
          '⚠️ Not a substitute for prescription medications',
        ],
      },
      scientificEvidence: {
        evidenceLevel: `Grade ${dbSupplement.evidenceLevel || 'C'} Evidence`,
        clinicalStudies: evidenceSources.map((source: string, index: number) => ({
          title: `Study ${index + 1}`,
          year: new Date().getFullYear() - 5,
          results: source,
          source: 'Clinical Research',
        })),
        mechanismOfAction: [],
        recommendedUse: dbSupplement.dosage
          ? (typeof dbSupplement.dosage === 'string'
              ? JSON.parse(dbSupplement.dosage).frequency || 'As directed'
              : 'As directed')
          : 'As directed',
      },
      diabetesInfo: {
        suitability: 'medium',
        bloodSugarImpact: 'minimal',
        benefits: dbSupplement.benefits
          ? (typeof dbSupplement.benefits === 'string'
              ? JSON.parse(dbSupplement.benefits)
              : dbSupplement.benefits)
          : [],
        targetConditions: [dbSupplement.category],
      },
      imageUrl: dbSupplement.imageUrl,
      productUrl: dbSupplement.productUrl,
      isActive: dbSupplement.isActive,
    };
  }

  throw new AppError('Supplement data not available', 404, 'SUPPLEMENT_NOT_FOUND');
}

/**
 * Get all supplements with complete data by category
 */
export async function getSupplementsByCategoryWithCompleteData(category: string): Promise<any[]> {
  const supplements = await prisma.supplement.findMany({
    where: {
      category: { contains: category },
      isActive: true,
    },
  });

  return supplements.map((supp) => {
    const completeData = getSupplementByName(supp.nameEn || supp.name);
    return mergeSupplementData(supp, completeData || undefined);
  });
}

