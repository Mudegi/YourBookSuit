#!/bin/bash
# =============================================================================
# YourBookSuit Auto-Deploy Script
# =============================================================================
# This script is triggered by GitHub webhook or run manually via SSH.
# It pulls the latest code, builds, and deploys to the cPanel app directory.
#
# Usage (manual):   bash deploy.sh
# Usage (webhook):  Called by deploy-webhook.js
# =============================================================================

set -e

# Configuration
APP_DIR="/home/nafazplp/yourbooksuit.com"
REPO_DIR="/home/nafazplp/repositories/YourBookSuit"
NODE_ENV_DIR="/home/nafazplp/nodevenv/yourbooksuit.com/20"
BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== YourBookSuit Deployment Started ===${NC}"
echo "$(date)"

# Activate Node.js environment
source "${NODE_ENV_DIR}/bin/activate"

# Step 1: Pull latest code
echo -e "${YELLOW}[1/5] Pulling latest code from GitHub...${NC}"
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo -e "${GREEN}✓ Code updated${NC}"

# Step 2: Install dependencies
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"
cd "$REPO_DIR/client"
npm install --production=false 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Generate Prisma client (with Linux binaries)
echo -e "${YELLOW}[3/5] Generating Prisma client...${NC}"
npx prisma generate 2>&1 || echo -e "${RED}⚠ Prisma generate failed (memory limit) - using existing client${NC}"
echo -e "${GREEN}✓ Prisma step done${NC}"

# Step 4: Build Next.js
echo -e "${YELLOW}[4/5] Building Next.js application...${NC}"
NODE_OPTIONS="--max-old-space-size=512" npx next build 2>&1
echo -e "${GREEN}✓ Build complete${NC}"

# Step 5: Deploy to app directory
echo -e "${YELLOW}[5/5] Deploying to app directory...${NC}"

# Backup .env
cp "$APP_DIR/.env" /tmp/yourbooks-env-backup 2>/dev/null || true

# Clean old deployment (preserve node_modules symlink, .env, .htaccess, tmp)
cd "$APP_DIR"
find . -maxdepth 1 ! -name '.' ! -name 'node_modules' ! -name '.env' ! -name '.htaccess' ! -name 'tmp' -exec rm -rf {} + 2>/dev/null || true

# Copy standalone build
cp -r "$REPO_DIR/client/.next/standalone/"* "$APP_DIR/"

# Copy static assets
cp -r "$REPO_DIR/client/.next/static" "$APP_DIR/.next/static"

# Copy public folder
cp -r "$REPO_DIR/client/public" "$APP_DIR/public" 2>/dev/null || true

# Copy prisma schema (for future migrations)
cp -r "$REPO_DIR/client/prisma" "$APP_DIR/prisma" 2>/dev/null || true

# Restore .env
cp /tmp/yourbooks-env-backup "$APP_DIR/.env" 2>/dev/null || true

# Copy Prisma client to venv node_modules
cp -r "$REPO_DIR/client/node_modules/.prisma" "${NODE_ENV_DIR}/lib/node_modules/" 2>/dev/null || true
cp -r "$REPO_DIR/client/node_modules/@prisma" "${NODE_ENV_DIR}/lib/node_modules/" 2>/dev/null || true

# Remove standalone node_modules (CloudLinux manages this)
rm -rf "$APP_DIR/node_modules" 2>/dev/null || true

# Recreate node_modules symlink if it was removed
if [ ! -L "$APP_DIR/node_modules" ]; then
    ln -s "${NODE_ENV_DIR}/lib/node_modules" "$APP_DIR/node_modules"
fi

echo -e "${GREEN}✓ Deployment complete${NC}"

# Restart app via touch tmp/restart.txt (Passenger convention)
mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"

echo -e "${GREEN}=== Deployment Finished Successfully ===${NC}"
echo "$(date)"
echo "Visit: https://yourbooksuit.com"
