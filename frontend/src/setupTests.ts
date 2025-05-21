// Configuração para os testes usando Vitest
// '@testing-library/jest-dom' adiciona matchers personalizados para asserções em nós DOM
// Permite fazer coisas como:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Configuração global do Vitest
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpa elementos montados após cada teste
afterEach(() => {
  cleanup();
});

// Mock do localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
