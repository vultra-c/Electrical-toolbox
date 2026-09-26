#!/bin/sh
# 保存当前源码快照到 history/<版本号>/（扩展名加 .bak，避免被 aiot-toolkit 当作源码编译）
set -e
VER="${1:-$(date +%Y%m%d-%H%M%S)}"
DEST="history/$VER"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -r src "$DEST/src"
cp -r tools "$DEST/tools" 2>/dev/null || true
cp package.json .gitignore "$DEST/" 2>/dev/null || true
# ux 文件改名为 .ux.bak，防止参与编译
find "$DEST" -name '*.ux' -exec sh -c 'mv "$1" "$1.bak"' _ {} \;
echo "snapshot -> $DEST"
