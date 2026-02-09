#!/bin/bash
# ============================================================
# SSL Setup with Let's Encrypt for doctors.sirish.world
# Run this AFTER deploy.sh and DNS is pointing to your server
# ============================================================

set -e

echo "=== Setting up SSL for doctors.sirish.world ==="

# Install certbot
sudo yum install -y certbot python3-certbot-nginx 2>/dev/null || \
sudo apt install -y certbot python3-certbot-nginx 2>/dev/null

# Stop frontend container temporarily
docker-compose stop frontend

# Get SSL certificate
sudo certbot certonly --standalone -d doctors.sirish.world \
    --non-interactive --agree-tos --email sirish.mandalika@gmail.com

# Create SSL nginx config
cat > healthcare-assistant-frontend/nginx-ssl.conf << 'NGINX'
server {
    listen 80;
    server_name doctors.sirish.world;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name doctors.sirish.world;

    ssl_certificate /etc/letsencrypt/live/doctors.sirish.world/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/doctors.sirish.world/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
NGINX

echo "SSL certificate obtained. Updating docker-compose to mount SSL certs..."

# Update docker-compose with SSL volumes
cat > docker-compose.ssl.yml << 'COMPOSE'
version: '3.8'

services:
  backend:
    build: ./healthcare-assistant-backend
    container_name: healthassist-backend
    ports:
      - "8080:8080"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ZOCDOC_API_KEY=${ZOCDOC_API_KEY:-}
      - CORS_ALLOWED_ORIGINS=https://doctors.sirish.world
    restart: unless-stopped

  frontend:
    build:
      context: ./healthcare-assistant-frontend
      dockerfile: Dockerfile.ssl
    container_name: healthassist-frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
    restart: unless-stopped
COMPOSE

# Create SSL Dockerfile for frontend
cat > healthcare-assistant-frontend/Dockerfile.ssl << 'DOCKERFILE'
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-ssl.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

# Restart with SSL
docker-compose -f docker-compose.ssl.yml up --build -d

echo ""
echo "=== SSL Setup Complete ==="
echo "Site is now live at: https://doctors.sirish.world"
echo ""
echo "Auto-renewal is handled by certbot. Test with:"
echo "  sudo certbot renew --dry-run"
