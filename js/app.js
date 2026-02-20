/**
 * OnlinePDFPro - Main Application JavaScript
 * All document processing happens client-side - no server uploads
 */

// =========================================
// Theme Management (Dark/Light Mode)
// =========================================

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('doctools-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (prefersDark) {
            this.setTheme('dark');
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('doctools-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Theme toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('doctools-theme', theme);
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
    }
};

// =========================================
// Mobile Menu
// =========================================

const MobileMenu = {
    init() {
        const menuToggle = document.getElementById('menuToggle');
        const nav = document.getElementById('nav');

        if (menuToggle && nav) {
            menuToggle.addEventListener('click', () => {
                nav.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
                    nav.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });
        }
    }
};

// =========================================
// File Upload Handler
// =========================================

const FileUploader = {
    init(uploadZoneId, options = {}) {
        const zone = document.getElementById(uploadZoneId);
        if (!zone) return null;

        const config = {
            accept: options.accept || '*/*',
            multiple: options.multiple || false,
            onFilesSelected: options.onFilesSelected || (() => { }),
            maxSize: options.maxSize || 100 * 1024 * 1024, // 100MB default
            maxFiles: options.maxFiles || 100
        };

        // Create hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.className = 'file-input';
        input.accept = config.accept;
        input.multiple = config.multiple;
        input.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
        zone.style.position = 'relative';
        zone.appendChild(input);

        // Click to upload
        zone.addEventListener('click', (e) => {
            if (e.target !== input) {
                input.click();
            }
        });

        // File input change
        input.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, config);
            input.value = ''; // Reset for same file selection
        });

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files, config);
        });

        return { zone, input, config };
    },

    handleFiles(fileList, config) {
        const files = Array.from(fileList);

        // Validate file count
        if (files.length > config.maxFiles) {
            alert(`Maximum ${config.maxFiles} files allowed`);
            return;
        }

        // Validate file sizes and filter
        const validFiles = files.filter(file => {
            if (file.size > config.maxSize) {
                alert(`${file.name} is too large. Maximum size is ${this.formatSize(config.maxSize)}`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            config.onFilesSelected(validFiles);
        }
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// =========================================
// Progress Handler
// =========================================

const ProgressHandler = {
    create(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-text">
                <span class="progress-status">Ready</span>
                <span class="progress-percent">0%</span>
            </div>
        `;

        return {
            update(percent, status = '') {
                const fill = container.querySelector('.progress-fill');
                const percentText = container.querySelector('.progress-percent');
                const statusText = container.querySelector('.progress-status');

                fill.style.width = `${percent}%`;
                percentText.textContent = `${Math.round(percent)}%`;
                if (status) statusText.textContent = status;
            },

            complete(status = 'Complete') {
                this.update(100, status);
            },

            reset() {
                this.update(0, 'Ready');
            }
        };
    }
};

// =========================================
// Recently Used Tools
// =========================================

const RecentlyUsed = {
    KEY: 'doctools-recent',
    MAX_ITEMS: 6,

    get() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY)) || [];
        } catch {
            return [];
        }
    },

    add(toolId, toolName) {
        let recent = this.get();

        // Remove if already exists
        recent = recent.filter(item => item.id !== toolId);

        // Add to beginning
        recent.unshift({ id: toolId, name: toolName, timestamp: Date.now() });

        // Limit to max items
        recent = recent.slice(0, this.MAX_ITEMS);

        localStorage.setItem(this.KEY, JSON.stringify(recent));
    },

    clear() {
        localStorage.removeItem(this.KEY);
    }
};

// =========================================
// Auto-Clear Timer
// =========================================

const AutoClear = {
    timers: [],

    start(seconds, onComplete, displayElement) {
        let remaining = seconds;

        const update = () => {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;

            if (displayElement) {
                displayElement.textContent = `Files will be cleared in ${mins}:${secs.toString().padStart(2, '0')}`;
            }

            if (remaining <= 0) {
                onComplete();
                return;
            }

            remaining--;
            const timerId = setTimeout(update, 1000);
            this.timers.push(timerId);
        };

        update();
    },

    clearAll() {
        this.timers.forEach(id => clearTimeout(id));
        this.timers = [];
    }
};

// =========================================
// Download Helper
// =========================================

const Downloader = {
    saveBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async saveAsZip(files, zipName = 'doctools-download.zip') {
        // Will be implemented when JSZip is loaded
        if (typeof JSZip === 'undefined') {
            console.error('JSZip not loaded');
            return;
        }

        const zip = new JSZip();

        files.forEach(({ name, data }) => {
            zip.file(name, data);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        this.saveBlob(content, zipName);
    }
};

// =========================================
// Utility Functions
// =========================================

const Utils = {
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    },

    generateFileName(original, suffix) {
        const ext = this.getFileExtension(original);
        const base = original.slice(0, original.lastIndexOf('.'));
        return `${base}${suffix}.${ext}`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// =========================================
// Service Worker Registration
// =========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => {
                console.log('[SW] Registered:', reg.scope);
            })
            .catch((err) => {
                console.log('[SW] Registration failed:', err);
            });
    });
}

// =========================================
// PWA Install Prompt
// =========================================

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install banner
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.innerHTML = `
        <div style="
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 10000;
            background: linear-gradient(135deg, #1E3A5F, #0096c7);
            color: white; padding: 14px 20px;
            display: flex; align-items: center; justify-content: center; gap: 16px;
            font-family: 'Inter', sans-serif; font-size: 0.95rem;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
            animation: slideUp 0.4s ease;
        ">
            <span>📱 Install OnlinePDFPro for quick access & offline use</span>
            <button id="installBtn" style="
                background: white; color: #1E3A5F; border: none;
                padding: 8px 20px; border-radius: 8px; font-weight: 600;
                cursor: pointer; font-size: 0.875rem;
            ">Install App</button>
            <button id="dismissInstall" style="
                background: transparent; color: rgba(255,255,255,0.8); border: none;
                cursor: pointer; font-size: 1.2rem; padding: 4px 8px;
            ">✕</button>
        </div>
    `;
    document.body.appendChild(banner);

    // Add animation
    const style = document.createElement('style');
    style.textContent = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }';
    document.head.appendChild(style);

    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            console.log('[PWA] Install result:', result.outcome);
            deferredPrompt = null;
            banner.remove();
        }
    });

    document.getElementById('dismissInstall').addEventListener('click', () => {
        banner.remove();
        deferredPrompt = null;
    });
});

window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    const banner = document.getElementById('installBanner');
    if (banner) banner.remove();
    deferredPrompt = null;
});

// =========================================
// Initialize on DOM Ready
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    MobileMenu.init();

    console.log('OnlinePDFPro initialized - All processing happens locally in your browser');
});

// Export for use in tool pages
const _exports = {
    ThemeManager,
    MobileMenu,
    FileUploader,
    ProgressHandler,
    RecentlyUsed,
    AutoClear,
    Downloader,
    Utils
};

window.OnlinePDFPro = _exports;
window.DocTools = _exports; // backward compatibility
