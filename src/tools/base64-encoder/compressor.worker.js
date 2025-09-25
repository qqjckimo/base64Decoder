// Image Compressor Worker with dynamic loading for all codecs

// Worker 初始化完成，發送就緒訊息
console.log("🚀 Compressor worker loading...");
setTimeout(() => {
  postMessage({ type: "ready" });
  console.log("✅ Compressor worker ready");
}, 100);

// Dynamic encoder loading
const encoders = new Map();

async function loadEncoder(format) {
  if (encoders.has(format)) {
    return encoders.get(format);
  }

  try {
    let module;

    switch (format) {
      case "png":
        module = await import(
          /* webpackChunkName: "png-encoder" */ "../../codecs/png-encoder.js"
        );
        break;
      case "webp":
        module = await import(
          /* webpackChunkName: "webp-encoder" */ "../../codecs/webp-encoder.js"
        );
        break;
      case "avif":
        module = await import(
          /* webpackChunkName: "avif-encoder" */ "../../codecs/avif-encoder.js"
        );
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    encoders.set(format, module.encode);
    console.log(`✅ ${format.toUpperCase()} encoder loaded successfully`);
    return module.encode;
  } catch (error) {
    console.error(`❌ Failed to load ${format} encoder:`, error);
    return null;
  }
}

self.onmessage = async function (e) {
  const { type, data, id } = e.data;

  try {
    switch (type) {
      case "init":
        // 再次確認就緒狀態
        postMessage({ type: "ready" });
        break;
      case "compress":
        await compressImage(data, id);
        break;
      case "getSupportedFormats":
        getSupportedFormats(id);
        break;
      case "ping":
        postMessage({ type: "pong", id: id, timestamp: Date.now() });
        break;
      default:
        postMessage({
          type: "error",
          id,
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    postMessage({
      type: "error",
      id,
      error: error.message,
    });
  }
};

async function compressImage(imageData, id) {
  const { file, quality = 75, formats = ["png", "webp", "avif"] } = imageData;

  try {
    // Show loading progress
    postMessage({
      type: "progress",
      id,
      step: "loading",
      progress: 5,
    });

    // No need to load jSquash libraries upfront - we'll load encoders on demand

    postMessage({
      type: "progress",
      id,
      step: "preparing",
      progress: 15,
    });

    // 讀取原始圖片為 ImageData
    const imageBuffer = await file.arrayBuffer();
    const imageBitmap = await createImageBitmap(new Blob([imageBuffer]));

    // 建立 Canvas 獲取 ImageData
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageBitmap, 0, 0);
    const imageDataObj = ctx.getImageData(
      0,
      0,
      imageBitmap.width,
      imageBitmap.height
    );

    postMessage({
      type: "progress",
      id,
      step: "preparing",
      progress: 15,
    });

    const results = [];
    const totalFormats = formats.length;

    // 按優先順序壓縮：PNG > WebP > AVIF
    const orderedFormats = ["png", "webp", "avif"].filter((format) =>
      formats.includes(format)
    );

    for (let i = 0; i < orderedFormats.length; i++) {
      const format = orderedFormats[i];
      const startTime = Date.now();

      postMessage({
        type: "progress",
        id,
        step: `compressing_${format}`,
        progress: 15 + (i / totalFormats) * 70,
        format,
      });

      try {
        const encoder = await loadEncoder(format);
        if (!encoder) {
          throw new Error(`Failed to load ${format} encoder`);
        }

        let compressedBuffer;
        switch (format) {
          case "png":
            compressedBuffer = await encoder(imageDataObj, {
              quality: quality / 100,
            });
            break;
          case "webp":
            compressedBuffer = await encoder(imageDataObj, {
              quality,
            });
            break;
          case "avif":
            compressedBuffer = await encoder(imageDataObj, {
              quality,
            });
            break;
        }

        const compressionTime = Date.now() - startTime;

        // 複製 ArrayBuffer 用於傳輸
        const transferBuffer = compressedBuffer.slice();

        results.push({
          format,
          size: compressedBuffer.byteLength,
          compressionTime,
          quality,
          success: true,
          data: compressedBuffer, // 包含壓縮後的數據
        });

        // 即時回報單一格式結果
        postMessage({
          type: "formatComplete",
          id,
          format,
          result: {
            format,
            size: compressedBuffer.byteLength,
            compressionTime,
            quality,
            success: true,
            data: transferBuffer, // 包含壓縮後的數據
          },
        }, [transferBuffer]); // 使用 Transferable Objects 傳輸 ArrayBuffer
      } catch (formatError) {
        console.error(
          `❌ Failed to compress as ${format}:`,
          formatError.message
        );

        let errorMessage;
        if (formatError.message.includes("Failed to load")) {
          errorMessage = `${format.toUpperCase()} encoder is not available. This format cannot be processed.`;
        } else {
          errorMessage = `Compression failed for ${format.toUpperCase()}: ${
            formatError.message
          }`;
        }

        results.push({
          format,
          error: errorMessage,
          success: false,
        });

        postMessage({
          type: "formatComplete",
          id,
          format,
          result: {
            format,
            error: errorMessage,
            success: false,
          },
        });
      }
    }

    postMessage({
      type: "compressed",
      id,
      results,
    });
  } catch (error) {
    console.error("❌ Compression failed:", error.message);
    postMessage({
      type: "error",
      id,
      error: `Compression failed: ${error.message}`,
    });
  }
}

function getSupportedFormats(id) {
  // jSquash 支援的格式
  const supportedFormats = ["png", "webp", "avif"];

  postMessage({
    type: "supportedFormats",
    id,
    formats: supportedFormats,
  });
}

// 輔助函數：格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 輔助函數：格式化時間
function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

// 錯誤處理
self.onerror = function (error) {
  console.error("❌ Worker error:", error.message);
  postMessage({
    type: "error",
    error: error.message,
  });
};

self.onunhandledrejection = function (event) {
  console.error("❌ Unhandled rejection:", event.reason);
  postMessage({
    type: "error",
    error: event.reason,
  });
};
