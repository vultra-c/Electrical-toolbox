#!/bin/sh
# 生成电学工具箱的 Vela 发布签名（自签名 RSA 2048，10 年有效期）
# 产物：sign/private.pem（私钥）、sign/certificate.pem（证书）
# aiot-toolkit 在 release 模式下会自动读取 sign/ 目录下的这两个文件
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
mkdir -p sign

if [ -f sign/private.pem ] && [ -f sign/certificate.pem ]; then
  echo "签名已存在：sign/private.pem, sign/certificate.pem"
  exit 0
fi

openssl req -newkey rsa:2048 -nodes \
  -keyout sign/private.pem \
  -out /tmp/electrobox.csr \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=ElectroBox/OU=Physics/CN=com.physics.electrobox" 2>/dev/null

openssl x509 -req -in /tmp/electrobox.csr -signkey sign/private.pem \
  -days 3650 -out sign/certificate.pem 2>/dev/null

rm -f /tmp/electrobox.csr
echo "已生成签名："
openssl x509 -in sign/certificate.pem -noout -subject -dates
