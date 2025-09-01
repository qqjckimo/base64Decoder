/**
 * Enhanced Build Script for Base64 Decoder
 * 
 * This script provides comprehensive minification functionality:
 * 1. Creates an all-in-one minified HTML with embedded CSS and JS (index.html)
 * 2. Extracts and creates separate minified CSS and JS files
 * 3. Creates an HTML version that uses external CSS/JS files (index-external.html)
 * 
 * Features:
 * - HTML minification with html-minifier-terser
 * - CSS minification with clean-css
 * - JavaScript minification with terser
 * - Detailed compression statistics
 * - Multiple output formats for different use cases
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: minifyJS } = require('terser');

async function extractAndMinifyAssets(htmlContent) {
    // Extract CSS from <style> tags
    const cssMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    let extractedCSS = '';
    if (cssMatch) {
        extractedCSS = cssMatch[1];
    }

    // Extract JS from <script> tags (excluding external scripts)
    const jsMatch = htmlContent.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/);
    let extractedJS = '';
    if (jsMatch) {
        extractedJS = jsMatch[1];
    }

    // Minify extracted CSS
    let minifiedCSS = '';
    if (extractedCSS) {
        const cssResult = new CleanCSS({
            level: 2,
            compatibility: 'ie8',
            returnPromise: false
        }).minify(extractedCSS);
        
        if (cssResult.errors.length > 0) {
            console.warn('CSS minification warnings:', cssResult.errors);
        }
        minifiedCSS = cssResult.styles;
    }

    // Minify extracted JS
    let minifiedJS = '';
    if (extractedJS) {
        const jsResult = await minifyJS(extractedJS, {
            compress: {
                drop_console: false,
                drop_debugger: true,
                pure_funcs: [],
            },
            mangle: true,
            format: {
                comments: false,
            },
        });
        
        if (jsResult.error) {
            console.error('JS minification error:', jsResult.error);
            minifiedJS = extractedJS; // fallback to original
        } else {
            minifiedJS = jsResult.code;
        }
    }

    return {
        css: {
            original: extractedCSS,
            minified: minifiedCSS
        },
        js: {
            original: extractedJS,
            minified: minifiedJS
        }
    };
}

async function createExternalAssetVersion(htmlContent, cssContent, jsContent) {
    // Replace inline <style> with link to external CSS
    let htmlWithExternalAssets = htmlContent.replace(
        /<style[^>]*>[\s\S]*?<\/style>/,
        '<link rel="stylesheet" href="style.min.css">'
    );

    // Replace inline <script> with link to external JS
    htmlWithExternalAssets = htmlWithExternalAssets.replace(
        /<script(?![^>]*src)[^>]*>[\s\S]*?<\/script>/,
        '<script src="script.min.js"></script>'
    );

    // Minify the HTML (without inline CSS/JS now)
    const minifiedHtmlExternal = await minify(htmlWithExternalAssets, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: false, // CSS is now external
        minifyJS: false,  // JS is now external
        minifyURLs: true,
        removeEmptyAttributes: true,
        removeOptionalTags: true,
        removeAttributeQuotes: true,
        collapseBooleanAttributes: true,
        removeEmptyElements: false,
        caseSensitive: false,
        preventAttributesEscaping: false,
        sortAttributes: true,
        sortClassName: true
    });

    return minifiedHtmlExternal;
}
async function buildMinified() {
    try {
        // Read the source HTML file
        const sourceFile = path.join(__dirname, 'index.html');
        const htmlContent = fs.readFileSync(sourceFile, 'utf8');
        
        console.log('Starting minification process...');
        
        // Extract and minify CSS and JS separately
        const assets = await extractAndMinifyAssets(htmlContent);
        
        // Create docs directory if it doesn't exist
        const docsDir = path.join(__dirname, 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir);
            console.log('Created docs directory');
        }

        // 1. Create the original all-in-one minified HTML (existing functionality)
        console.log('Creating all-in-one minified HTML...');
        const minifiedHtml = await minify(htmlContent, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true,
            removeAttributeQuotes: true,
            collapseBooleanAttributes: true,
            removeEmptyElements: false,
            caseSensitive: false,
            preventAttributesEscaping: false,
            sortAttributes: true,
            sortClassName: true
        });
        
        const outputFile = path.join(docsDir, 'index.html');
        fs.writeFileSync(outputFile, minifiedHtml, 'utf8');

        // 2. Create separate minified CSS and JS files
        console.log('Creating separate minified CSS and JS files...');
        if (assets.css.minified) {
            const cssFile = path.join(docsDir, 'style.min.css');
            fs.writeFileSync(cssFile, assets.css.minified, 'utf8');
            console.log(`📄 Created: ${cssFile}`);
        }

        if (assets.js.minified) {
            const jsFile = path.join(docsDir, 'script.min.js');
            fs.writeFileSync(jsFile, assets.js.minified, 'utf8');
            console.log(`📄 Created: ${jsFile}`);
        }

        // 3. Create HTML version that uses external CSS/JS files
        console.log('Creating HTML version with external assets...');
        const htmlWithExternalAssets = await createExternalAssetVersion(
            htmlContent, 
            assets.css.minified, 
            assets.js.minified
        );
        
        const externalAssetsFile = path.join(docsDir, 'index-external.html');
        fs.writeFileSync(externalAssetsFile, htmlWithExternalAssets, 'utf8');
        console.log(`📄 Created: ${externalAssetsFile}`);

        // Calculate compression statistics
        const originalSize = Buffer.byteLength(htmlContent, 'utf8');
        const minifiedSize = Buffer.byteLength(minifiedHtml, 'utf8');
        const compressionRatio = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
        
        const cssOriginalSize = Buffer.byteLength(assets.css.original, 'utf8');
        const cssMinifiedSize = Buffer.byteLength(assets.css.minified, 'utf8');
        const cssCompressionRatio = cssOriginalSize > 0 ? 
            ((cssOriginalSize - cssMinifiedSize) / cssOriginalSize * 100).toFixed(2) : 0;
        
        const jsOriginalSize = Buffer.byteLength(assets.js.original, 'utf8');
        const jsMinifiedSize = Buffer.byteLength(assets.js.minified, 'utf8');
        const jsCompressionRatio = jsOriginalSize > 0 ? 
            ((jsOriginalSize - jsMinifiedSize) / jsOriginalSize * 100).toFixed(2) : 0;

        console.log(`✅ Minification completed successfully!`);
        console.log(`📊 HTML - Original: ${originalSize} bytes, Minified: ${minifiedSize} bytes (${compressionRatio}% reduction)`);
        console.log(`📊 CSS  - Original: ${cssOriginalSize} bytes, Minified: ${cssMinifiedSize} bytes (${cssCompressionRatio}% reduction)`);
        console.log(`📊 JS   - Original: ${jsOriginalSize} bytes, Minified: ${jsMinifiedSize} bytes (${jsCompressionRatio}% reduction)`);
        console.log(`📁 Output directory: ${docsDir}`);
        
    } catch (error) {
        console.error('❌ Error during minification:', error);
        process.exit(1);
    }
}

buildMinified();