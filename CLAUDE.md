# Claude AI Assistant Configuration

## Role Definition

You MUST see [ROLE_DEFINITION.md](./ROLE_DEFINITION.md) for detailed role and behavior specifications.

## Project: Web Developer Tools Collection

### Project Overview

A collection of developer tools built as a modular single-page web application. Starting with Base64 image decoder and expanding to include various web development utilities. Built with vanilla HTML/CSS/JavaScript for maximum portability, focusing on minimal bundle size through dynamic module loading.

### Technical Architecture

#### Core Technologies

- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Module System**: Dynamic ES6 modules with lazy loading
- **Build Strategy**: Hybrid approach - pre-bundle common tools, dynamic load others
- **UI Framework**: None - custom responsive CSS Grid/Flexbox layout
- **Bundle Optimization**: Critical focus on minimizing bundle size for fast initial load

#### CRITICAL TECHNICAL REQUIREMENT: Bundle Size Optimization

**MANDATORY**: All technical decisions MUST prioritize minimal bundle size:

1. **Code Splitting**: Each tool as separate module, loaded on-demand
2. **Tree Shaking**: Aggressive removal of unused code
3. **Minification**: All JS/CSS/HTML must be minified for production
4. **Compression**: Support for gzip/brotli compression
5. **Shared Dependencies**: Extract common code to shared modules
6. **Lazy Loading**: Tools loaded only when accessed
7. **Critical CSS**: Inline only essential styles, defer rest
8. **No Polyfills**: Target modern browsers only to avoid polyfill overhead

#### Architecture Strategy

- **Initial Load**: < 50KB for core app shell (HTML + critical CSS + router)
  - Core modules: ~15KB (app.js, router.js, loader.js, styles.css)
  - Components: ~9KB (sidebar, icon system)
  - Utilities: < 5KB (MonacoLoader)
- **Common Tools Bundle**: Pre-bundled frequently used tools
  - Base64 Decoder: ~15KB (preloaded for optimal UX)
- **Dynamic Tools**: Loaded on-demand
  - Base64 Encoder: ~135KB (includes external libraries)
  - ICO Analyzer: ~25KB (pending modularization)
  - PNG to ICO: ~28KB (pending modularization)
- **Shared Modules**: Common utilities extracted (< 5KB actual)
- **Total Initial Experience**: Core + Base64 Decoder = ~65KB (well under 150KB target)

#### Module Structure

1. **Core Modules**:
   - Router (hash-based, < 5KB)
   - Tool loader (dynamic import, < 3KB)
   - Layout components (sidebar, < 10KB)
2. **Tool Modules**:
   - Self-contained with own styles
   - Exportable as standalone if needed
   - Lazy-loaded CSS and JS
3. **Shared Utilities**:
   - Common functions extracted
   - Loaded once, cached

### Build System

- **Build Tool**: Webpack/Rollup for module bundling with aggressive optimization
- **Minification**: Terser for JS, cssnano for CSS, html-minifier-terser for HTML
- **Bundle Analysis**: Built-in size monitoring and alerts for size regression
- **Output**: Optimized bundles in `docs/` directory
- **Deployment**: GitHub Pages ready with CDN optimization

### File Structure

```
base64Decoder/
├── index.html              # Main app shell
├── src/
│   ├── core/              # Core functionality (router, loader) - See core/claude.md
│   │   ├── app.js         # Main application logic (~3KB)
│   │   ├── router.js      # Hash-based routing (~2KB)
│   │   ├── loader.js      # Dynamic module loader (~2KB)
│   │   ├── styles.css     # Critical core styles (~8KB)
│   │   └── claude.md      # Core module documentation
│   ├── components/        # Reusable components - See components/claude.md
│   │   ├── sidebar/       # Navigation sidebar (~8KB)
│   │   ├── shared/        # Shared UI components
│   │   │   └── Icon.js    # Icon system (~1KB)
│   │   └── claude.md      # Components documentation
│   ├── tools/             # Individual tools
│   │   ├── base64-decoder/   # Image decoder tool (~15KB, preloaded)
│   │   │   ├── tool.js       # Tool implementation
│   │   │   ├── styles.css    # Tool-specific styles
│   │   │   ├── config.json   # Tool metadata
│   │   │   └── claude.md     # Tool documentation
│   │   ├── base64-encoder/   # Image encoder tool (~135KB, on-demand)
│   │   │   ├── tool.js       # Tool with Web Worker
│   │   │   ├── worker.js     # Background processing
│   │   │   ├── styles.css    # Tool-specific styles
│   │   │   ├── config.json   # Tool metadata
│   │   │   └── claude.md     # Tool documentation
│   │   ├── icoAnalyzer/      # ICO analyzer (standalone, needs integration)
│   │   │   ├── index.html    # Standalone implementation (~25KB)
│   │   │   └── claude.md     # Tool documentation
│   │   ├── pngToIco/         # PNG to ICO converter (standalone, needs integration)
│   │   │   ├── index.html    # Standalone implementation (~28KB)
│   │   │   └── claude.md     # Tool documentation
│   │   └── [tool-name]/
│   └── utils/             # Shared utilities - See utils/claude.md
│       ├── monacoLoader.js # Monaco Editor loader (<5KB)
│       └── claude.md        # Utilities documentation
├── docs/                  # Production build output
│   ├── index.html         # Minified app shell
│   ├── core.bundle.js     # Core bundle
│   ├── common.bundle.js   # Common tools bundle
│   └── tools/             # Dynamic tool bundles
├── build.js               # Build script
├── webpack.config.js      # Webpack configuration
├── package.json           # Build dependencies
├── CLAUDE.md              # This configuration file
├── ROLE_DEFINITION.md     # AI assistant role definition
├── README.md              # Project documentation
├── BUILD.md               # Build instructions
└── LICENSE                # MIT License
```

### Development Guidelines

#### Code Standards

- **Language**: UI in Traditional Chinese (zh-TW), code/comments in English
- **Style**: Clean, readable, self-documenting code
- **Performance**: Bundle size is TOP PRIORITY, followed by runtime performance
- **Browser Support**: Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Size Limits**: Enforce via build tools - fail build if limits exceeded

#### Architecture Principles

1. **Modular Design**: Each tool is independent module, dynamically loaded
2. **Minimal Dependencies**: Pure browser APIs preferred, any library must justify its size
3. **Progressive Loading**: Core shell loads first, tools load on-demand
4. **Privacy-First**: All processing client-side, no server communication
5. **Bundle Size First**: Every feature must justify its byte cost
6. **Code Reuse**: Extract common patterns to shared modules

#### Common Tasks

- **Build for production**: `npm run build` (with size analysis)
- **Check bundle size**: `npm run analyze`
- **Local development**: `npm run dev` (with hot reload)
- **Add new tool**: `npm run create-tool [name]`
- **Deploy**: Push to GitHub, builds automatically serve from `docs/`

#### Bundle Size Guidelines

- **Per-tool limit**: 30KB minified + gzipped
- **Core bundle**: < 50KB minified + gzipped
- **Shared utilities**: < 20KB minified + gzipped
- **Images/Assets**: Use SVG when possible, optimize all raster images
- **Fonts**: System fonts only, no web fonts unless essential

### Security Considerations

- Client-side only processing (no data transmission)
- Input validation for all user inputs
- Safe DOM operations with error boundaries
- XSS prevention in dynamic content rendering
- CSP headers for additional protection
- Sandboxed tool execution where applicable

### Tool Development Guidelines

Each tool MUST follow these guidelines:

1. **Size Budget**: Maximum 30KB minified + gzipped
2. **Self-contained**: Include all necessary styles and logic
3. **Metadata**: config.json with name, description, category, size estimate
4. **API Contract**: Export default class with init(), destroy() methods
5. **Error Handling**: Graceful degradation, user-friendly error messages
6. **Accessibility**: ARIA labels, keyboard navigation support
7. **Responsive**: Mobile-first design approach

### Performance Monitoring

- **Build-time checks**: Fail if size limits exceeded
- **Runtime monitoring**: Track load times, report if > 1s
- **Lazy load triggers**: Intersection Observer for viewport-based loading
- **Cache strategy**: Service Worker for offline support (optional)
- **Resource hints**: Preconnect, prefetch for anticipated tools

### Maintenance Notes

- Single maintainer project
- Bundle size takes precedence over features
- Modular architecture must be preserved
- Each tool should be independently deployable
- Regular size audits and optimization passes

### Module Documentation

For detailed implementation and maintenance information, refer to the module-specific documentation:

#### Core Systems

- **[Core Modules](./src/core/claude.md)**: Application initialization, routing, module loading
  - Critical path optimization for < 50KB initial load
  - Hash-based routing with security measures
  - Advanced dynamic module loading with caching

#### Components

- **[Component Library](./src/components/claude.md)**: Reusable UI components
  - Sidebar navigation with i18n support (~8KB)
  - Icon system using Lucide icons (~1KB)
  - CSS-in-JS scoped styling approach

#### Utilities

- **[Shared Utilities](./src/utils/claude.md)**: Common functionality
  - Monaco Editor loader with singleton management
  - Bundle size < 5KB for all utilities
  - CDN-based external dependencies

#### Tools

- **[Base64 Decoder](./src/tools/base64-decoder/claude.md)**: Image decoding and analysis (~15KB, preloaded)
  - Advanced pixel analysis and color statistics
  - Monaco Editor integration for code display
  - Canvas-based image processing
- **[Base64 Encoder](./src/tools/base64-encoder/claude.md)**: Image encoding with compression (~135KB, on-demand)

  - Web Worker for non-blocking processing
  - Multiple compression format comparison
  - Real-time compression analysis

- **[ICO Analyzer](./src/tools/icoAnalyzer/claude.md)**: ICO file analysis (~25KB, needs integration)

  - Deep ICO format parsing
  - Format detection (PNG vs BMP)
  - HEX viewer for binary analysis

- **[PNG to ICO Converter](./src/tools/pngToIco/claude.md)**: Professional icon creation (~28KB, needs integration)
  - Multi-size icon generation
  - High-quality scaling algorithms
  - Three conversion modes

### Current Status

- **Integrated Tools**: Base64 Decoder, Base64 Encoder (fully modularized)
- **Pending Integration**: ICO Analyzer, PNG to ICO Converter (standalone HTML files)
- **Bundle Size Achievement**: Core + Base64 Decoder = ~65KB (well under 150KB target)
