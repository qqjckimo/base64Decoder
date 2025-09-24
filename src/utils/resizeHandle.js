/**
 * Reusable drag-to-resize functionality for Monaco Editor containers
 * Provides vertical resizing capability for editor areas
 */
export class ResizeHandle {
  constructor(options = {}) {
    this.options = {
      minHeight: 200,
      maxHeight: 800,
      handleHeight: 8,
      cursor: 'ns-resize',
      ...options,
    };

    this.isResizing = false;
    this.startY = 0;
    this.startHeight = 0;
    this.handle = null;
    this.targetElement = null;

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Initialize resize handle for a target element
   * @param {HTMLElement} targetElement - The element to make resizable
   * @param {HTMLElement} insertAfter - Element to insert the handle after
   */
  init(targetElement, insertAfter) {
    if (!targetElement) {
      console.warn('ResizeHandle: Target element is required');
      return;
    }

    this.targetElement = targetElement;
    this.createHandle();

    if (insertAfter && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(this.handle, insertAfter.nextSibling);
    } else if (targetElement.parentNode) {
      targetElement.parentNode.insertBefore(this.handle, targetElement.nextSibling);
    }

    this.attachEvents();
  }

  /**
   * Create the resize handle element
   */
  createHandle() {
    this.handle = document.createElement('div');
    this.handle.className = 'resize-handle';
    this.handle.setAttribute('tabindex', '0');
    this.handle.setAttribute('role', 'separator');
    this.handle.setAttribute('aria-label', 'Resize editor');
    this.handle.setAttribute('aria-orientation', 'horizontal');

    // Add visual indicator
    const grip = document.createElement('div');
    grip.className = 'resize-grip';
    grip.innerHTML = '⋯'; // Three dots as grip indicator
    this.handle.appendChild(grip);

    // Add styles
    this.applyStyles();
  }

  /**
   * Apply CSS styles to the handle
   */
  applyStyles() {
    const styles = `
      .resize-handle {
        height: ${this.options.handleHeight}px;
        background: var(--bg-secondary, #f5f5f5);
        border-top: 1px solid var(--border-color, #e0e0e0);
        border-bottom: 1px solid var(--border-color, #e0e0e0);
        cursor: ${this.options.cursor};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
        user-select: none;
        position: relative;
      }

      .resize-handle:hover,
      .resize-handle:focus {
        background: var(--primary-hover, #e8e8e8);
        outline: none;
      }

      .resize-handle:focus {
        box-shadow: inset 0 0 0 2px var(--primary, #333333);
      }

      .resize-handle.resizing {
        background: var(--primary, #333333);
      }

      .resize-grip {
        font-size: 14px;
        color: var(--text-secondary, #666666);
        font-weight: bold;
        pointer-events: none;
        transform: rotate(90deg);
        line-height: 1;
      }

      .resize-handle:hover .resize-grip,
      .resize-handle:focus .resize-grip {
        color: var(--text-primary, #333333);
      }

      .resize-handle.resizing .resize-grip {
        color: #ffffff;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .resize-handle {
          height: ${Math.max(this.options.handleHeight, 12)}px;
          touch-action: none;
        }
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .resize-handle {
          transition: none;
        }
      }
    `;

    // Add styles to document if not already present
    if (!document.querySelector('#resize-handle-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'resize-handle-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    this.handle.addEventListener('mousedown', this.handleMouseDown);
    this.handle.addEventListener('keydown', this.handleKeyDown);

    // Touch events for mobile support
    this.handle.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
  }

  /**
   * Remove event listeners
   */
  detachEvents() {
    if (this.handle) {
      this.handle.removeEventListener('mousedown', this.handleMouseDown);
      this.handle.removeEventListener('keydown', this.handleKeyDown);
      this.handle.removeEventListener('touchstart', this.handleTouchStart);
    }

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * Handle mouse down on resize handle
   */
  handleMouseDown(e) {
    e.preventDefault();
    this.startResize(e.clientY);
  }

  /**
   * Handle touch start on resize handle
   */
  handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.startResize(e.touches[0].clientY);
    }
  }

  /**
   * Start resize operation
   */
  startResize(clientY) {
    this.isResizing = true;
    this.startY = clientY;
    this.startHeight = this.targetElement.offsetHeight;

    this.handle.classList.add('resizing');
    document.body.style.cursor = this.options.cursor;
    document.body.style.userSelect = 'none';

    // Add document-level event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Fire resize start event
    this.targetElement.dispatchEvent(new CustomEvent('resizeStart', {
      detail: { height: this.startHeight }
    }));
  }

  /**
   * Handle mouse move during resize
   */
  handleMouseMove(e) {
    if (!this.isResizing) return;
    e.preventDefault();
    this.performResize(e.clientY);
  }

  /**
   * Handle touch move during resize
   */
  handleTouchMove(e) {
    if (!this.isResizing || e.touches.length !== 1) return;
    e.preventDefault();
    this.performResize(e.touches[0].clientY);
  }

  /**
   * Perform the actual resize
   */
  performResize(clientY) {
    const deltaY = clientY - this.startY;
    const newHeight = Math.max(
      this.options.minHeight,
      Math.min(this.options.maxHeight, this.startHeight + deltaY)
    );

    this.targetElement.style.height = newHeight + 'px';

    // Fire resize event
    this.targetElement.dispatchEvent(new CustomEvent('resize', {
      detail: { height: newHeight, deltaY }
    }));
  }

  /**
   * Handle mouse up to end resize
   */
  handleMouseUp(e) {
    if (!this.isResizing) return;
    this.endResize();
  }

  /**
   * Handle touch end to end resize
   */
  handleTouchEnd(e) {
    if (!this.isResizing) return;
    this.endResize();
  }

  /**
   * End resize operation
   */
  endResize() {
    this.isResizing = false;

    this.handle.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Remove document-level event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);

    // Fire resize end event
    this.targetElement.dispatchEvent(new CustomEvent('resizeEnd', {
      detail: { height: this.targetElement.offsetHeight }
    }));
  }

  /**
   * Handle keyboard navigation for accessibility
   */
  handleKeyDown(e) {
    const currentHeight = this.targetElement.offsetHeight;
    let newHeight = currentHeight;
    const step = 10; // 10px increments

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newHeight = Math.max(this.options.minHeight, currentHeight - step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newHeight = Math.min(this.options.maxHeight, currentHeight + step);
        break;
      case 'Home':
        e.preventDefault();
        newHeight = this.options.minHeight;
        break;
      case 'End':
        e.preventDefault();
        newHeight = this.options.maxHeight;
        break;
      default:
        return;
    }

    if (newHeight !== currentHeight) {
      this.targetElement.style.height = newHeight + 'px';

      // Fire resize event
      this.targetElement.dispatchEvent(new CustomEvent('resize', {
        detail: { height: newHeight, deltaY: newHeight - currentHeight }
      }));
    }
  }

  /**
   * Update resize constraints
   */
  setConstraints(minHeight, maxHeight) {
    this.options.minHeight = minHeight;
    this.options.maxHeight = maxHeight;
  }

  /**
   * Destroy the resize handle
   */
  destroy() {
    this.detachEvents();

    if (this.handle && this.handle.parentNode) {
      this.handle.parentNode.removeChild(this.handle);
    }

    this.handle = null;
    this.targetElement = null;
  }
}

/**
 * Factory function to create and initialize a resize handle
 * @param {HTMLElement} targetElement - Element to make resizable
 * @param {HTMLElement} insertAfter - Element to insert handle after
 * @param {Object} options - Configuration options
 * @returns {ResizeHandle} - The resize handle instance
 */
export function createResizeHandle(targetElement, insertAfter, options = {}) {
  const resizeHandle = new ResizeHandle(options);
  resizeHandle.init(targetElement, insertAfter);
  return resizeHandle;
}