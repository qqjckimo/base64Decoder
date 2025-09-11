# Compressor Worker Refactor Documentation

## Overview
This document tracks the refactoring of the image compressor worker to use dynamic loading for @jsquash libraries, similar to the successful fflate implementation.

## Current State (Before Refactor)

### Files Modified Previously
1. **compressor.worker.js**: Currently uses mixed approach (direct imports for PNG/WebP, dynamic loading for AVIF)
2. **webpack.config.js**: Has avif-lib entry and special handling
3. **package.json**: Has @jsquash dependencies in devDependencies
4. **avif-entry.js**: Exists for AVIF dynamic loading

### Current Issues
- Mixed loading strategies (import vs importScripts)
- Complex webpack configuration
- simulateCompression fallback instead of proper error handling
- Bundle size concerns with direct imports

## Target Architecture

### Goal
Implement dynamic loading for all image codecs (@jsquash/png, @jsquash/webp, @jsquash/avif) to:
- Keep initial bundle size minimal (~10KB)
- Load codecs on-demand
- Provide clear error messages instead of simulation fallback
- Maintain consistent architecture with fflate implementation

### File Structure
```
src/
├── codecs/                    # New directory for codec modules
│   ├── png-encoder.js        # PNG codec wrapper
│   ├── webp-encoder.js       # WebP codec wrapper
│   └── avif-encoder.js       # AVIF codec wrapper
└── tools/
    └── base64-encoder/
        └── compressor.worker.js  # Refactored with dynamic loading

docs/                          # Build output
├── compressor-worker.*.bundle.js  # Small core worker
└── codecs/                    # Codec bundles
    ├── png-encoder.*.bundle.js
    ├── webp-encoder.*.bundle.js
    └── avif-encoder.*.bundle.js
```

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install --save-dev @jsquash/png @jsquash/webp @jsquash/avif
```

### Step 2: Create Codec Modules

**src/codecs/png-encoder.js**
```javascript
import { encode } from '@jsquash/png';
export { encode };
```

**src/codecs/webp-encoder.js**
```javascript
import { encode } from '@jsquash/webp';
export { encode };
```

**src/codecs/avif-encoder.js**
```javascript
import { encode } from '@jsquash/avif';
export { encode };
```

### Step 3: Update webpack.config.js

**Key Changes Required:**
1. Add new entry points for codecs
2. Ensure splitChunks doesn't affect codec bundles
3. Configure output paths correctly
4. Remove avif-lib entry and related config

**Entry Configuration:**
```javascript
entry: {
  'core': './src/core/app.js',
  'encoder-worker': './src/tools/base64-encoder/encoder.worker.js',
  'compressor-worker': './src/tools/base64-encoder/compressor.worker.js',
  // New codec entries
  'codecs/png-encoder': './src/codecs/png-encoder.js',
  'codecs/webp-encoder': './src/codecs/webp-encoder.js',
  'codecs/avif-encoder': './src/codecs/avif-encoder.js',
}
```

**splitChunks Adjustment:**
```javascript
splitChunks: {
  chunks: (chunk) => {
    // Don't split worker chunks and codec chunks
    return !chunk.name?.includes('-worker') && !chunk.name?.includes('codecs/');
  }
}
```

### Step 4: Refactor compressor.worker.js

**Remove:**
- All direct import statements for @jsquash
- simulateCompression function
- loadJSquashWithProgress function (current implementation)
- AVIF-specific loading logic

**Add:**
```javascript
// Dynamic encoder loading
const encoders = new Map();

async function loadEncoder(format) {
  if (encoders.has(format)) {
    return encoders.get(format);
  }

  try {
    const baseUrl = self.location.href.replace(/[^/]*$/, '');
    let module;
    
    switch(format) {
      case 'png':
        module = await import(`${baseUrl}codecs/png-encoder.bundle.js`);
        break;
      case 'webp':
        module = await import(`${baseUrl}codecs/webp-encoder.bundle.js`);
        break;
      case 'avif':
        module = await import(`${baseUrl}codecs/avif-encoder.bundle.js`);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    encoders.set(format, module.encode);
    console.log(`✅ ${format.toUpperCase()} encoder loaded successfully`);
    return module.encode;
  } catch (error) {
    console.error(`❌ Failed to load ${format} encoder:`, error);
    return null;
  }
}

// Error handling in compression
if (!encoder) {
  postMessage({
    type: 'formatComplete',
    id,
    format,
    result: {
      format,
      error: `Failed to load ${format} encoder. This format is not available.`,
      success: false
    }
  });
  continue;
}
```

### Step 5: Clean Up
1. Delete `src/avif-entry.js`
2. Remove avif-lib entry from webpack.config.js
3. Update bundle size limits in webpack.config.js:
   - compressor-worker: 10KB (down from 80KB)
   - Add size tracking for codec bundles (informational only)

## Webpack Configuration Risks

### Critical Areas to Review
1. **Entry Points**: Ensure new codec entries don't conflict with existing chunks
2. **Output Paths**: Verify `codecs/` subdirectory creation doesn't affect deployment
3. **Public Path**: Confirm dynamic imports resolve correctly in production
4. **SplitChunks**: Double-check exclusion rules don't break other optimizations

### Testing Required
1. Build production bundle and verify all files generate correctly
2. Test dynamic import paths in development server
3. Verify no impact on base64-decoder tool
4. Check that core app bundle remains unchanged

## Recovery Points

### If Build Fails
1. Revert webpack.config.js changes
2. Keep original compressor.worker.js imports
3. Check for syntax errors in codec modules

### If Dynamic Loading Fails
1. Check browser console for import path errors
2. Verify webpack output structure matches expected paths
3. Test with hardcoded URLs first

### Rollback Plan
All changes are isolated to:
- New files in src/codecs/ (safe to delete)
- compressor.worker.js (git revert single file)
- webpack.config.js entries (remove new entries)

## Testing Checklist

- [ ] Dependencies installed
- [ ] Codec modules created
- [ ] Webpack builds without errors
- [ ] Compressor worker initial size < 10KB
- [ ] PNG compression works
- [ ] WebP compression works
- [ ] AVIF compression works
- [ ] Error messages display correctly for failed loads
- [ ] No impact on other tools
- [ ] Production build successful

## Bundle Size Expectations

| Bundle | Expected Size | Limit | Notes |
|--------|--------------|-------|-------|
| compressor-worker | ~8-10KB | 10KB | Core logic only |
| codecs/png-encoder | ~70KB | N/A | Loaded on demand |
| codecs/webp-encoder | ~80KB | N/A | Loaded on demand |
| codecs/avif-encoder | ~150KB | N/A | Loaded on demand |

## Notes for Resume

When resuming work:
1. Check current state with `git status`
2. Verify which steps have been completed
3. Run `npm run dev` to test current state
4. Continue from the last incomplete step
5. Always test after each major change

## Error Message Templates

For consistency, use these error messages:

```javascript
// Encoder load failure
`Failed to load ${format.toUpperCase()} encoder. This format is currently unavailable.`

// Compression failure
`Compression failed for ${format.toUpperCase()}: ${error.message}`

// Unsupported format
`Format '${format}' is not supported. Available formats: PNG, WebP, AVIF`
```

## Questions for Discussion

Before modifying webpack.config.js:
1. Should codec bundles go in a subdirectory or root?
2. Is the dynamic import path strategy acceptable?
3. Should we implement preloading for common formats?
4. How should we handle older browsers without dynamic import support?