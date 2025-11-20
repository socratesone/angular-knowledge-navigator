#!/bin/bash

# Angular Knowledge Navigator - Subdirectory Deployment Script
# This script builds the Angular app for deployment to a subdirectory

set -e  # Exit on any error

# Configuration
SUBDIRECTORY_PATH="${1:-/angular-knowledge-navigator/}"
BUILD_CONFIG="${2:-production}"
OUTPUT_PATH="dist/angular-knowledge-navigator"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Angular Knowledge Navigator - Subdirectory Build ===${NC}"
echo -e "${YELLOW}Subdirectory Path: ${SUBDIRECTORY_PATH}${NC}"
echo -e "${YELLOW}Build Configuration: ${BUILD_CONFIG}${NC}"
echo -e "${YELLOW}Output Path: ${OUTPUT_PATH}${NC}"
echo ""

# Clean previous build
if [ -d "$OUTPUT_PATH" ]; then
  echo -e "${YELLOW}Cleaning previous build...${NC}"
  rm -rf "$OUTPUT_PATH"
fi

# Build the application
echo -e "${BLUE}Building Angular application...${NC}"
ng build \
  --configuration="$BUILD_CONFIG" \
  --base-href="$SUBDIRECTORY_PATH" \
  --deploy-url="$SUBDIRECTORY_PATH"

# Verify build success
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build completed successfully!${NC}"
else
  echo -e "${RED}✗ Build failed!${NC}"
  exit 1
fi

# Verify critical files exist
echo -e "${BLUE}Verifying build output...${NC}"

CRITICAL_FILES=(
  "$OUTPUT_PATH/index.html"
  "$OUTPUT_PATH/assets/data/learning-path.json"
  "$OUTPUT_PATH/assets/concepts/fundamentals/introduction-to-angular.md"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓ Found: $file${NC}"
  else
    echo -e "${RED}✗ Missing: $file${NC}"
    exit 1
  fi
done

# Check base href in index.html
BASE_HREF_CHECK=$(grep "base href=\"$SUBDIRECTORY_PATH\"" "$OUTPUT_PATH/index.html" || true)
if [ -n "$BASE_HREF_CHECK" ]; then
  echo -e "${GREEN}✓ Base href correctly set in index.html${NC}"
else
  echo -e "${RED}✗ Base href not found or incorrect in index.html${NC}"
  echo -e "${YELLOW}Expected: base href=\"$SUBDIRECTORY_PATH\"${NC}"
  echo -e "${YELLOW}Found in index.html:${NC}"
  grep "base href=" "$OUTPUT_PATH/index.html" || echo "No base href found"
fi

# Display file sizes
echo -e "${BLUE}Build Summary:${NC}"
echo -e "${YELLOW}Main bundle size:${NC}"
ls -lh "$OUTPUT_PATH"/*.js | head -5

echo -e "${YELLOW}Asset files:${NC}"
find "$OUTPUT_PATH/assets" -name "*.json" -o -name "*.md" | wc -l | xargs echo "Found files:"

# Display deployment instructions
echo ""
echo -e "${GREEN}=== Deployment Instructions ===${NC}"
echo -e "${YELLOW}1. Upload the contents of '$OUTPUT_PATH' to your web server${NC}"
echo -e "${YELLOW}2. Configure your web server to handle Angular routing:${NC}"
echo ""
echo -e "${BLUE}Nginx configuration example:${NC}"
echo "location $SUBDIRECTORY_PATH {"
echo "  try_files \$uri \$uri/ ${SUBDIRECTORY_PATH}index.html;"
echo "}"
echo ""
echo -e "${BLUE}Apache .htaccess example:${NC}"
echo "RewriteEngine On"
echo "RewriteBase $SUBDIRECTORY_PATH"
echo "RewriteRule ^index\.html$ - [L]"
echo "RewriteCond %{REQUEST_FILENAME} !-f"
echo "RewriteCond %{REQUEST_FILENAME} !-d"
echo "RewriteRule . ${SUBDIRECTORY_PATH}index.html [L]"
echo ""
echo -e "${GREEN}=== Testing URLs ===${NC}"
echo -e "${YELLOW}After deployment, test these URLs:${NC}"
echo "• https://your-domain.com${SUBDIRECTORY_PATH}"
echo "• https://your-domain.com${SUBDIRECTORY_PATH}assets/data/learning-path.json"
echo "• https://your-domain.com${SUBDIRECTORY_PATH}assets/concepts/fundamentals/introduction-to-angular.md"
echo ""
echo -e "${GREEN}Build completed successfully! 🚀${NC}"