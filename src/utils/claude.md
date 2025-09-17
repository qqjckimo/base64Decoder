# Utilities Directory Documentation

## Overview
The `src/utils/` directory contains shared utility modules that provide common functionality across multiple tools in the application. These utilities are designed with bundle size optimization as the primary concern, following the project's critical requirement to minimize JavaScript bundle size.

## Available Utility Modules

### MonacoLoader (`monacoLoader.js`)
**Size Impact**: 4.43KB (actual production bundle size) + Monaco Editor CDN (~300KB external, lazy loaded)
**Bundle Impact**: Only loaded when tools require code editing functionality

#### Purpose
- Provides centralized Monaco Editor loading and management
- Implements singleton pattern to ensure Monaco is loaded only once across the application
- Offers fallback text editor when Monaco fails to load
- Manages editor instances lifecycle to prevent memory leaks

#### Key Features
- **Lazy Loading**: Monaco Editor is loaded on-demand from CDN, not bundled
- **Singleton Pattern**: Single instance shared across all tools
- **Error Handling**: Automatic retry mechanism (up to 3 attempts)
- **Fallback Support**: Graceful degradation to textarea when Monaco fails
- **Memory Management**: Tracks and disposes editor instances
- **Custom Theming**: Pre-configured theme matching application design

#### API Methods
```javascript
// Core loading
MonacoLoader.load() // Returns Promise<monaco>

// Editor creation
MonacoLoader.createEditor(container, options) // Returns monaco editor instance
MonacoLoader.createFallbackEditor(container, options) // Returns textarea-based editor

// Memory management
MonacoLoader.disposeEditor(editor)
MonacoLoader.disposeAllEditors()
MonacoLoader.getEditorCount()
```

#### Usage Pattern
```javascript
import { MonacoLoader } from "../../utils/monacoLoader.js";

// In tool initialization
await MonacoLoader.load();
this.editor = MonacoLoader.createEditor(container, {
    language: 'json',
    value: initialContent
});

// In tool cleanup
MonacoLoader.disposeEditor(this.editor);
```

#### Bundle Size Strategy
- **External CDN**: Monaco loaded from jsdelivr, not included in bundle
- **Conditional Loading**: Only loaded when tools require code editing
- **Shared Instance**: Multiple tools reuse same Monaco instance
- **Lazy Theme Configuration**: Theme setup only after Monaco loads

## Shared Components (Cross-Reference)

### Icon System (`../components/shared/Icon.js`)
**Size Impact**: ~1.8KB + Lucide Icons CDN (~50KB external, lazy loaded)
**Usage**: Icon creation and management across all UI components

#### Integration with Utils
- Used by tools that need Monaco Editor with custom toolbar icons
- Shared between sidebar navigation and tool-specific UI elements
- External CDN loading pattern similar to MonacoLoader

## Code Reuse Patterns

### 1. Singleton Pattern (MonacoLoader)
**Purpose**: Ensure expensive resources (Monaco Editor) are loaded once
**Benefits**: Reduces memory usage and load time for subsequent tools
**Implementation**: Static class with instance tracking

### 2. CDN-Based External Dependencies
**Purpose**: Keep bundle size minimal by loading large libraries externally
**Benefits**: 
- Core bundle remains under 50KB target
- Libraries cached across visits
- Optional loading based on tool requirements

### 3. Error Resilience
**Pattern**: Graceful degradation with fallbacks
**Implementation**: 
- Retry mechanisms for network failures
- Fallback editors when advanced features fail
- Error boundaries prevent tool crashes

### 4. Memory Management
**Pattern**: Explicit resource cleanup
**Benefits**: Prevents memory leaks in single-page application
**Implementation**: Instance tracking and disposal methods

## Bundle Size Impact Analysis

### Current Utilities Footprint
- **monacoLoader.js**: 4.43KB (production build, gzipped: ~1.5KB)
- **Total Utils Bundle**: 4.43KB actual (under 5KB target)
- **External Dependencies**: Loaded on-demand, not bundled

### Size Optimization Strategies
1. **Conditional Loading**: Monaco only loaded by tools that need code editing
2. **CDN Dependencies**: Large libraries served externally
3. **Shared Instances**: Single Monaco instance across multiple tools
4. **Tree Shaking**: Unused methods eliminated in production builds
5. **Lazy Initialization**: Heavy operations deferred until needed

## Guidelines for Adding New Utilities

### Size Budget Allocation
- **Per Utility**: Maximum 5KB minified + gzipped
- **Total Utils Directory**: Target <20KB combined
- **External Dependencies**: Prefer CDN over bundling for >10KB libraries

### Development Standards
```javascript
// Required export pattern
export class UtilityName {
    static instance = null; // For singletons
    
    // Static methods preferred for tree shaking
    static methodName() {
        // Implementation
    }
}

// Always provide size estimate in comments
// Bundle Impact: ~2.3KB minified + gzipped
```

### Code Quality Requirements
1. **Error Handling**: All utilities must handle failures gracefully
2. **Memory Management**: Provide cleanup methods for stateful utilities
3. **Browser Support**: Target modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
4. **Documentation**: Include JSDoc comments for all public methods
5. **Testing**: Unit tests required for utilities used by multiple tools

### Integration Patterns
1. **Import from Utils**: `import { UtilityName } from "../../utils/utilityName.js"`
2. **Conditional Loading**: Use dynamic imports for heavy utilities
3. **Shared State**: Use singleton pattern for expensive resources
4. **Error Boundaries**: Wrap utility calls in try-catch blocks

### Anti-Patterns to Avoid
❌ **Bundling Large Libraries**: Don't include >10KB dependencies in utils
❌ **Synchronous Loading**: Avoid blocking main thread with heavy operations
❌ **Global Variables**: Use module exports instead of window globals
❌ **Circular Dependencies**: Ensure clean dependency graph
❌ **Polyfills**: Target modern browsers, avoid compatibility code

## Future Utility Candidates

### Potential Additions (Size Budget Permitting)
1. **File Type Detection**: MIME type validation (~2KB)
2. **Compression Utilities**: Shared compression logic (~3KB)
3. **Validation Helpers**: Input validation patterns (~1KB)
4. **Storage Manager**: LocalStorage abstraction (~2KB)

### Size Monitoring
- Build system enforces 20KB total utils limit
- Individual utilities capped at 5KB
- Bundle analyzer reports size regression
- Automated alerts for size increases >10%

## Tool Integration Examples

### Base64 Decoder Integration
```javascript
// Uses MonacoLoader for code display
import { MonacoLoader } from "../../utils/monacoLoader.js";

async setupEditor() {
    await MonacoLoader.load();
    this.editor = MonacoLoader.createEditor(container, {
        language: 'json',
        readOnly: true
    });
}
```

### Base64 Encoder Integration
```javascript
// Uses MonacoLoader for both input and output editors
import { MonacoLoader } from "../../utils/monacoLoader.js";

async createEditors() {
    await MonacoLoader.load();
    this.inputEditor = MonacoLoader.createEditor(inputContainer, {
        language: 'plaintext'
    });
    this.outputEditor = MonacoLoader.createEditor(outputContainer, {
        language: 'json',
        readOnly: true
    });
}
```

## Current Status (2025-09-15)
- **MonacoLoader**: Production ready, optimized at 4.43KB
- **Bundle Size**: Achieved target under 5KB
- **CDN Strategy**: Working efficiently with Monaco Editor external loading
- **Integration**: Successfully used by Base64 Decoder and Encoder tools

## Maintenance Notes
- **Single Maintainer**: Utilities must be self-documenting
- **Size Priority**: Bundle size takes precedence over features
- **Backward Compatibility**: Breaking changes require version planning
- **Performance Monitoring**: Regular audits of utility performance impact
- **Security**: All utilities undergo security review for client-side safety