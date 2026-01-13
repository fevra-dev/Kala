# Firefox Build Instructions

## Overview

Kala supports both Chrome (Manifest V3) and Firefox (Manifest V2). The codebase uses a browser compatibility layer to handle differences between the two platforms.

## Building for Firefox

### 1. Build the Extension

```bash
# Build for Chrome (default)
npm run build

# The build output is in dist/
```

### 2. Create Firefox Manifest

The Firefox manifest (`manifest.firefox.json`) is already created. To use it:

```bash
# Copy Firefox manifest to dist
cp manifest.firefox.json dist/manifest.json
```

### 3. Load in Firefox

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `dist/manifest.json`

## Key Differences

### Manifest V2 vs V3

- **Chrome**: Uses Manifest V3 with service workers
- **Firefox**: Uses Manifest V2 with background scripts (persistent: false)

### API Differences

The `browser-compat.ts` layer handles:
- `chrome.storage` → `browser.storage` (Firefox)
- `chrome.tabs` → `browser.tabs` (Firefox)
- `chrome.runtime` → `browser.runtime` (Firefox)
- `chrome.action` → `browser.browserAction` (Firefox)
- `chrome.notifications` → `browser.notifications` (Firefox)

### Background Scripts

- **Chrome**: Service worker (terminates when idle)
- **Firefox**: Background script (persistent: false, similar behavior)

## Testing

Both Chrome and Firefox versions should have identical functionality:
- ✅ Keystroke obfuscation
- ✅ Mouse movement obfuscation
- ✅ Scroll pattern obfuscation
- ✅ Tracker detection
- ✅ Statistics tracking
- ✅ Settings export/import

## Browser Compatibility

The extension automatically detects the browser and uses the appropriate APIs:
- Chrome/Edge: Uses `chrome.*` APIs
- Firefox: Uses `browser.*` APIs (via compatibility layer)

## Future Improvements

- [ ] Automated Firefox build script
- [ ] Firefox-specific optimizations
- [ ] WebExtension polyfill for better compatibility

