# Build System Documentation

## Overview

The enhanced build system provides comprehensive minification for the Base64 Decoder application, creating multiple optimized output formats.

## Features

### 🔧 Enhanced Minification
- **HTML Minification**: Complete HTML optimization with `html-minifier-terser`
- **CSS Minification**: Standalone CSS minification with `clean-css`
- **JavaScript Minification**: Advanced JS optimization with `terser`

### 📦 Multiple Output Formats
1. **All-in-One HTML** (`index.html`): Single file with embedded minified CSS and JS
2. **Separate Assets**: Individual minified files (`style.min.css`, `script.min.js`)
3. **External Assets HTML** (`index-external.html`): HTML that links to external CSS/JS

## Usage

### Build Command
```bash
npm run build
```

### Build Process
1. Reads the source `index.html` file
2. Extracts embedded CSS and JavaScript
3. Minifies each asset type using specialized tools
4. Generates multiple output formats in the `docs/` directory

## Output Files

| File | Description | Use Case |
|------|-------------|----------|
| `index.html` | All-in-one minified HTML | Single file deployment, GitHub Pages |
| `style.min.css` | Minified CSS only | Modular development, caching optimization |
| `script.min.js` | Minified JavaScript only | Modular development, caching optimization |
| `index-external.html` | HTML with external asset links | CDN deployment, better caching |

## Compression Statistics

Example output from the build process:
```
📊 HTML - Original: 35167 bytes, Minified: 19650 bytes (44.12% reduction)
📊 CSS  - Original: 7924 bytes, Minified: 4028 bytes (49.17% reduction)
📊 JS   - Original: 20852 bytes, Minified: 11627 bytes (44.24% reduction)
```

## Dependencies

- `html-minifier-terser`: HTML minification
- `clean-css`: CSS minification
- `terser`: JavaScript minification

## Development

To modify the build process, edit `build.js`. The script is structured with separate functions for:
- Asset extraction (`extractAndMinifyAssets`)
- External asset HTML creation (`createExternalAssetVersion`)
- Main build process (`buildMinified`)