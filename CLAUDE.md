# Claude AI Assistant Configuration

## Role Definition
See [ROLE_DEFINITION.md](./ROLE_DEFINITION.md) for detailed role and behavior specifications.

## Project: Base64 Image Decoder and Pixel Analysis Tool

### Project Overview
A powerful single-page web application for decoding Base64 encoded images with comprehensive pixel-level analysis capabilities. Built with vanilla HTML/CSS/JavaScript for maximum portability and zero dependencies.

### Technical Architecture

#### Core Technologies
- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **No Dependencies**: Standalone single-file architecture
- **Image Processing**: HTML5 Canvas API for pixel manipulation
- **UI Framework**: None - custom responsive CSS Grid/Flexbox layout

#### Key Features Implementation
1. **Base64 Decoding**: Native browser data URL support with format detection
2. **Pixel Analysis**: Canvas-based real-time pixel data extraction
3. **Color Analysis**: 
   - RGB/HEX/HSL color space conversions
   - Dominant color extraction algorithm
   - Transparency detection
4. **Interactive Features**:
   - Drag-and-drop file upload
   - Clipboard paste support
   - Click-to-inspect pixel details
   - Hover effects for color preview

### Build System
- **Build Tool**: Custom Node.js script (`build.js`)
- **Minification**: `html-minifier-terser` for production builds
- **Output**: Single minified `index.html` in `docs/` directory
- **Deployment**: GitHub Pages ready

### File Structure
```
base64Decoder/
├── index.html          # Development version (source)
├── docs/
│   └── index.html      # Production version (minified)
├── build.js            # Build script
├── package.json        # Build dependencies
├── CLAUDE.md           # This configuration file
├── ROLE_DEFINITION.md  # AI assistant role definition
├── README.md           # Project documentation
├── BUILD.md            # Build instructions
└── LICENSE             # MIT License
```

### Development Guidelines

#### Code Standards
- **Language**: UI in Traditional Chinese (zh-TW), code/comments in English
- **Style**: Clean, readable, self-documenting code
- **Performance**: Optimize for Canvas operations and large image handling
- **Browser Support**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

#### Architecture Principles
1. **Single-File Design**: All functionality in one HTML file for easy deployment
2. **No External Dependencies**: Pure browser APIs only
3. **Progressive Enhancement**: Core functionality works without JavaScript features
4. **Privacy-First**: All processing client-side, no server communication

#### Common Tasks
- **Build for production**: `npm run build`
- **Local development**: Open `index.html` directly or use local server
- **Deploy**: Push to GitHub, builds automatically serve from `docs/`

### Security Considerations
- Client-side only processing (no data transmission)
- Input validation for Base64 strings
- Safe Canvas operations with error boundaries
- XSS prevention in dynamic content rendering

### Future Enhancements (Planned)
- [ ] WebAssembly for faster pixel processing
- [ ] Support for additional image formats
- [ ] Batch processing capabilities
- [ ] Color palette export features
- [ ] PWA support for offline usage

### Maintenance Notes
- Single maintainer project
- Focus on stability over feature additions
- Preserve single-file architecture
- Maintain backward compatibility