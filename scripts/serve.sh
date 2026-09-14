#!/usr/bin/env bash
# ============================================================
# 本地预览脚本 - 启动 Hugo 开发服务器
# ============================================================
# 用法：
#   ./scripts/serve.sh
# 然后浏览器打开 http://localhost:1313
# ============================================================

set -e
cd "$(dirname "$0")/.."

HUGO_BIN="${HUGO_BIN:-hugo}"
if ! command -v $HUGO_BIN >/dev/null 2>&1; then
    if [ -x /tmp/hugo ]; then
        HUGO_BIN=/tmp/hugo
    else
        echo "未找到 hugo，正在下载..."
        curl -sL https://github.com/gohugoio/hugo/releases/download/v0.140.0/hugo_extended_0.140.0_linux-amd64.tar.gz \
            | tar -xz -C /tmp hugo
        HUGO_BIN=/tmp/hugo
    fi
fi

echo "启动 Hugo 开发服务器..."
echo "浏览器打开: http://localhost:1313"
echo "按 Ctrl+C 停止"
echo ""
exec $HUGO_BIN server -D --bind 0.0.0.0 --port 1313 --baseURL http://localhost:1313
