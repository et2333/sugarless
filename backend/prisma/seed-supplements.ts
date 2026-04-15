/**
 * B2: 补充剂种子数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSupplements() {
  console.log('开始添加补充剂数据...');

  // 清理现有数据
  await prisma.supplementWatchlist.deleteMany();
  await prisma.recommendationItem.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.supplement.deleteMany();

  // 补充剂数据
  const supplements = [
    {
      name: '维生素D3',
      nameEn: 'Vitamin D3',
      type: 'vitamin',
      category: '血糖控制',
      activeIngredients: JSON.stringify([
        { name: '维生素D3', amount: 1000, unit: 'IU' },
      ]),
      benefits: JSON.stringify([
        '改善胰岛素敏感性',
        '降低HbA1c水平',
        '增强免疫力',
        '改善骨骼健康',
      ]),
      indications: JSON.stringify(['1型糖尿病', '2型糖尿病']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_1', 'type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '高钙血症患者禁用',
        '肾结石患者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 1,
        unit: 'capsule',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: ['轻度恶心', '便秘'],
        rare: ['高钙血症'],
      }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify([
        'Diabetes Care 2018;41:1299-1305',
        'Journal of Clinical Endocrinology & Metabolism 2017',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.3,
        glucose: -10,
        timeframe: 90,
        confidence: 0.7,
      }),
      averagePrice: 19.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Vitamin+D3',
    },
    {
      name: 'Omega-3鱼油',
      nameEn: 'Omega-3 Fish Oil',
      type: 'other',
      category: '心血管健康',
      activeIngredients: JSON.stringify([
        { name: 'EPA', amount: 500, unit: 'mg' },
        { name: 'DHA', amount: 250, unit: 'mg' },
      ]),
      benefits: JSON.stringify([
        '降低甘油三酯',
        '改善血脂代谢',
        '保护心血管健康',
        '减少炎症反应',
      ]),
      indications: JSON.stringify(['1型糖尿病', '2型糖尿病', '高血脂']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_1', 'type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '对鱼类过敏者禁用',
        '服用抗凝药物者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 2,
        unit: 'capsule',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: ['轻度鱼腥味', '消化不良'],
        rare: ['出血倾向增加'],
      }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify([
        'New England Journal of Medicine 2019',
        'American Heart Association Guidelines 2020',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.15,
        glucose: -5,
        timeframe: 120,
        confidence: 0.85,
      }),
      averagePrice: 29.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Omega-3',
    },
    {
      name: '镁补充剂',
      nameEn: 'Magnesium Supplement',
      type: 'mineral',
      category: '血糖控制',
      activeIngredients: JSON.stringify([
        { name: '镁', amount: 400, unit: 'mg' },
      ]),
      benefits: JSON.stringify([
        '改善胰岛素敏感性',
        '降低血糖水平',
        '预防糖尿病并发症',
        '改善睡眠质量',
      ]),
      indications: JSON.stringify(['2型糖尿病', '镁缺乏']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '肾功能不全者禁用',
        '心脏传导阻滞患者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 1,
        unit: 'tablet',
        frequency: 'daily',
        timing: 'before_bed',
      }),
      sideEffects: JSON.stringify({
        common: ['腹泻', '腹部不适'],
        rare: ['肌肉无力', '心律失常'],
      }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify([
        'Diabetes & Metabolism Journal 2020',
        'Nutrients 2019',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.4,
        glucose: -15,
        timeframe: 90,
        confidence: 0.75,
      }),
      averagePrice: 15.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Magnesium',
    },
    {
      name: '铬补充剂',
      nameEn: 'Chromium Picolinate',
      type: 'mineral',
      category: '血糖控制',
      activeIngredients: JSON.stringify([
        { name: '吡啶甲酸铬', amount: 200, unit: 'mcg' },
      ]),
      benefits: JSON.stringify([
        '增强胰岛素作用',
        '改善血糖控制',
        '降低空腹血糖',
        '减少糖渴望',
      ]),
      indications: JSON.stringify(['2型糖尿病', '胰岛素抵抗']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_2'],
        ageMin: 18,
        ageMax: 75,
      }),
      contraindications: JSON.stringify([
        '肾功能不全者慎用',
        '肝病患者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 1,
        unit: 'tablet',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: ['头痛', '失眠'],
        rare: ['肝损伤'],
      }),
      evidenceLevel: 'C',
      evidenceSources: JSON.stringify([
        'Diabetes Technology & Therapeutics 2018',
        'Journal of Trace Elements in Medicine 2019',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.5,
        glucose: -20,
        timeframe: 90,
        confidence: 0.6,
      }),
      averagePrice: 18.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Chromium',
    },
    {
      name: '维生素B12',
      nameEn: 'Vitamin B12',
      type: 'vitamin',
      category: '神经保护',
      activeIngredients: JSON.stringify([
        { name: '甲基钴胺素', amount: 1000, unit: 'mcg' },
      ]),
      benefits: JSON.stringify([
        '预防神经病变',
        '改善神经功能',
        '提高能量水平',
        '支持红细胞生成',
      ]),
      indications: JSON.stringify(['1型糖尿病', '2型糖尿病', '服用二甲双胍']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_1', 'type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '对钴过敏者禁用',
      ]),
      dosage: JSON.stringify({
        amount: 1,
        unit: 'tablet',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: [],
        rare: ['过敏反应'],
      }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify([
        'Diabetes Care 2017',
        'American Diabetes Association Guidelines',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.1,
        glucose: -3,
        timeframe: 60,
        confidence: 0.9,
      }),
      averagePrice: 12.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Vitamin+B12',
    },
    {
      name: 'α-硫辛酸',
      nameEn: 'Alpha-Lipoic Acid',
      type: 'other',
      category: '神经保护',
      activeIngredients: JSON.stringify([
        { name: 'α-硫辛酸', amount: 600, unit: 'mg' },
      ]),
      benefits: JSON.stringify([
        '改善神经病变症状',
        '强效抗氧化',
        '改善胰岛素敏感性',
        '减轻神经疼痛',
      ]),
      indications: JSON.stringify(['糖尿病神经病变', '氧化应激']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_1', 'type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '甲状腺疾病患者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 1,
        unit: 'capsule',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: ['胃部不适', '皮疹'],
        rare: ['低血糖'],
      }),
      evidenceLevel: 'A',
      evidenceSources: JSON.stringify([
        'Diabetologia 2018',
        'Journal of Diabetes Complications 2019',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.2,
        glucose: -8,
        timeframe: 120,
        confidence: 0.85,
      }),
      averagePrice: 34.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Alpha+Lipoic+Acid',
    },
    {
      name: '肉桂提取物',
      nameEn: 'Cinnamon Extract',
      type: 'herbal',
      category: '血糖控制',
      activeIngredients: JSON.stringify([
        { name: '肉桂提取物', amount: 500, unit: 'mg' },
      ]),
      benefits: JSON.stringify([
        '降低空腹血糖',
        '改善胰岛素敏感性',
        '天然降糖',
        '抗氧化作用',
      ]),
      indications: JSON.stringify(['2型糖尿病', '血糖偏高']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '肝病患者慎用',
        '服用抗凝药物者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 2,
        unit: 'capsule',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: ['轻度胃部不适'],
        rare: ['肝损伤'],
      }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify([
        'Annals of Family Medicine 2013',
        'Journal of Medicinal Food 2016',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.25,
        glucose: -12,
        timeframe: 90,
        confidence: 0.7,
      }),
      averagePrice: 22.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=Cinnamon',
    },
    {
      name: '辅酶Q10',
      nameEn: 'Coenzyme Q10',
      type: 'other',
      category: '心血管健康',
      activeIngredients: JSON.stringify([
        { name: '辅酶Q10', amount: 200, unit: 'mg' },
      ]),
      benefits: JSON.stringify([
        '保护心血管健康',
        '提高能量代谢',
        '强效抗氧化',
        '改善血糖控制',
      ]),
      indications: JSON.stringify(['糖尿病', '心血管疾病']),
      suitableFor: JSON.stringify({
        diabetesType: ['type_1', 'type_2'],
        ageMin: 18,
        ageMax: 80,
      }),
      contraindications: JSON.stringify([
        '服用华法林者慎用',
      ]),
      dosage: JSON.stringify({
        amount: 1,
        unit: 'capsule',
        frequency: 'daily',
        timing: 'with_meal',
      }),
      sideEffects: JSON.stringify({
        common: ['轻度失眠', '胃部不适'],
        rare: [],
      }),
      evidenceLevel: 'B',
      evidenceSources: JSON.stringify([
        'Diabetes & Metabolism 2018',
        'European Journal of Nutrition 2019',
      ]),
      expectedImpact: JSON.stringify({
        hba1c: -0.18,
        glucose: -7,
        timeframe: 90,
        confidence: 0.72,
      }),
      averagePrice: 39.99,
      imageUrl: 'https://via.placeholder.com/300x300?text=CoQ10',
    },
  ];

  for (const supplement of supplements) {
    await prisma.supplement.create({
      data: supplement,
    });
  }

  console.log(`✅ 成功添加 ${supplements.length} 个补充剂`);
}

async function main() {
  try {
    await seedSupplements();
    console.log('✨ 补充剂种子数据添加完成！');
  } catch (error) {
    console.error('❌ 添加种子数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

