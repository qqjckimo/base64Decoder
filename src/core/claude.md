# Core Module Architecture

## Overview

The `src/core` directory contains the essential modules that power the modular, lazy-loading architecture of the Developer Tools Collection. This core system enables dynamic tool loading, hash-based routing, and maintains optimal bundle sizes through strategic code splitting.

## Module Structure

### Primary Modules

#### 1. **app.js** - Application Controller
The main application orchestrator that manages the application lifecycle, DOM setup, and tool coordination.

**Key Responsibilities:**
- Application initialization and DOM structure setup
- Tool lifecycle management (loading/unloading)
- Error handling and user feedback
- Integration of router and loader systems

**Architecture Pattern:**
```javascript
class App {
    constructor() -> init() -> setupDOM() -> registerRoutes() -> preloadCommonTools()
}
```

**Critical Features:**
- **Tool Isolation**: Each tool is properly destroyed before loading new ones
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Loading States**: Visual feedback during tool loading operations
- **DOM Management**: Clean separation between app shell and tool containers

#### 2. **router.js** - Hash-Based Navigation
Lightweight client-side router optimized for single-page applications with tool validation.

**Key Responsibilities:**
- Hash-based route management (no server round-trips)
- Tool validation and security checks
- Route parameter parsing and validation
- Navigation state management

**Architecture Pattern:**
```javascript
Router: register() -> handleRoute() -> validate() -> execute handler
```

**Bundle Size Optimization:**
- **Zero Dependencies**: Pure browser API implementation
- **Minimal Footprint**: < 5KB implementation
- **Event-Driven**: Uses native hashchange events
- **Tool Validation**: Prevents loading non-existent tools

**Security Features:**
- Whitelist-based tool validation (`validTools` array)
- Invalid route redirection to default tool
- Parameter sanitization and validation

#### 3. **loader.js** - Dynamic Module Loader
Advanced module loading system with caching, error handling, and bundle optimization.

**Key Responsibilities:**
- Dynamic ES6 module importing
- Tool and style loading coordination
- Memory management and caching
- Common tool preloading strategy

**Architecture Pattern:**
```javascript
ToolLoader: loadTool() -> performLoad() -> [module, styles] -> instance + cache
```

**Bundle Size Optimization Strategies:**
- **Code Splitting**: Each tool loaded as separate chunk
- **Concurrent Loading**: Parallel loading of JS and CSS
- **Cache Management**: Prevents redundant loading
- **Preloading Strategy**: Common tools loaded proactively
- **Memory Management**: Proper cleanup of unused tools

**Advanced Features:**
- **Loading Deduplication**: Prevents multiple concurrent loads of same tool
- **Style Isolation**: Tool-specific CSS loading and cleanup
- **Tool API Contract**: Enforces init()/destroy() lifecycle methods
- **Error Recovery**: Graceful handling of failed tool loads

#### 4. **styles.css** - Critical CSS
Core application styles optimized for initial page load performance.

**Bundle Size Strategy:**
- **Critical Path CSS**: Only essential styles for app shell
- **CSS Variables**: Consistent theming with minimal overhead
- **Responsive Design**: Mobile-first approach with efficient media queries
- **Tool Isolation**: Tools load their own styles dynamically

**Layout Architecture:**
- **CSS Grid/Flexbox**: Modern layout without framework overhead
- **Fixed Sidebar**: Optimized for tool navigation
- **Responsive Breakpoints**: 768px (tablet), 480px (mobile)

## Application Initialization Flow

### 1. Initial Load Sequence
```
index.html → Core CSS → app.js → DOM Setup → Router Init → Sidebar Init → Tool Preload
```

### 2. Critical Path (< 50KB Target)
1. **HTML Shell** (< 2KB): Minimal markup with app container
2. **Core CSS** (< 15KB): Essential styles for layout and theming
3. **Core JS Bundle** (< 25KB): App + Router + Loader
4. **Sidebar Component** (< 8KB): Navigation and language switching

### 3. Tool Loading Flow
```
Route Change → Router Validation → Loader Check Cache → Dynamic Import → Style Loading → Tool Init
```

## Bundle Size Optimization Strategies

### Core Module Optimizations

#### 1. **Minimal Dependencies**
- **Zero External Libraries**: Pure browser APIs only
- **Lucide Icons**: CDN-loaded for icon system (shared across tools)
- **Native ES6 Modules**: Browser-native module system

#### 2. **Code Splitting Strategy**
- **Core Bundle**: App + Router + Loader (target: < 25KB)
- **Sidebar Bundle**: Navigation component (< 8KB)
- **Tool Bundles**: Individual tools (< 30KB each)
- **Shared Utilities**: Common functions extracted (< 20KB)

#### 3. **Lazy Loading Architecture**
- **Route-Based Splitting**: Tools loaded only when accessed
- **Concurrent Loading**: JS and CSS loaded in parallel
- **Preload Strategy**: Common tools loaded after core initialization
- **Cache Management**: Loaded tools remain in memory until unloaded

#### 4. **Runtime Optimizations**
- **DOM Recycling**: Tool container reused across tool switches
- **Event Delegation**: Efficient event handling patterns
- **Memory Management**: Proper cleanup via tool destroy() methods

## API Contracts

### Tool API Contract
All tools must implement this standardized interface:

```javascript
class ToolName {
    constructor() {
        // Tool initialization
    }
    
    async init(container) {
        // Tool rendering and event binding
        // container: DOM element for tool content
    }
    
    destroy() {
        // Cleanup: remove event listeners, clear intervals, etc.
    }
}

export default ToolName;
```

### Router API Contract
```javascript
router
    .register(path, handler)  // Register route handler
    .setDefault(path)         // Set default route
    .navigate(path)           // Programmatic navigation
```

### Loader API Contract
```javascript
loader.loadTool(toolName)     // Returns Promise<{instance, styles, name}>
loader.unloadTool(toolName)   // Cleanup tool and styles
loader.preloadCommonTools()   // Load frequently used tools
```

## Critical Path for Initial Page Load

### Performance Budget
- **Total Initial Load**: < 50KB (HTML + Critical CSS + Core JS)
- **First Contentful Paint**: < 1.5s on 3G
- **Time to Interactive**: < 3s on 3G
- **Tool Load Time**: < 500ms per tool

### Loading Strategy
1. **Immediate**: Core app shell and critical CSS
2. **High Priority**: Router and core application logic
3. **Normal Priority**: Sidebar navigation component
4. **Low Priority**: Common tool preloading
5. **On-Demand**: Individual tools as requested

### Optimization Techniques
- **Resource Hints**: Preconnect to CDN for icons
- **Critical CSS Inlining**: Essential styles in HTML head
- **Module Preloading**: `<link rel="modulepreload">` for core modules
- **Compression**: Gzip/Brotli for all static assets

## Error Handling and Resilience

### Router Error Handling
- Invalid routes redirect to default tool
- Tool validation prevents loading non-existent tools
- Graceful degradation for navigation failures

### Loader Error Handling
- Failed tool loads show user-friendly error messages
- Partial loading failures don't crash the application
- Tool cleanup on errors prevents memory leaks

### Application Error Boundaries
- Global error handling for unhandled exceptions
- User-friendly error messages with recovery options
- Fallback UI when core components fail

## Integration Points

### With Tool System
- Tools register through config.json metadata
- Dynamic imports enable code splitting
- Standardized lifecycle methods ensure clean integration

### With Build System
- Webpack integration for module bundling
- Tree shaking for unused code elimination
- Chunk splitting for optimal loading patterns

### With Deployment
- GitHub Pages compatibility
- CDN optimization for static assets
- Service Worker integration for offline support

## Security Considerations

### Tool Validation
- Whitelist-based tool loading prevents arbitrary code execution
- Route validation ensures only valid tools can be accessed
- Input sanitization in router parameter handling

### Content Security
- No eval() or Function() constructors used
- Safe DOM manipulation practices
- XSS prevention in dynamic content rendering

## Performance Monitoring

### Bundle Size Monitoring
- Build-time checks for size regressions
- Per-tool size limits enforced
- Core bundle size alerts

### Runtime Performance
- Tool loading time tracking
- Memory usage monitoring
- Route navigation performance metrics

## Future Extensibility

### Plugin Architecture
- Tool registration system ready for dynamic tool discovery
- Config-based tool metadata enables tool marketplace
- API contracts support third-party tool development

### Scaling Considerations
- Module federation ready for micro-frontend architecture
- CDN deployment strategy for tool distribution
- Internationalization framework in place

This core architecture enables the entire application to maintain sub-50KB initial load while supporting unlimited tool expansion through dynamic loading and intelligent caching strategies.