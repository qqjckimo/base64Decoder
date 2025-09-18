// Base64 Encoder Worker with local fflate
import { gzipSync } from 'fflate';

// Fallback gzip estimation (in case gzipSync fails)
function estimateGzipSize(text) {
  const baseEstimate = text.length * 0.7;
  const uniqueChars = new Set(text).size;
  const compressionRatio = Math.max(0.5, Math.min(0.9, uniqueChars / 64));
  return Math.round(baseEstimate * compressionRatio);
}


// Helper function to convert ArrayBuffer to base64 data URL
function arrayBufferToBase64DataUrl(arrayBuffer, mimeType) {
  return new Promise((resolve, reject) => {
    try {
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert to base64 string
      let binaryString = "";
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

// Worker 初始化完成，發送就緒訊息
console.log("🚀 Encoder worker loading...");
setTimeout(() => {
  postMessage({ type: "ready" });
  console.log("✅ Encoder worker ready");
}, 100);

self.onmessage = async function (e) {
  if (!e.data) {
    console.error("❌ No data in received message!");
    postMessage({
      type: "error",
      error: "No data in received message",
    });
    return;
  }

  const { type, data, id } = e.data;

  try {
    switch (type) {
      case "init":
        // 再次確認就緒狀態
        postMessage({ type: "ready" });
        break;
      case "encode":
        await encodeImage(data, id);
        break;
      case "calculateGzip":
        calculateGzipSize(data, id);
        break;
      case "ping":
        postMessage({
          type: "pong",
          id: id,
          timestamp: Date.now(),
        });
        break;
      default:
        console.error("❌ Unknown message type:", type);
        postMessage({
          type: "error",
          id,
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    console.error("❌ Error in worker message handler:", error.message);
    postMessage({
      type: "error",
      id,
      error: error.message,
      stack: error.stack,
    });
  }
};

async function encodeImage(imageData, id) {
  const {
    arrayBuffer,
    fileName,
    fileSize,
    fileType,
    includePrefix = true,
  } = imageData;

  if (!arrayBuffer) {
    console.error("❌ No arrayBuffer provided in imageData");
    postMessage({
      type: "error",
      id,
      error: "No arrayBuffer provided",
    });
    return;
  }

  try {
    // 開始編碼
    postMessage({
      type: "progress",
      id,
      step: "encoding",
      progress: 0,
    });

    postMessage({
      type: "progress",
      id,
      step: "encoding",
      progress: 30,
    });

    // 使用 ArrayBuffer 轉換為 base64
    const dataUrl = await arrayBufferToBase64DataUrl(arrayBuffer, fileType);

    postMessage({
      type: "progress",
      id,
      step: "encoding",
      progress: 60,
    });

    // 處理結果格式
    let result;
    if (includePrefix) {
      result = dataUrl; // 完整的 data URL
    } else {
      // 提取純 base64 部分 (去掉 data:mime;base64, 前綴)
      const base64StartIndex = dataUrl.indexOf(",") + 1;
      result = dataUrl.substring(base64StartIndex);
    }

    postMessage({
      type: "progress",
      id,
      step: "encoding",
      progress: 80,
    });

    // 計算大小資訊
    const originalSize = fileSize;
    const base64Size = result.length;

    postMessage({
      type: "progress",
      id,
      step: "encoding",
      progress: 90,
    });

    // 計算 gzip 壓縮大小
    postMessage({
      type: "progress",
      id,
      step: "compressing",
      progress: 95,
    });

    const gzipSize = calculateGzipSize(result);

    const finalResult = {
      base64: result,
      originalSize,
      base64Size,
      gzipSize,
      mimeType: fileType,
      fileName: fileName,
    };

    postMessage({
      type: "encoded",
      id,
      result: finalResult,
    });
  } catch (error) {
    console.error("❌ Error in encodeImage:", error.message);
    postMessage({
      type: "error",
      id,
      error: error.message,
    });
  }
}

function calculateGzipSize(text) {
  try {
    const textEncoder = new TextEncoder();
    const uint8Array = textEncoder.encode(text);
    const compressed = gzipSync(uint8Array);
    return compressed.length;
  } catch (error) {
    console.error("❌ gzip compression failed:", error.message);
    // Fall back to estimation
    return estimateGzipSize(text);
  }
}

// 輔助函數：格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 錯誤處理
self.onerror = function (error) {
  console.error("❌ Global worker error:", error.message);
  postMessage({
    type: "error",
    error: error.message,
    details: {
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
    },
  });
};

self.onunhandledrejection = function (event) {
  console.error("❌ Unhandled promise rejection:", event.reason);
  postMessage({
    type: "error",
    error: "Unhandled promise rejection: " + event.reason,
  });
};
