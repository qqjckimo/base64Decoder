# Base64 Decoder - AI Coding Instructions

## Project Overview

A single-file web application for decoding Base64 images and performing pixel-level analysis. Built with vanilla JavaScript, no external dependencies, emphasizing simplicity and browser compatibility.

## Architecture Principles

### Single-File Design Philosophy
- **Everything in `index.html`**: HTML structure + embedded CSS (`<style>`) + embedded JavaScript (`<script>`)
- **No external dependencies**: Pure vanilla JavaScript, no frameworks or libraries
- **Self-contained**: Can run from file:// protocol or any web server
- **Dual-language support**: Traditional Chinese (zh-TW) primary, English secondary with runtime switching

### Build System Strategy
- **Source**: `index.html` (development file)
- **Output**: `docs/index.html` (minified for GitHub Pages)
- **Build command**: `npm run build` using `build.js`
- **Minification**: Uses `html-minifier-terser` for single-file optimization
- **Multiple outputs**: Also generates separate CSS/JS files for modular deployment

## Key Technical Patterns

### Canvas-Based Image Processing
```javascript
// Core pattern for pixel analysis
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
```

### Color Analysis Architecture
- **Pixel iteration**: Process RGBA data in 4-byte chunks (`i += 4`)
- **Color mapping**: Use `Map` for unique color counting with `r,g,b,a` string keys
- **Brightness calculation**: Standard formula `(r * 299 + g * 587 + b * 114) / 1000`
- **Color space conversion**: RGB → HEX, RGB → HSL utility functions

### Event-Driven UI Pattern
```javascript
// Canvas click handling with coordinate scaling
canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
});
```

## Development Workflows

### Local Development
```bash
# Open directly in browser (no build step needed)
open index.html
# OR serve locally
python -m http.server 8000
npm run serve  # Uses docs/ directory
```

### Build & Deploy
```bash
npm install                 # Install build dependencies
npm run build              # Minify to docs/index.html
npm run test:build         # Build + serve for testing
```

### GitHub Pages Deployment
- **Automatic**: Pushes to `main` trigger `.github/workflows/pages.yml`
- **Source**: Uses `docs/` directory (built files)
- **URL**: `https://qqjckimo.github.io/base64Decoder/`

## Code Conventions

### Language Strategy
- **UI Text**: Traditional Chinese with English fallback via `translations` object
- **Code Comments**: Mixed Chinese/English
- **Function Names**: English camelCase
- **Variable Names**: English, descriptive

### CSS Architecture
- **Glass morphism**: `backdrop-filter: blur()` with `rgba()` backgrounds
- **CSS Grid**: Main layout using `grid-template-columns: 1fr 1fr`
- **Responsive**: Single breakpoint at 768px switching to single column
- **No CSS framework**: Custom utility classes, inline styles for dynamic content

### JavaScript Patterns
- **Global state**: `currentCanvas`, `currentContext`, `currentLanguage`
- **Utility functions**: Color conversion, file size calculation, alert system
- **Error handling**: User-friendly alerts with `showAlert(message, type)`
- **Memory management**: Canvas cleanup on clear operations

## Critical Integration Points

### Base64 Processing Chain
1. **Input validation**: Handle both data URLs and raw Base64 strings
2. **Image creation**: `new Image()` → `onload` → canvas drawing
3. **Format detection**: Parse MIME type from data URL header
4. **File size estimation**: `base64Length * 0.75 / 1024` for KB calculation

### Pixel Analysis Pipeline
1. **Canvas extraction**: `getImageData()` for pixel array access
2. **Color statistics**: Concurrent unique color counting and brightness calculation
3. **Dominant color sorting**: Map entries sorted by frequency, top 5 displayed
4. **Interactive inspection**: Click coordinates → pixel color display

## Performance Considerations

- **Large image handling**: Canvas operations are synchronous, may block UI
- **Memory optimization**: Clear previous canvas references before new operations
- **Color map efficiency**: String-based color keys for Map performance
- **DOM updates**: Batch statistical updates to minimize reflows

## Browser Compatibility Requirements

- **HTML5 Canvas API**: Core dependency for pixel manipulation
- **ES6+ features**: Arrow functions, template literals, `Map`, `const`/`let`
- **CSS Grid/Flexbox**: Layout system
- **FileReader API**: For potential drag-drop file handling (if implemented)

When modifying this codebase, maintain the single-file architecture, preserve the bilingual interface, and ensure canvas-based operations remain efficient for large images.
