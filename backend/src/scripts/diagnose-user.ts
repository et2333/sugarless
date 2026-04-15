import prisma from '../utils/prisma';
import jwt from 'jsonwebtoken';

// 诊断用户问题
async function diagnoseUser() {
  // 从环境变量或命令行参数获取token
  const token = process.argv[2];
  
  if (!token) {
    console.log('❌ 请提供JWT token作为参数');
    console.log('用法: npm run diagnose-user <your-jwt-token>');
    process.exit(1);
  }
  
  try {
    // 解码token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    console.log('✅ Token解码成功:');
    console.log(`  - userId: ${decoded.userId}`);
    console.log(`  - email: ${decoded.email}`);
    console.log(`  - role: ${decoded.role}`);
    console.log('');
    
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true
      }
    });
    
    if (!user) {
      console.log('❌ 用户不存在于数据库中');
      console.log('');
      console.log('可能的原因：');
      console.log('  1. 数据库已被重置，但你还在使用旧的token');
      console.log('  2. 用户账户已被删除');
      console.log('');
      console.log('解决方案：');
      console.log('  1. 重新注册账户');
      console.log('  2. 或使用现有账户重新登录');
      
      // 显示数据库中的所有用户
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          createdAt: true
        }
      });
      
      console.log('');
      console.log(`数据库中现有的用户 (共${allUsers.length}个):`);
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id})`);
      });
      
    } else {
      console.log('✅ 用户存在于数据库中');
      console.log(`  - email: ${user.email}`);
      console.log(`  - role: ${user.role}`);
      console.log(`  - 创建时间: ${user.createdAt}`);
      console.log('');
      
      if (user.profile) {
        console.log('✅ 用户已有档案');
        console.log(`  - 姓名: ${user.profile.firstName} ${user.profile.lastName}`);
        console.log(`  - 糖尿病类型: ${user.profile.diabetesType}`);
      } else {
        console.log('⚠️  用户还没有创建档案');
      }
    }
    
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Token无效');
      console.log('');
      console.log('解决方案：');
      console.log('  请重新登录获取新的token');
    } else if (error.name === 'TokenExpiredError') {
      console.log('❌ Token已过期');
      console.log('');
      console.log('解决方案：');
      console.log('  请重新登录获取新的token');
    } else {
      console.error('❌ 发生错误:', error.message);
    }
  }
  
  await prisma.$disconnect();
}

diagnoseUser();

