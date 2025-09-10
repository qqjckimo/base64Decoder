# Base64 Image Decoder Tool

## Overview
A comprehensive Base64 image decoder with advanced pixel analysis capabilities. This tool converts Base64-encoded images back to displayable format while providing detailed image analysis including pixel statistics, color information, and interactive pixel exploration.

## Tool Purpose and Functionality
- **Primary Function**: Decode Base64-encoded images and display them with comprehensive analysis
- **Core Features**:
  - Support for multiple image formats (PNG, JPEG, GIF, WebP)
  - Monaco Editor integration for enhanced Base64 input editing
  - Real-time pixel analysis with color statistics
  - Interactive pixel clicking for detailed color information
  - Dominant color extraction and display
  - Image metadata display (dimensions, format, file size)
  - Drag & drop support for image files
  - Bilingual interface (Traditional Chinese / English)

## Key Files and Responsibilities

### `tool.js` (Main Tool Implementation)
- **Size**: ~33KB (~788 lines)
- **Primary Class**: `Base64DecoderTool`
- **Key Methods**:
  - `init(container)`: Initializes the tool with Monaco Editor integration
  - `initMonacoEditor()`: Sets up Monaco Editor with fallback to textarea
  - `decode()`: Main decoding logic with format detection
  - `analyzePixels(img)`: Comprehensive pixel analysis including color mapping
  - `displayImage(img, base64String)`: Canvas-based image rendering
  - `showPixelInfo(x, y)`: Interactive pixel information display
- **Dependencies**: 
  - `../../utils/monacoLoader.js` for enhanced text editing
  - Browser Canvas API for image analysis

### `config.json` (Tool Metadata)
- **Tool ID**: `base64-decoder`
- **Estimated Size**: 15KB
- **Category**: Image Processing
- **Preload**: `true` (bundled in common tools)
- **Version**: 1.0.0

### `styles.css` (Visual Styling)
- **Size**: ~560 lines of CSS
- **Features**:
  - Glass-morphism design with backdrop filters
  - Responsive grid layout
  - Monaco Editor integration styling
  - Interactive pixel display styling
  - Mobile-responsive design (768px breakpoint)
  - Custom scrollbar styling
  - Animated elements (progress indicators, alerts)

## Technical Implementation Details

### Image Processing Pipeline
1. **Input Validation**: Checks for valid Base64 format with automatic MIME type detection
2. **Format Detection**: Automatically detects PNG, JPEG, GIF based on Base64 headers
3. **Canvas Rendering**: Uses HTML5 Canvas for pixel-perfect image display
4. **Pixel Analysis**: Real-time pixel data extraction using `getImageData()`

### Advanced Features
- **Color Analysis**: 
  - Unique color counting using Map data structure
  - Average brightness calculation using luminance formula
  - Transparent pixel detection and counting
  - Dominant color extraction with percentage calculation
- **Interactive Elements**:
  - Click-to-analyze pixel information
  - RGB, HEX, HSL color format conversion
  - Collapsible dominant colors section

### Monaco Editor Integration
- **Enhanced Editing**: Syntax highlighting, find & replace, large file support
- **Fallback Strategy**: Automatic fallback to textarea if Monaco fails to load
- **Drag & Drop**: Direct file drop support with automatic Base64 conversion
- **Error Handling**: Graceful degradation with user notifications

## Bundle Size Considerations
- **Estimated Bundle Size**: 15KB (excluding Monaco Editor)
- **Monaco Editor**: Loaded dynamically from shared utils
- **Optimization Strategies**:
  - Dynamic imports for Monaco Editor
  - Shared utilities for common functions
  - Efficient pixel analysis algorithms
  - Minimal external dependencies

## API Contract

### Export Structure
```javascript
export default class Base64DecoderTool {
  constructor()
  async init(container)
  destroy()
}
```

### Required Methods
- `init(container)`: Initialize tool in provided DOM container
- `destroy()`: Clean up resources, dispose Monaco Editor
- Language change event listener for runtime language switching

### Tool State Management
- Current canvas and context references
- Monaco Editor instance management
- Translation system with localStorage persistence
- File analysis results caching

## Dependencies and Requirements
- **Browser APIs**: Canvas 2D Context, File API, Clipboard API
- **Shared Utilities**: MonacoLoader for enhanced text editing
- **Modern Browser Support**: ES6+ features, Canvas API, backdrop-filter CSS
- **Memory Requirements**: Moderate (handles large Base64 strings in Monaco Editor)

## Performance Considerations
- **Image Analysis**: Optimized pixel scanning with efficient color mapping
- **DOM Updates**: Batch DOM manipulations for smooth UI updates
- **Memory Management**: Proper cleanup of canvas contexts and Monaco Editor
- **Large Files**: Monaco Editor handles large Base64 strings efficiently

## Extension Points
- **Format Support**: Easy to add new image format detection
- **Analysis Features**: Modular pixel analysis functions
- **Export Options**: Can be extended with export/save functionality
- **Integration**: Designed to work with app-wide language switching

## Error Handling
- Comprehensive error messages in both languages
- Graceful fallback for Monaco Editor loading failures
- Input validation with user-friendly error alerts
- Network error handling for example file loading

## Accessibility Features
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast color schemes
- Semantic HTML structure
- Focus management for interactive elements