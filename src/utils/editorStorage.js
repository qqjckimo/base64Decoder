// Editor Storage Utility - Centralized localStorage management for editor-based tools
// Bundle Impact: ~1.8KB minified + gzipped
// Pattern: Singleton static class (matches MonacoLoader pattern)

export class EditorStorage {
  static STORAGE_PREFIX = 'editor-tool-';
  static STORAGE_VERSION = '1.0';
  static MAX_SIZE = 5 * 1024 * 1024; // 5MB limit per tool
  static isAvailable = null; // Cache availability check

  /**
   * Check if localStorage is available (handles private browsing mode)
   * @returns {boolean}
   */
  static checkAvailability() {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.isAvailable = true;
      return true;
    } catch (error) {
      console.warn('localStorage not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Generate namespaced storage key
   * @param {string} toolId - Tool identifier (e.g., 'json-formatter')
   * @returns {string}
   */
  static getKey(toolId) {
    return `${this.STORAGE_PREFIX}${toolId}`;
  }

  /**
   * Save content to localStorage
   * @param {string} toolId - Tool identifier
   * @param {string} content - Content to save
   * @param {Object} options - Optional settings
   * @returns {boolean} Success status
   */
  static save(toolId, content, options = {}) {
    if (!this.checkAvailability()) {
      return false;
    }

    try {
      const key = this.getKey(toolId);

      // Check size limit
      const size = new Blob([content]).size;
      if (size > this.MAX_SIZE) {
        console.warn(`Content size (${size} bytes) exceeds limit (${this.MAX_SIZE} bytes)`);
        return false;
      }

      // Create storage object with metadata
      const storageObject = {
        version: this.STORAGE_VERSION,
        timestamp: Date.now(),
        size: size,
        content: content,
        ...options
      };

      localStorage.setItem(key, JSON.stringify(storageObject));

      // Emit custom event for monitoring (optional)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('editorContentSaved', {
          detail: { toolId, size, timestamp: storageObject.timestamp }
        }));
      }

      return true;
    } catch (error) {
      // Handle quota exceeded or other errors
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded for', toolId);
      } else {
        console.warn('Failed to save to localStorage:', error.message);
      }
      return false;
    }
  }

  /**
   * Load content from localStorage
   * @param {string} toolId - Tool identifier
   * @returns {string|null} Saved content or null
   */
  static load(toolId) {
    if (!this.checkAvailability()) {
      return null;
    }

    try {
      const key = this.getKey(toolId);
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const storageObject = JSON.parse(stored);

      // Version compatibility check (for future migrations)
      if (storageObject.version !== this.STORAGE_VERSION) {
        console.warn(`Storage version mismatch for ${toolId}: ${storageObject.version} vs ${this.STORAGE_VERSION}`);
        // Could implement migration logic here
      }

      // Emit custom event for monitoring (optional)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('editorContentLoaded', {
          detail: {
            toolId,
            size: storageObject.size,
            timestamp: storageObject.timestamp
          }
        }));
      }

      return storageObject.content || null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error.message);
      return null;
    }
  }

  /**
   * Clear content for a specific tool
   * @param {string} toolId - Tool identifier
   * @returns {boolean} Success status
   */
  static clear(toolId) {
    if (!this.checkAvailability()) {
      return false;
    }

    try {
      const key = this.getKey(toolId);
      localStorage.removeItem(key);

      // Emit custom event for monitoring (optional)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('editorContentCleared', {
          detail: { toolId, timestamp: Date.now() }
        }));
      }

      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error.message);
      return false;
    }
  }

  /**
   * Check if content exists for a tool
   * @param {string} toolId - Tool identifier
   * @returns {boolean}
   */
  static exists(toolId) {
    if (!this.checkAvailability()) {
      return false;
    }

    try {
      const key = this.getKey(toolId);
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage metadata for a tool
   * @param {string} toolId - Tool identifier
   * @returns {Object|null} Metadata or null
   */
  static getMetadata(toolId) {
    if (!this.checkAvailability()) {
      return null;
    }

    try {
      const key = this.getKey(toolId);
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const storageObject = JSON.parse(stored);

      // Return metadata without content
      return {
        version: storageObject.version,
        timestamp: storageObject.timestamp,
        size: storageObject.size,
        age: Date.now() - storageObject.timestamp
      };
    } catch (error) {
      console.warn('Failed to get metadata:', error.message);
      return null;
    }
  }

  /**
   * Get size of stored content in bytes
   * @param {string} toolId - Tool identifier
   * @returns {number} Size in bytes, or 0 if not found
   */
  static getSize(toolId) {
    const metadata = this.getMetadata(toolId);
    return metadata ? metadata.size : 0;
  }

  /**
   * Clear all editor tool storage
   * @returns {number} Number of items cleared
   */
  static clearAll() {
    if (!this.checkAvailability()) {
      return 0;
    }

    try {
      let cleared = 0;
      const keys = [];

      // Collect keys first to avoid modification during iteration
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keys.push(key);
        }
      }

      // Remove collected keys
      keys.forEach(key => {
        localStorage.removeItem(key);
        cleared++;
      });

      console.log(`Cleared ${cleared} editor storage items`);
      return cleared;
    } catch (error) {
      console.warn('Failed to clear all storage:', error.message);
      return 0;
    }
  }

  /**
   * Get statistics about all editor storage
   * @returns {Object} Storage statistics
   */
  static getStats() {
    if (!this.checkAvailability()) {
      return {
        available: false,
        tools: [],
        totalSize: 0,
        count: 0
      };
    }

    try {
      const tools = [];
      let totalSize = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          const toolId = key.substring(this.STORAGE_PREFIX.length);
          const metadata = this.getMetadata(toolId);

          if (metadata) {
            tools.push({
              toolId,
              ...metadata
            });
            totalSize += metadata.size;
          }
        }
      }

      return {
        available: true,
        tools,
        totalSize,
        count: tools.length,
        maxSize: this.MAX_SIZE
      };
    } catch (error) {
      console.warn('Failed to get storage stats:', error.message);
      return {
        available: true,
        tools: [],
        totalSize: 0,
        count: 0,
        error: error.message
      };
    }
  }
}
