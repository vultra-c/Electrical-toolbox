#!/bin/sh
# 一次性构建 debug + release 两个 rpk 到 release/ 目录
# （aiot 每次构建会清空 dist/，所以构建完立刻归档到 release/）
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f sign/private.pem ] || [ ! -f sign/certificate.pem ]; then
  sh tools/make_sign.sh
fi

mkdir -p release

echo "==> 1/2 构建 release 包（带签名，压缩）"
./node_modules/.bin/aiot release
cp dist/*release*.rpk release/

echo "==> 2/2 构建 debug 包（含调试信息，便于真机定位问题）"
./node_modules/.bin/aiot build
cp dist/*debug*.rpk release/

echo
echo "构建完成："
ls -lh release/
