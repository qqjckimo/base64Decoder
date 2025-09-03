export default class Base64DecoderTool {
    constructor() {
        this.currentCanvas = null;
        this.currentContext = null;
        this.currentLanguage = 'zh-TW';
        this.translations = {
            'zh-TW': {
                title: 'Base64 圖片解碼器',
                inputPlaceholder: '在此貼上 Base64 編碼的圖片字串...',
                decode: '解碼圖片',
                clear: '清除',
                loadExample: '載入範例',
                imageInfo: '圖片資訊',
                dimensions: '尺寸',
                format: '格式',
                fileSize: '檔案大小',
                totalPixels: '總像素數',
                pixelAnalysis: '像素分析',
                uniqueColors: '不同顏色數',
                avgBrightness: '平均亮度',
                transparentPixels: '透明像素',
                dominantColors: '主要顏色',
                clickedPixel: '點擊像素資訊',
                coordinates: '座標',
                waitingText: '等待圖片解碼...',
                loadFailed: '圖片載入失敗',
                pleaseInputBase64: '請輸入 Base64 編碼',
                decodeSuccess: '圖片解碼成功',
                decodeError: '解碼失敗，請檢查 Base64 格式',
                aboutSize: '約'
            },
            'en': {
                title: 'Base64 Image Decoder',
                inputPlaceholder: 'Paste Base64 encoded image string here...',
                decode: 'Decode Image',
                clear: 'Clear',
                loadExample: 'Load Example',
                imageInfo: 'Image Info',
                dimensions: 'Dimensions',
                format: 'Format',
                fileSize: 'File Size',
                totalPixels: 'Total Pixels',
                pixelAnalysis: 'Pixel Analysis',
                uniqueColors: 'Unique Colors',
                avgBrightness: 'Avg Brightness',
                transparentPixels: 'Transparent Pixels',
                dominantColors: 'Dominant Colors',
                clickedPixel: 'Clicked Pixel Info',
                coordinates: 'Coordinates',
                waitingText: 'Waiting for image decode...',
                loadFailed: 'Image load failed',
                pleaseInputBase64: 'Please input Base64 code',
                decodeSuccess: 'Image decoded successfully',
                decodeError: 'Decode failed, please check Base64 format',
                aboutSize: 'About'
            }
        };
    }

    async init(container) {
        this.container = container;
        this.render();
        this.attachEvents();
    }

    render() {
        const t = this.translations[this.currentLanguage];
        
        this.container.innerHTML = `
            <div class="base64-decoder-tool">
                <div class="tool-header">
                    <h2>${t.title}</h2>
                    <button class="language-toggle" data-action="toggleLanguage">
                        ${this.currentLanguage === 'zh-TW' ? '🌐 EN' : '🌐 中文'}
                    </button>
                </div>
                
                <div class="tool-grid">
                    <div class="input-section">
                        <div class="input-group">
                            <textarea 
                                id="base64Input" 
                                placeholder="${t.inputPlaceholder}"
                                rows="10"
                            ></textarea>
                        </div>
                        
                        <div class="button-group">
                            <button class="btn btn-primary" data-action="decode">
                                ${t.decode}
                            </button>
                            <button class="btn btn-secondary" data-action="clear">
                                ${t.clear}
                            </button>
                            <button class="btn btn-secondary" data-action="loadExample">
                                ${t.loadExample}
                            </button>
                        </div>
                        
                        <div id="alertMessage" class="alert" style="display: none;"></div>
                        
                        <div id="imageInfo" class="info-card" style="display: none;">
                            <h3>${t.imageInfo}</h3>
                            <div class="info-item">
                                <span>${t.dimensions}:</span>
                                <span id="imageDimensions"></span>
                            </div>
                            <div class="info-item">
                                <span>${t.format}:</span>
                                <span id="imageFormat"></span>
                            </div>
                            <div class="info-item">
                                <span>${t.fileSize}:</span>
                                <span id="fileSize"></span>
                            </div>
                            <div class="info-item">
                                <span>${t.totalPixels}:</span>
                                <span id="totalPixels"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="output-section">
                        <div id="imageContainer" class="image-container">
                            <div class="placeholder">${t.waitingText}</div>
                        </div>
                        
                        <div id="pixelAnalysis" class="info-card" style="display: none;">
                            <h3>${t.pixelAnalysis}</h3>
                            <div class="info-item">
                                <span>${t.uniqueColors}:</span>
                                <span id="uniqueColors"></span>
                            </div>
                            <div class="info-item">
                                <span>${t.avgBrightness}:</span>
                                <span id="avgBrightness"></span>
                            </div>
                            <div class="info-item">
                                <span>${t.transparentPixels}:</span>
                                <span id="transparentPixels"></span>
                            </div>
                            
                            <h4>${t.dominantColors}</h4>
                            <div id="dominantColors"></div>
                        </div>
                        
                        <div id="clickedPixelInfo" class="info-card" style="display: none;">
                            <h3>${t.clickedPixel}</h3>
                            <div class="pixel-info-grid">
                                <div id="clickedColorPreview" class="color-preview"></div>
                                <div>
                                    <div class="info-item">
                                        <span>${t.coordinates}:</span>
                                        <span id="pixelCoords"></span>
                                    </div>
                                    <div class="info-item">
                                        <span>RGB:</span>
                                        <span id="pixelRGB"></span>
                                    </div>
                                    <div class="info-item">
                                        <span>HEX:</span>
                                        <span id="pixelHEX"></span>
                                    </div>
                                    <div class="info-item">
                                        <span>HSL:</span>
                                        <span id="pixelHSL"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        this.container.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this[action]?.();
            }
        });

        const textarea = this.container.querySelector('#base64Input');
        
        textarea.addEventListener('dragover', (e) => {
            e.preventDefault();
            textarea.classList.add('dragover');
        });
        
        textarea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            textarea.classList.remove('dragover');
        });
        
        textarea.addEventListener('drop', (e) => {
            e.preventDefault();
            textarea.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    textarea.value = e.target.result;
                    this.decode();
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.addEventListener('paste', (e) => {
            if (!this.container.contains(document.activeElement)) return;
            
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        textarea.value = e.target.result;
                        this.decode();
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
        });
    }

    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh-TW' ? 'en' : 'zh-TW';
        this.render();
        this.attachEvents();
    }

    showAlert(message, type = 'error') {
        const alertDiv = this.container.querySelector('#alertMessage');
        alertDiv.textContent = message;
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.display = 'block';
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 3000);
    }

    decode() {
        const input = this.container.querySelector('#base64Input').value.trim();
        const t = this.translations[this.currentLanguage];
        
        if (!input) {
            this.showAlert(t.pleaseInputBase64);
            return;
        }
        
        let base64String = input;
        
        if (!input.startsWith('data:image')) {
            if (input.startsWith('iVBORw0')) {
                base64String = 'data:image/png;base64,' + input;
            } else if (input.startsWith('/9j/')) {
                base64String = 'data:image/jpeg;base64,' + input;
            } else if (input.startsWith('R0lGOD')) {
                base64String = 'data:image/gif;base64,' + input;
            } else {
                base64String = 'data:image/png;base64,' + input;
            }
        }
        
        const img = new Image();
        
        img.onload = () => {
            this.displayImage(img, base64String);
            this.analyzePixels(img);
            this.showAlert(t.decodeSuccess, 'success');
        };
        
        img.onerror = () => {
            this.showAlert(t.decodeError);
            const container = this.container.querySelector('#imageContainer');
            container.innerHTML = `<div class="placeholder">${t.loadFailed}</div>`;
        };
        
        img.src = base64String;
    }

    displayImage(img, base64String) {
        const container = this.container.querySelector('#imageContainer');
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        this.currentCanvas = canvas;
        this.currentContext = ctx;
        
        container.innerHTML = '';
        container.appendChild(canvas);
        
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);
            
            this.showPixelInfo(x, y);
        });
        
        this.container.querySelector('#imageInfo').style.display = 'block';
        this.container.querySelector('#imageDimensions').textContent = `${img.width} × ${img.height} px`;
        
        let format = 'Unknown';
        if (base64String.includes('image/png')) format = 'PNG';
        else if (base64String.includes('image/jpeg') || base64String.includes('image/jpg')) format = 'JPEG';
        else if (base64String.includes('image/gif')) format = 'GIF';
        else if (base64String.includes('image/webp')) format = 'WebP';
        this.container.querySelector('#imageFormat').textContent = format;
        
        const base64Length = base64String.split(',')[1]?.length || base64String.length;
        const fileSize = Math.round(base64Length * 0.75 / 1024);
        const t = this.translations[this.currentLanguage];
        this.container.querySelector('#fileSize').textContent = `${t.aboutSize} ${fileSize} KB`;
        
        this.container.querySelector('#totalPixels').textContent = (img.width * img.height).toLocaleString();
    }

    analyzePixels(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        const colorMap = new Map();
        let transparentCount = 0;
        let totalBrightness = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            if (a < 255) transparentCount++;
            
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            totalBrightness += brightness;
            
            const colorKey = `${r},${g},${b},${a}`;
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
        
        const pixelCount = pixels.length / 4;
        const avgBrightness = Math.round(totalBrightness / pixelCount / 255 * 100);
        
        this.container.querySelector('#pixelAnalysis').style.display = 'block';
        this.container.querySelector('#uniqueColors').textContent = colorMap.size.toLocaleString();
        this.container.querySelector('#avgBrightness').textContent = avgBrightness + '%';
        this.container.querySelector('#transparentPixels').textContent = transparentCount.toLocaleString();
        
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const dominantColorsDiv = this.container.querySelector('#dominantColors');
        dominantColorsDiv.innerHTML = '';
        
        sortedColors.forEach(([color, count]) => {
            const [r, g, b, a] = color.split(',').map(Number);
            const percentage = ((count / pixelCount) * 100).toFixed(2);
            
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            colorBox.style.background = `rgba(${r}, ${g}, ${b}, ${a/255})`;
            
            const colorInfo = document.createElement('div');
            colorInfo.className = 'color-info';
            colorInfo.innerHTML = `
                <div class="color-hex">${this.rgbToHex(r, g, b)}</div>
                <div class="color-rgb">RGB(${r}, ${g}, ${b}) - ${percentage}%</div>
            `;
            
            colorDiv.appendChild(colorBox);
            colorDiv.appendChild(colorInfo);
            dominantColorsDiv.appendChild(colorDiv);
        });
    }

    showPixelInfo(x, y) {
        if (!this.currentContext) return;
        
        const pixel = this.currentContext.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const a = pixel[3];
        
        this.container.querySelector('#clickedPixelInfo').style.display = 'block';
        this.container.querySelector('#clickedColorPreview').style.background = 
            `rgba(${r}, ${g}, ${b}, ${a/255})`;
        this.container.querySelector('#pixelCoords').textContent = `(${x}, ${y})`;
        this.container.querySelector('#pixelRGB').textContent = `rgb(${r}, ${g}, ${b})`;
        this.container.querySelector('#pixelHEX').textContent = this.rgbToHex(r, g, b);
        
        const hsl = this.rgbToHsl(r, g, b);
        this.container.querySelector('#pixelHSL').textContent = 
            `hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)`;
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    clear() {
        this.container.querySelector('#base64Input').value = '';
        const t = this.translations[this.currentLanguage];
        this.container.querySelector('#imageContainer').innerHTML = 
            `<div class="placeholder">${t.waitingText}</div>`;
        this.container.querySelector('#imageInfo').style.display = 'none';
        this.container.querySelector('#pixelAnalysis').style.display = 'none';
        this.container.querySelector('#alertMessage').style.display = 'none';
        this.container.querySelector('#clickedPixelInfo').style.display = 'none';
        this.currentCanvas = null;
        this.currentContext = null;
    }

    loadExample() {
        const exampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
        this.container.querySelector('#base64Input').value = exampleBase64;
        this.decode();
    }

    destroy() {
        this.currentCanvas = null;
        this.currentContext = null;
        this.container.innerHTML = '';
    }
}