import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extended product data for vitamins and supplements
async function seedExtendedProducts() {
  console.log('\n📦 Seeding extended product data (Vitamins & Supplements)...');
  
  const extendedProducts = [
    // Vitamin C Products (10 items)
    { name: 'Vitamin C 1000mg', brand: 'Nature\'s Way', category: 'Vitamin', dosage: '1000mg', quantity: 100, unit: 'tablets', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: 'High-potency Vitamin C supplement with immune support benefits' },
    { name: 'Vitamin C with Zinc', brand: 'Swisse', category: 'Vitamin', dosage: '1000mg + 10mg', quantity: 60, unit: 'tablets', price: 15.99, vendor: 'Priceline', inStock: true, description: 'Vitamin C enhanced with zinc for enhanced immune function' },
    { name: 'Ester-C 1000mg', brand: 'Nature Made', category: 'Vitamin', dosage: '1000mg', quantity: 90, unit: 'tablets', price: 19.99, vendor: 'iHerb', inStock: true, description: 'Buffered Vitamin C form, gentle on stomach' },
    { name: 'Liposomal Vitamin C', brand: 'Dr. Mercola', category: 'Vitamin', dosage: '1000mg', quantity: 30, unit: 'packets', price: 29.99, vendor: 'iHerb', inStock: true, description: 'Advanced absorption technology for better bioavailability' },
    { name: 'Vitamin C Chewable 500mg', brand: 'Nature\'s Bounty', category: 'Vitamin', dosage: '500mg', quantity: 120, unit: 'tablets', price: 11.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Delicious chewable Vitamin C tablets' },
    { name: 'Vitamin C Time Release', brand: 'Solgar', category: 'Vitamin', dosage: '1000mg', quantity: 100, unit: 'tablets', price: 22.99, vendor: 'Priceline', inStock: true, description: 'Sustained-release formula for all-day support' },
    { name: 'Natural Vitamin C Complex', brand: 'Garden of Life', category: 'Vitamin', dosage: '500mg', quantity: 60, unit: 'capsules', price: 24.99, vendor: 'iHerb', inStock: true, description: 'Whole food Vitamin C from organic fruits' },
    { name: 'Vitamin C Powder', brand: 'Now Foods', category: 'Vitamin', dosage: '1134mg per tsp', quantity: 227, unit: 'g', price: 16.99, vendor: 'iHerb', inStock: true, description: 'Pure ascorbic acid powder for flexible dosing' },
    { name: 'Vitamin C with Rose Hips', brand: 'Solaray', category: 'Vitamin', dosage: '1000mg', quantity: 100, unit: 'tablets', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Vitamin C with natural rose hip extract' },
    { name: 'Vitamin C Gummies', brand: 'Nature Made', category: 'Vitamin', dosage: '250mg', quantity: 150, unit: 'gummies', price: 13.99, vendor: 'Priceline', inStock: true, description: 'Delicious gummy Vitamin C for kids and adults' },
    
    // Vitamin D3 Products (10 items)
    { name: 'Vitamin D3 1000 IU', brand: 'Nature\'s Way', category: 'Vitamin', dosage: '1000 IU', quantity: 100, unit: 'softgels', price: 9.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Standard dose Vitamin D3 for daily support' },
    { name: 'Vitamin D3 2000 IU', brand: 'Swisse', category: 'Vitamin', dosage: '2000 IU', quantity: 60, unit: 'tablets', price: 12.99, vendor: 'Priceline', inStock: true, description: 'Higher potency Vitamin D3 supplement' },
    { name: 'Vitamin D3 5000 IU', brand: 'Now Foods', category: 'Vitamin', dosage: '5000 IU', quantity: 120, unit: 'softgels', price: 15.99, vendor: 'iHerb', inStock: true, description: 'High-potency Vitamin D3 for deficiency correction' },
    { name: 'Vitamin D3 + K2', brand: 'Thorne Research', category: 'Vitamin', dosage: '1000 IU D3 + 100mcg K2', quantity: 60, unit: 'capsules', price: 24.99, vendor: 'iHerb', inStock: true, description: 'Combined D3 and K2 for optimal calcium utilization' },
    { name: 'Liquid Vitamin D3', brand: 'Nordic Naturals', category: 'Vitamin', dosage: '1000 IU per drop', quantity: 30, unit: 'ml', price: 19.99, vendor: 'iHerb', inStock: true, description: 'Liquid form for easy absorption and dosing' },
    { name: 'Vitamin D3 Chewable', brand: 'Nature Made', category: 'Vitamin', dosage: '2000 IU', quantity: 60, unit: 'tablets', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Easy-to-take chewable Vitamin D3' },
    { name: 'Vitamin D3 Spray', brand: 'BetterYou', category: 'Vitamin', dosage: '3000 IU per spray', quantity: 30, unit: 'ml', price: 18.99, vendor: 'iHerb', inStock: true, description: 'Oral spray for efficient absorption' },
    { name: 'Vitamin D3 with Calcium', brand: 'Caltrate', category: 'Vitamin', dosage: '400 IU + 600mg', quantity: 60, unit: 'tablets', price: 16.99, vendor: 'Priceline', inStock: true, description: 'D3 and calcium combination for bone health' },
    { name: 'Organic Vitamin D3', brand: 'Garden of Life', category: 'Vitamin', dosage: '2000 IU', quantity: 60, unit: 'capsules', price: 22.99, vendor: 'iHerb', inStock: true, description: 'Organic, plant-based Vitamin D3' },
    { name: 'Vitamin D3 Gummies', brand: 'Nature Made', category: 'Vitamin', dosage: '2000 IU', quantity: 90, unit: 'gummies', price: 17.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Delicious gummy Vitamin D3 supplement' },
    
    // B-Complex Vitamins (10 items)
    { name: 'B-Complex 100', brand: 'Nature\'s Bounty', category: 'Vitamin', dosage: '100mg B-vitamins', quantity: 60, unit: 'tablets', price: 11.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Complete B-vitamin complex with all essential B vitamins' },
    { name: 'Super B-Complex', brand: 'Nature Made', category: 'Vitamin', dosage: 'High potency', quantity: 100, unit: 'tablets', price: 16.99, vendor: 'Priceline', inStock: true, description: 'High-potency B-vitamin complex' },
    { name: 'B-Complex with Vitamin C', brand: 'Swisse', category: 'Vitamin', dosage: 'Standard dose', quantity: 60, unit: 'tablets', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: 'B-vitamins enhanced with Vitamin C' },
    { name: 'Methylated B-Complex', brand: 'Thorne Research', category: 'Vitamin', dosage: 'Active forms', quantity: 60, unit: 'capsules', price: 29.99, vendor: 'iHerb', inStock: true, description: 'Bioavailable methylated B-vitamin forms' },
    { name: 'B-Complex Liquid', brand: 'Now Foods', category: 'Vitamin', dosage: '1 fl oz', quantity: 30, unit: 'ml', price: 12.99, vendor: 'iHerb', inStock: true, description: 'Liquid B-complex for easy absorption' },
    { name: 'Stress B-Complex', brand: 'Solgar', category: 'Vitamin', dosage: 'With C', quantity: 100, unit: 'tablets', price: 19.99, vendor: 'Priceline', inStock: true, description: 'B-vitamins formulated for stress support' },
    { name: 'B-Complex Timed Release', brand: 'Nature\'s Way', category: 'Vitamin', dosage: 'Sustained release', quantity: 100, unit: 'tablets', price: 17.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Sustained-release B-complex formula' },
    { name: 'Energy B-Complex', brand: 'Garden of Life', category: 'Vitamin', dosage: 'Whole food', quantity: 60, unit: 'tablets', price: 24.99, vendor: 'iHerb', inStock: true, description: 'Whole food B-complex for energy support' },
    { name: 'B-Complex Gummies', brand: 'Nature Made', category: 'Vitamin', dosage: 'Standard dose', quantity: 90, unit: 'gummies', price: 15.99, vendor: 'Priceline', inStock: true, description: 'Delicious gummy B-complex vitamins' },
    { name: 'B-Complex with Folate', brand: 'Now Foods', category: 'Vitamin', dosage: 'With folic acid', quantity: 100, unit: 'tablets', price: 13.99, vendor: 'iHerb', inStock: true, description: 'B-complex with added folate support' },
    
    // Iron Supplements (5 items)
    { name: 'Iron 65mg', brand: 'Nature Made', category: 'Mineral', dosage: '65mg', quantity: 60, unit: 'tablets', price: 9.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Gentle iron supplement with Vitamin C' },
    { name: 'Iron Bisglycinate', brand: 'Solgar', category: 'Mineral', dosage: '25mg', quantity: 90, unit: 'tablets', price: 18.99, vendor: 'Priceline', inStock: true, description: 'Chelated iron form, easy on stomach' },
    { name: 'Liquid Iron', brand: 'Floradix', category: 'Mineral', dosage: '10mg per tsp', quantity: 250, unit: 'ml', price: 24.99, vendor: 'iHerb', inStock: true, description: 'Herbal liquid iron supplement' },
    { name: 'Iron with Vitamin C', brand: 'Swisse', category: 'Mineral', dosage: '20mg + C', quantity: 60, unit: 'tablets', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Iron enhanced with Vitamin C for absorption' },
    { name: 'Gentle Iron', brand: 'Nature\'s Bounty', category: 'Mineral', dosage: '18mg', quantity: 90, unit: 'tablets', price: 11.99, vendor: 'Priceline', inStock: true, description: 'Gentle iron supplement for sensitive stomachs' },
    
    // Calcium Supplements (5 items)
    { name: 'Calcium 600mg', brand: 'Nature Made', category: 'Mineral', dosage: '600mg', quantity: 120, unit: 'tablets', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Standard calcium supplement with Vitamin D' },
    { name: 'Calcium Citrate', brand: 'Now Foods', category: 'Mineral', dosage: '500mg', quantity: 100, unit: 'tablets', price: 10.99, vendor: 'iHerb', inStock: true, description: 'Highly absorbable calcium citrate form' },
    { name: 'Calcium + Magnesium + D3', brand: 'Solgar', category: 'Mineral', dosage: '1000mg + 500mg + 400IU', quantity: 120, unit: 'tablets', price: 19.99, vendor: 'Priceline', inStock: true, description: 'Complete bone support formula' },
    { name: 'Liquid Calcium', brand: 'Bluebonnet', category: 'Mineral', dosage: '1000mg per tbsp', quantity: 16, unit: 'fl oz', price: 22.99, vendor: 'iHerb', inStock: true, description: 'Liquid calcium for easy absorption' },
    { name: 'Calcium Chewable', brand: 'Viactiv', category: 'Mineral', dosage: '500mg', quantity: 60, unit: 'chews', price: 13.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Delicious chewable calcium supplements' },
    
    // Glucose Monitoring Products (10 items)
    { name: 'Blood Glucose Test Strips', brand: 'Accu-Chek', category: 'Medical Device', dosage: '50 strips', quantity: 50, unit: 'strips', price: 29.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Reliable glucose test strips for diabetes monitoring' },
    { name: 'Blood Glucose Meter', brand: 'Accu-Chek Guide', category: 'Medical Device', dosage: '1 meter', quantity: 1, unit: 'unit', price: 19.99, vendor: 'Priceline', inStock: true, description: 'Easy-to-use blood glucose monitoring device' },
    { name: 'Lancing Device', brand: 'Accu-Chek FastClix', category: 'Medical Device', dosage: '1 device', quantity: 1, unit: 'unit', price: 14.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Virtually painless lancing device' },
    { name: 'Lancets', brand: 'Accu-Chek', category: 'Medical Device', dosage: '200 lancets', quantity: 200, unit: 'lancets', price: 24.99, vendor: 'Priceline', inStock: true, description: 'Disposable lancets for blood glucose testing' },
    { name: 'Blood Glucose Meter Kit', brand: 'Contour Next', category: 'Medical Device', dosage: 'Complete kit', quantity: 1, unit: 'kit', price: 39.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Complete glucose monitoring kit with meter and strips' },
    { name: 'Continuous Glucose Monitor', brand: 'FreeStyle Libre', category: 'Medical Device', dosage: '14-day sensor', quantity: 1, unit: 'sensor', price: 89.99, vendor: 'Priceline', inStock: true, description: '14-day continuous glucose monitoring sensor' },
    { name: 'Glucose Control Solution', brand: 'Accu-Chek', category: 'Medical Device', dosage: '2 vials', quantity: 2, unit: 'vials', price: 12.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Control solution for meter accuracy testing' },
    { name: 'Glucose Gel', brand: 'GlucoLift', category: 'Medical Device', dosage: '15g per tube', quantity: 6, unit: 'tubes', price: 16.99, vendor: 'Priceline', inStock: true, description: 'Fast-acting glucose gel for hypoglycemia treatment' },
    { name: 'Blood Glucose Log Book', brand: 'Accu-Chek', category: 'Medical Device', dosage: '1 book', quantity: 1, unit: 'book', price: 8.99, vendor: 'Chemist Warehouse', inStock: true, description: 'Organized log book for tracking blood glucose readings' },
    { name: 'Glucose Test Strips (100)', brand: 'OneTouch', category: 'Medical Device', dosage: '100 strips', quantity: 100, unit: 'strips', price: 54.99, vendor: 'Priceline', inStock: true, description: 'Value pack of 100 glucose test strips' },
  ];
  
  // Check if products already exist to avoid duplicates (only check by name)
  const existingNames = new Set<string>();
  try {
    const existingProducts = await prisma.product.findMany({
      select: { name: true }
    });
    existingProducts.forEach(p => existingNames.add(p.name));
  } catch (error) {
    console.warn('Could not check existing products, will attempt to create all:', error);
  }
  
  const newProducts = extendedProducts.filter(p => !existingNames.has(p.name));
  
  if (newProducts.length > 0) {
    await prisma.product.createMany({
      data: newProducts
    });
    console.log(`  ✅ Added ${newProducts.length} new extended products`);
  } else {
    console.log(`  ℹ️  All extended products already exist`);
  }
  
  console.log(`  📊 Total extended products available: ${extendedProducts.length}`);
}

// Run seeding
async function main() {
  try {
    await seedExtendedProducts();
  } catch (error) {
    console.error('❌ Error seeding extended products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

