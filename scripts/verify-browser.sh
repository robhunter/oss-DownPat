#!/bin/bash
set -e

echo "🌐 Verifying browser experience..."

# Create screenshots directory if it doesn't exist
mkdir -p verification-screenshots

# Ensure API server is running
echo "Checking API server on port 3001..."
curl -sf http://localhost:3001/api/health > /dev/null || {
  echo "❌ API server not running on port 3001"
  echo "   Start it with: npm run dev:server"
  exit 1
}
echo "✓ API server is running"

# Ensure client is running (check if Vite dev server responds)
echo "Checking client on port 5173..."
curl -sf http://localhost:5173 > /dev/null || {
  echo "❌ Client not running on port 5173"
  echo "   Start it with: npm run dev:client"
  exit 1
}
echo "✓ Client is running"

# Check if shot-scraper is installed
if ! command -v shot-scraper &> /dev/null; then
  echo "⚠️  shot-scraper not installed. Installing..."
  pip install shot-scraper
  shot-scraper install
fi

# Take screenshot of the client UI
echo "Taking screenshot..."
shot-scraper http://localhost:5173 \
  --output verification-screenshots/app.png \
  --width 1280 \
  --height 800 \
  --wait 2000

# Verify screenshot was created and has content
if [ -f "verification-screenshots/app.png" ]; then
  SIZE=$(stat -f%z "verification-screenshots/app.png" 2>/dev/null || stat -c%s "verification-screenshots/app.png" 2>/dev/null)
  if [ "$SIZE" -gt 10000 ]; then
    echo "✓ Screenshot captured successfully (${SIZE} bytes)"
    echo ""
    echo "📸 Screenshot saved to: verification-screenshots/app.png"
    echo ""
    echo "✅ Browser verification PASSED"
    echo ""
    echo "Please visually inspect the screenshot to verify:"
    echo "  - Page renders correctly"
    echo "  - CSS styles are applied"
    echo "  - 'DownPat' title is visible"
    echo "  - API status shows 'Hello from DownPat!'"
  else
    echo "❌ Screenshot too small (${SIZE} bytes) - page may not have rendered"
    exit 1
  fi
else
  echo "❌ Screenshot not created"
  exit 1
fi
