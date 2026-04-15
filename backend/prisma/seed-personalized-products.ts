import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Personalized recommendation test products
async function seedPersonalizedProducts() {
  console.log('\n📦 Seeding personalized recommendation products...');
  
  const personalizedProducts = [
    // Blood Sugar Control Category
    { name: 'Alpha Lipoic Acid 600mg', brand: 'Now Foods', category: 'Antioxidant', dosage: '600mg', quantity: 60, unit: 'tablets', price: 24.99, vendor: 'iHerb', inStock: true, description: 'Potent antioxidant that helps improve insulin sensitivity and may lower blood sugar levels in diabetes patients' },
    { name: 'Chromium Picolinate 200mcg', brand: 'Nature Made', category: 'Mineral', dosage: '200mcg', quantity: 100, unit: 'tablets', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Essential mineral that enhances insulin sensitivity and helps regulate blood glucose levels' },
    { name: 'Cinnamon Extract 1000mg', brand: 'Nature\'s Way', category: 'Herbal Supplement', dosage: '1000mg', quantity: 60, unit: 'capsules', price: 18.99, vendor: 'Priceline', inStock: true, description: 'Natural herbal supplement shown to help lower fasting blood sugar levels in diabetes patients' },
    { name: 'Bitter Melon Extract', brand: 'Solaray', category: 'Herbal Supplement', dosage: '500mg', quantity: 60, unit: 'capsules', price: 16.99, vendor: 'iHerb', inStock: true, description: 'Traditional remedy for blood sugar control, may help lower glucose levels naturally' },
    { name: 'Fenugreek Seed Extract', brand: 'Now Foods', category: 'Herbal Supplement', dosage: '610mg', quantity: 90, unit: 'capsules', price: 14.99, vendor: 'iHerb', inStock: true, description: 'May help improve glucose tolerance and insulin sensitivity in type 2 diabetes' },
    
    // Boost Energy Category
    { name: 'Vitamin B12 1000mcg', brand: 'Solgar', category: 'Vitamin', dosage: '1000mcg', quantity: 100, unit: 'tablets', price: 22.99, vendor: 'Priceline', inStock: true, description: 'High-potency B12 supplement to boost energy and support nerve health, especially important for diabetes patients' },
    { name: 'CoQ10 100mg', brand: 'Nature Made', category: 'Antioxidant', dosage: '100mg', quantity: 60, unit: 'softgels', price: 28.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Coenzyme Q10 supports cellular energy production and heart health, beneficial for diabetes patients' },
    { name: 'Iron 18mg', brand: 'Nature\'s Bounty', category: 'Mineral', dosage: '18mg', quantity: 90, unit: 'tablets', price: 11.99, vendor: 'Priceline', inStock: true, description: 'Gentle iron supplement to combat fatigue and support energy levels' },
    { name: 'Magnesium Citrate 400mg', brand: 'Now Foods', category: 'Mineral', dosage: '400mg', quantity: 100, unit: 'tablets', price: 15.99, vendor: 'iHerb', inStock: true, description: 'Essential mineral for energy metabolism, often deficient in diabetes patients' },
    { name: 'Vitamin D3 5000 IU', brand: 'Thorne Research', category: 'Vitamin', dosage: '5000 IU', quantity: 60, unit: 'softgels', price: 26.99, vendor: 'iHerb', inStock: true, description: 'High-potency Vitamin D3 for overall vitality and immune support, important for diabetes patients' },
    
    // Weight Management Category
    { name: 'Green Tea Extract 500mg', brand: 'Now Foods', category: 'Herbal Supplement', dosage: '500mg', quantity: 100, unit: 'tablets', price: 13.99, vendor: 'iHerb', inStock: true, description: 'May boost metabolism and support healthy weight management in diabetes patients' },
    { name: 'Garcinia Cambogia 1000mg', brand: 'Nature\'s Way', category: 'Herbal Supplement', dosage: '1000mg', quantity: 60, unit: 'capsules', price: 17.99, vendor: 'Priceline', inStock: true, description: 'May help reduce appetite and support weight management goals' },
    { name: 'CLA 1000mg', brand: 'Now Foods', category: 'Fatty Acid', dosage: '1000mg', quantity: 90, unit: 'softgels', price: 19.99, vendor: 'iHerb', inStock: true, description: 'Conjugated linoleic acid may help reduce body fat and support lean muscle mass' },
    { name: 'Psyllium Fiber', brand: 'Metamucil', category: 'Fiber', dosage: '3.4g per serving', quantity: 250, unit: 'g', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Soluble fiber supplement to increase satiety, improve blood sugar control, and support digestion' },
    { name: 'Probiotics 50 Billion CFU', brand: 'Culturelle', category: 'Probiotic', dosage: '50 billion CFU', quantity: 30, unit: 'capsules', price: 32.99, vendor: 'Priceline', inStock: true, description: 'High-potency probiotic to support gut health and may help with weight management and blood sugar control' },
  ];
  
  // Check existing products
  const existingNames = new Set<string>();
  try {
    const existingProducts = await prisma.product.findMany({
      select: { name: true }
    });
    existingProducts.forEach(p => existingNames.add(p.name));
  } catch (error) {
    console.warn('Could not check existing products:', error);
  }
  
  const newProducts = personalizedProducts.filter(p => !existingNames.has(p.name));
  
  if (newProducts.length > 0) {
    await prisma.product.createMany({
      data: newProducts
    });
    console.log(`  ✅ Added ${newProducts.length} personalized recommendation products`);
  } else {
    console.log(`  ℹ️  All personalized products already exist`);
  }
  
  // Also add to Supplement table if needed
  const supplementData = personalizedProducts.map(p => ({
    name: p.name,
    nameEn: p.name,
    category: p.category,
    type: p.category.toLowerCase().includes('vitamin') ? 'vitamin' : 
          p.category.toLowerCase().includes('mineral') ? 'mineral' : 'supplement',
    evidenceLevel: 'B',
    activeIngredients: JSON.stringify([{ name: p.name.split(' ')[0], amount: p.dosage }]),
    benefits: JSON.stringify([
      'Suitable for diabetes patients',
      'Evidence-based support',
      'Quality supplement'
    ]),
    indications: JSON.stringify(['Diabetes support', 'Health maintenance']),
    suitableFor: JSON.stringify({ diabetesType: ['type_1', 'type_2'] }),
    expectedImpact: JSON.stringify(['Health support', 'Diabetes management']),
    dosage: JSON.stringify({ amount: 1, unit: p.unit, frequency: 'Daily' }),
    sideEffects: JSON.stringify({ common: [], rare: [] }),
    averagePrice: p.price,
    evidenceSources: JSON.stringify(['Clinical research and studies']),
    contraindications: JSON.stringify([]),
    isActive: true,
  }));

  // Check existing supplements
  const existingSupplementNames = new Set<string>();
  try {
    const existingSupplements = await prisma.supplement.findMany({
      select: { name: true }
    });
    existingSupplements.forEach(s => existingSupplementNames.add(s.name));
  } catch (error) {
    console.warn('Could not check existing supplements:', error);
  }

  const newSupplements = supplementData.filter(s => !existingSupplementNames.has(s.name));
  
  if (newSupplements.length > 0) {
    await prisma.supplement.createMany({
      data: newSupplements
    });
    console.log(`  ✅ Added ${newSupplements.length} supplements for personalized recommendations`);
  }
  
  console.log(`  📊 Total personalized products available: ${personalizedProducts.length}`);
}

// Run seeding
async function main() {
  try {
    await seedPersonalizedProducts();
  } catch (error) {
    console.error('❌ Error seeding personalized products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

