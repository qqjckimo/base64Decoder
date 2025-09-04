// Base64 Encoder Worker with fflate loading and progress tracking
console.log('🏭 [WORKER DEBUG] Encoder worker starting up...');

let fflate = null;
let fflateLoading = false;
let fflateLoadError = null;

// Load fflate library with progress tracking
async function loadFflateWithProgress() {
  if (fflate || fflateLoadError) return fflate;
  if (fflateLoading) {
    // Wait for current loading to complete
    while (fflateLoading && !fflate && !fflateLoadError) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return fflate;
  }
  
  fflateLoading = true;
  console.log('🏭 [WORKER DEBUG] Starting to load fflate library from CDN...');
  
  try {
    // Method 1: Try importScripts first
    console.log('🏭 [WORKER DEBUG] Attempting to load via importScripts...');
    importScripts('https://cdn.skypack.dev/fflate');
    fflate = self.fflate || self;
    
    if (fflate && fflate.gzipSync) {
      console.log('🏭 [WORKER DEBUG] ✅ fflate loaded successfully via importScripts');
      fflateLoading = false;
      return fflate;
    }
    
    throw new Error('fflate functions not available after importScripts');
  } catch (importError) {
    console.warn('🏭 [WORKER DEBUG] importScripts failed:', importError.message);
    
    try {
      // Method 2: Try dynamic import as fallback
      console.log('🏭 [WORKER DEBUG] Attempting to load via dynamic import...');
      const module = await import('https://cdn.skypack.dev/fflate');
      fflate = module;
      console.log('🏭 [WORKER DEBUG] ✅ fflate loaded successfully via dynamic import');
      fflateLoading = false;
      return fflate;
    } catch (dynamicError) {
      console.error('🏭 [WORKER DEBUG] ❌ Failed to load fflate library:', dynamicError);
      fflateLoadError = dynamicError;
      fflateLoading = false;
      return null;
    }
  }
}

// Fallback gzip estimation
function estimateGzipSize(text) {
  const baseEstimate = text.length * 0.7;
  const uniqueChars = new Set(text).size;
  const compressionRatio = Math.max(0.5, Math.min(0.9, uniqueChars / 64));
  return Math.round(baseEstimate * compressionRatio);
}

console.log('🏭 [WORKER DEBUG] Worker initialized, ready to load fflate on demand');

// Helper function to convert ArrayBuffer to base64 data URL
function arrayBufferToBase64DataUrl(arrayBuffer, mimeType) {
  return new Promise((resolve, reject) => {
    try {
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 string
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64String = btoa(binaryString);
      
      // Create data URL
      const dataUrl = `data:${mimeType};base64,${base64String}`;
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

self.onmessage = async function(e) {
  console.log('🏭 [WORKER DEBUG] Message received in encoder worker:', e.data);
  const { type, data, id } = e.data;
  
  try {
    console.log('🏭 [WORKER DEBUG] Processing message type:', type, 'with id:', id);
    switch (type) {
      case 'encode':
        console.log('🏭 [WORKER DEBUG] Starting encode process...');
        await encodeImage(data, id);
        break;
      case 'calculateGzip':
        console.log('🏭 [WORKER DEBUG] Starting gzip calculation...');
        calculateGzipSize(data, id);
        break;
      default:
        console.error('🏭 [WORKER DEBUG] Unknown message type:', type);
        postMessage({
          type: 'error',
          id,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    console.error('🏭 [WORKER DEBUG] Error in worker message handler:', error);
    postMessage({
      type: 'error',
      id,
      error: error.message
    });
  }
};

async function encodeImage(imageData, id) {
  console.log('🏭 [WORKER DEBUG] encodeImage called with:', { imageData, id });
  console.log('🏭 [WORKER DEBUG] Data check:', {
    hasArrayBuffer: !!imageData.arrayBuffer,
    arrayBufferType: typeof imageData.arrayBuffer,
    fileName: imageData.fileName,
    fileSize: imageData.fileSize,
    fileType: imageData.fileType
  });
  
  const { arrayBuffer, fileName, fileSize, fileType, includePrefix = true } = imageData;
  
  if (!arrayBuffer) {
    console.error('🏭 [WORKER DEBUG] No arrayBuffer provided in imageData');
    postMessage({
      type: 'error',
      id,
      error: 'No arrayBuffer provided'
    });
    return;
  }
  
  try {
    // 開始編碼
    console.log('🏭 [WORKER DEBUG] Sending initial progress...');
    postMessage({
      type: 'progress',
      id,
      step: 'encoding',
      progress: 0
    });
    
    console.log('🏭 [WORKER DEBUG] Sending 30% progress...');
    postMessage({
      type: 'progress',
      id,
      step: 'encoding',
      progress: 30
    });
    
    // 使用 ArrayBuffer 轉換為 base64
    console.log('🏭 [WORKER DEBUG] Starting ArrayBuffer to base64 conversion...');
    const dataUrl = await arrayBufferToBase64DataUrl(arrayBuffer, fileType);
    console.log('🏭 [WORKER DEBUG] ArrayBuffer conversion completed, dataUrl length:', dataUrl?.length);
    
    console.log('🏭 [WORKER DEBUG] Sending 60% progress...');
    postMessage({
      type: 'progress',
      id,
      step: 'encoding',
      progress: 60
    });
    
    // 處理結果格式
    let result;
    if (includePrefix) {
      result = dataUrl; // 完整的 data URL
    } else {
      // 提取純 base64 部分 (去掉 data:mime;base64, 前綴)
      const base64StartIndex = dataUrl.indexOf(',') + 1;
      result = dataUrl.substring(base64StartIndex);
    }
    console.log('🏭 [WORKER DEBUG] Result processed, length:', result?.length);
    
    console.log('🏭 [WORKER DEBUG] Sending 80% progress...');
    postMessage({
      type: 'progress',
      id,
      step: 'encoding',
      progress: 80
    });
    
    // 計算大小資訊
    const originalSize = fileSize;
    const base64Size = result.length;
    console.log('🏭 [WORKER DEBUG] Size calculation:', { originalSize, base64Size });
    
    console.log('🏭 [WORKER DEBUG] Sending 90% progress...');
    postMessage({
      type: 'progress',
      id,
      step: 'encoding',
      progress: 90
    });
    
    // 計算 gzip 壓縮大小
    console.log('🏭 [WORKER DEBUG] Starting gzip size calculation...');
    
    postMessage({
      type: 'progress',
      id,
      step: 'compressing',
      progress: 95
    });
    
    const gzipSize = await calculateGzipSize(result);
    console.log('🏭 [WORKER DEBUG] Gzip size calculated:', gzipSize);
    
    const finalResult = {
      base64: result,
      originalSize,
      base64Size,
      gzipSize,
      mimeType: fileType,
      fileName: fileName
    };
    
    console.log('🏭 [WORKER DEBUG] Sending final encoded result:', {
      hasBase64: !!finalResult.base64,
      base64Length: finalResult.base64?.length,
      originalSize: finalResult.originalSize,
      base64Size: finalResult.base64Size,
      gzipSize: finalResult.gzipSize
    });
    
    postMessage({
      type: 'encoded',
      id,
      result: finalResult
    });
    
    console.log('🏭 [WORKER DEBUG] encodeImage completed successfully');
  } catch (error) {
    console.error('🏭 [WORKER DEBUG] Error in encodeImage:', error);
    console.error('🏭 [WORKER DEBUG] Error stack:', error.stack);
    postMessage({
      type: 'error',
      id,
      error: error.message
    });
  }
}

function calculateGzipSize(data, id) {
  const { text } = data;
  
  postMessage({
    type: 'progress',
    id,
    step: 'compressing',
    progress: 0
  });
  
  try {
    const gzipSize = calculateGzipSizeSync(text);
    
    postMessage({
      type: 'gzipCalculated',
      id,
      gzipSize
    });
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: `Gzip calculation failed: ${error.message}`
    });
  }
}

async function calculateGzipSize(text) {
  console.log('🏭 [WORKER DEBUG] Calculating gzip size for text length:', text.length);
  
  // Try to load fflate library first
  const fflateLib = await loadFflateWithProgress();
  
  if (fflateLib && fflateLib.gzipSync) {
    try {
      console.log('🏭 [WORKER DEBUG] Using fflate library for accurate gzip compression...');
      const textEncoder = new TextEncoder();
      const uint8Array = textEncoder.encode(text);
      const compressed = fflateLib.gzipSync(uint8Array);
      
      console.log('🏭 [WORKER DEBUG] ✅ Real gzip compression completed:', {
        originalSize: text.length,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / text.length * 100).toFixed(1) + '%'
      });
      
      return compressed.length;
    } catch (error) {
      console.error('🏭 [WORKER DEBUG] fflate compression failed:', error);
      // Fall back to estimation
    }
  }
  
  // Fallback to estimation if fflate not available
  console.log('🏭 [WORKER DEBUG] Using fallback gzip estimation...');
  const estimatedSize = estimateGzipSize(text);
  
  console.log('🏭 [WORKER DEBUG] Gzip estimation completed:', {
    originalSize: text.length,
    estimatedGzipSize: estimatedSize,
    compressionRatio: (estimatedSize / text.length * 100).toFixed(1) + '%',
    note: 'Estimated (fflate not available)'
  });
  
  return estimatedSize;
}

// 輔助函數：格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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