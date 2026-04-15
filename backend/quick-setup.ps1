# 后端快速设置脚本 (Windows PowerShell)
# 用于快速初始化或重置后端环境

Write-Host "=== 后端快速设置 ===" -ForegroundColor Green
Write-Host ""

# 1. 检查 .env 文件
if (-not (Test-Path ".env")) {
    Write-Host "1. 创建 .env 文件..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "   ✓ .env 文件已创建" -ForegroundColor Green
} else {
    Write-Host "1. .env 文件已存在，跳过" -ForegroundColor Gray
}

Write-Host ""

# 2. 生成 Prisma Client
Write-Host "2. 生成 Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "   ✓ Prisma Client 已生成" -ForegroundColor Green

Write-Host ""

# 3. 运行数据库迁移
Write-Host "3. 运行数据库迁移..." -ForegroundColor Yellow
npx prisma migrate deploy
Write-Host "   ✓ 数据库迁移完成" -ForegroundColor Green

Write-Host ""

# 4. 填充种子数据
Write-Host "4. 填充种子数据..." -ForegroundColor Yellow
npx prisma db seed
Write-Host "   ✓ 种子数据已填充" -ForegroundColor Green

Write-Host ""
Write-Host "=== 设置完成！===" -ForegroundColor Green
Write-Host ""
Write-Host "测试账号信息：" -ForegroundColor Cyan
Write-Host "  普通用户: demo@example.com / Demo123456!" -ForegroundColor White
Write-Host "  商家用户: merchant@example.com / Merchant123456!" -ForegroundColor White
Write-Host ""
Write-Host "现在可以运行以下命令启动服务器：" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

