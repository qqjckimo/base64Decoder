# Components Architecture Documentation

## Overview
The components directory contains reusable UI components following a modular architecture with emphasis on minimal bundle size and responsive design. All components are built with vanilla JavaScript ES6+ modules and incorporate dynamic styling to avoid CSS conflicts.

## Directory Structure
```
src/components/
├── sidebar/           # Navigation sidebar component
│   └── sidebar.js     # Main sidebar implementation
├── shared/            # Shared utility components
│   └── Icon.js        # Lucide icon management system
└── claude.md          # This documentation file
```

## Available Components

### 1. Sidebar Component (`sidebar/sidebar.js`)
**Purpose**: Primary navigation interface with responsive design and internationalization support.

**Key Features**:
- **Multi-language Support**: Traditional Chinese (zh-TW) and English with persistent language preference
- **Responsive Design**: Auto-collapse on mobile devices (≤768px), overlay mode on small screens (≤480px)
- **Dynamic Tool Loading**: Integrates with the app's dynamic module system
- **Icon Integration**: Uses Lucide icons through the shared Icon component
- **Accessibility**: ARIA labels, keyboard navigation support
- **Bundle Size**: ~8KB minified (including inline styles)

**API Contract**:
```javascript
class Sidebar {
    constructor()                    // Initialize with language detection
    async init()                     // Load configuration and render
    async loadToolsConfig()          // Load available tools dynamically
    render()                         // Generate DOM structure
    attachEvents()                   // Bind event listeners
    toggleLanguage()                 // Switch between zh-TW/en
    groupByCategory()                // Group tools by category
    addStyles()                      // Inject component-specific CSS
}
```

**Tool Registration Pattern**:
```javascript
{
    id: 'tool-id',                  // URL route identifier
    name: 'Display Name',           // Localized display name
    icon: createIcon('iconName'),   // Lucide icon HTML
    category: 'Category Name'       // Grouping category
}
```

### 2. Icon Component (`shared/Icon.js`)
**Purpose**: Unified icon management system using Lucide Icons CDN with lazy loading.

**Key Features**:
- **CDN Integration**: Uses official Lucide CDN for minimal bundle impact
- **Lazy Initialization**: Icons load only when needed
- **Multiple Output Formats**: HTML string or DOM element
- **Consistent Styling**: Standardized sizing and styling attributes
- **Bundle Size**: ~1KB (excluding CDN dependency)

**API Contract**:
```javascript
// Factory functions (recommended)
createIcon(iconName, size, className)     // Returns HTML string
getIconElement(iconName, size, className) // Returns DOM element
initializeLucideIcons(container)          // Initialize icons in container

// Class-based approach
new LucideIcon(iconName, size, className)
    .getHTML()                            // Get HTML string
    .createElement()                      // Create DOM element
```

**Usage Examples**:
```javascript
// HTML string for template literals
const iconHTML = createIcon('menu', 16, 'nav-icon');

// DOM element for programmatic insertion
const iconElement = getIconElement('settings', 20, 'tool-icon');

// Initialize icons after DOM updates
initializeLucideIcons();
```

## Component API Patterns

### 1. Initialization Pattern
All components follow this initialization pattern:
```javascript
constructor() → init() → render() → attachEvents()
```

### 2. Style Injection Pattern
Components inject their own CSS to avoid conflicts:
```javascript
addStyles() {
    const styleId = 'component-styles';
    if (document.getElementById(styleId)) return;
    // Inject styles with unique ID
}
```

### 3. Event Handling Pattern
Components use event delegation and cleanup:
```javascript
attachEvents() {
    // Attach events with proper cleanup consideration
    // Use arrow functions to maintain 'this' context
}
```

### 4. Responsive Design Pattern
Components implement mobile-first responsive design:
```javascript
// Desktop-first styles in addStyles()
// Mobile overrides in @media queries
// Programmatic responsive behavior in attachEvents()
```

## Styling Approach

### CSS-in-JS Strategy
- **Scoped Styles**: Each component injects its own styles with unique IDs
- **CSS Custom Properties**: Uses CSS variables for theming consistency
- **No External Dependencies**: Pure CSS without preprocessors
- **Bundle Optimization**: Styles are minified and injected only when component is used

### Responsive Breakpoints
- **≤480px**: Mobile overlay mode
- **≤768px**: Collapsed sidebar mode  
- **>768px**: Full expanded mode

### Theme Integration
Components use CSS custom properties for consistent theming:
```css
var(--primary-color)     /* Primary accent color */
var(--bg-primary)        /* Main background */
var(--bg-secondary)      /* Secondary background */
var(--text-primary)      /* Primary text color */
var(--text-secondary)    /* Secondary text color */
var(--border-color)      /* Border and divider color */
```

## Bundle Size Considerations

### Size Targets
- **Sidebar Component**: <8KB minified + gzipped
- **Icon Component**: <1KB minified + gzipped  
- **Combined**: <10KB total component overhead

### Optimization Strategies
1. **Inline Styles**: CSS injected dynamically to avoid unused styles
2. **Icon CDN**: Lucide icons loaded from CDN, not bundled
3. **Lazy Loading**: Components load only when route is accessed
4. **Minimal Dependencies**: No external libraries beyond Lucide CDN
5. **Tree Shaking**: ES6 modules support selective imports

### Bundle Impact Analysis
- **Critical Path**: Only core routing requires immediate component loading
- **Deferred Loading**: Sidebar loads after initial app shell
- **Icon Loading**: Lucide CDN loads asynchronously, graceful fallback
- **Memory Footprint**: Components self-cleanup when not needed

## Reusability Guidelines

### Creating New Components
1. **Follow Patterns**: Use established initialization and styling patterns
2. **Size Budget**: Stay within 30KB per component limit
3. **API Consistency**: Implement standard init/render/attachEvents methods
4. **Responsive Design**: Mobile-first approach with breakpoint considerations
5. **Internationalization**: Support multi-language if user-facing
6. **Icon Integration**: Use shared Icon component for consistency

### Component Dependencies
- **Shared Utilities**: Use `src/utils/common.js` for shared functionality
- **Icon System**: Import from `shared/Icon.js` for all icons
- **Theme Variables**: Use CSS custom properties defined in core styles
- **Event System**: Use native browser events, avoid custom event libraries

### Testing Considerations
- **Bundle Size**: Monitor component size during development
- **Responsive Testing**: Test all breakpoints thoroughly
- **Icon Loading**: Test with slow/blocked CDN scenarios  
- **Language Switching**: Test internationalization if applicable
- **Accessibility**: Test keyboard navigation and screen readers

## Performance Monitoring
- **Lazy Evaluation**: Components initialize only when needed
- **Memory Management**: Clean up event listeners and DOM references
- **Render Optimization**: Avoid unnecessary re-renders
- **CSS Efficiency**: Use efficient selectors, avoid deep nesting
- **Icon Caching**: Leverage browser caching for Lucide CDN

## Current Status (2025-09-15)
- **Sidebar Component**: Production ready, integrated with tool system
- **Icon Component**: Production ready, CDN-based implementation
- **Bundle Size**: Components fit within size targets (<10KB combined)
- **Production Build**: Optimized and deployed successfully

## Future Considerations
- **Component Registry**: Consider automated component discovery
- **Theming System**: Enhance CSS custom property usage
- **Animation Library**: Add lightweight transitions if needed
- **Testing Framework**: Add component-level testing utilities
- **Bundle Analyzer**: Integrate size monitoring in build process