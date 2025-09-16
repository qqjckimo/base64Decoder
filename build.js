/**
 * Build Script for Base64 Decoder
 * 
 * This script creates a single minified HTML file with embedded CSS and JS.
 * 
 * Features:
 * - HTML minification with html-minifier-terser
 * - Embedded CSS and JS minification
 * - Single output file for easy deployment
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

async function buildMinified() {
    try {
        // Read the source HTML file
        const sourceFile = path.join(__dirname, 'index.html');
        let htmlContent = fs.readFileSync(sourceFile, 'utf8');

        // Replace template parameters
        const packageJson = require('./package.json');
        const buildDate = new Date().toISOString().split('T')[0];

        htmlContent = htmlContent
            .replace(/<%= _APP_VERSION_ %>/g, packageJson.version)
            .replace(/<%= _BUILD_DATE_ %>/g, buildDate);

        console.log('Replacing template parameters...');
        console.log(`  _APP_VERSION_: ${packageJson.version}`);
        console.log(`  _BUILD_DATE_: ${buildDate}`);
        console.log('Starting minification process...');
        
        // Create docs directory if it doesn't exist
        const docsDir = path.join(__dirname, 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir);
            console.log('Created docs directory');
        }

        // Create minified HTML with embedded CSS and JS
        console.log('Creating minified HTML with embedded CSS and JS...');
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

        // Calculate compression statistics
        const originalSize = Buffer.byteLength(htmlContent, 'utf8');
        const minifiedSize = Buffer.byteLength(minifiedHtml, 'utf8');
        const compressionRatio = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);

        console.log(`✅ Minification completed successfully!`);
        console.log(`📊 Original size: ${originalSize} bytes`);
        console.log(`📊 Minified size: ${minifiedSize} bytes`);
        console.log(`📊 Compression: ${compressionRatio}% reduction`);
        console.log(`📁 Output: ${outputFile}`);
        
    } catch (error) {
        console.error('❌ Error during minification:', error);
        process.exit(1);
    }
}

buildMinified();