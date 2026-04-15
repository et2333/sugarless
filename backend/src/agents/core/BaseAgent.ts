/**
 * BaseAgent - LLM Multi-Agent Core
 * From Report: Architecture (4+1 Views) - AI Agents Layer
 * Implements UC-A2.1, UC-B2.1, UC-C1 use cases
 */

import { LLMChain } from 'langchain/chains';
import { OpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { Tool } from '@langchain/core/tools';
import prisma from '../../utils/prisma';

export interface AgentContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  userProfile?: any;
  conversationHistory?: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  message: string;
  confidence: number;
  nextActions?: string[];
  metadata?: any;
}

export abstract class BaseAgent {
  protected llm: OpenAI;
  protected chain?: LLMChain;
  protected tools: Tool[];
  protected context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
    this.llm = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      modelName: 'gpt-4-turbo-preview',
    });
    this.tools = [];
  }

  /**
   * Core perception and reasoning - From Report: AI Agents for perception
   */
  protected async perceive(): Promise<any> {
    const perceptionPrompt = new PromptTemplate({
      template: `
        Analyze the current context and user needs:
        User ID: {userId}
        Session: {sessionId}
        Timestamp: {timestamp}
        
        Available tools: {tools}
        
        What insights can you gather from this context?
        `,
      inputVariables: ['userId', 'sessionId', 'timestamp', 'tools'],
    });

    const chain = new LLMChain({
      llm: this.llm,
      prompt: perceptionPrompt,
    });

    return await chain.call({
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      timestamp: this.context.timestamp.toISOString(),
      tools: this.tools.map(t => t.name).join(', '),
    });
  }

  /**
   * Task decomposition - From Report: AI Agents for task decomposition
   */
  protected async decomposeTask(task: string): Promise<string[]> {
    const decompositionPrompt = new PromptTemplate({
      template: `
        Decompose this healthcare task into smaller, actionable steps:
        Task: {task}
        User Profile: {profile}
        
        Return a JSON array of subtasks.
        `,
      inputVariables: ['task', 'profile'],
    });

    const chain = new LLMChain({
      llm: this.llm,
      prompt: decompositionPrompt,
    });

    const response = await chain.call({
      task,
      profile: JSON.stringify(this.context.userProfile),
    });

    return JSON.parse(response.text);
  }

  /**
   * Tool calling - From Report: AI Agents for tool calls
   */
  protected async callTool(toolName: string, input: any): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    return await tool.call(input);
  }

  /**
   * Reflection and learning - From Report: AI Agents for reflection
   */
  protected async reflect(action: string, result: any): Promise<void> {
    const reflectionPrompt = new PromptTemplate({
      template: `
        Reflect on this action and its result:
        Action: {action}
        Result: {result}
        Context: {context}
        
        What can be learned? How can this be improved?
        `,
      inputVariables: ['action', 'result', 'context'],
    });

    const chain = new LLMChain({
      llm: this.llm,
      prompt: reflectionPrompt,
    });

    await chain.call({
      action,
      result: JSON.stringify(result),
      context: JSON.stringify(this.context),
    });
  }

  /**
   * Execute agent workflow
   */
  abstract execute(input: any): Promise<AgentResponse>;

  /**
   * Validate input and context
   */
  protected validateInput(input: any): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }
    return true;
  }

  /**
   * Get user profile with caching
   */
  protected async getUserProfile(): Promise<any> {
    if (!this.context.userProfile) {
      this.context.userProfile = await prisma.profile.findUnique({
        where: { userId: this.context.userId },
        include: {
          user: true,
        },
      });
    }
    return this.context.userProfile;
  }

  /**
   * Log agent activity for audit
   */
  protected async logActivity(action: string, details: any): Promise<void> {
    await prisma.agentLog.create({
      data: {
        agentType: this.constructor.name,
        userId: this.context.userId,
        sessionId: this.context.sessionId,
        action,
        details: JSON.stringify(details),
        timestamp: new Date(),
      },
    });
  }
}
