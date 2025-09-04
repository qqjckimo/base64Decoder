// Image Compressor Worker with jSquash loading and progress tracking
console.log('🏭 [COMPRESSOR DEBUG] Compressor worker starting up...');

let jSquash = null;
let jSquashLoading = false;
let jSquashLoadError = null;

// Load jSquash libraries with progress tracking
async function loadJSquashWithProgress() {
  if (jSquash || jSquashLoadError) return jSquash;
  if (jSquashLoading) {
    // Wait for current loading to complete
    while (jSquashLoading && !jSquash && !jSquashLoadError) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return jSquash;
  }
  
  jSquashLoading = true;
  console.log('🏭 [COMPRESSOR DEBUG] Starting to load jSquash libraries from CDN...');
  
  try {
    // Method 1: Try importScripts first
    console.log('🏭 [COMPRESSOR DEBUG] Attempting to load via importScripts...');
    importScripts('https://cdn.skypack.dev/@jsquash/png');
    importScripts('https://cdn.skypack.dev/@jsquash/webp');
    importScripts('https://cdn.skypack.dev/@jsquash/avif');
    
    jSquash = {
      png: self.png || self,
      webp: self.webp || self,
      avif: self.avif || self
    };
    
    console.log('🏭 [COMPRESSOR DEBUG] ✅ jSquash loaded successfully via importScripts');
    jSquashLoading = false;
    return jSquash;
  } catch (importError) {
    console.warn('🏭 [COMPRESSOR DEBUG] importScripts failed:', importError.message);
    
    try {
      // Method 2: Try dynamic import as fallback
      console.log('🏭 [COMPRESSOR DEBUG] Attempting to load via dynamic import...');
      const pngModule = await import('https://cdn.skypack.dev/@jsquash/png');
      const webpModule = await import('https://cdn.skypack.dev/@jsquash/webp');
      const avifModule = await import('https://cdn.skypack.dev/@jsquash/avif');
      
      jSquash = {
        png: pngModule,
        webp: webpModule,
        avif: avifModule
      };
      
      console.log('🏭 [COMPRESSOR DEBUG] ✅ jSquash loaded successfully via dynamic import');
      jSquashLoading = false;
      return jSquash;
    } catch (dynamicError) {
      console.error('🏭 [COMPRESSOR DEBUG] ❌ Failed to load jSquash libraries:', dynamicError);
      jSquashLoadError = dynamicError;
      jSquashLoading = false;
      return null;
    }
  }
}

// Fallback compression simulation
function simulateCompression(originalSize, format, quality) {
  const ratios = {
    png: 0.8 + (quality / 100) * 0.2,  // PNG: 80-100%
    webp: 0.3 + (quality / 100) * 0.4, // WebP: 30-70%
    avif: 0.2 + (quality / 100) * 0.3  // AVIF: 20-50%
  };
  
  const ratio = ratios[format] || 0.7;
  const compressedSize = Math.round(originalSize * ratio);
  const processingTime = 50 + Math.random() * 150;
  
  return {
    format,
    size: compressedSize,
    compressionTime: Math.round(processingTime),
    quality,
    success: true
  };
}

console.log('🏭 [COMPRESSOR DEBUG] Worker initialized, ready to load jSquash on demand');

self.onmessage = async function(e) {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'compress':
        await compressImage(data, id);
        break;
      case 'getSupportedFormats':
        getSupportedFormats(id);
        break;
      default:
        postMessage({
          type: 'error',
          id,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error.message
    });
  }
};

async function compressImage(imageData, id) {
  console.log('🏭 [COMPRESSOR DEBUG] Starting image compression:', imageData);
  const { file, quality = 75, formats = ['png', 'webp', 'avif'] } = imageData;
  
  try {
    // Show loading progress
    postMessage({
      type: 'progress',
      id,
      step: 'loading',
      progress: 5
    });
    
    // Try to load jSquash libraries
    console.log('🏭 [COMPRESSOR DEBUG] Attempting to load jSquash libraries...');
    const jSquashLib = await loadJSquashWithProgress();
    
    postMessage({
      type: 'progress',
      id,
      step: 'preparing',
      progress: 15
    });
    
    if (jSquashLib) {
      console.log('🏭 [COMPRESSOR DEBUG] Using real jSquash compression...');
      // Real compression logic would go here...
      // For now, simulate since the actual implementation needs more setup
    } else {
      console.log('🏭 [COMPRESSOR DEBUG] Using fallback simulation...');
    }
    
    // 讀取原始圖片為 ImageData
    const imageBuffer = await file.arrayBuffer();
    const imageBitmap = await createImageBitmap(new Blob([imageBuffer]));
    
    // 建立 Canvas 獲取 ImageData
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    const imageDataObj = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
    
    postMessage({
      type: 'progress',
      id,
      step: 'preparing',
      progress: 15
    });
    
    const results = [];
    const totalFormats = formats.length;
    
    // 按優先順序壓縮：PNG > WebP > AVIF
    const orderedFormats = ['png', 'webp', 'avif'].filter(format => formats.includes(format));
    
    for (let i = 0; i < orderedFormats.length; i++) {
      const format = orderedFormats[i];
      const startTime = Date.now();
      
      postMessage({
        type: 'progress',
        id,
        step: `compressing_${format}`,
        progress: 15 + (i / totalFormats) * 70,
        format
      });
      
      try {
        let compressedBuffer;
        
        switch (format) {
          case 'png':
            compressedBuffer = await jSquash.png.encode(imageDataObj, {
              quality: quality / 100
            });
            break;
          case 'webp':
            compressedBuffer = await jSquash.webp.encode(imageDataObj, {
              quality
            });
            break;
          case 'avif':
            compressedBuffer = await jSquash.avif.encode(imageDataObj, {
              quality
            });
            break;
        }
        
        const compressionTime = Date.now() - startTime;
        
        results.push({
          format,
          size: compressedBuffer.byteLength,
          compressionTime,
          quality,
          success: true
        });
        
        // 即時回報單一格式結果
        postMessage({
          type: 'formatComplete',
          id,
          format,
          result: {
            format,
            size: compressedBuffer.byteLength,
            compressionTime,
            quality,
            success: true
          }
        });
        
      } catch (formatError) {
        console.warn(`Failed to compress as ${format}:`, formatError);
        results.push({
          format,
          error: formatError.message,
          success: false
        });
        
        postMessage({
          type: 'formatComplete',
          id,
          format,
          result: {
            format,
            error: formatError.message,
            success: false
          }
        });
      }
    }
    
    postMessage({
      type: 'compressed',
      id,
      results
    });
    
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: `Compression failed: ${error.message}`
    });
  }
}

function getSupportedFormats(id) {
  // jSquash 支援的格式
  const supportedFormats = ['png', 'webp', 'avif'];
  
  postMessage({
    type: 'supportedFormats',
    id,
    formats: supportedFormats
  });
}

// 輔助函數：格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 輔助函數：格式化時間
function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

// 錯誤處理
self.onerror = function(error) {
  postMessage({
    type: 'error',
    error: error.message
  });
};

self.onunhandledrejection = function(event) {
  postMessage({
    type: 'error',
    error: event.reason
  });
};