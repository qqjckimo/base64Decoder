require.config({
  paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' },
});

require(['vs/editor/editor.main'], function () {
  // Initialize Monaco Editor
  const editor = monaco.editor.create(document.getElementById('editor'), {
    value:
      '<?xml version="1.0" encoding="UTF-8"?>\n<example>paste your XML here</example>',
    language: 'xml',
    theme: 'vs',
    minimap: { enabled: false },
    fontSize: 14,
    folding: true,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    formatOnPaste: false,
    formatOnType: false,
  });

  // DOM elements
  const formatBtn = document.getElementById('formatBtn');
  const compactBtn = document.getElementById('compactBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');
  const charCount = document.getElementById('charCount');

  // XML Formatter
  function formatXML(xml) {
    const PADDING = '  ';
    let formatted = '';
    let indent = '';

    // Remove existing formatting
    xml = xml.replace(/>\s*</g, '><').trim();

    // Split into tokens
    const tokens = xml.split(/(?=<)|(?<=>)/g).filter((t) => t);

    tokens.forEach((token) => {
      if (token.startsWith('<?') || token.startsWith('<!')) {
        // Declaration or DOCTYPE
        formatted += token + '\n';
      } else if (token.startsWith('</')) {
        // Closing tag
        indent = indent.substring(PADDING.length);
        formatted += indent + token + '\n';
      } else if (token.startsWith('<') && !token.includes('/>')) {
        // Opening tag
        formatted += indent + token;
        if (!token.includes('</')) {
          indent += PADDING;
          formatted += '\n';
        }
      } else if (token.startsWith('<') && token.includes('/>')) {
        // Self-closing tag
        formatted += indent + token + '\n';
      } else if (token.trim()) {
        // Text content
        formatted += token;
      }
    });

    return formatted.trim();
  }

  // XML Compactor
  function compactXML(xml) {
    return xml
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .replace(/\s*(?=\/>)/g, '')
      .trim();
  }

  // Validate XML
  function validateXML(xml) {
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

  // Update character count
  function updateCharCount() {
    const text = editor.getValue();
    charCount.textContent = `${text.length} characters`;
  }

  // Set status message
  function setStatus(message, type = '') {
    status.textContent = message;
    status.className = type ? `status-${type}` : '';
    if (type) {
      setTimeout(() => {
        status.textContent = 'Ready';
        status.className = '';
      }, 2000);
    }
  }

  // Format XML
  formatBtn.addEventListener('click', () => {
    try {
      const value = editor.getValue();
      const validation = validateXML(value);
      if (!validation.valid) {
        setStatus(`Invalid XML: ${validation.error}`, 'error');
        return;
      }
      const formatted = formatXML(value);
      editor.setValue(formatted);
      setStatus('Formatted successfully', 'success');
    } catch (e) {
      setStatus(`Error: ${e.message}`, 'error');
    }
  });

  // Compact XML
  compactBtn.addEventListener('click', () => {
    try {
      const value = editor.getValue();
      const validation = validateXML(value);
      if (!validation.valid) {
        setStatus(`Invalid XML: ${validation.error}`, 'error');
        return;
      }
      const compacted = compactXML(value);
      editor.setValue(compacted);
      setStatus('Compacted successfully', 'success');
    } catch (e) {
      setStatus(`Error: ${e.message}`, 'error');
    }
  });

  // Copy to clipboard
  copyBtn.addEventListener('click', async () => {
    try {
      const value = editor.getValue();
      await navigator.clipboard.writeText(value);
      setStatus('Copied to clipboard', 'success');
    } catch (e) {
      setStatus('Failed to copy', 'error');
    }
  });

  // Clear editor
  clearBtn.addEventListener('click', () => {
    editor.setValue('');
    setStatus('Cleared', 'success');
  });

  // Listen to editor changes
  editor.onDidChangeModelContent(() => {
    updateCharCount();
  });

  // Initial character count
  updateCharCount();

  // Keyboard shortcuts
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    formatBtn.click();
  });

  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
    () => {
      compactBtn.click();
    }
  );
});
