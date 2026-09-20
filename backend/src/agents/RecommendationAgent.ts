/**
 * RecommendationAgent - AI-Powered Supplement Recommendations
 * From Report: UC-B2.1 Get Recommendations, UC-B2.2 View Recommendations
 * Implements B2 Optimized Recommendations module
 */

import { BaseAgent, AgentContext, AgentResponse } from './core/BaseAgent';
import { DynamicTool } from '@langchain/core/tools';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import prisma from '../utils/prisma';

interface RecommendationRequest {
  focus?: 'blood_sugar' | 'weight' | 'energy' | 'general' | 'cardiovascular' | 'neuropathy';
  userConditions?: string[];
  currentMedications?: string[];
  budget?: number;
  preferences?: {
    form?: 'capsule' | 'tablet' | 'liquid' | 'powder';
    frequency?: 'daily' | 'twice_daily' | 'as_needed';
    timing?: 'morning' | 'evening' | 'with_meal' | 'empty_stomach';
  };
}

interface SupplementRecommendation {
  supplement: {
    id: string;
    name: string;
    type: string;
    category: string;
    activeIngredients: any[];
    benefits: string[];
    dosage: any;
    evidenceLevel: string;
    averagePrice: number;
  };
  rank: number;
  strength: 'strong' | 'moderate' | 'weak';
  reasons: string[];
  expectedImpact: {
    hba1c?: number;
    glucose?: number;
    timeframe: number;
    confidence: number;
  };
  interactions: Array<{
    drug: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }>;
  pricing: {
    averagePrice: number;
    lowestPrice: number;
    vendor: string;
  };
  relevanceScore: number;
}

export class RecommendationAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context);
    this.initializeTools();
  }

  private initializeTools() {
    this.tools = [
      new DynamicTool({
        name: 'get_user_health_data',
        description: 'Get comprehensive user health data including profile, medications, and history',
        func: async () => {
          const profile = await this.getUserProfile();
          const medications = await prisma.medication.findMany({
            where: { userId: this.context.userId, isActive: true },
          });
          const bloodSugarRecords = await prisma.bloodSugarRecord.findMany({
            where: { userId: this.context.userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });
          
          return JSON.stringify({
            profile,
            medications,
            bloodSugarRecords,
          });
        },
      }),

      new DynamicTool({
        name: 'search_supplements',
        description: 'Search supplements database with filters',
        func: async (input: string) => {
          const criteria = JSON.parse(input);
          const supplements = await prisma.supplement.findMany({
            where: {
              isActive: true,
              ...(criteria.category && { category: criteria.category }),
              ...(criteria.type && { type: criteria.type }),
              ...(criteria.benefits && { 
                benefits: { contains: criteria.benefits }
              }),
            },
            take: criteria.limit || 50,
          });
          return JSON.stringify(supplements);
        },
      }),

      new DynamicTool({
        name: 'check_drug_interactions',
        description: 'Check for drug interactions with supplements',
        func: async (input: string) => {
          const { supplementId, medications } = JSON.parse(input);
          const supplement = await prisma.supplement.findUnique({
            where: { id: supplementId },
          });
          
          if (!supplement) {
            return JSON.stringify({ interactions: [] });
          }

          // Simple interaction checking logic
          const interactions = [];
          const supplementIngredients = JSON.parse(supplement.activeIngredients);
          
          for (const med of medications) {
            for (const ingredient of supplementIngredients) {
              // Check for known interactions (simplified)
              if (this.hasKnownInteraction(ingredient.name, med.name)) {
                interactions.push({
                  drug: med.name,
                  severity: 'moderate',
                  description: `Potential interaction between ${ingredient.name} and ${med.name}`,
                });
              }
            }
          }
          
          return JSON.stringify({ interactions });
        },
      }),

      new DynamicTool({
        name: 'get_pricing_info',
        description: 'Get current pricing information for supplements',
        func: async (input: string) => {
          const supplementIds = JSON.parse(input);
          const pricing = [];
          
          for (const id of supplementIds) {
            const supplement = await prisma.supplement.findUnique({
              where: { id },
              select: { averagePrice: true },
            });
            
            pricing.push({
              supplementId: id,
              averagePrice: supplement?.averagePrice || 0,
              lowestPrice: (supplement?.averagePrice || 0) * 0.8,
              vendor: 'Chemist Warehouse',
            });
          }
          
          return JSON.stringify(pricing);
        },
      }),

      new DynamicTool({
        name: 'save_recommendations',
        description: 'Save generated recommendations to database',
        func: async (input: string) => {
          const recommendations = JSON.parse(input);
          
          const recommendation = await prisma.recommendation.create({
            data: {
              userId: this.context.userId,
              focus: recommendations.focus,
              rationale: recommendations.rationale,
              aiModel: 'recommendation_agent_v1',
              confidence: recommendations.confidence,
              status: 'active',
            },
          });

          // Create recommendation items
          for (const item of recommendations.items) {
            await prisma.recommendationItem.create({
              data: {
                recommendationId: recommendation.id,
                supplementId: item.supplementId,
                rank: item.rank,
                strength: item.strength,
                reasons: JSON.stringify(item.reasons),
                expectedImpact: JSON.stringify(item.expectedImpact),
                evidenceLevel: item.evidenceLevel,
                evidenceSources: JSON.stringify(item.evidenceSources),
                interactions: JSON.stringify(item.interactions),
                pricing: JSON.stringify(item.pricing),
                relevanceScore: item.relevanceScore,
              },
            });
          }
          
          return JSON.stringify(recommendation);
        },
      }),
    ];
  }

  async execute(input: RecommendationRequest): Promise<AgentResponse> {
    try {
      await this.logActivity('recommendation_generation_start', input);

      // 1. Perception and analysis
      const healthData = await this.callTool('get_user_health_data', '');
      const userHealth = JSON.parse(healthData);
      
      // 2. Generate recommendations using LLM
      const recommendations = await this.generateRecommendations(input, userHealth);
      
      // 3. Check interactions and pricing
      const enhancedRecommendations = await this.enhanceRecommendations(recommendations, userHealth.medications);
      
      // 4. Calculate relevance scores
      const scoredRecommendations = await this.scoreRecommendations(enhancedRecommendations, userHealth);
      
      // 5. Save to database
      const saved = await this.callTool('save_recommendations', JSON.stringify({
        focus: input.focus,
        rationale: recommendations.rationale,
        confidence: recommendations.confidence,
        items: scoredRecommendations,
      }));
      
      // 6. Reflection
      await this.reflect('recommendation_generation', { 
        input, 
        output: scoredRecommendations 
      });

      await this.logActivity('recommendation_generation_complete', { recommendations: scoredRecommendations });

      return {
        success: true,
        data: {
          recommendations: JSON.parse(saved),
          items: scoredRecommendations,
          summary: {
            totalItems: scoredRecommendations.length,
            strongRecommendations: scoredRecommendations.filter((r: any) => r.strength === 'strong').length,
            averageConfidence: recommendations.confidence,
          },
        },
        message: 'Personalized supplement recommendations generated successfully',
        confidence: recommendations.confidence,
        nextActions: ['view_recommendations', 'add_to_cart', 'schedule_consultation'],
      };

    } catch (error: any) {
      await this.logActivity('recommendation_generation_error', { error: error.message });
      
      return {
        success: false,
        message: `Recommendation generation failed: ${error.message}`,
        confidence: 0.0,
      };
    }
  }

  private async generateRecommendations(request: RecommendationRequest, healthData: any): Promise<any> {
    const recommendationPrompt = new PromptTemplate({
      template: `
        You are a specialized AI healthcare assistant for diabetes patients.
        
        User Health Profile:
        - Diabetes Type: {diabetesType}
        - Current HbA1c: {hba1c}
        - Current Medications: {medications}
        - Recent Blood Sugar: {bloodSugar}
        - Allergies: {allergies}
        - Activity Level: {activityLevel}
        
        Request Focus: {focus}
        Budget: {budget}
        Preferences: {preferences}
        
        Generate evidence-based supplement recommendations that:
        1. Are specifically beneficial for diabetes management
        2. Consider current medications and potential interactions
        3. Are backed by scientific evidence (level A-C)
        4. Fit within the user's budget and preferences
        5. Address the specific focus area
        
        Provide detailed rationale and expected impact on:
        - HbA1c reduction
        - Blood glucose control
        - Overall diabetes management
        
        Format as JSON:
        {{
          "focus": "{focus}",
          "rationale": "Detailed explanation of recommendation strategy",
          "confidence": 0.85,
          "items": [
            {{
              "supplementId": "supplement_id",
              "rank": 1,
              "strength": "strong",
              "reasons": ["Reason 1", "Reason 2"],
              "expectedImpact": {{
                "hba1c": -0.5,
                "glucose": -20,
                "timeframe": 90,
                "confidence": 0.8
              }},
              "evidenceLevel": "B",
              "evidenceSources": ["Study 1", "Study 2"],
              "interactions": [],
              "relevanceScore": 0.9
            }}
          ]
        }}
        `,
      inputVariables: [
        'diabetesType', 'hba1c', 'medications', 'bloodSugar', 'allergies', 'activityLevel',
        'focus', 'budget', 'preferences'
      ],
    });

    const chain = new LLMChain({
      llm: this.llm,
      prompt: recommendationPrompt,
    });

    const response = await chain.call({
      diabetesType: healthData.profile?.diabetesType || 'type_2',
      hba1c: healthData.profile?.hba1c || '7.0',
      medications: healthData.medications?.map((m: any) => m.name).join(', ') || 'None',
      bloodSugar: healthData.bloodSugarRecords?.[0]?.value || 'Unknown',
      allergies: healthData.profile?.allergies || '[]',
      activityLevel: healthData.profile?.activityLevel || 'moderate',
      focus: request.focus || 'general',
      budget: request.budget || 100,
      preferences: JSON.stringify(request.preferences || {}),
    });

    return JSON.parse(response.text);
  }

  private async enhanceRecommendations(recommendations: any, medications: any[]): Promise<any> {
    const enhanced = [...recommendations.items];
    
    for (let i = 0; i < enhanced.length; i++) {
      const item = enhanced[i];
      
      // Check drug interactions
      const interactions = await this.callTool('check_drug_interactions', JSON.stringify({
        supplementId: item.supplementId,
        medications: medications,
      }));
      
      item.interactions = JSON.parse(interactions).interactions;
      
      // Get pricing information
      const pricing = await this.callTool('get_pricing_info', JSON.stringify([item.supplementId]));
      item.pricing = JSON.parse(pricing)[0];
    }
    
    return {
      ...recommendations,
      items: enhanced,
    };
  }

  private async scoreRecommendations(recommendations: any, healthData: any): Promise<any> {
    // Enhanced scoring algorithm considering multiple factors
    const scored = recommendations.items.map((item: any, index: number) => {
      let score = 0.5; // Base score
      
      // Evidence level scoring
      const evidenceScoreMap: { [key: string]: number } = {
        'A': 0.9,
        'B': 0.7,
        'C': 0.5,
        'D': 0.3,
      };
      const evidenceScore = evidenceScoreMap[item.evidenceLevel] || 0.3;
      
      // Interaction penalty
      const interactionPenalty = item.interactions.length * 0.1;
      
      // Rank bonus
      const rankBonus = (recommendations.items.length - index) / recommendations.items.length * 0.2;
      
      // Personalization bonus
      const personalizationBonus = item.reasons.length * 0.05;
      
      score = evidenceScore - interactionPenalty + rankBonus + personalizationBonus;
      score = Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
      
      return {
        ...item,
        relevanceScore: score,
      };
    });
    
    // Sort by relevance score
    return scored.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  }

  private hasKnownInteraction(ingredient: string, medication: string): boolean {
    // Simplified interaction database
    const interactions: {[key: string]: string[]} = {
      'Vitamin D': ['Warfarin', 'Digoxin'],
      'Omega-3': ['Warfarin', 'Aspirin'],
      'Magnesium': ['Digoxin', 'Quinolones'],
      'Chromium': ['Insulin', 'Metformin'],
    };
    
    return interactions[ingredient]?.includes(medication) || false;
  }
}
