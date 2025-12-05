import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test to prevent "multiple elements found" errors
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for components that use it
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock scrollIntoView which is not available in jsdom
  if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = () => {};
  }
}
