export class WorkerCreator {
  static createEncoderWorker() {
    return new Worker(
      /* webpackChunkName: "encoder-worker" */
      new URL('./encoder.worker.js', import.meta.url),
      { type: 'module' }
    );
  }
  static createCompressorWorker() {
    return new Worker(
      /* webpackChunkName: "compressor-worker" */
      new URL('./compressor.worker.js', import.meta.url),
      { type: 'module' }
    );
  }
}
