#!/bin/bash
# AWS EC2 Setup Script - Run this on your EC2 instance after SSH

set -e

echo "🚀 SupplySync AWS Deployment Setup"
echo "===================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Node.js 18
echo "📗 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Yarn
echo "🧶 Installing Yarn..."
sudo npm install -g yarn

# Install PostgreSQL client
echo "🐘 Installing PostgreSQL client..."
sudo apt install -y postgresql-client

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install Supervisor
echo "👮 Installing Supervisor..."
sudo apt install -y supervisor

# Install Certbot for SSL
echo "🔒 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Clone your repository: git clone <your-repo-url>"
echo "2. Set up backend environment variables"
echo "3. Initialize database"
echo "4. Build frontend"
echo "5. Configure Nginx and Supervisor"
echo ""
echo "See AWS_DEPLOYMENT_GUIDE.md for detailed instructions"
