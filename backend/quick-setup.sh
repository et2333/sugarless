#!/bin/bash
# 后端快速设置脚本 (Linux/Mac)
# 用于快速初始化或重置后端环境

echo -e "\033[0;32m=== 后端快速设置 ===\033[0m"
echo ""

# 1. 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "\033[0;33m1. 创建 .env 文件...\033[0m"
    cp .env.example .env
    echo -e "   \033[0;32m✓ .env 文件已创建\033[0m"
else
    echo -e "\033[0;90m1. .env 文件已存在，跳过\033[0m"
fi

echo ""

# 2. 生成 Prisma Client
echo -e "\033[0;33m2. 生成 Prisma Client...\033[0m"
npx prisma generate
echo -e "   \033[0;32m✓ Prisma Client 已生成\033[0m"

echo ""

# 3. 运行数据库迁移
echo -e "\033[0;33m3. 运行数据库迁移...\033[0m"
npx prisma migrate deploy
echo -e "   \033[0;32m✓ 数据库迁移完成\033[0m"

echo ""

# 4. 填充种子数据
echo -e "\033[0;33m4. 填充种子数据...\033[0m"
npx prisma db seed
echo -e "   \033[0;32m✓ 种子数据已填充\033[0m"

echo ""
echo -e "\033[0;32m=== 设置完成！===\033[0m"
echo ""
echo -e "\033[0;36m测试账号信息：\033[0m"
echo -e "  普通用户: demo@example.com / Demo123456!"
echo -e "  商家用户: merchant@example.com / Merchant123456!"
echo ""
echo -e "\033[0;36m现在可以运行以下命令启动服务器：\033[0m"
echo -e "  npm run dev"
echo ""

