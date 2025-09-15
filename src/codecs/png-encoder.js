import init, {
  optimise_raw,
} from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";

let wasmInitialized = false;

export async function encode(data, options = {}) {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }

  const defaultOptions = { level: 2, interlace: false, optimizeAlpha: false };
  const _options = { ...defaultOptions, ...options };

  // if (data instanceof ImageData) {
  //   throw new Error("ImageData input not supported in single-threaded mode");
  // }

  return optimise_raw(
    data.data,
    data.width,
    data.height,
    _options.level,
    _options.interlace,
    _options.optimizeAlpha
  ).buffer;
}
