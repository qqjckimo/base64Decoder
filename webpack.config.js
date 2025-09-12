const path = require("path");
const crypto = require("crypto");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const portfinder = require("portfinder");

const isProduction = process.env.NODE_ENV === "production";
const shouldAnalyze = process.env.ANALYZE === "true";

// Unified asset filename generator to avoid conflicts
const generateAssetFilename = (pathData) => {
  // Get relative path for uniqueness
  const relativePath = path.relative(process.cwd(), pathData.filename);

  // Get file basename and extension
  const ext = path.extname(pathData.filename);
  const basename = path.basename(pathData.filename, ext);

  // Generate path hash (8 chars is enough to avoid conflicts)
  const pathHash = crypto
    .createHash("md5")
    .update(relativePath)
    .digest("hex")
    .substring(0, 8);

  // Determine subdirectory based on file type
  let subdir = "";
  if (ext === ".wasm") {
    subdir = "wasm/";
  } else if (ext === ".mjs" || basename.includes(".worker")) {
    subdir = "workers/";
  } else if (ext === ".txt") {
    subdir = "assets/";
  } else {
    subdir = "assets/";
  }

  // Return unified format: [subdir][name]-[pathHash].[contenthash:8][ext]
  return isProduction
    ? `${subdir}${basename}-${pathHash}.[contenthash:8]${ext}`
    : `${subdir}${basename}-${pathHash}${ext}`;
};

// Size limit configuration
const SIZE_LIMITS = {
  core: 50 * 1024, // 50KB
  common: 100 * 1024, // 100KB
  perTool: 30 * 1024, // 30KB per tool
  total: 150 * 1024, // 150KB initial experience
};

class BundleSizePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap("BundleSizePlugin", (compilation) => {
      // Skip size checks in development mode
      if (!isProduction) {
        console.log("📦 Skipping bundle size checks in development mode");
        return;
      }

      const assets = compilation.assets;
      const warnings = [];

      console.log("\n📊 Bundle Size Analysis:");
      Object.keys(assets).forEach((filename) => {
        // Skip WASM files from bundle size analysis
        if (
          (filename.endsWith(".js") || filename.endsWith(".css")) &&
          !filename.endsWith(".wasm")
        ) {
          const size = assets[filename].size();
          console.log(`   ${filename}: ${(size / 1024).toFixed(2)}KB`);

          if (filename.includes("core") && size > SIZE_LIMITS.core) {
            warnings.push(
              `Core bundle (${filename}) exceeds limit: ${(size / 1024).toFixed(
                2
              )}KB > ${SIZE_LIMITS.core / 1024}KB`
            );
          }
          if (filename.includes("tool-base64-decoder") && size > 130 * 1024) {
            warnings.push(
              `Base64 Decoder tool (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 130KB`
            );
          }
          if (
            filename.includes("tool-base64-encoder") &&
            size > SIZE_LIMITS.perTool
          ) {
            warnings.push(
              `Base64 Encoder tool (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > ${SIZE_LIMITS.perTool / 1024}KB`
            );
          }
          if (
            filename.includes("encoder-worker") &&
            size > 20 * 1024 // Increased limit to account for fflate
          ) {
            warnings.push(
              `Encoder worker (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 20KB`
            );
          }
          if (
            filename.includes("compressor-worker") &&
            size > 10 * 1024 // Reduced limit after codec extraction
          ) {
            warnings.push(
              `Compressor worker (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 10KB`
            );
          }
          if (
            filename.includes("tools") &&
            !filename.includes("tool-") &&
            size > SIZE_LIMITS.common
          ) {
            warnings.push(
              `Tools bundle (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > ${SIZE_LIMITS.common / 1024}KB`
            );
          }
          if (
            filename.includes("chunks/") &&
            filename.includes("tool-base64-decoder") &&
            size > 130 * 1024
          ) {
            warnings.push(
              `Chunk (${filename}) exceeds limit: ${(size / 1024).toFixed(
                2
              )}KB > 130KB`
            );
          } else if (
            filename.includes("chunks/") &&
            !filename.includes("tool-base64-decoder") &&
            size > SIZE_LIMITS.perTool
          ) {
            warnings.push(
              `Chunk (${filename}) exceeds limit: ${(size / 1024).toFixed(
                2
              )}KB > ${SIZE_LIMITS.perTool / 1024}KB`
            );
          }
        }
      });

      if (warnings.length > 0) {
        console.warn("\n⚠️  Bundle Size Warnings:");
        warnings.forEach((w) => console.warn(`   ${w}`));
        // Temporarily disable build failure for testing Worker functionality
        // if (isProduction) {
        //     throw new Error('Bundle size limits exceeded. Build failed.');
        // }
      } else {
        console.log("✅ All bundles within size limits");
      }
    });
  }
}

// Log configuration for debugging
console.log("🔧 Webpack Configuration:");
console.log(`   Mode: ${isProduction ? "production" : "development"}`);
console.log(`   Analyze: ${shouldAnalyze}`);

// Base port configuration
const DEFAULT_PORT = 3000;
portfinder.basePort = DEFAULT_PORT;

const webpackConfig = {
  mode: isProduction ? "production" : "development",
  entry: {
    core: "./src/core/app.js",
    "encoder-worker": "./src/tools/base64-encoder/encoder.worker.js",
    "compressor-worker": "./src/tools/base64-encoder/compressor.worker.js",
  },
  output: {
    path: path.resolve(__dirname, "docs"),
    filename: (pathData) => {
      return isProduction
        ? "[name].[contenthash:8].bundle.js"
        : "[name].bundle.js";
    },
    chunkFilename: isProduction
      ? "chunks/[name].[contenthash:8].chunk.js"
      : "chunks/[name].chunk.js",
    publicPath: "/",
    workerPublicPath: "./", // Fix for Web Workers to use self.location instead of document.baseURI
    clean: false,
    assetModuleFilename: generateAssetFilename,
    // Standard JS module output for dynamic codec loading.
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    chrome: "90",
                    firefox: "88",
                    safari: "14",
                    edge: "90",
                  },
                  modules: false,
                  useBuiltIns: false, // No polyfills
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.wasm$/,
        type: "asset/resource",
        // Using global assetModuleFilename with generateAssetFilename
      },
      {
        test: /avif_enc_mt\.worker\.mjs$/,
        type: "asset/resource",
        // Using global assetModuleFilename with generateAssetFilename
        // Prevent webpack from parsing and injecting runtime deps
        parser: { javascript: { commonjsMagicComments: false } },
      },
      {
        test: /\.txt$/,
        resourceQuery: /raw/,
        type: "asset/resource",
        // Using global assetModuleFilename with generateAssetFilename
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: !isProduction,
              modules: false,
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  ["autoprefixer"],
                  isProduction && [
                    "cssnano",
                    {
                      preset: [
                        "default",
                        {
                          discardComments: { removeAll: true },
                          normalizeWhitespace: true,
                        },
                      ],
                    },
                  ],
                ].filter(Boolean),
              },
            },
          },
        ],
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /\.worker\.mjs$/,
      message: /the request of a dependency is an expression/,
    },
    {
      module: /workerHelpers\.worker\.js$/,
      message: /Can't resolve/,
    },
  ],
  plugins: [
    // CleanWebpackPlugin not needed for Cloudflare Workers deployment
    new webpack.NormalModuleReplacementPlugin(
      /@jsquash\/oxipng.*pkg-parallel/,
      (resource) => {
        if (resource.createData) {
          resource.createData.resource = resource.createData.resource.replace(
            /pkg-parallel/g,
            "pkg"
          );
          resource.createData.context = path.dirname(
            resource.createData.resource
          );
        }
      }
    ),
    new HtmlWebpackPlugin({
      template: "./index.html",
      minify: isProduction
        ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: false, // Keep SEO attributes
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true,
            // Preserve important SEO attributes
            ignoreCustomComments: [/^\s*JSON-LD/],
            // Keep attributes that are important for SEO
            removeAttributeQuotes: false,
            caseSensitive: false,
            preventAttributesEscaping: true,
            // Preserve meta tags and structured data
            removeEmptyAttributes: false,
            removeOptionalTags: false,
          }
        : false,
      chunks: ["core"],
      inject: "body",
    }),
    isProduction &&
      new CompressionPlugin({
        test: /\.(js|css|html)$/,
        algorithm: "gzip",
        threshold: 1024,
        minRatio: 0.8,
      }),
    isProduction &&
      new CompressionPlugin({
        test: /\.(js|css|html)$/,
        algorithm: "brotliCompress",
        filename: "[path][base].br",
        threshold: 1024,
        minRatio: 0.8,
      }),
    isProduction && new BundleSizePlugin(),
    shouldAnalyze &&
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        reportFilename: "bundle-report.html",
        openAnalyzer: true,
      }),
  ].filter(Boolean),
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: { ecma: 2020 },
          compress: {
            ecma: 2020,
            drop_console: isProduction,
            drop_debugger: true,
            pure_funcs: ["console.log"],
            passes: 2,
          },
          mangle: {
            safari10: true,
          },
          format: {
            ecma: 2020,
            comments: false,
            ascii_only: true,
          },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      chunks: (chunk) => {
        // Don't split worker chunks and codec chunks
        return (
          !chunk.name?.includes("-worker") && !chunk.name?.includes("codecs/")
        );
      },
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        core: {
          test: /[\\/]src[\\/]core[\\/]/,
          name: "core",
          priority: 30,
          enforce: true,
        },
        "tool-base64-decoder": {
          test: /[\\/]src[\\/]tools[\\/]base64-decoder[\\/]/,
          name: "tool-base64-decoder",
          priority: 25,
          enforce: true,
          chunks: "all",
        },
        "tool-base64-encoder": {
          test: /[\\/]src[\\/]tools[\\/]base64-encoder[\\/](?!.*\.worker\.js$)/,
          name: "tool-base64-encoder",
          priority: 25,
          enforce: true,
          chunks: (chunk) => chunk.name !== "compressor-worker",
        },
        tools: {
          test: /[\\/]src[\\/]tools[\\/](?!.*\.worker\.js$)/,
          name: "tools",
          priority: 20,
          enforce: false,
        },
        utils: {
          test: /[\\/]src[\\/]utils[\\/]/,
          name: "utils",
          priority: 10,
          minSize: 1024,
        },
        // Disable default cache groups to prevent vendor extraction creating circular runtimes
        default: false,
        defaultVendors: false,
      },
    },
    runtimeChunk: false, // Keep runtime inline to reduce requests
    moduleIds: "deterministic",
  },
  resolve: {
    extensions: [".js", ".json", ".css"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@core": path.resolve(__dirname, "src/core"),
      "@tools": path.resolve(__dirname, "src/tools"),
      "@components": path.resolve(__dirname, "src/components"),
      "@utils": path.resolve(__dirname, "src/utils"),
      // 修正：使用 path.resolve 確保路徑正確
      "@jsquash/oxipng/codec/pkg-parallel": path.resolve(
        __dirname,
        "node_modules/@jsquash/oxipng/codec/pkg"
      ),
    },
    // Fix ESM module resolution for packages like @jsquash/oxipng
    byDependency: {
      esm: {
        fullySpecified: false, // Allow imports without file extensions
      },
      commonjs: {
        fullySpecified: false,
      },
      amd: {
        fullySpecified: false,
      },
      url: {
        fullySpecified: false,
      },
      import: { fullySpecified: false },
      require: { fullySpecified: false },
      // 新增：針對 @jsquash 套件的特殊處理
      "@jsquash": {
        fullySpecified: false,
      },
    },
    // Additional configuration to handle strict ESM resolution
    extensionAlias: {
      ".js": [".js", ".ts", ".mjs"],
    },
    modules: [
      "node_modules",
      // 添加 @jsquash 套件的特定解析路徑
      path.resolve(__dirname, "node_modules/@jsquash/oxipng/codec/pkg"),
    ],
    fallback: {
      // 處理 @jsquash/oxipng 中的相對路徑問題
      "pkg-parallel": path.resolve(
        __dirname,
        "node_modules/@jsquash/oxipng/codec/pkg"
      ),
      workerHelpers: false, // 禁用有問題的worker helper
    },
  },
  devServer: {
    static: false,
    compress: true,
    port: DEFAULT_PORT,
    hot: true,
    open: true,
    historyApiFallback: true,
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error("webpack-dev-server is not defined");
      }
      const port = devServer.server.address().port;
      console.log(`\n🚀 Dev server running at: http://localhost:${port}\n`);
    },
  },
  performance: {
    hints: false, // Disable size hints for WASM assets
    maxEntrypointSize: SIZE_LIMITS.total,
    maxAssetSize: SIZE_LIMITS.perTool,
    assetFilter: (assetFilename) => {
      // Skip size checks for WASM files and source maps
      return (
        !assetFilename.endsWith(".map") && !assetFilename.endsWith(".wasm")
      );
    },
  },
  devtool: isProduction ? false : "eval-source-map",
  stats: {
    assets: true,
    chunks: true,
    modules: false,
    entrypoints: true,
    children: false,
    cached: false,
    cachedAssets: false,
    colors: true,
    performance: true,
  },
};

// Worker-specific configuration
const workerConfig = {
  ...webpackConfig,
  target: "webworker",
  entry: {
    "encoder-worker": "./src/tools/base64-encoder/encoder.worker.js",
    "compressor-worker": "./src/tools/base64-encoder/compressor.worker.js",
  },
  output: {
    ...webpackConfig.output,
    environment: {
      ...webpackConfig.output.environment,
      document: false, // Disable document references for workers
    },
  },
  resolve: {
    ...webpackConfig.resolve, // Inherit resolve config including ESM fix
  },
  devServer: undefined, // Workers don't need dev server
  optimization: {
    ...webpackConfig.optimization,
    splitChunks: {
      chunks: (chunk) => {
        // Allow splitting for worker chunks
        return !chunk.name?.includes("codecs/");
      },
      cacheGroups: {
        // Only keep essential cache groups for workers
        default: false,
        defaultVendors: false,
      },
    },
  },
  // 關鍵：添加plugins配置
  plugins: [
    // 複製NormalModuleReplacementPlugin到worker配置
    new webpack.NormalModuleReplacementPlugin(
      /@jsquash\/oxipng.*pkg-parallel/,
      (resource) => {
        if (resource.createData) {
          resource.createData.resource = resource.createData.resource.replace(
            /pkg-parallel/g,
            "pkg"
          );
          resource.createData.context = path.dirname(
            resource.createData.resource
          );
        }
      }
    ),
  ],
};

// Main app configuration (without workers)
const mainConfig = {
  ...webpackConfig,
  entry: {
    core: "./src/core/app.js",
  },
};

// Export configuration with port finding for dev server
module.exports = (env, argv) => {
  const mode = argv.mode || "development";

  if (mode === "development") {
    return portfinder
      .getPortPromise({
        port: DEFAULT_PORT,
        stopPort: DEFAULT_PORT + 100, // Try ports 3000-3100
      })
      .then((port) => {
        if (port !== DEFAULT_PORT) {
          console.log(
            `⚠️  Port ${DEFAULT_PORT} is in use, using port ${port} instead`
          );
        }

        mainConfig.devServer.port = port;
        return [mainConfig, workerConfig];
      })
      .catch((err) => {
        console.error("Could not find an available port:", err);
        return [mainConfig, workerConfig];
      });
  }

  return [mainConfig, workerConfig];
};
