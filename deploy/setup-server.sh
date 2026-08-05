#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get update
  sudo apt-get install -y nodejs
fi

if ! command -v npm >/dev/null 2>&1; then
  sudo apt-get install -y npm
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y nginx
fi

npm install --production

pm2 delete qdbh2026 >/dev/null 2>&1 || true
pm2 start ecosystem.config.js --update-env
pm2 save

sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo cp deploy/nginx-qdbh2026.conf /etc/nginx/sites-available/qdbh2026.conf
sudo ln -sf /etc/nginx/sites-available/qdbh2026.conf /etc/nginx/sites-enabled/qdbh2026.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx >/dev/null 2>&1 || sudo service nginx reload

echo "Deployment completed."
echo "Open: http://YOUR_SERVER_IP/"
echo "Check status: pm2 status"
