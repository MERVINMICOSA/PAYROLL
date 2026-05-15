#!/bin/bash
# Render deployment startup script

echo "🚀 Starting Philtech Payroll on Render..."
echo "📋 Node version: $(node --version)"
echo "📦 npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server
echo "🔧 Starting server..."
node server.js
