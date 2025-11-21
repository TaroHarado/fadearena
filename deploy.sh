#!/bin/bash

# FadeArena Deployment Script
# For Ubuntu VPS with Docker installed

set -e

echo "=========================================="
echo "FadeArena Deployment Script"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your configuration:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Verify critical environment variables
echo "Verifying environment variables..."
source .env

if [ -z "$HYPERLIQUID_WALLET_ADDRESS" ] || [ -z "$HYPERLIQUID_WALLET_PRIVATE_KEY" ]; then
    echo "Warning: HYPERLIQUID_WALLET_ADDRESS or HYPERLIQUID_WALLET_PRIVATE_KEY not set"
    echo "Trading will not work without these!"
fi

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "CHANGE_ME_SECURE_PASSWORD" ]; then
    echo "Error: POSTGRES_PASSWORD must be changed from default!"
    exit 1
fi

# Check if FADEARENA_MODE is set to simulation (recommended for first run)
if [ "$FADEARENA_MODE" != "simulation" ]; then
    echo "Warning: FADEARENA_MODE is set to '$FADEARENA_MODE'"
    echo "For first deployment, it's recommended to use 'simulation' mode"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build and start services
echo ""
echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo ""
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "Checking service health..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✓ API is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for API to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Error: API did not become healthy after $MAX_RETRIES retries"
    echo "Check logs with: docker-compose -f docker-compose.prod.yml logs api"
    exit 1
fi

# Display health status
echo ""
echo "Service Health Status:"
curl -s http://localhost:3001/api/health | python3 -m json.tool || curl -s http://localhost:3001/api/health

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Services:"
echo "  - Database: Running (internal)"
echo "  - API: http://localhost:3001"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
echo "  Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  Check health: curl http://localhost:3001/api/health"
echo ""
echo "Next steps:"
echo "  1. Verify health endpoint: curl http://localhost:3001/api/health"
echo "  2. Access frontend: http://localhost:3000"
echo "  3. Review settings in UI (should be in simulation mode)"
echo "  4. When ready, switch to live mode via Settings page"
echo ""

