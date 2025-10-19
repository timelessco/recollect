#!/bin/bash

# Deploy Go version to Vercel for performance testing
echo "🚀 Deploying Go version to Vercel..."

# Install Vercel CLI if not already installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Set environment variables for Go deployment
export GO_VERSION="1.21"
export VERCEL_GO_VERSION="1.21"

# Deploy to Vercel
echo "Deploying Go API to Vercel..."
vercel --prod --name=recollect-go-api

echo "✅ Go API deployed successfully!"
echo "🔗 Test the Go version at: https://recollect-go-api.vercel.app/api/bookmark/add-bookmark-min-data"
echo ""
echo "📊 Performance comparison:"
echo "- TypeScript version: http://localhost:3000/api/bookmark/add-bookmark-min-data"
echo "- Go version: https://recollect-go-api.vercel.app/api/bookmark/add-bookmark-min-data"
