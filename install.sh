#!/bin/bash

echo "Installing Homelab Monitor..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Create necessary directories
mkdir -p config
mkdir -p public/apps
mkdir -p apps-available

# Create initial config
echo '{"apps": []}' > config/installed-apps.json

# Install dependencies
npm install

# Create systemd service
sudo tee /etc/systemd/system/homelab-monitor.service > /dev/null <<EOF
[Unit]
Description=Homelab Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable homelab-monitor
sudo systemctl start homelab-monitor

echo "Homelab Monitor installed and started!"
echo "Access it at: http://localhost"
echo "Use 'sudo systemctl status homelab-monitor' to check status"
