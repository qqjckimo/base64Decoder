// AVIF Encoder Entry Point
// Keep this entry extremely small; it just attaches the encoder to a global accessible from workers.
import { encode } from "@jsquash/avif";

// Attach to both window/self so it works in main thread or worker classic script context.
const target =
  typeof self !== "undefined"
    ? self
    : typeof window !== "undefined"
    ? window
    : {};
target.AvifLib = { encode };

// No exports needed – this file is consumed as a classic script via importScripts in the worker.
