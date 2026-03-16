/**
 * Presentation Framework - Shared Utilities
 * Provides common functionality for all presentations
 */

const PresentationFramework = {
  /**
   * Initialize keyboard shortcuts and custom behaviors
   */
  init() {
    this.addKeyboardShortcuts();
    this.addPrintSupport();
    console.log('[PresentationFramework] Initialized');
  },

  /**
   * Custom keyboard shortcuts
   */
  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const targetTag = (e.target.tagName || '').toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      const key = (e.key || '').toLowerCase();

      // 'H' key: go to first slide (home)
      if (key === 'h') {
        Reveal.slide(0);
      }

      // 'T' key: toggle overview / table of contents
      if (key === 't') {
        Reveal.toggleOverview();
      }
    });
  },

  /**
   * Add print/PDF export support
   */
  addPrintSupport() {
    if (window.location.search.match(/print-pdf/gi)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/css/print/pdf.css';
      document.head.appendChild(link);
    }
  },

  /**
   * Get total slide count
   */
  getSlideCount() {
    return Reveal.getTotalSlides();
  },

  /**
   * Navigate to a specific section by data-section attribute
   */
  goToSection(sectionName) {
    const slides = document.querySelectorAll('.slides section');
    slides.forEach((slide, index) => {
      if (slide.dataset.section === sectionName) {
        Reveal.slide(index);
      }
    });
  }
};

// Auto-initialize after Reveal.js is ready
if (typeof Reveal !== 'undefined') {
  Reveal.on('ready', () => PresentationFramework.init());
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const check = setInterval(() => {
      if (typeof Reveal !== 'undefined') {
        clearInterval(check);
        Reveal.on('ready', () => PresentationFramework.init());
      }
    }, 100);
  });
}
