import { MonacoLoader } from "../../utils/monacoLoader.js";
import { createIcon, initializeLucideIcons } from "../../components/shared/Icon.js";
import "./styles.css";

export default class XMLFormatterTool {
  constructor() {
    this.monacoEditor = null;
    this.currentLanguage = window.appLanguage?.get() || "zh-TW";
    this.translations = {
      "zh-TW": {
        title: "XML 格式化工具",
        format: "格式化",
        compact: "壓縮",
        copy: "複製",
        clear: "清除",
        ready: "就緒",
        formatted: "格式化成功",
        compacted: "壓縮成功",
        copied: "已複製到剪貼簿",
        cleared: "已清除",
        invalidXML: "無效的 XML",
        error: "錯誤",
        failedToCopy: "複製失敗",
        characters: "字元",
        exampleXML: '<?xml version="1.0" encoding="UTF-8"?>\n<example>請在此處貼上您的 XML</example>',
        formatTooltip: "格式化 XML (Ctrl+S)",
        compactTooltip: "壓縮 XML (Ctrl+Shift+S)",
        copyTooltip: "複製到剪貼簿",
        clearTooltip: "清除編輯器內容"
      },
      "en": {
        title: "XML Formatter Tool",
        format: "Format",
        compact: "Compact",
        copy: "Copy",
        clear: "Clear",
        ready: "Ready",
        formatted: "Formatted successfully",
        compacted: "Compacted successfully",
        copied: "Copied to clipboard",
        cleared: "Cleared",
        invalidXML: "Invalid XML",
        error: "Error",
        failedToCopy: "Failed to copy",
        characters: "characters",
        exampleXML: '<?xml version="1.0" encoding="UTF-8"?>\n<example>paste your XML here</example>',
        formatTooltip: "Format XML (Ctrl+S)",
        compactTooltip: "Compact XML (Ctrl+Shift+S)",
        copyTooltip: "Copy to clipboard",
        clearTooltip: "Clear editor content"
      }
    };
  }

  async init(container) {
    this.container = container;
    this.renderInitial();
    this.attachEvents();

    // Load Monaco Editor
    await this.loadMonacoEditor();

    // Setup language listener
    window.addEventListener("languageChanged", (e) => {
      this.currentLanguage = e.detail.language;
      this.updateLanguage();
    });
  }

  renderInitial() {
    const t = this.translations[this.currentLanguage];

    this.container.innerHTML = `
      <div class="xml-formatter-tool">
        <div class="tool-toolbar">
          <span class="tool-title" data-i18n="title">${t.title}</span>
          <button class="btn btn-primary" id="formatBtn" data-i18n-title="formatTooltip" title="${t.formatTooltip}">
            ${createIcon('align-left', 18, 'btn-icon')}
            <span data-i18n="format">${t.format}</span>
          </button>
          <button class="btn" id="compactBtn" data-i18n-title="compactTooltip" title="${t.compactTooltip}">
            ${createIcon('minimize-2', 18, 'btn-icon')}
            <span data-i18n="compact">${t.compact}</span>
          </button>
          <button class="btn" id="copyBtn" data-i18n-title="copyTooltip" title="${t.copyTooltip}">
            ${createIcon('copy', 18, 'btn-icon')}
            <span data-i18n="copy">${t.copy}</span>
          </button>
          <button class="btn" id="clearBtn" data-i18n-title="clearTooltip" title="${t.clearTooltip}">
            ${createIcon('trash-2', 18, 'btn-icon')}
            <span data-i18n="clear">${t.clear}</span>
          </button>
        </div>

        <div class="editor-container">
          <div id="xmlEditor"></div>
        </div>

        <div class="status-bar">
          <span id="status" data-i18n="ready">${t.ready}</span>
          <span id="charCount">0 <span data-i18n="characters">${t.characters}</span></span>
        </div>
      </div>
    `;

    // Initialize Lucide icons
    initializeLucideIcons();

    this.updateLanguage();
  }

  render() {
    this.renderInitial();
  }

  updateLanguage() {
    const t = this.translations[this.currentLanguage];

    // Update all elements with data-i18n attributes
    this.container.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (t[key]) {
        element.textContent = t[key];
      }
    });

    // Update title attributes
    this.container.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (t[key]) {
        element.title = t[key];
      }
    });

    // Update character count text
    const charCountElement = document.getElementById('charCount');
    if (charCountElement && this.monacoEditor) {
      const count = this.monacoEditor.getValue().length;
      charCountElement.innerHTML = `${count} <span data-i18n="characters">${t.characters}</span>`;
    }

    // Update Monaco Editor placeholder value if it's still the default
    if (this.monacoEditor) {
      const currentValue = this.monacoEditor.getValue();
      const oldExampleEN = '<?xml version="1.0" encoding="UTF-8"?>\n<example>paste your XML here</example>';
      const oldExampleZH = '<?xml version="1.0" encoding="UTF-8"?>\n<example>請在此處貼上您的 XML</example>';

      if (currentValue === oldExampleEN || currentValue === oldExampleZH) {
        this.monacoEditor.setValue(t.exampleXML);
      }
    }
  }

  attachEvents() {
    const formatBtn = document.getElementById('formatBtn');
    const compactBtn = document.getElementById('compactBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    formatBtn?.addEventListener('click', () => this.formatXML());
    compactBtn?.addEventListener('click', () => this.compactXML());
    copyBtn?.addEventListener('click', () => this.copyToClipboard());
    clearBtn?.addEventListener('click', () => this.clearEditor());
  }

  async loadMonacoEditor() {
    try {
      await MonacoLoader.load();

      const container = document.getElementById('xmlEditor');
      if (!container) {
        console.error('Monaco editor container not found');
        return;
      }

      const t = this.translations[this.currentLanguage];

      this.monacoEditor = MonacoLoader.createEditor(container, {
        value: t.exampleXML,
        language: 'xml',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        folding: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        formatOnPaste: false,
        formatOnType: false,
      });

      // Listen to editor changes for character count
      this.monacoEditor.onDidChangeModelContent(() => {
        this.updateCharCount();
      });

      // Add keyboard shortcuts
      this.monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.formatXML();
      });

      this.monacoEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        () => {
          this.compactXML();
        }
      );

      // Register XML formatting provider
      this.registerXMLFormattingProvider();

      // Initial character count
      this.updateCharCount();

      console.log('Monaco Editor initialized successfully for XML Formatter');
    } catch (error) {
      console.error('Failed to load Monaco Editor:', error);
      this.createFallbackEditor();
    }
  }

  createFallbackEditor() {
    const container = document.getElementById('xmlEditor');
    if (container) {
      const t = this.translations[this.currentLanguage];
      this.monacoEditor = MonacoLoader.createFallbackEditor(container, {
        value: t.exampleXML,
        readOnly: false,
      });

      if (this.monacoEditor) {
        this.monacoEditor.isFallback = true;
        // Add change listener for fallback editor
        const textarea = container.querySelector('textarea');
        if (textarea) {
          textarea.addEventListener('input', () => this.updateCharCount());
        }
      }

      this.updateCharCount();
    }
  }

  formatXML() {
    if (!this.monacoEditor) return;

    try {
      const value = this.monacoEditor.getValue();
      const validation = this.validateXML(value);

      if (!validation.valid) {
        this.setStatus(`${this.translations[this.currentLanguage].invalidXML}: ${validation.error}`, 'error');
        return;
      }

      const formatted = this.doFormatXML(value);
      this.monacoEditor.setValue(formatted);
      this.setStatus(this.translations[this.currentLanguage].formatted, 'success');
    } catch (e) {
      this.setStatus(`${this.translations[this.currentLanguage].error}: ${e.message}`, 'error');
    }
  }

  compactXML() {
    if (!this.monacoEditor) return;

    try {
      const value = this.monacoEditor.getValue();
      const validation = this.validateXML(value);

      if (!validation.valid) {
        this.setStatus(`${this.translations[this.currentLanguage].invalidXML}: ${validation.error}`, 'error');
        return;
      }

      const compacted = this.doCompactXML(value);
      this.monacoEditor.setValue(compacted);
      this.setStatus(this.translations[this.currentLanguage].compacted, 'success');
    } catch (e) {
      this.setStatus(`${this.translations[this.currentLanguage].error}: ${e.message}`, 'error');
    }
  }

  async copyToClipboard() {
    if (!this.monacoEditor) return;

    try {
      const value = this.monacoEditor.getValue();
      await navigator.clipboard.writeText(value);
      this.setStatus(this.translations[this.currentLanguage].copied, 'success');
    } catch (e) {
      this.setStatus(this.translations[this.currentLanguage].failedToCopy, 'error');
    }
  }

  clearEditor() {
    if (!this.monacoEditor) return;

    this.monacoEditor.setValue('');
    this.setStatus(this.translations[this.currentLanguage].cleared, 'success');
  }

  doFormatXML(xml) {
    const PADDING = '  ';
    let formatted = '';
    let indent = '';
    let insideCDATA = false;
    let preserveWhitespace = false;

    // Normalize line endings and handle mixed content
    xml = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into meaningful segments, preserving CDATA and comments
    const segments = this.parseXMLSegments(xml);

    segments.forEach((segment, index) => {
      const { type, content, preserveSpace } = segment;

      switch (type) {
        case 'declaration':
        case 'doctype':
          // XML declarations and DOCTYPE
          formatted += content + '\n';
          break;

        case 'comment':
          // Preserve comment formatting
          if (content.includes('\n')) {
            // Multi-line comment
            const lines = content.split('\n');
            formatted += indent + lines[0] + '\n';
            lines.slice(1, -1).forEach(line => {
              formatted += indent + line.trim() + '\n';
            });
            formatted += indent + lines[lines.length - 1] + '\n';
          } else {
            // Single-line comment
            formatted += indent + content + '\n';
          }
          break;

        case 'cdata':
          // Preserve CDATA content exactly
          formatted += indent + content + '\n';
          break;

        case 'opening-tag':
          formatted += indent + content;
          if (!this.isSelfClosing(content)) {
            indent += PADDING;
            // Check if next segment is text content
            const nextSegment = segments[index + 1];
            if (nextSegment && nextSegment.type === 'text' && !nextSegment.content.includes('\n')) {
              // Inline text content
              formatted += nextSegment.content;
              // Skip the next text segment
              segments[index + 1].processed = true;
            } else {
              formatted += '\n';
            }
          } else {
            formatted += '\n';
          }
          break;

        case 'closing-tag':
          if (indent.length >= PADDING.length) {
            indent = indent.substring(PADDING.length);
          }
          formatted += indent + content + '\n';
          break;

        case 'self-closing-tag':
          formatted += indent + content + '\n';
          break;

        case 'text':
          if (!segment.processed) {
            const trimmedContent = content.trim();
            if (trimmedContent) {
              if (preserveSpace) {
                // Preserve whitespace as specified
                formatted += content;
              } else {
                // Normalize whitespace
                formatted += trimmedContent;
              }
              if (!content.endsWith('\n') && index < segments.length - 1) {
                const nextSegment = segments[index + 1];
                if (nextSegment && nextSegment.type === 'closing-tag') {
                  // Text followed by closing tag - don't add newline
                } else {
                  formatted += '\n';
                }
              }
            }
          }
          break;
      }
    });

    return formatted.trim();
  }

  parseXMLSegments(xml) {
    const segments = [];
    let current = 0;
    let insideCDATA = false;

    while (current < xml.length) {
      if (insideCDATA) {
        // Inside CDATA - look for ]]>
        const cdataEnd = xml.indexOf(']]>', current);
        if (cdataEnd !== -1) {
          const content = xml.substring(current - 9, cdataEnd + 3); // Include <![CDATA[ and ]]>
          segments.push({ type: 'cdata', content, preserveSpace: true });
          current = cdataEnd + 3;
          insideCDATA = false;
        } else {
          // Malformed CDATA
          segments.push({ type: 'text', content: xml.substring(current) });
          break;
        }
      } else {
        const nextTag = xml.indexOf('<', current);

        if (nextTag === -1) {
          // Remaining text
          const content = xml.substring(current);
          if (content.trim()) {
            segments.push({ type: 'text', content });
          }
          break;
        }

        // Text before next tag
        if (nextTag > current) {
          const textContent = xml.substring(current, nextTag);
          if (textContent.trim()) {
            segments.push({ type: 'text', content: textContent });
          }
        }

        // Find end of tag
        let tagEnd = this.findTagEnd(xml, nextTag);
        const tagContent = xml.substring(nextTag, tagEnd + 1);

        // Determine tag type
        if (tagContent.startsWith('<?')) {
          segments.push({ type: 'declaration', content: tagContent });
        } else if (tagContent.startsWith('<!DOCTYPE')) {
          segments.push({ type: 'doctype', content: tagContent });
        } else if (tagContent.startsWith('<!--')) {
          segments.push({ type: 'comment', content: tagContent });
        } else if (tagContent.startsWith('<![CDATA[')) {
          insideCDATA = true;
          current = nextTag + 9; // Skip <![CDATA[
          continue;
        } else if (tagContent.startsWith('</')) {
          segments.push({ type: 'closing-tag', content: tagContent });
        } else if (tagContent.endsWith('/>') || this.isSelfClosing(tagContent)) {
          segments.push({ type: 'self-closing-tag', content: tagContent });
        } else {
          segments.push({
            type: 'opening-tag',
            content: tagContent,
            preserveSpace: this.hasPreserveSpace(tagContent)
          });
        }

        current = tagEnd + 1;
      }
    }

    return segments;
  }

  findTagEnd(xml, start) {
    let pos = start + 1;
    let inString = false;
    let stringChar = '';
    let inComment = false;

    // Handle comments
    if (xml.substring(start, start + 4) === '<!--') {
      const commentEnd = xml.indexOf('-->', start + 4);
      return commentEnd === -1 ? xml.length - 1 : commentEnd + 2;
    }

    // Handle CDATA
    if (xml.substring(start, start + 9) === '<![CDATA[') {
      const cdataEnd = xml.indexOf(']]>', start + 9);
      return cdataEnd === -1 ? xml.length - 1 : cdataEnd + 2;
    }

    while (pos < xml.length) {
      const char = xml[pos];

      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '>') {
          return pos;
        }
      } else {
        if (char === stringChar && xml[pos - 1] !== '\\') {
          inString = false;
          stringChar = '';
        }
      }

      pos++;
    }

    return xml.length - 1;
  }

  isSelfClosing(tag) {
    return tag.endsWith('/>') || /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(tag);
  }

  hasPreserveSpace(tag) {
    return /xml:space\s*=\s*["']preserve["']/i.test(tag);
  }

  doCompactXML(xml) {
    // Parse segments to preserve CDATA and special content
    const segments = this.parseXMLSegments(xml);
    let compacted = '';

    segments.forEach((segment, index) => {
      const { type, content } = segment;

      switch (type) {
        case 'declaration':
        case 'doctype':
          // Keep declarations and DOCTYPE as-is but remove extra whitespace
          compacted += content.replace(/\s+/g, ' ').replace(/\s+>/g, '>');
          break;

        case 'comment':
          // Remove comments completely in compact mode for aggressive minification
          // If you want to preserve comments, uncomment the next line:
          // compacted += content.replace(/\s+/g, ' ');
          break;

        case 'cdata':
          // Preserve CDATA content exactly
          compacted += content;
          break;

        case 'opening-tag':
        case 'closing-tag':
        case 'self-closing-tag':
          // Aggressive whitespace removal in tags
          let cleanTag = content
            .replace(/\s+/g, ' ')           // Multiple spaces to single space
            .replace(/\s*=\s*/g, '=')       // Remove spaces around =
            .replace(/\s+>/g, '>')          // Remove space before >
            .replace(/\s+\/>/g, '/>')       // Remove space before />
            .replace(/(<[^>]*)\s+([^>]*>)/g, '$1 $2') // Normalize attribute spacing
            .trim();

          // Remove unnecessary spaces in attributes
          cleanTag = cleanTag.replace(/([a-zA-Z0-9_-]+)\s*=\s*(['"][^'"]*['"])/g, '$1=$2');

          compacted += cleanTag;
          break;

        case 'text':
          // Aggressive text content minification
          const trimmedText = content.trim();
          if (trimmedText) {
            // Check if this text is between tags that should preserve space
            const previousSegment = segments[index - 1];
            const nextSegment = segments[index + 1];

            if (previousSegment && this.hasPreserveSpace(previousSegment.content)) {
              // Preserve whitespace if parent element has xml:space="preserve"
              compacted += content;
            } else {
              // Normalize all whitespace to single spaces and remove leading/trailing
              const normalizedText = trimmedText.replace(/\s+/g, ' ');
              compacted += normalizedText;
            }
          }
          break;
      }
    });

    // Final cleanup passes
    return compacted
      .replace(/>\s+</g, '><')           // Remove whitespace between tags
      .replace(/\s*\n\s*/g, '')          // Remove all line breaks and surrounding whitespace
      .replace(/\s+/g, ' ')              // Collapse multiple spaces
      .replace(/>\s+/g, '>')             // Remove space after >
      .replace(/\s+</g, '<')             // Remove space before <
      .replace(/\s*\/\s*>/g, '/>')       // Clean up self-closing tags
      .trim();
  }

  // Enhanced helper method to check for xml:space preserve more thoroughly
  hasPreserveSpace(tagContent) {
    if (!tagContent || typeof tagContent !== 'string') return false;

    // Check for xml:space="preserve" in various formats
    return /xml:space\s*=\s*["']preserve["']/i.test(tagContent) ||
           /xml:space\s*=\s*preserve\b/i.test(tagContent);
  }

  registerXMLFormattingProvider() {
    if (!window.monaco || !window.monaco.languages) {
      console.warn('Monaco Editor languages API not available');
      return;
    }

    try {
      // Register document formatting provider for XML
      window.monaco.languages.registerDocumentFormattingEditProvider('xml', {
        provideDocumentFormattingEdits: (model, options) => {
          try {
            const unformattedXML = model.getValue();
            const validation = this.validateXML(unformattedXML);

            if (!validation.valid) {
              // Return empty array if XML is invalid
              console.warn('XML validation failed:', validation.error);
              return [];
            }

            const formattedXML = this.doFormatXML(unformattedXML);

            // Return a single edit that replaces the entire content
            return [{
              range: model.getFullModelRange(),
              text: formattedXML
            }];
          } catch (error) {
            console.error('Error during XML formatting:', error);
            return [];
          }
        }
      });

      // Register document range formatting provider for XML (for partial selections)
      window.monaco.languages.registerDocumentRangeFormattingEditProvider('xml', {
        provideDocumentRangeFormattingEdits: (model, range, options) => {
          try {
            // For range formatting, we'll format the selected text
            const selectedText = model.getValueInRange(range);
            const validation = this.validateXML(selectedText);

            if (!validation.valid) {
              // If selected text is not valid XML, try formatting the entire document
              const fullText = model.getValue();
              const fullValidation = this.validateXML(fullText);

              if (fullValidation.valid) {
                const formattedXML = this.doFormatXML(fullText);
                return [{
                  range: model.getFullModelRange(),
                  text: formattedXML
                }];
              }

              console.warn('XML validation failed for range:', validation.error);
              return [];
            }

            const formattedXML = this.doFormatXML(selectedText);

            return [{
              range: range,
              text: formattedXML
            }];
          } catch (error) {
            console.error('Error during XML range formatting:', error);
            return [];
          }
        }
      });

      // Register on-type formatting provider for basic XML formatting
      window.monaco.languages.registerOnTypeFormattingEditProvider('xml', {
        autoFormatTriggerCharacters: ['>'],
        provideOnTypeFormattingEdits: (model, position, ch, options) => {
          try {
            // Only auto-format on closing tags
            if (ch === '>') {
              const lineContent = model.getLineContent(position.lineNumber);
              const currentLine = lineContent.substring(0, position.column - 1);

              // Check if this is a closing tag
              if (currentLine.trim().endsWith('</') || currentLine.includes('</')) {
                // Simple indentation fix for the current line
                const indent = this.calculateIndentForLine(model, position.lineNumber);
                const trimmedLine = lineContent.trim();

                if (trimmedLine !== indent + trimmedLine.replace(/^\s*/, '')) {
                  return [{
                    range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
                    text: indent + trimmedLine
                  }];
                }
              }
            }

            return [];
          } catch (error) {
            console.error('Error during on-type formatting:', error);
            return [];
          }
        }
      });

      console.log('XML formatting providers registered successfully');
    } catch (error) {
      console.error('Failed to register XML formatting providers:', error);
    }
  }

  calculateIndentForLine(model, lineNumber) {
    // Simple indentation calculation based on opening/closing tags
    let indent = '';
    const PADDING = '  ';

    for (let i = 1; i < lineNumber; i++) {
      const line = model.getLineContent(i).trim();

      if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<!--') && !line.startsWith('<?')) {
        // Opening tag
        if (!line.endsWith('/>') && !this.isSelfClosing(line)) {
          indent += PADDING;
        }
      } else if (line.startsWith('</')) {
        // Closing tag
        if (indent.length >= PADDING.length) {
          indent = indent.substring(PADDING.length);
        }
      }
    }

    return indent;
  }

  validateXML(xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        return { valid: false, error: parserError.textContent };
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  updateCharCount() {
    if (!this.monacoEditor) return;

    const text = this.monacoEditor.getValue();
    const t = this.translations[this.currentLanguage];
    const charCountElement = document.getElementById('charCount');

    if (charCountElement) {
      charCountElement.innerHTML = `${text.length} <span data-i18n="characters">${t.characters}</span>`;
    }
  }

  setStatus(message, type = '') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = type ? `status-${type}` : '';

    if (type) {
      setTimeout(() => {
        const t = this.translations[this.currentLanguage];
        statusElement.textContent = t.ready;
        statusElement.className = '';
      }, 2000);
    }
  }

  destroy() {
    // Clean up Monaco Editor
    if (this.monacoEditor) {
      MonacoLoader.disposeEditor(this.monacoEditor);
      this.monacoEditor = null;
    }

    // Remove event listeners
    window.removeEventListener("languageChanged", this.updateLanguage);
  }
}