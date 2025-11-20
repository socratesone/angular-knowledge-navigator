# Angular Knowledge Navigator - Subdirectory Deployment Fix

## Problem Analysis

The Angular Knowledge Navigator was experiencing navigation issues when deployed to a subdirectory (`/angular-knowledge-navigator/`) due to absolute asset paths that didn't respect the base href configuration.

## Root Causes Identified

1. **Absolute Asset Paths**: Services were using `/assets/...` instead of `assets/...`
2. **Missing Base Href Handling**: No dynamic base href resolution in HTTP requests
3. **Test Path Mismatches**: Unit tests used absolute paths that didn't match the fixed service paths

## Solutions Implemented

### 1. Fixed Asset Path References

**NavigationService** (`src/app/core/services/navigation.service.ts`):
- Changed `/assets/data/learning-path.json` → `assets/data/learning-path.json`
- Added comprehensive error logging for debugging deployment issues

**ContentService** (`src/app/core/services/content.service.ts`):
- Changed `/assets/concepts/...` → `assets/concepts/...`
- Integrated with AssetPathService for dynamic path resolution

### 2. Created AssetPathService

**New Service** (`src/app/core/services/asset-path.service.ts`):
- Dynamically resolves asset paths based on current base href
- Provides deployment debugging information
- Handles both root and subdirectory deployments automatically

### 3. Enhanced Error Logging

Added comprehensive logging to help debug deployment issues:
- Base href detection and logging
- Full URL construction logging
- HTTP error details with deployment context
- Asset path resolution tracing

### 4. Fixed Unit Tests

**ContentService Tests** (`src/app/core/services/content.service.spec.ts`):
- Updated all test expectations from `/assets/concepts/` to `assets/concepts/`
- Ensures tests match the corrected service implementation

### 5. Created Build Script

**Subdirectory Build Script** (`build-subdirectory.sh`):
- Automated build process with correct base href and deploy URL
- Verification of critical files and configuration
- Deployment instructions for Nginx and Apache
- Testing URL generation

### 6. Added Diagnostic Component

**DeploymentDiagnosticComponent** (`src/app/shared/components/deployment-diagnostic.component.ts`):
- Real-time deployment environment information
- HTTP asset loading tests
- Navigation service status monitoring
- Interactive troubleshooting interface

## Deployment Instructions

### 1. Build for Subdirectory

```bash
# Use the provided build script
./build-subdirectory.sh

# Or manually:
ng build --configuration=production \
  --base-href="/angular-knowledge-navigator/" \
  --deploy-url="/angular-knowledge-navigator/"
```

### 2. Server Configuration

**Nginx Configuration**:
```nginx
location /angular-knowledge-navigator/ {
  try_files $uri $uri/ /angular-knowledge-navigator/index.html;
}
```

**Apache .htaccess**:
```apache
RewriteEngine On
RewriteBase /angular-knowledge-navigator/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /angular-knowledge-navigator/index.html [L]
```

### 3. Verification

Test these URLs after deployment:
- `https://socratesone.com/angular-knowledge-navigator/` (App loads)
- `https://socratesone.com/angular-knowledge-navigator/assets/data/learning-path.json` (JSON data)
- `https://socratesone.com/angular-knowledge-navigator/assets/concepts/fundamentals/introduction-to-angular.md` (Content)

## Testing & Debugging

### Development Debug Mode

Add the diagnostic component to any page during development:
```html
<app-deployment-diagnostic></app-deployment-diagnostic>
```

### Browser Console Debugging

The app now logs detailed information to the browser console:
- Asset path resolution process
- Base href detection
- HTTP request details and errors
- Navigation service loading status

### Verification Checklist

- [ ] App loads at subdirectory URL
- [ ] Navigation panel shows learning path structure
- [ ] Navigation data error message is gone
- [ ] Content loads when clicking navigation items
- [ ] All asset URLs in Network tab use correct base path
- [ ] Browser console shows successful asset loading

## Technical Details

### Path Resolution Logic

1. **AssetPathService** detects base href from `<base>` tag
2. **Asset paths** are resolved relative to base href automatically
3. **HTTP requests** use resolved paths that work in any deployment scenario
4. **Error logging** provides full context for troubleshooting

### Angular CLI Build Process

The build process correctly:
- Sets base href in `index.html`
- Configures router for subdirectory navigation
- Maintains relative asset references
- Generates correct asset URLs in JS bundles

## Benefits

1. **Universal Deployment**: Works in root directory or any subdirectory
2. **Easy Debugging**: Comprehensive logging and diagnostic tools  
3. **Automated Building**: Script handles all build configuration
4. **Future-Proof**: AssetPathService handles any deployment scenario
5. **Zero Runtime Overhead**: Path resolution happens once at service initialization

## Next Steps for Production

1. **Deploy with build script**: Use `./build-subdirectory.sh` for consistent builds
2. **Monitor logs**: Check browser console for any remaining asset loading issues
3. **Performance test**: Verify navigation and content loading speed
4. **Cache headers**: Ensure proper cache configuration for assets
5. **CDN compatibility**: AssetPathService supports CDN deployments if needed

This comprehensive fix ensures the Angular Knowledge Navigator works reliably in subdirectory deployments while maintaining backward compatibility with root directory deployments.