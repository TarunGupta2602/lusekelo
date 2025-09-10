'use client';

import { useEffect } from 'react';

// Debounce utility to prevent excessive cleanup calls
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function NavbarTranslateWidget() {
  useEffect(() => {
    // Enhanced Google Translate branding removal
    const hideGoogleBranding = () => {
      // Comprehensive selector list targeting all Google branding elements
      const selectors = [
        '.goog-te-banner-frame',
        '.goog-te-banner',
        '.goog-te-gadget-icon',
        '.goog-te-gadget-simple .goog-te-menu-value span:first-child',
        '.goog-te-gadget-simple .goog-te-menu-value span[style*="color"]',
        '.goog-te-gadget-simple .goog-te-menu-value > span:first-child',
        '.goog-te-gadget .goog-te-gadget-icon',
        '.goog-te-combo option[value=""]',
        'iframe[src*="translate.google.com"]',
        '.goog-te-spinner',
        '.goog-te-balloon',
        '.goog-te-balloon-frame',
        '.goog-tooltip',
        '.goog-te-menu-frame',
        '.goog-te-ftab',
        '.goog-te-menu2',
        '.goog-te-menu2-item div[style*="color: rgb(118, 118, 118)"]',
        '.goog-te-menu2-item:first-child',
        '.goog-logo-link',
        'a[href*="translate.google.com"]',
        '[id*="google_translate_element"] .goog-te-gadget-simple a',
        '[id*="google_translate_element"] .goog-te-gadget-simple span[style*="color"]',
        '[id*="google_translate_element"] .goog-te-gadget-simple > span:first-child',
      ];

      // Remove elements completely rather than just hiding them
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (element && element.parentNode) {
            element.remove();
          }
        });
      });

      // Reset body positioning to prevent navbar displacement
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.transform = '';
      document.body.style.transition = '';
    };

    // Debounced version of hideGoogleBranding
    const debouncedHideGoogleBranding = debounce(hideGoogleBranding, 100);

    // Enhanced MutationObserver monitoring document.documentElement with attribute filtering
    const observer = new MutationObserver((mutations) => {
      let shouldCleanup = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const element = node;
              // Use classList.contains instead of className.includes
              if (
                element.classList &&
                (element.classList.contains('goog-te') ||
                  element.classList.contains('skiptranslate') ||
                  (element.id && String(element.id).includes('google')))
              ) {
                shouldCleanup = true;
              }
            }
          });
        }
        if (
          mutation.type === 'attributes' &&
          mutation.target.style &&
          (mutation.target.style.position || mutation.target.style.top)
        ) {
          shouldCleanup = true;
        }
      });

      if (shouldCleanup) {
        debouncedHideGoogleBranding();
      }
    });

    // Observe changes in a specific container if possible, or fallback to document.documentElement
    const translateContainer = document.querySelector('.translate-widget') || document.documentElement;
    observer.observe(translateContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Cleanup interval with debouncing (every 1000ms)
    const cleanupInterval = setInterval(debouncedHideGoogleBranding, 1000);

    // Initial cleanup with staggered timing
    setTimeout(debouncedHideGoogleBranding, 100);
    setTimeout(debouncedHideGoogleBranding, 1000);

    return () => {
      observer.disconnect();
      clearInterval(cleanupInterval);
      debouncedHideGoogleBranding.cancel();
    };
  }, []);

  return null; // This component doesn't render anything
}