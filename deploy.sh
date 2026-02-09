#!/bin/bash
# ============================================================
# HealthAssist AI — AWS EC2 Deployment Script
# Domain: doctors.sirish.world
# ============================================================

set -e

echo "=== HealthAssist AI Deployment ==="

# Step 1: Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# Step 2: Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Step 3: Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.production .env
    echo ""
    echo "!!! IMPORTANT: Edit .env and set your ANTHROPIC_API_KEY !!!"
    echo "Run: nano .env"
    echo ""
    exit 1
fi

# Step 4: Build and start containers
echo "Building and starting containers..."
docker-compose down 2>/dev/null || true
docker-compose up --build -d

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: http://doctors.sirish.world (port 80)"
echo "Backend:  http://doctors.sirish.world/api/chat/health"
echo ""
echo "Check status: docker-compose ps"
echo "View logs:    docker-compose logs -f"
