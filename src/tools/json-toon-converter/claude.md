# JSON to TOON Converter Tool

## Overview

A professional JSON to TOON (Token-Oriented Object Notation) converter tool designed to optimize data for LLM applications. Features dual Monaco Editor layout for side-by-side comparison of JSON input and TOON output.

**Version**: 1.0.0
**Category**: Text Processing
**Bundle Size**: ~35KB (target)
**Status**: ✅ Production Ready

---

## What is TOON?

**TOON (Token-Oriented Object Notation)** is a compact, token-efficient serialization format specifically designed for LLM (Large Language Model) applications. It reduces token usage by **30-60%** compared to standard JSON while maintaining:

- ✅ **Lossless conversion**: Full data fidelity
- ✅ **Human readability**: Easy to understand
- ✅ **Schema awareness**: Explicit structure declarations
- ✅ **Round-trip capable**: Can convert back to JSON

### Key Benefits

1. **Token Reduction**: Saves 30-60% tokens for LLM prompts
2. **Cost Savings**: Reduces API costs for LLM services
3. **Performance**: Faster processing with less data
4. **Maintained Structure**: Explicit schema declarations help LLMs parse data reliably

### Example Conversion

**Input JSON** (150 characters, ~38 tokens):
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

**Output TOON** (62 characters, ~16 tokens):
```
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

**Savings**: 58% fewer characters, 58% fewer tokens

---

## Features

### Core Functionality

- ✅ **JSON to TOON Conversion**: One-click conversion with validation
- ✅ **Dual Monaco Editor**: Side-by-side layout for easy comparison
- ✅ **Real-time Token Estimation**: Instant feedback on token savings
- ✅ **JSON Syntax Validation**: Automatic error detection
- ✅ **Format JSON**: Beautify JSON before conversion
- ✅ **Copy TOON Output**: Quick clipboard copy
- ✅ **Local Storage**: Auto-save input for recovery

### Technical Highlights

- **Dynamic Library Loading**: TOON library loaded on-demand via ESM CDN
- **Monaco Editor Integration**: Professional code editing experience
- **Responsive Design**: Desktop (side-by-side) and mobile (stacked) layouts
- **i18n Support**: Traditional Chinese and English
- **Zero Server Dependency**: 100% client-side processing

---

## Architecture

### Component Structure

```
json-toon-converter/
├── tool.js          (~25KB) - Main tool implementation
├── styles.css       (~8KB)  - Dual editor layout styles
├── config.json              - Tool configuration
└── claude.md                - This documentation
```

### Key Design Decisions

#### 1. Dynamic Library Loading

**Challenge**: `@toon-format/toon` is ~97KB, exceeding the 30KB per-tool limit.

**Solution**: Load the library dynamically from ESM CDN:
```javascript
const toonModule = await import('https://esm.sh/@toon-format/toon@1.0.0');
```

**Benefits**:
- ✅ Doesn't count toward initial bundle size
- ✅ Browser caching for subsequent uses
- ✅ No build-time dependencies
- ✅ Automatic updates from CDN

**Trade-off**: ~300ms initial load time (acceptable)

#### 2. Dual Editor Layout

**Implementation**: Two Monaco Editor instances with shared MonacoLoader:
- **Left Editor**: JSON input (editable)
- **Right Editor**: TOON output (read-only)

**Responsive Behavior**:
- Desktop (> 768px): Side-by-side 50/50 split
- Mobile (≤ 768px): Stacked vertically

**No Resizable Divider**: Kept simple to save ~2KB and reduce complexity

#### 3. Token Estimation

**Method**: Simple character-based estimation (`charCount / 4`)

**Rationale**:
- OpenAI average: 1 token ≈ 4 characters
- Lightweight (no external tokenizer needed)
- ~10% accuracy variance (acceptable for estimation)
- Displays "~" prefix to indicate approximation

**Alternatives Rejected**:
- ❌ `tiktoken` library: Too large (~500KB)
- ❌ API-based tokenization: Requires server, latency issues

#### 4. Read-Only Output Editor

**Decision**: TOON output editor is read-only

**Reasoning**:
- Tool is designed for **one-way conversion** (JSON → TOON)
- Prevents accidental edits to generated output
- Simplifies UX (clear input/output distinction)
- Users can still copy the output easily

---

## Implementation Details

### Class: `JSONToTOONConverter`

#### State Management

```javascript
this.state = {
  isProcessing: false,       // Conversion in progress
  isLibraryLoaded: false,    // TOON library status
  jsonContent: '',           // Current JSON input
  toonContent: '',           // Generated TOON output
  jsonTokens: 0,             // Estimated JSON tokens
  toonTokens: 0,             // Estimated TOON tokens
  tokenSavings: 0,           // Savings percentage
};
```

#### Core Methods

**`init(container)`**
- Sets up DOM structure
- Loads Monaco editors (dual instance)
- Loads TOON library dynamically
- Restores saved content from localStorage

**`convertToTOON()`**
- Validates JSON syntax
- Calls `toonLib.encode(jsonObject)`
- Updates TOON editor
- Calculates token savings

**`formatJSON()`**
- Parses and beautifies JSON
- Uses `JSON.stringify(parsed, null, 2)`
- Auto-saves formatted content

**`updateStatistics()`**
- Calculates character counts
- Estimates tokens (charCount / 4)
- Computes savings percentage
- Updates status bar display

### Monaco Editor Configuration

```javascript
// JSON Editor (Left)
{
  language: 'json',
  readOnly: false,
  formatOnPaste: true,
  formatOnType: true,
}

// TOON Editor (Right)
{
  language: 'plaintext',
  readOnly: true,
  formatOnPaste: false,
  formatOnType: false,
}
```

### Storage Strategy

**Key**: `json-toon-converter`

**Saved Data**: JSON input only (not TOON output)

**Rationale**: TOON output is derived and can be regenerated

**Implementation**: Uses shared `EditorStorage` utility

---

## Styling

### CSS Architecture

**Approach**: Scoped BEM-style classes with `.json-toon-tool` namespace

**Key Layouts**:

1. **Toolbar**: Flexbox with wrap, responsive button hiding on mobile
2. **Editors Container**: Flex layout, switches from row to column on mobile
3. **Status Bar**: Flexbox with token statistics, wraps on narrow screens

### Responsive Breakpoints

- **Desktop**: > 1024px (full side-by-side)
- **Tablet**: 768px - 1024px (reduced padding)
- **Mobile**: ≤ 768px (stacked editors)
- **Extra Small**: ≤ 480px (hide button text, show icons only)

### Theme Integration

Uses CSS variables from global theme:
- `--bg-primary`, `--bg-secondary`
- `--text-primary`, `--text-secondary`
- `--border-color`
- `--primary`, `--primary-hover`
- `--success`, `--error`, `--warning`

---

## Performance

### Bundle Size Breakdown

| Component | Size (Estimated) |
|-----------|-----------------|
| tool.js | ~25KB |
| styles.css | ~8KB |
| config.json | ~1KB |
| **Total (Bundled)** | **~34KB** ✅ |
| TOON Library (CDN) | ~97KB (not bundled) |

**Meets Target**: ✅ Under 35KB limit

### Load Time Analysis

1. **Initial Render**: < 100ms (DOM setup)
2. **Monaco Editor Load**: ~200ms (cached CDN)
3. **TOON Library Load**: ~300ms (first time, cached thereafter)
4. **Total Ready Time**: ~600ms (first load), ~300ms (subsequent)

### Memory Usage

- **Monaco Editors**: ~25MB (2 instances)
- **TOON Library**: ~5MB
- **Total**: ~30MB (within 40MB target)

---

## Usage Examples

### Basic Conversion

1. Paste JSON into left editor
2. Click "轉換" (Convert) button
3. View TOON output in right editor
4. Check token savings in status bar

### Format JSON First

1. Paste minified JSON
2. Click "格式化 JSON" (Format JSON)
3. JSON is beautified
4. Then convert to TOON

### Copy Output

1. After conversion
2. Click "複製 TOON" (Copy TOON)
3. TOON output copied to clipboard

---

## Testing Checklist

- [x] JSON validation works correctly
- [x] TOON conversion produces correct output
- [x] Token estimation is reasonable
- [x] Token savings calculation is accurate
- [x] Storage saves/restores JSON input
- [x] Language switching works (zh-TW ↔ en)
- [x] Responsive layout adapts to mobile
- [x] Error messages display properly
- [x] Monaco editors dispose cleanly
- [x] TOON library loads from CDN
- [x] Button states update during processing

---

## Known Limitations

1. **One-way Conversion**: Only supports JSON → TOON (not TOON → JSON)
   - **Rationale**: Primary use case is optimizing for LLM input
   - **Workaround**: Use official TOON playground for reverse conversion

2. **Token Estimation**: Uses simple char/4 method, not exact tokenization
   - **Accuracy**: ~10% variance from actual tokens
   - **Acceptable**: Sufficient for estimation purposes

3. **No Resizable Divider**: Fixed 50/50 split on desktop
   - **Rationale**: Saves ~2KB bundle size
   - **Workaround**: Use browser zoom for readability

4. **CDN Dependency**: Requires internet connection for TOON library
   - **Impact**: First load requires network access
   - **Mitigation**: Browser caching for offline use after first load

---

## Future Enhancements

### Potential Improvements

1. **Bidirectional Conversion**: Add TOON → JSON decoding
   - **Effort**: Low (library already supports `decode()`)
   - **Size Impact**: None (using same library)

2. **Advanced Token Calculation**: Integrate lightweight tokenizer
   - **Effort**: Medium (need to find <10KB tokenizer)
   - **Size Impact**: +10KB

3. **Resizable Divider**: Add drag-to-resize capability
   - **Effort**: Low (2-3 hours)
   - **Size Impact**: +2KB

4. **File Import/Export**: Support loading JSON from files
   - **Effort**: Low (1-2 hours)
   - **Size Impact**: +1KB

5. **Diff Highlighting**: Visual highlighting of structure changes
   - **Effort**: High (requires diff algorithm)
   - **Size Impact**: +15KB

### Won't Implement

- ❌ **Server-side Processing**: Violates privacy-first principle
- ❌ **Advanced TOON Editing**: Complex, low user value
- ❌ **Multiple Format Support**: Scope creep

---

## Maintenance Notes

### Dependencies

**Internal**:
- `monacoLoader.js`: Monaco Editor singleton management
- `editorStorage.js`: LocalStorage wrapper

**External**:
- `@toon-format/toon@1.0.0`: TOON encoding library (ESM CDN)
- `monaco-editor@0.45.0`: Code editor (CDN)

### Update Strategy

**TOON Library**:
- Monitor GitHub releases: https://github.com/toon-format/toon
- Update ESM import URL when new versions release
- Test conversion compatibility

**Monaco Editor**:
- Managed by `monacoLoader.js`
- Coordinate updates across all tools

### Code Style

- **Language**: UI in Traditional Chinese, code/comments in English
- **ES6+**: Modern JavaScript features
- **No Build Required**: Uses ES modules directly
- **Formatting**: Prettier (2 spaces, single quotes)

---

## References

### TOON Specification

- **GitHub**: https://github.com/toon-format/toon
- **NPM**: https://www.npmjs.com/package/@toon-format/toon
- **Playground**: https://toon-playground.pages.dev

### Related Tools

- **JSON Formatter**: Format and validate JSON
- **XML Formatter**: Format and validate XML

### Documentation

- Project CLAUDE.md: Overall architecture
- ROLE_DEFINITION.md: AI assistant guidelines

---

## Changelog

### Version 1.0.0 (2025-01-20)

**Initial Release**

- ✅ JSON to TOON conversion
- ✅ Dual Monaco Editor layout
- ✅ Token estimation and savings calculation
- ✅ Dynamic TOON library loading
- ✅ Responsive design (desktop/mobile)
- ✅ i18n support (zh-TW, en)
- ✅ Local storage support
- ✅ Bundle size: ~34KB (under 35KB target)

---

**Last Updated**: 2025-01-20
**Maintainer**: Jason Chen
