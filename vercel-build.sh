#!/usr/bin/env bash
# Vercel production build script for Wedding Guest Manager
#
# This script runs during `vercel deploy` / `npm run build` on Vercel.
# It:
#   1. Generates the Prisma Client (idempotent, also runs in postinstall)
#   2. Applies Prisma migrations to the production database
#   3. Builds the Next.js application for production
#
# Required environment variables (set in Vercel project settings):
#   DATABASE_URL           - Production PostgreSQL connection string
#   AUTH_SECRET            - NextAuth v5 secret (production value)
#   AUTH_URL               - Production Auth URL (e.g. https://app.vercel.app)
#   NEXT_PUBLIC_APP_URL    - Public application URL
#   RAZORPAY_KEY_ID        - Razorpay key ID (paid plans)
#   RAZORPAY_KEY_SECRET    - Razorpay key secret (paid plans)
#   RAZORPAY_WEBHOOK_SECRET- Razorpay webhook signing secret
#   ADMIN_EMAILS           - Comma-separated admin email allowlist
set -euo pipefail

echo "============================================"
echo "  Wedding Guest Manager — Vercel Build"
echo "============================================"
echo ""

# Node.js version check (required by the project)
echo "Node version: $(node --version)"
echo "NPM version:  $(npm --version)"
echo ""

# -----------------------------------------------------------
# Step 1: Generate Prisma Client
# -----------------------------------------------------------
echo "[1/3] Generating Prisma Client..."
npx prisma generate
echo "Prisma Client generated."
echo ""

# -----------------------------------------------------------
# Step 2: Apply Prisma migrations to production database
# -----------------------------------------------------------
echo "[2/3] Applying Prisma migrations (prisma migrate deploy)..."
npx prisma migrate deploy
echo "Migrations applied."
echo ""

# -----------------------------------------------------------
# Step 3: Build Next.js application
# -----------------------------------------------------------
echo "[3/3] Building Next.js application for production..."
npm run build
echo "Next.js build complete."
echo ""

echo "============================================"
echo "  Build succeeded"
echo "============================================"
