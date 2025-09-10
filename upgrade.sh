#!/bin/bash

echo "Upgrading Homelab Monitor..."

# Stop service
sudo systemctl stop homelab-monitor

# Backup current config
cp config/installed-apps.json config/installed-apps.json.backup

# Pull latest changes (assuming git repository)
git pull origin main

# Install new dependencies
npm install

# Restart service
sudo systemctl start homelab-monitor

echo "Upgrade complete!"
echo "Config backup saved as: config/installed-apps.json.backup"
