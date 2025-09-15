/**
 * Language Detection Utility
 * Provides centralized language detection and management
 * Logic: localStorage → navigator.language (zh-* → zh-TW, others → en) → fallback 'zh-TW'
 */

class LanguageDetector {
    constructor() {
        this.supportedLanguages = ['zh-TW', 'en'];
        this.defaultLanguage = 'zh-TW';
        this.storageKey = 'preferredLanguage';
        this.current = this.detectInitialLanguage();
    }

    /**
     * Detect initial language based on priority:
     * 1. localStorage preference
     * 2. Browser language (navigator.language)
     * 3. Default fallback (zh-TW)
     */
    detectInitialLanguage() {
        // Check localStorage first
        const stored = localStorage.getItem(this.storageKey);
        if (stored && this.supportedLanguages.includes(stored)) {
            return stored;
        }

        // Check browser language
        const browserLang = navigator.language || navigator.languages?.[0] || '';
        
        // zh-* variants (zh, zh-CN, zh-TW, zh-HK, etc.) → zh-TW
        if (browserLang.toLowerCase().startsWith('zh')) {
            return 'zh-TW';
        }

        // All other languages → en
        return 'en';
    }

    /**
     * Get current language
     */
    get() {
        return this.current;
    }

    /**
     * Set language and persist to localStorage
     */
    set(language) {
        if (!this.supportedLanguages.includes(language)) {
            console.warn(`Unsupported language: ${language}, using default: ${this.defaultLanguage}`);
            language = this.defaultLanguage;
        }

        this.current = language;
        localStorage.setItem(this.storageKey, language);

        // Trigger global language change event
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.current }
        }));

        return this.current;
    }

    /**
     * Toggle between supported languages
     */
    toggle() {
        const newLanguage = this.current === 'zh-TW' ? 'en' : 'zh-TW';
        return this.set(newLanguage);
    }

    /**
     * Check if language is supported
     */
    isSupported(language) {
        return this.supportedLanguages.includes(language);
    }

    /**
     * Get all supported languages
     */
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }
}

// Create global instance
const languageDetector = new LanguageDetector();

// Setup global language API
window.appLanguage = {
    get: () => languageDetector.get(),
    set: (lang) => languageDetector.set(lang),
    toggle: () => languageDetector.toggle(),
    isSupported: (lang) => languageDetector.isSupported(lang),
    getSupportedLanguages: () => languageDetector.getSupportedLanguages()
};

// Export for module usage
export default languageDetector;
export { LanguageDetector };