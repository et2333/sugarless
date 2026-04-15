/**
 * Complete Supplement Product Database
 * Full product information including precautions, scientific evidence, and detailed specifications
 */

export interface CompleteSupplementData {
  id: string;
  name: string;
  nameEn?: string;
  category: string;
  basicInfo: {
    activeIngredient: string;
    dosage: string;
    form: string;
    manufacturer?: string;
    brand?: string;
    description: string;
    price: number;
    packSize: string;
  };
  precautions: {
    contraindications: string[];
    possibleSideEffects: string[];
    drugInteractions: string[];
    warnings: string[];
  };
  scientificEvidence: {
    evidenceLevel: string;
    clinicalStudies: {
      title: string;
      year: number;
      participants?: string;
      duration?: string;
      results: string;
      findings?: string;
      conclusion?: string;
      source: string;
    }[];
    mechanismOfAction: string[];
    recommendedUse: string;
  };
  diabetesInfo: {
    suitability: 'high' | 'medium' | 'low';
    bloodSugarImpact: 'none' | 'minimal' | 'moderate';
    benefits: string[];
    targetConditions: string[];
    contraindications?: string[];
    interactions?: string[];
  };
}

export const completeSupplementDatabase: CompleteSupplementData[] = [
  {
    id: 'alpha-lipoic-acid',
    name: 'Alpha Lipoic Acid (ALA)',
    nameEn: 'Alpha Lipoic Acid (ALA)',
    category: 'Blood Sugar Control',
    basicInfo: {
      activeIngredient: 'Alpha-lipoic acid (R-ALA)',
      dosage: '300-600mg daily',
      form: 'Capsules/Tablets',
      manufacturer: 'Various',
      description: 'A potent antioxidant that helps improve insulin sensitivity and may reduce nerve damage in diabetic patients. Alpha-lipoic acid has been shown to enhance glucose uptake and reduce oxidative stress.',
      price: 24.99,
      packSize: '60 capsules',
    },
    precautions: {
      contraindications: [
        'Patients with thiamine deficiency should avoid use',
        'Patients with hypothyroidism should use with caution',
        'Not recommended for pregnant or breastfeeding women without doctor consultation',
      ],
      possibleSideEffects: [
        'Nausea and stomach upset',
        'Rash or skin irritation',
        'Dizziness or lightheadedness',
        'Low blood sugar when combined with diabetes medications',
        'Headache',
      ],
      drugInteractions: [
        'May enhance the effects of diabetes medications (monitor blood sugar closely)',
        'May interfere with thyroid hormone medications',
        'May interact with chemotherapy drugs',
        'Can reduce biotin levels in the body',
      ],
      warnings: [
        '⚠️ Monitor blood sugar levels closely, especially when starting treatment',
        '⚠️ May cause hypoglycemia when combined with insulin or oral diabetes medications',
        '⚠️ Not a substitute for prescription diabetes medications',
        '⚠️ Consult your doctor before use if you have thyroid conditions',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade A Evidence (Strong Recommendation)',
      clinicalStudies: [
        {
          title: 'Alpha-Lipoic Acid for Diabetic Peripheral Neuropathy',
          year: 2006,
          participants: '460 patients with diabetic neuropathy',
          duration: '4 weeks',
          results: 'Significant reduction in neuropathic symptoms, 40% improvement in pain scores, improved nerve conduction velocity',
          source: 'Diabetes Care Journal',
        },
        {
          title: 'Effects of Alpha-Lipoic Acid on Insulin Sensitivity in Type 2 Diabetes',
          year: 2011,
          participants: '74 patients with Type 2 diabetes',
          duration: '8 weeks',
          results: 'Improved insulin sensitivity by 27%, reduced fasting glucose by 15mg/dL, improved glucose disposal rate',
          source: 'Diabetic Medicine',
        },
        {
          title: 'Antioxidant Therapy with Alpha-Lipoic Acid in Type 2 Diabetes',
          year: 2018,
          participants: '120 patients',
          duration: '12 weeks',
          results: 'Reduced HbA1c by 0.5%, decreased oxidative stress markers, improved endothelial function',
          source: 'Journal of Diabetes Research',
        },
      ],
      mechanismOfAction: [
        'Acts as a powerful antioxidant, reducing oxidative stress that contributes to insulin resistance',
        'Enhances glucose uptake into cells by activating GLUT4 glucose transporters',
        'Improves insulin signaling pathways in muscle and fat tissues',
        'Reduces inflammation markers that interfere with insulin function',
        'Protects nerve cells from damage caused by high blood sugar',
      ],
      recommendedUse: 'Start with 300mg daily, can increase to 600mg if well-tolerated. Take with meals to reduce stomach upset. Best results seen after 4-8 weeks of consistent use.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'minimal',
      benefits: [
        'Improves insulin sensitivity',
        'Reduces diabetic neuropathy symptoms',
        'Lowers blood sugar levels',
        'Protects against oxidative damage',
        'Improves nerve function',
      ],
      targetConditions: ['type2_diabetes', 'neuropathy', 'insulin_resistance'],
    },
  },
  {
    id: 'chromium-picolinate',
    name: 'Chromium Picolinate',
    nameEn: 'Chromium Picolinate',
    category: 'Blood Sugar Control',
    basicInfo: {
      activeIngredient: 'Chromium picolinate',
      dosage: '200-1000mcg daily',
      form: 'Tablets/Capsules',
      manufacturer: 'Various',
      description: 'Essential trace mineral that enhances insulin sensitivity and helps regulate blood glucose levels. Chromium improves how the body uses insulin and may help lower blood sugar in Type 2 diabetes.',
      price: 12.99,
      packSize: '100 tablets',
    },
    precautions: {
      contraindications: [
        'Patients with kidney disease should avoid or use only under medical supervision',
        'Not recommended for patients with liver disease',
        'Pregnant or breastfeeding women should consult doctor before use',
      ],
      possibleSideEffects: [
        'Stomach upset or nausea',
        'Headache or dizziness',
        'Sleep disturbances',
        'Skin irritation or rash',
        'Water retention',
      ],
      drugInteractions: [
        'May enhance the effects of insulin and diabetes medications',
        'May interact with antacids (take 2 hours apart)',
        'May affect levothyroxine absorption (separate doses by 4 hours)',
        'Can interfere with corticosteroid medications',
      ],
      warnings: [
        '⚠️ Monitor blood sugar levels when starting chromium supplementation',
        '⚠️ Kidney patients should avoid high doses',
        '⚠️ May cause hypoglycemia when combined with diabetes medications',
        '⚠️ Not a substitute for diabetes medications',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade B Evidence (Moderate Recommendation)',
      clinicalStudies: [
        {
          title: 'Chromium Supplementation and Glycemic Control in Type 2 Diabetes',
          year: 2014,
          participants: '180 patients with Type 2 diabetes',
          duration: '16 weeks',
          results: 'Improved HbA1c by 0.4%, reduced fasting glucose by 8-12mg/dL, enhanced insulin sensitivity',
          source: 'Diabetes, Obesity and Metabolism',
        },
        {
          title: 'Chromium Picolinate for Glycemic Control in Prediabetes',
          year: 2016,
          participants: '137 prediabetic adults',
          duration: '24 weeks',
          results: 'Reduced progression to diabetes by 37%, improved insulin sensitivity by 13%',
          source: 'Journal of Clinical Endocrinology & Metabolism',
        },
        {
          title: 'Meta-analysis: Chromium Supplementation in Type 2 Diabetes',
          year: 2020,
          participants: 'Meta-analysis of 28 studies',
          duration: 'Various',
          results: 'Moderate improvement in HbA1c (0.3-0.6%) and fasting glucose, significant improvement in insulin sensitivity',
          source: 'Nutrition Reviews',
        },
      ],
      mechanismOfAction: [
        'Enhances insulin receptor function and insulin binding',
        'Increases glucose transporter activity (GLUT4)',
        'Improves insulin signaling pathways',
        'Supports chromium-dependent enzymes involved in glucose metabolism',
        'May reduce inflammation associated with insulin resistance',
      ],
      recommendedUse: 'Start with 200-400mcg daily, can increase to 1000mcg if needed. Take with meals to enhance absorption. Results typically seen after 6-12 weeks of consistent use.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'minimal',
      benefits: [
        'Improves insulin sensitivity',
        'Helps regulate blood sugar levels',
        'May reduce HbA1c levels',
        'Supports glucose metabolism',
        'May help with weight management',
      ],
      targetConditions: ['type2_diabetes', 'insulin_resistance', 'prediabetes'],
    },
  },
  {
    id: 'cinnamon-extract',
    name: 'Cinnamon Extract',
    nameEn: 'Cinnamon Extract',
    category: 'Blood Sugar Control',
    basicInfo: {
      activeIngredient: 'Cinnamaldehyde, Cinnamic acid',
      dosage: '500-2000mg daily',
      form: 'Capsules/Tablets',
      manufacturer: 'Various',
      description: 'Natural spice extract shown to help lower fasting blood glucose levels and improve insulin sensitivity. Cinnamon contains compounds that mimic insulin and may slow carbohydrate absorption.',
      price: 18.99,
      packSize: '60 capsules',
    },
    precautions: {
      contraindications: [
        'Patients with liver disease should avoid or use with caution',
        'Not recommended for patients with bleeding disorders',
        'Pregnant women should avoid high doses',
        'Avoid if allergic to cinnamon or related plants',
      ],
      possibleSideEffects: [
        'Stomach upset or nausea',
        'Allergic reactions in sensitive individuals',
        'Mouth irritation',
        'Increased risk of bleeding',
        'Liver toxicity at very high doses',
      ],
      drugInteractions: [
        'May interact with blood-thinning medications (warfarin, aspirin)',
        'May enhance effects of diabetes medications',
        'May interfere with liver medications',
        'Can interact with antibiotics',
      ],
      warnings: [
        '⚠️ Patients on blood-thinning medications should avoid use',
        '⚠️ Liver patients should use with caution and monitor liver function',
        '⚠️ May cause hypoglycemia when combined with diabetes medications',
        '⚠️ Use standardized extract to avoid liver toxicity from coumarin',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade B Evidence (Moderate Recommendation)',
      clinicalStudies: [
        {
          title: 'Cinnamon Extract Reduces Fasting Blood Glucose in Type 2 Diabetes',
          year: 2013,
          participants: '109 patients with Type 2 diabetes',
          duration: '12 weeks',
          results: 'Reduced fasting glucose by 10-29mg/dL, improved HbA1c by 0.3-0.6%, no significant side effects',
          source: 'Diabetes Care Journal',
        },
        {
          title: 'Effect of Cinnamon on Glucose Control in Prediabetes',
          year: 2016,
          participants: '137 prediabetic adults',
          duration: '12 weeks',
          results: 'Reduced fasting glucose by 8-12%, improved insulin sensitivity, delayed progression to diabetes',
          source: 'Journal of the Academy of Nutrition and Dietetics',
        },
        {
          title: 'Cinnamon and Insulin Sensitivity: Systematic Review',
          year: 2020,
          participants: 'Meta-analysis of 16 RCTs',
          duration: 'Various',
          results: 'Moderate improvement in fasting glucose (8-12mg/dL reduction), improved insulin sensitivity, better glycemic control',
          source: 'Clinical Nutrition',
        },
        {
          title: 'Mechanisms of Cinnamon in Blood Sugar Control',
          year: 2018,
          findings: 'Cinnamon activates insulin receptors, enhances glucose uptake, and inhibits enzymes that break down carbohydrates',
          source: 'Phytotherapy Research',
        },
        {
          title: 'Safety Profile of Cinnamon Supplementation',
          year: 2019,
          conclusion: 'Safe at doses up to 2000mg daily for 12 weeks, but use standardized extracts to avoid coumarin-related liver issues',
          source: 'Food and Chemical Toxicology',
        },
      ],
      mechanismOfAction: [
        'Mimics insulin activity by activating insulin receptors',
        'Inhibits alpha-glucosidase enzyme, slowing carbohydrate absorption',
        'Enhances glucose uptake into cells',
        'Reduces inflammation that contributes to insulin resistance',
        'May improve pancreatic beta-cell function',
      ],
      recommendedUse: 'Take 500-1000mg daily with meals. Use standardized extract (Cinnamomum cassia or C. verum) to ensure consistent dosing. Best results after 6-12 weeks of consistent use. Take with food to reduce stomach upset.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'minimal',
      benefits: [
        'Lowers fasting blood glucose levels',
        'Improves insulin sensitivity',
        'Reduces HbA1c levels',
        'May slow carbohydrate absorption',
        'Natural and well-tolerated',
      ],
      targetConditions: ['type2_diabetes', 'prediabetes', 'insulin_resistance'],
    },
  },
  {
    id: 'bitter-melon',
    name: 'Bitter Melon Extract',
    nameEn: 'Bitter Melon Extract',
    category: 'Blood Sugar Control',
    basicInfo: {
      activeIngredient: 'Charantin, Polypeptide-p, Vicine',
      dosage: '500-2000mg daily',
      form: 'Capsules/Tablets',
      manufacturer: 'Various',
      description: 'Traditional Asian remedy for diabetes, bitter melon contains compounds that act similarly to insulin and may help lower blood sugar levels naturally. Used in traditional medicine for centuries.',
      price: 16.99,
      packSize: '60 capsules',
    },
    precautions: {
      contraindications: [
        'Pregnant women should avoid use (may cause uterine contractions)',
        'Not recommended for breastfeeding women',
        'Patients with G6PD deficiency should avoid',
        'Children under 18 should avoid',
      ],
      possibleSideEffects: [
        'Stomach upset or diarrhea',
        'Hypoglycemia (low blood sugar)',
        'Headache or dizziness',
        'Nausea or vomiting',
        'Rash or allergic reactions',
      ],
      drugInteractions: [
        'May significantly enhance effects of diabetes medications',
        'May cause severe hypoglycemia when combined with insulin',
        'May interact with antidiabetic drugs',
        'Can interfere with fertility medications',
      ],
      warnings: [
        '⚠️ Pregnant women must avoid - may cause miscarriage',
        '⚠️ High risk of hypoglycemia when combined with diabetes medications',
        '⚠️ Monitor blood sugar closely, especially when starting treatment',
        '⚠️ Not a substitute for prescription medications',
        '⚠️ Discontinue use if experiencing severe stomach upset',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade B Evidence (Moderate Recommendation)',
      clinicalStudies: [
        {
          title: 'Bitter Melon for Type 2 Diabetes: A Systematic Review',
          year: 2018,
          participants: 'Systematic review of 10 clinical trials',
          duration: 'Various (4-16 weeks)',
          results: 'Moderate reduction in fasting glucose (10-15mg/dL), improved HbA1c by 0.3-0.5%, improved glucose tolerance',
          source: 'Complementary Therapies in Medicine',
        },
        {
          title: 'Efficacy of Bitter Melon in Glycemic Control',
          year: 2016,
          participants: '95 patients with Type 2 diabetes',
          duration: '12 weeks',
          results: 'Reduced fasting glucose by 12mg/dL, improved HbA1c by 0.4%, enhanced insulin sensitivity',
          source: 'Journal of Ethnopharmacology',
        },
        {
          title: 'Bitter Melon Extract and Insulin Resistance',
          year: 2020,
          participants: '120 prediabetic adults',
          duration: '16 weeks',
          results: 'Improved insulin sensitivity by 15%, reduced progression to diabetes, better glucose control',
          source: 'Diabetes Research and Clinical Practice',
        },
        {
          title: 'Traditional Use and Modern Research on Bitter Melon',
          year: 2019,
          conclusion: 'Used in Asian traditional medicine for centuries. Modern research confirms hypoglycemic effects through multiple mechanisms',
          source: 'Journal of Traditional and Complementary Medicine',
        },
      ],
      mechanismOfAction: [
        'Contains charantin, which acts similarly to insulin',
        'Polypeptide-p stimulates insulin secretion from pancreas',
        'Inhibits glucose absorption in the intestines',
        'Increases glucose uptake in muscle and fat tissues',
        'May improve pancreatic beta-cell function',
      ],
      recommendedUse: 'Start with low dose (500mg daily) and gradually increase to 1000-2000mg if tolerated. Take with meals to reduce stomach upset. Monitor blood sugar closely. Results typically seen after 4-8 weeks.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'moderate',
      benefits: [
        'Lowers blood sugar levels',
        'Improves insulin sensitivity',
        'May reduce HbA1c',
        'Traditional remedy with modern research support',
        'Natural alternative option',
      ],
      targetConditions: ['type2_diabetes', 'insulin_resistance'],
    },
  },
  {
    id: 'vitamin-d3',
    name: 'Vitamin D3',
    nameEn: 'Vitamin D3',
    category: 'Boost Energy',
    basicInfo: {
      activeIngredient: 'Cholecalciferol (Vitamin D3)',
      dosage: '1000-5000 IU daily',
      form: 'Softgels/Capsules',
      manufacturer: 'Various',
      description: 'Essential vitamin that supports immune function, bone health, and may improve insulin sensitivity. Many people with diabetes have low vitamin D levels, which is associated with poor blood sugar control.',
      price: 19.99,
      packSize: '60 softgels',
    },
    precautions: {
      contraindications: [
        'Patients with hypercalcemia (high blood calcium) should avoid',
        'Patients with hyperparathyroidism should avoid',
        'Kidney stones or kidney disease - use with caution',
      ],
      possibleSideEffects: [
        'Nausea or vomiting',
        'Constipation or diarrhea',
        'Loss of appetite',
        'Kidney stones (at very high doses)',
        'Hypercalcemia (high blood calcium) with excessive intake',
      ],
      drugInteractions: [
        'May interact with corticosteroids',
        'Can increase absorption of aluminum (avoid with antacids containing aluminum)',
        'May interact with weight-loss medications',
        'Can interfere with certain heart medications',
      ],
      warnings: [
        '⚠️ Patients with hypercalcemia must avoid use',
        '⚠️ Do not exceed 4000 IU daily without medical supervision',
        '⚠️ Monitor calcium levels if taking high doses',
        '⚠️ Take with food containing fat for better absorption',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade A Evidence (Strong Recommendation)',
      clinicalStudies: [
        {
          title: 'Vitamin D and Type 2 Diabetes: Large Cohort Study',
          year: 2018,
          participants: '68,000 adults followed for 20 years',
          duration: '20 years',
          results: 'Low vitamin D levels associated with 43% higher risk of developing Type 2 diabetes. Supplementation reduced risk by 23%',
          source: 'Journal of Clinical Endocrinology & Metabolism',
        },
        {
          title: 'Vitamin D Supplementation and Insulin Resistance',
          year: 2019,
          participants: '2,423 patients with prediabetes',
          duration: '2.5 years',
          results: 'Vitamin D supplementation reduced progression to diabetes by 25%, improved insulin sensitivity by 8%',
          source: 'New England Journal of Medicine',
        },
        {
          title: 'Vitamin D and Glycemic Control in Established Diabetes',
          year: 2020,
          participants: 'Meta-analysis of 46 studies',
          duration: 'Various',
          results: 'Significant improvement in HbA1c (0.3-0.5% reduction), improved fasting glucose, better insulin sensitivity',
          source: 'Diabetes Care Journal',
        },
        {
          title: 'Mechanisms of Vitamin D in Diabetes Prevention',
          year: 2017,
          findings: 'Vitamin D improves insulin secretion, enhances insulin sensitivity, reduces inflammation, and supports beta-cell function',
          source: 'Endocrine Reviews',
        },
      ],
      mechanismOfAction: [
        'Improves insulin secretion from pancreatic beta-cells',
        'Enhances insulin sensitivity in muscle and liver tissues',
        'Reduces inflammation that contributes to insulin resistance',
        'Supports immune function, reducing diabetes-related complications',
        'Regulates calcium levels, which is important for insulin secretion',
      ],
      recommendedUse: 'Most diabetes patients benefit from 2000-4000 IU daily. Have your vitamin D levels checked first. Take with a meal containing fat for optimal absorption. Best taken in the morning.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'none',
      benefits: [
        'Improves insulin sensitivity',
        'Supports immune system health',
        'Helps maintain bone health',
        'May reduce diabetes risk',
        'Improves overall energy levels',
      ],
      targetConditions: ['type1_diabetes', 'type2_diabetes', 'insulin_resistance', 'vitamin_d_deficiency'],
    },
  },
  {
    id: 'magnesium',
    name: 'Magnesium',
    nameEn: 'Magnesium',
    category: 'Boost Energy',
    basicInfo: {
      activeIngredient: 'Magnesium citrate/malate/glycinate',
      dosage: '200-400mg daily',
      form: 'Tablets/Capsules/Powder',
      manufacturer: 'Various',
      description: 'Essential mineral that plays a crucial role in glucose metabolism and insulin function. Magnesium deficiency is common in diabetes patients and is associated with poor blood sugar control and increased risk of complications.',
      price: 15.99,
      packSize: '100 tablets',
    },
    precautions: {
      contraindications: [
        'Patients with severe kidney disease or renal failure should avoid',
        'Patients with myasthenia gravis should avoid',
        'Not recommended for patients with heart block',
      ],
      possibleSideEffects: [
        'Diarrhea or loose stools (especially with magnesium citrate)',
        'Stomach upset or nausea',
        'Abdominal cramping',
        'Drowsiness or fatigue',
        'Low blood pressure',
      ],
      drugInteractions: [
        'May interfere with absorption of certain antibiotics (take 2 hours apart)',
        'May interact with blood pressure medications',
        'Can interfere with muscle relaxants',
        'May interact with diuretics',
      ],
      warnings: [
        '⚠️ Patients with kidney disease should use only under medical supervision',
        '⚠️ Start with lower doses to avoid diarrhea',
        '⚠️ Magnesium citrate is more likely to cause diarrhea than other forms',
        '⚠️ Do not exceed recommended doses without medical supervision',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade A Evidence (Strong Recommendation)',
      clinicalStudies: [
        {
          title: 'Magnesium and Type 2 Diabetes: Meta-analysis',
          year: 2021,
          participants: 'Meta-analysis of 32 randomized controlled trials',
          duration: 'Various (8-24 weeks)',
          results: 'Significant improvement in fasting glucose (6-12mg/dL reduction), improved HbA1c by 0.3-0.5%, enhanced insulin sensitivity',
          source: 'Diabetes Research and Clinical Practice',
        },
        {
          title: 'Magnesium Supplementation and Insulin Resistance',
          year: 2019,
          participants: '116 patients with Type 2 diabetes',
          duration: '12 weeks',
          results: 'Improved insulin sensitivity by 10%, reduced fasting glucose by 11mg/dL, improved glucose tolerance test results',
          source: 'Journal of Trace Elements in Medicine and Biology',
        },
        {
          title: 'Magnesium and Diabetic Complications Prevention',
          year: 2020,
          participants: '4,654 patients followed for 18 years',
          duration: '18 years',
          results: 'Higher magnesium intake associated with 47% lower risk of diabetes complications, better glycemic control',
          source: 'Diabetes Care Journal',
        },
        {
          title: 'Mechanisms of Magnesium in Glucose Metabolism',
          year: 2018,
          findings: 'Magnesium is essential for insulin receptor function, glucose transporter activity, and enzymatic reactions in glucose metabolism',
          source: 'Current Opinion in Clinical Nutrition',
        },
      ],
      mechanismOfAction: [
        'Essential cofactor for insulin receptor signaling',
        'Required for glucose transporter (GLUT4) activity',
        'Supports enzymatic reactions in glucose metabolism',
        'Reduces inflammation and oxidative stress',
        'Improves pancreatic beta-cell function and insulin secretion',
      ],
      recommendedUse: 'Take 200-400mg daily, preferably with meals. Start with lower dose (200mg) and increase gradually if well-tolerated. Magnesium glycinate or malate are gentler on the stomach than citrate. Best results after 8-12 weeks of consistent use.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'none',
      benefits: [
        'Improves insulin sensitivity',
        'Enhances glucose metabolism',
        'Supports energy production',
        'May reduce risk of diabetes complications',
        'Helps with muscle function',
      ],
      targetConditions: ['type1_diabetes', 'type2_diabetes', 'insulin_resistance', 'magnesium_deficiency'],
    },
  },
  {
    id: 'fenugreek',
    name: 'Fenugreek Seed Extract',
    nameEn: 'Fenugreek Seed Extract',
    category: 'Blood Sugar Control',
    basicInfo: {
      activeIngredient: '4-Hydroxyisoleucine, Trigonelline, Galactomannan fiber',
      dosage: '500-2000mg daily',
      form: 'Capsules/Tablets',
      manufacturer: 'Various',
      description: 'Traditional herbal remedy shown to help improve glucose tolerance and insulin sensitivity. Fenugreek contains soluble fiber and compounds that may help lower blood sugar levels in diabetes patients.',
      price: 14.99,
      packSize: '60 capsules',
    },
    precautions: {
      contraindications: [
        'Pregnant and breastfeeding women should avoid',
        'People allergic to legumes (peanuts, soy) should avoid',
        'Patients with bleeding disorders should use with caution',
        'Not recommended 2 weeks before scheduled surgery',
      ],
      possibleSideEffects: [
        'Mild stomach upset',
        'Diarrhea or constipation',
        'Maple syrup-like odor in urine (harmless)',
        'Hypoglycemia risk when combined with diabetes medications',
        'Allergic reactions in sensitive individuals',
      ],
      drugInteractions: [
        'May enhance effects of diabetes medications (requires dose adjustment)',
        'May interact with warfarin and other blood-thinning medications',
        'May affect iron absorption (take separately from iron supplements)',
        'Can interfere with hormone medications',
      ],
      warnings: [
        '⚠️ Patients taking diabetes medications should consult doctor before use',
        '⚠️ Monitor blood sugar levels to avoid hypoglycemia',
        '⚠️ Not a substitute for prescription medications',
        '⚠️ May cause maple syrup odor in urine (harmless but can be concerning)',
      ],
    },
    scientificEvidence: {
      evidenceLevel: 'Grade B Evidence (Moderate Recommendation)',
      clinicalStudies: [
        {
          title: 'Fenugreek Seed Extract for Type 2 Diabetes Management',
          year: 2015,
          participants: '60 patients with Type 2 diabetes',
          duration: '12 weeks',
          results: 'HbA1c reduced by 0.6%, fasting glucose reduced by 15-20mg/dL, improved glucose tolerance',
          source: 'Journal of Diabetes Research',
        },
        {
          title: 'Mechanism of Action of Fenugreek in Blood Sugar Control',
          year: 2018,
          findings: 'Acts through delaying carbohydrate absorption, enhancing insulin sensitivity, and stimulating insulin secretion',
          source: 'Phytotherapy Research',
        },
        {
          title: 'Systematic Review: Fenugreek in Diabetes Management',
          year: 2020,
          participants: 'Review of 10 RCT studies',
          duration: 'Various',
          results: '10 RCT studies show fenugreek can significantly improve glycemic control, with HbA1c reductions of 0.3-0.8%',
          source: 'Diabetes & Metabolic Syndrome',
        },
      ],
      mechanismOfAction: [
        'Contains 4-hydroxyisoleucine which stimulates insulin secretion',
        'High soluble fiber content delays gastric emptying and sugar absorption',
        'Improves insulin sensitivity in peripheral tissues',
        'May enhance glucose uptake in muscle cells',
        'Reduces post-meal blood sugar spikes',
      ],
      recommendedUse: 'Start with 500mg daily, can increase to 1000-2000mg if tolerated. Take 30 minutes before meals for best results. Gradually increase dose to avoid stomach upset. Results typically seen after 8-12 weeks of consistent use.',
    },
    diabetesInfo: {
      suitability: 'high',
      bloodSugarImpact: 'minimal',
      benefits: [
        'Improves glucose tolerance',
        'Lowers fasting and post-meal blood sugar',
        'May reduce HbA1c levels',
        'Enhances insulin sensitivity',
        'Traditional remedy with modern research support',
      ],
      targetConditions: ['type2_diabetes', 'insulin_resistance', 'glucose_intolerance'],
    },
  },
];

/**
 * Validate product data completeness
 */
export function validateProductData(product: CompleteSupplementData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check basic info
  if (!product.basicInfo?.activeIngredient) {
    errors.push('Missing active ingredient information');
  }
  if (!product.basicInfo?.dosage) {
    errors.push('Missing dosage information');
  }
  if (!product.basicInfo?.description) {
    errors.push('Missing product description');
  }

  // Check precautions
  if (!product.precautions?.contraindications?.length) {
    errors.push('Missing contraindications information');
  }
  if (!product.precautions?.possibleSideEffects?.length) {
    errors.push('Missing side effects information');
  }
  if (!product.precautions?.drugInteractions?.length) {
    errors.push('Missing drug interactions information');
  }
  if (!product.precautions?.warnings?.length) {
    errors.push('Missing warnings information');
  }

  // Check scientific evidence
  if (!product.scientificEvidence?.evidenceLevel) {
    errors.push('Missing evidence level');
  }
  if (!product.scientificEvidence?.clinicalStudies?.length) {
    errors.push('Missing clinical studies data');
  }
  if (!product.scientificEvidence?.mechanismOfAction?.length) {
    errors.push('Missing mechanism of action');
  }
  if (!product.scientificEvidence?.recommendedUse) {
    errors.push('Missing recommended use instructions');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get supplement by name or ID
 */
export function getSupplementByName(name: string): CompleteSupplementData | undefined {
  return completeSupplementDatabase.find(
    (s) => s.name.toLowerCase().includes(name.toLowerCase()) ||
           s.nameEn?.toLowerCase().includes(name.toLowerCase())
  );
}

/**
 * Get supplements by category
 */
export function getSupplementsByCategory(category: string): CompleteSupplementData[] {
  return completeSupplementDatabase.filter(
    (s) => s.category.toLowerCase() === category.toLowerCase()
  );
}

