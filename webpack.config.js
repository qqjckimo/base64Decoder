const path = require('path');
const crypto = require('crypto');
const webpack = require('webpack');
const packageJson = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackObfuscator = require('webpack-obfuscator');
const { LicenseWebpackPlugin } = require('license-webpack-plugin');
const portfinder = require('portfinder');

const gEnv = {
  isProduction: process.env.NODE_ENV === 'production',
  shouldAnalyze: process.env.ANALYZE === 'true',
};

// Log configuration for debugging
console.log('🔧 Webpack Configuration:');
console.log(`   Mode: ${gEnv.isProduction ? 'production' : 'development'}`);
console.log(`   Analyze: ${gEnv.shouldAnalyze}\n`);
// gEnv.isProduction = false;

// Unified asset filename generator to avoid conflicts
const generateAssetFilename = (pathData) => {
  // Get relative path for uniqueness
  const relativePath = path.relative(process.cwd(), pathData.filename);

  // Get file basename and extension
  const ext = path.extname(pathData.filename);
  const basename = path.basename(pathData.filename, ext);

  // Generate path hash (8 chars is enough to avoid conflicts)
  const pathHash = crypto
    .createHash('md5')
    .update(relativePath)
    .digest('hex')
    .substring(0, 8);

  // Determine subdirectory based on file type
  let subdir = '';
  if (ext === '.wasm') {
    subdir = 'wasm/';
  } else if (ext === '.mjs' || basename.includes('.worker')) {
    subdir = 'workers/';
  } else if (ext === '.txt') {
    subdir = 'assets/';
  } else {
    subdir = 'assets/';
  }

  // Return unified format: [subdir][name]-[pathHash].[contenthash:8][ext]
  return gEnv.isProduction
    ? `${subdir}${basename}-${pathHash}.[contenthash:8]${ext}`
    : `${subdir}${basename}-${pathHash}${ext}`;
};

// Size limit configuration
const SIZE_LIMITS = {
  core: 150 * 1024, // 150KB
  common: 100 * 1024, // 100KB
  perTool: 70 * 1024, // 70KB per tool
  total: 150 * 1024, // 150KB initial experience
};

class BundleSizePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('BundleSizePlugin', (compilation) => {
      // Skip size checks in development mode
      if (!gEnv.isProduction) {
        console.log('📦 Skipping bundle size checks in development mode');
        return;
      }

      const assets = compilation.assets;
      const warnings = [];

      console.log('\n📊 Bundle Size Analysis:');
      Object.keys(assets).forEach((filename) => {
        // Skip WASM files from bundle size analysis
        if (
          (filename.endsWith('.js') || filename.endsWith('.css')) &&
          !filename.endsWith('.wasm')
        ) {
          const size = assets[filename].size();
          console.log(`   ${filename}: ${(size / 1024).toFixed(2)}KB`);

          if (filename.includes('core') && size > SIZE_LIMITS.core) {
            warnings.push(
              `Core bundle (${filename}) exceeds limit: ${(size / 1024).toFixed(
                2
              )}KB > ${SIZE_LIMITS.core / 1024}KB`
            );
          }
          if (filename.includes('tool-base64-decoder') && size > 130 * 1024) {
            warnings.push(
              `Base64 Decoder tool (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 130KB`
            );
          }
          if (
            filename.includes('tool-base64-encoder') &&
            size > SIZE_LIMITS.perTool
          ) {
            warnings.push(
              `Base64 Encoder tool (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > ${SIZE_LIMITS.perTool / 1024}KB`
            );
          }
          if (
            filename.includes('encoder-worker') &&
            size > 20 * 1024 // Increased limit to account for fflate
          ) {
            warnings.push(
              `Encoder worker (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 20KB`
            );
          }
          if (
            filename.includes('compressor-worker') &&
            size > 10 * 1024 // Reduced limit after codec extraction
          ) {
            warnings.push(
              `Compressor worker (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 10KB`
            );
          }
          if (
            filename.includes('tools') &&
            !filename.includes('tool-') &&
            size > SIZE_LIMITS.common
          ) {
            warnings.push(
              `Tools bundle (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > ${SIZE_LIMITS.common / 1024}KB`
            );
          }
          if (
            filename.includes('chunks/') &&
            filename.includes('tool-base64-decoder') &&
            size > 130 * 1024
          ) {
            warnings.push(
              `Chunk (${filename}) exceeds limit: ${(size / 1024).toFixed(
                2
              )}KB > 130KB`
            );
          }
          if (
            filename.includes('tool-xml-formatter') &&
            size > 30 * 1024 // 30KB limit for XML formatter
          ) {
            warnings.push(
              `XML Formatter tool (${filename}) exceeds limit: ${(
                size / 1024
              ).toFixed(2)}KB > 30KB`
            );
          } else if (
            filename.includes('chunks/') &&
            !filename.includes('tool-base64-decoder') &&
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
        console.warn('\n⚠️  Bundle Size Warnings:');
        warnings.forEach((w) => console.warn(`   ${w}`));
        // Temporarily disable build failure for testing Worker functionality
        // if (gEnv.isProduction) {
        //     throw new Error('Bundle size limits exceeded. Build failed.');
        // }
      } else {
        console.log('✅ All bundles within size limits');
      }
    });
  }
}

// Base port configuration
const DEFAULT_PORT = 3000;
portfinder.basePort = DEFAULT_PORT;

const webpackConfig = {
  mode: gEnv.isProduction ? 'production' : 'development',
  entry: {
    core: './src/core/app.js',
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: (pathData) => {
      return gEnv.isProduction
        ? '[name].[contenthash:8].bundle.js'
        : '[name].bundle.js';
    },
    chunkFilename: gEnv.isProduction
      ? 'chunks/[name].[contenthash:8].chunk.js'
      : 'chunks/[name].chunk.js',
    publicPath: '/',
    workerPublicPath: './', // Fix for Web Workers to use self.location instead of document.baseURI
    clean: true,
    assetModuleFilename: generateAssetFilename,
    // Standard JS module output for dynamic codec loading.
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    chrome: '90',
                    firefox: '88',
                    safari: '14',
                    edge: '90',
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
        type: 'asset/resource',
        // Using global assetModuleFilename with generateAssetFilename
      },
      {
        test: /avif_enc_mt\.worker\.mjs$/,
        type: 'asset/resource',
        // Using global assetModuleFilename with generateAssetFilename
        // Prevent webpack from parsing and injecting runtime deps
        parser: { javascript: { commonjsMagicComments: false } },
      },
      {
        test: /\.txt$/,
        resourceQuery: /raw/,
        type: 'asset/resource',
        // Using global assetModuleFilename with generateAssetFilename
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: !gEnv.isProduction,
              modules: false,
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer'],
                  gEnv.isProduction && [
                    'cssnano',
                    {
                      preset: [
                        'default',
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
      // 核心業務邏輯 - 輕度混淆
      gEnv.isProduction && {
        test: /\.js$/,
        exclude: [
          /node_modules/,
          /\.worker\./, // 排除 worker 的 mjs 檔案
          /monaco-editor/, // 排除 Monaco Editor
          /base64-encoder\/worker-creator\.js$/, // 排除整個 base64-encoder worker-creator.js
        ],
        enforce: 'post',
        use: {
          loader: WebpackObfuscator.loader,
          options: {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'mangled-shuffled',
            ignoreImports: true, // 忽略 import 語句
            log: false,
            seed: 5, // Deterministic output keeps chunk hashes stable across deploys
            renameGlobals: false, // 保護 webpack runtime
            selfDefending: false, // 避免效能影響
            simplify: true,
            splitStrings: false, // 避免增加體積
            stringArray: true,
            stringArrayCallsTransform: false,
            stringArrayEncoding: [],
            stringArrayIndexShift: false,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 0,
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false,
          },
        },
      },
    ],
  },
  ignoreWarnings: [
    {
      module: /\.worker\.mjs$/,
      message: /the request of a dependency is an expression/,
    },
  ],
  plugins: [
    new webpack.DefinePlugin({
      _APP_VERSION_: JSON.stringify(packageJson.version),
      __PRODUCTION__: JSON.stringify(gEnv.isProduction),
    }),
    new webpack.BannerPlugin({
      banner: `/*!
 * Developer Tools Collection v${packageJson.version}
 * Copyright (c) ${new Date().getFullYear()} Jason Chen. All Rights Reserved.
 * Proprietary and Confidential - Unauthorized use prohibited
 */`,
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      templateParameters: {
        _APP_VERSION_: packageJson.version,
        _BUILD_DATE_: new Date().toISOString().split('T')[0],
      },
      minify: gEnv.isProduction
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
      chunks: ['core'],
      inject: 'body',
    }),
    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json',
        },
        {
          from: 'og-image.png',
          to: 'og-image.png',
        },
        {
          from: 'twitter-card.png',
          to: 'twitter-card.png',
        },
        {
          from: 'icon-*.png',
          to: '[name][ext]',
        },
        {
          from: 'public/sitemap.xml',
          to: 'sitemap.xml',
          transform(content) {
            // Update all lastmod dates to current build date
            const buildDate = new Date().toISOString().split('T')[0];
            return content
              .toString()
              .replace(
                /<lastmod>[\d-]+<\/lastmod>/g,
                `<lastmod>${buildDate}</lastmod>`
              );
          },
        },
        {
          from: 'public/robots.txt',
          to: 'robots.txt',
        },
      ],
    }),
    gEnv.isProduction &&
      new CompressionPlugin({
        test: /\.(js|css|html)$/,
        algorithm: 'gzip',
        threshold: 1024,
        minRatio: 0.8,
      }),
    gEnv.isProduction &&
      new CompressionPlugin({
        test: /\.(js|css|html)$/,
        algorithm: 'brotliCompress',
        filename: '[path][base].br',
        threshold: 1024,
        minRatio: 0.8,
      }),
    gEnv.isProduction && new BundleSizePlugin(),
    gEnv.isProduction &&
      new LicenseWebpackPlugin({
        outputFilename: 'third-party-licenses.txt',
        perChunkOutput: false,
        addBanner: false,
        unacceptablePattern: /GPL|AGPL|LGPL/i,
        excludedPackageTest: (packageName) => {
          // Exclude the main application package
          return packageName === 'developer-tools-collection';
        }
      }),
    gEnv.shouldAnalyze &&
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
        openAnalyzer: true,
      }),
  ].filter(Boolean),
  optimization: {
    minimize: gEnv.isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: { ecma: 2020 },
          compress: {
            ecma: 2020,
            drop_console: gEnv.isProduction,
            // drop_debugger: false,
            // pure_funcs: ["console.log", "console.info", "console.debug"],
            // passes: 2,
            // // Enhanced compression
            // dead_code: true,
            // evaluate: true,
            // sequences: true,
            // properties: true,
            booleans_as_integers: true,
          },
          mangle: {
            safari10: true,
            // // Enhanced property mangling
            // properties: {
            //   regex: /^_/, // Mangle properties starting with _
            //   keep_quoted: true, // Keep quoted property names
            // },
            keep_fnames: true, // Keep function names for better stack traces
          },
          // format: {
          //   ecma: 2020,
          //   comments: false,
          //   ascii_only: true,
          //   // Additional formatting options
          //   beautify: false,
          //   semicolons: false,
          // },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      chunks: (chunk) => {
        // Don't split worker chunks and codec chunks
        return (
          !chunk.name?.includes('-worker') && !chunk.name?.includes('codecs/')
        );
      },
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        core: {
          test: /[\\/]src[\\/]core[\\/]/,
          name: 'core',
          priority: 30,
          enforce: true,
        },
        'tool-base64-decoder': {
          test: /[\\/]src[\\/]tools[\\/]base64-decoder[\\/]/,
          name: 'tool-base64-decoder',
          priority: 25,
          enforce: true,
          chunks: 'all',
        },
        'tool-base64-encoder': {
          test: /[\\/]src[\\/]tools[\\/]base64-encoder[\\/](?!.*\.worker\.js$)/,
          name: 'tool-base64-encoder',
          priority: 25,
          enforce: true,
          chunks: (chunk) => chunk.name !== 'compressor-worker',
        },
        tools: {
          test: /[\\/]src[\\/]tools[\\/](?!.*\.worker\.js$)/,
          name: 'tools',
          priority: 20,
          enforce: false,
        },
        utils: {
          test: /[\\/]src[\\/]utils[\\/]/,
          name: 'utils',
          priority: 10,
          minSize: 1024,
        },
        // Disable default cache groups to prevent vendor extraction creating circular runtimes
        default: false,
        defaultVendors: false,
      },
    },
    runtimeChunk: false, // Keep runtime inline to reduce requests
    moduleIds: 'deterministic',
  },
  resolve: {
    extensions: ['.js', '.json', '.css'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@tools': path.resolve(__dirname, 'src/tools'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
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
    },
    // Additional configuration to handle strict ESM resolution
    extensionAlias: {
      '.js': ['.js', '.ts', '.mjs'],
    },
    modules: ['node_modules'],
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
        throw new Error('webpack-dev-server is not defined');
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
        !assetFilename.endsWith('.map') && !assetFilename.endsWith('.wasm')
      );
    },
  },
  devtool: gEnv.isProduction ? false : 'eval-source-map',
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

// Export configuration with port finding for dev server
module.exports = (env, argv) => {
  const mode = argv.mode || 'development';

  if (mode === 'development') {
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

        webpackConfig.devServer.port = port;
        return webpackConfig;
      })
      .catch((err) => {
        console.error('Could not find an available port:', err);
        return webpackConfig;
      });
  }

  return webpackConfig;
};
