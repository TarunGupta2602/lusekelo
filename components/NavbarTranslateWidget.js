"use client";
import { useEffect } from "react";

export default function NavbarTranslateWidget() {
  useEffect(() => {
    // Enhanced Google Translate branding removal
    const hideGoogleBranding = () => {
      // More comprehensive selector list targeting all Google branding elements
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
        '[id*="google_translate_element"] .goog-te-gadget-simple > span:first-child'
      ];

      // Remove elements completely rather than just hiding them
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
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

    // Enhanced MutationObserver monitoring document.documentElement with attribute filtering
    const observer = new MutationObserver((mutations) => {
      let shouldCleanup = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const element = node;
              if (element.className && (
                element.className.includes('goog-te') || 
                element.className.includes('skiptranslate') ||
                element.id && element.id.includes('google')
              )) {
                shouldCleanup = true;
              }
            }
          });
        }
        if (mutation.type === 'attributes' && 
            mutation.target.style && 
            (mutation.target.style.position || mutation.target.style.top)) {
          shouldCleanup = true;
        }
      });
      
      if (shouldCleanup) {
        setTimeout(hideGoogleBranding, 50);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // More frequent cleanup intervals (500ms instead of 1000ms)
    const cleanupInterval = setInterval(hideGoogleBranding, 500);

    // Multiple setTimeout calls with staggered timing for initialization cleanup
    setTimeout(hideGoogleBranding, 100);
    setTimeout(hideGoogleBranding, 500);
    setTimeout(hideGoogleBranding, 1000);
    setTimeout(hideGoogleBranding, 2000);

    return () => {
      observer.disconnect();
      clearInterval(cleanupInterval);
    };
  }, []);

  return null; // This component doesn't render anything
}
