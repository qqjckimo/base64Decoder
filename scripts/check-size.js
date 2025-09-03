#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const docsDir = path.join(__dirname, '..', 'docs');

const SIZE_LIMITS = {
    core: 50 * 1024,        // 50KB
    common: 100 * 1024,     // 100KB
    perTool: 30 * 1024,     // 30KB per tool
    total: 150 * 1024       // 150KB initial experience
};

function formatSize(bytes) {
    return (bytes / 1024).toFixed(2) + 'KB';
}

function checkBundleSizes() {
    if (!fs.existsSync(docsDir)) {
        console.error('❌ Build directory not found. Run npm run build first.');
        process.exit(1);
    }

    console.log('\n📊 Bundle Size Report\n');
    console.log('=' . repeat(60));

    let totalSize = 0;
    let hasErrors = false;
    const files = fs.readdirSync(docsDir);

    files.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.css')) {
            const filePath = path.join(docsDir, file);
            const content = fs.readFileSync(filePath);
            const size = content.length;
            const gzipSize = gzipSync(content).length;

            console.log(`\n📦 ${file}`);
            console.log(`   Raw: ${formatSize(size)} | Gzip: ${formatSize(gzipSize)}`);

            let limit = SIZE_LIMITS.perTool;
            if (file.includes('core')) limit = SIZE_LIMITS.core;
            if (file.includes('common')) limit = SIZE_LIMITS.common;

            if (gzipSize > limit) {
                console.log(`   ❌ Exceeds limit: ${formatSize(limit)}`);
                hasErrors = true;
            } else {
                const percentage = ((gzipSize / limit) * 100).toFixed(1);
                console.log(`   ✅ Within limit: ${percentage}% of ${formatSize(limit)}`);
            }

            if (file.includes('core') || file.includes('common')) {
                totalSize += gzipSize;
            }
        }
    });

    console.log('\n' + '=' . repeat(60));
    console.log(`\n📈 Initial Load Size: ${formatSize(totalSize)}`);
    
    if (totalSize > SIZE_LIMITS.total) {
        console.log(`❌ Exceeds total limit: ${formatSize(SIZE_LIMITS.total)}`);
        hasErrors = true;
    } else {
        const percentage = ((totalSize / SIZE_LIMITS.total) * 100).toFixed(1);
        console.log(`✅ Within total limit: ${percentage}% of ${formatSize(SIZE_LIMITS.total)}`);
    }

    console.log('\n' + '=' . repeat(60) + '\n');

    if (hasErrors) {
        console.error('❌ Bundle size check failed!');
        process.exit(1);
    } else {
        console.log('✅ All bundle sizes within limits!');
    }
}

checkBundleSizes();