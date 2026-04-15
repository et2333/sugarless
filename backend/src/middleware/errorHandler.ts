import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Error:', err);
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // 处理Prisma错误
  if (err.name === 'PrismaClientKnownRequestError') {
    console.error('Prisma Error Details:', {
      code: (err as any).code,
      message: err.message,
      meta: (err as any).meta
    });
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: process.env.NODE_ENV === 'development' ? err.message : '数据库操作失败',
        details: process.env.NODE_ENV === 'development' ? (err as any).meta : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // 处理Zod验证错误
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '输入验证失败',
        details: (err as any).errors,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // 默认500错误
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
      timestamp: new Date().toISOString()
    }
  });
};

