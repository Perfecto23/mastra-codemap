#!/bin/bash
set -e

echo "🔨 开始构建 Mastra CodeMap..."
pnpm build

echo ""
echo "✅ 构建完成，dist/ 目录已准备好，可上传到 EdgeOne Pages"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EdgeOne Pages 配置建议"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  构建命令:     pnpm build"
echo "  输出目录:     dist"
echo "  Node 版本:    18 或 20"
echo "  安装命令:     pnpm install"
echo "  框架预设:     Astro"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "dist/ 文件统计:"
find dist/ -type f | wc -l | xargs echo "  文件数:"
du -sh dist/ | awk '{print "  总大小: "$1}'
