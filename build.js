const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

async function buildMinified() {
    try {
        // Read the source HTML file
        const sourceFile = path.join(__dirname, 'index.html');
        const htmlContent = fs.readFileSync(sourceFile, 'utf8');
        
        console.log('Starting minification process...');
        
        // Minify HTML with embedded CSS and JS
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
            removeEmptyElements: false, // Keep this false to avoid removing important empty elements
            caseSensitive: false,
            preventAttributesEscaping: false,
            sortAttributes: true,
            sortClassName: true
        });
        
        // Create docs directory if it doesn't exist
        const docsDir = path.join(__dirname, 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir);
            console.log('Created docs directory');
        }
        
        // Write minified HTML to docs folder
        const outputFile = path.join(docsDir, 'index.html');
        fs.writeFileSync(outputFile, minifiedHtml, 'utf8');
        
        // Calculate compression ratio
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