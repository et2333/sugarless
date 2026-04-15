/**
 * Complete Product Database Seed
 * Contains 25+ products with inStock: true, stockQuantity, and prescriptionRequired flags
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productDatabase = [
  // ========== Supplements (10 products) ==========
  {
    name: "Omega-3 Fish Oil 1000mg",
    brand: "Nature's Bounty",
    category: "Supplement",
    price: 24.99,
    inStock: true,
    stockQuantity: 50,
    description: "Supports heart health and reduces inflammation in diabetes patients",
    diabetesRelevance: 0.85,
    prescriptionRequired: false,
  },
  {
    name: "Omega-3 Vegan Algae Oil",
    brand: "Nordic Naturals",
    category: "Supplement",
    price: 29.99,
    inStock: true,
    stockQuantity: 30,
    description: "Plant-based omega-3 suitable for vegetarians with diabetes",
    diabetesRelevance: 0.80,
    prescriptionRequired: false,
  },
  {
    name: "Vitamin C 1000mg",
    brand: "Nature's Way",
    category: "Vitamin",
    price: 12.99,
    inStock: true,
    stockQuantity: 100,
    description: "High-potency Vitamin C supplement with immune support",
    diabetesRelevance: 0.70,
    prescriptionRequired: false,
  },
  {
    name: "Vitamin D3 5000 IU",
    brand: "NOW Foods",
    category: "Vitamin",
    price: 15.99,
    inStock: true,
    stockQuantity: 80,
    description: "Supports insulin sensitivity and bone health",
    diabetesRelevance: 0.90,
    prescriptionRequired: false,
  },
  {
    name: "Magnesium Glycinate 400mg",
    brand: "Pure Encapsulations",
    category: "Mineral",
    price: 22.99,
    inStock: true,
    stockQuantity: 60,
    description: "Helps regulate blood sugar and improves insulin function",
    diabetesRelevance: 0.88,
    prescriptionRequired: false,
  },
  {
    name: "Alpha Lipoic Acid 600mg",
    brand: "Doctor's Best",
    category: "Supplement",
    price: 18.99,
    inStock: true,
    stockQuantity: 45,
    description: "Powerful antioxidant that may help with diabetic neuropathy",
    diabetesRelevance: 0.92,
    prescriptionRequired: false,
  },
  {
    name: "Chromium Picolinate 200mcg",
    brand: "Solgar",
    category: "Mineral",
    price: 14.99,
    inStock: true,
    stockQuantity: 70,
    description: "Enhances insulin action and glucose metabolism",
    diabetesRelevance: 0.95,
    prescriptionRequired: false,
  },
  {
    name: "Cinnamon Extract 1000mg",
    brand: "Nature's Nutrition",
    category: "Herbal",
    price: 16.99,
    inStock: true,
    stockQuantity: 55,
    description: "May help lower fasting blood glucose levels",
    diabetesRelevance: 0.87,
    prescriptionRequired: false,
  },
  {
    name: "B-Complex Vitamin",
    brand: "Garden of Life",
    category: "Vitamin",
    price: 19.99,
    inStock: true,
    stockQuantity: 90,
    description: "Supports energy metabolism and nerve health",
    diabetesRelevance: 0.75,
    prescriptionRequired: false,
  },
  {
    name: "CoQ10 100mg",
    brand: "Qunol",
    category: "Supplement",
    price: 27.99,
    inStock: true,
    stockQuantity: 40,
    description: "Supports heart health and cellular energy production",
    diabetesRelevance: 0.78,
    prescriptionRequired: false,
  },

  // ========== Medications (4 products) ==========
  {
    name: "Metformin 500mg",
    brand: "Generic",
    category: "Medication",
    price: 10.99,
    inStock: true,
    stockQuantity: 200,
    description: "First-line medication for type 2 diabetes",
    diabetesRelevance: 1.0,
    prescriptionRequired: true,
  },
  {
    name: "Insulin Glargine (Lantus)",
    brand: "Sanofi",
    category: "Medication",
    price: 89.99,
    inStock: true,
    stockQuantity: 25,
    description: "Long-acting insulin for diabetes management",
    diabetesRelevance: 1.0,
    prescriptionRequired: true,
  },
  {
    name: "Januvia 100mg",
    brand: "Merck",
    category: "Medication",
    price: 45.99,
    inStock: true,
    stockQuantity: 30,
    description: "DPP-4 inhibitor for type 2 diabetes",
    diabetesRelevance: 1.0,
    prescriptionRequired: true,
  },
  {
    name: "Jardiance 10mg",
    brand: "Boehringer",
    category: "Medication",
    price: 52.99,
    inStock: true,
    stockQuantity: 35,
    description: "SGLT2 inhibitor that helps lower blood sugar",
    diabetesRelevance: 1.0,
    prescriptionRequired: true,
  },

  // ========== Monitoring Devices (8 products) ==========
  {
    name: "Contour Next Blood Glucose Meter",
    brand: "Ascensia",
    category: "Monitor",
    price: 29.99,
    inStock: true,
    stockQuantity: 50,
    description: "Highly accurate blood glucose monitoring system",
    diabetesRelevance: 1.0,
    prescriptionRequired: false,
  },
  {
    name: "OneTouch Verio Test Strips (50ct)",
    brand: "OneTouch",
    category: "Test Strips",
    price: 39.99,
    inStock: true,
    stockQuantity: 100,
    description: "Blood glucose test strips for OneTouch meters",
    diabetesRelevance: 1.0,
    prescriptionRequired: false,
  },
  {
    name: "FreeStyle Libre 2 Sensor",
    brand: "Abbott",
    category: "CGM",
    price: 74.99,
    inStock: true,
    stockQuantity: 20,
    description: "14-day continuous glucose monitoring sensor",
    diabetesRelevance: 1.0,
    prescriptionRequired: false,
  },
  {
    name: "Dexcom G7 CGM System",
    brand: "Dexcom",
    category: "CGM",
    price: 299.99,
    inStock: true,
    stockQuantity: 15,
    description: "Real-time continuous glucose monitoring",
    diabetesRelevance: 1.0,
    prescriptionRequired: false,
  },
  {
    name: "Lancets (100 count)",
    brand: "Care Touch",
    category: "Supplies",
    price: 8.99,
    inStock: true,
    stockQuantity: 200,
    description: "Sterile lancets for blood glucose testing",
    diabetesRelevance: 0.95,
    prescriptionRequired: false,
  },
  {
    name: "Insulin Pen Needles 4mm",
    brand: "BD",
    category: "Supplies",
    price: 24.99,
    inStock: true,
    stockQuantity: 150,
    description: "Ultra-fine pen needles for insulin injection",
    diabetesRelevance: 0.98,
    prescriptionRequired: false,
  },
  {
    name: "A1C Home Test Kit",
    brand: "CVS Health",
    category: "Test Kit",
    price: 39.99,
    inStock: true,
    stockQuantity: 30,
    description: "At-home HbA1c testing kit",
    diabetesRelevance: 0.96,
    prescriptionRequired: false,
  },
  {
    name: "Blood Pressure Monitor",
    brand: "Omron",
    category: "Monitor",
    price: 49.99,
    inStock: true,
    stockQuantity: 40,
    description: "Automatic blood pressure monitor for home use",
    diabetesRelevance: 0.85,
    prescriptionRequired: false,
  },

  // ========== Special Foods (Rice-related products) ==========
  {
    name: "Low GI Brown Rice",
    brand: "Lundberg",
    category: "Food",
    price: 12.99,
    inStock: true,
    stockQuantity: 80,
    description: "Low glycemic index rice suitable for diabetes",
    diabetesRelevance: 0.70,
    prescriptionRequired: false,
  },
  {
    name: "Cauliflower Rice",
    brand: "Green Giant",
    category: "Food",
    price: 4.99,
    inStock: true,
    stockQuantity: 60,
    description: "Low-carb rice alternative for blood sugar control",
    diabetesRelevance: 0.90,
    prescriptionRequired: false,
  },
  {
    name: "Konjac Rice (Shirataki)",
    brand: "Miracle Noodle",
    category: "Food",
    price: 3.99,
    inStock: true,
    stockQuantity: 100,
    description: "Zero-calorie, zero-carb rice substitute",
    diabetesRelevance: 0.95,
    prescriptionRequired: false,
  },

  // ========== Additional Products (3 more to reach 25) ==========
  {
    name: "Vitamin B12 1000mcg",
    brand: "Nature Made",
    category: "Vitamin",
    price: 13.99,
    inStock: true,
    stockQuantity: 75,
    description: "Essential for nerve health and energy production",
    diabetesRelevance: 0.72,
    prescriptionRequired: false,
  },
  {
    name: "Iron Supplement 18mg",
    brand: "Nature's Bounty",
    category: "Mineral",
    price: 11.99,
    inStock: true,
    stockQuantity: 85,
    description: "Iron supplement for diabetes patients with anemia",
    diabetesRelevance: 0.65,
    prescriptionRequired: false,
  },
  {
    name: "Fenugreek Seed Extract",
    brand: "Nature's Way",
    category: "Herbal",
    price: 17.99,
    inStock: true,
    stockQuantity: 45,
    description: "Traditional herb that may help control blood sugar",
    diabetesRelevance: 0.82,
    prescriptionRequired: false,
  },
];

async function seedCompleteProducts() {
  console.log('\n📦 Seeding complete product database...');

  // Don't delete existing products, just add new ones
  // To avoid duplicates, we'll check by name and brand
  let addedCount = 0;
  let skippedCount = 0;

  for (const product of productDatabase) {
    try {
      // Check if product already exists
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          brand: product.brand || null,
        },
      });

      if (existing) {
        // Update existing product to ensure it has the new fields
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            inStock: true,
            stockQuantity: product.stockQuantity || 100,
            prescriptionRequired: product.prescriptionRequired || false,
            diabetesRelevance: product.diabetesRelevance || 0.5,
            description: product.description,
          },
        });
        skippedCount++;
      } else {
        // Create new product
        await prisma.product.create({
          data: {
            ...product,
            nameEn: product.name, // Set English name same as name
            descriptionEn: product.description,
          },
        });
        addedCount++;
      }
    } catch (error: any) {
      console.error(`Error processing product ${product.name}:`, error.message);
    }
  }

  // Also update all existing products to ensure inStock is true
  await prisma.product.updateMany({
    data: {
      inStock: true,
    },
  });

  // Set default stockQuantity for products without it
  const productsWithoutStock = await prisma.product.findMany({
    where: {
      stockQuantity: null,
    },
  });

  for (const product of productsWithoutStock) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        stockQuantity: 100,
      },
    });
  }

  console.log(`  ✅ Added ${addedCount} new products`);
  console.log(`  ✅ Updated ${skippedCount} existing products`);
  console.log(`  ✅ Ensured all products have inStock: true`);
  console.log(`  ✅ Total products in database: ${await prisma.product.count()}`);
}

seedCompleteProducts()
  .catch((e) => {
    console.error('Error seeding products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedCompleteProducts };

