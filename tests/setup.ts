/**
 * Jest Test Setup
 * 
 * Mocks Chrome Extension APIs and sets up test environment
 */

// Declare global types for Node.js environment
declare const global: typeof globalThis & {
  chrome: any;
  performance: any;
  document: any;
  window: any;
};

// Mock Chrome Extension APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: jest.fn((callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    id: 'test-extension-id',
    openOptionsPage: jest.fn(),
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([])),
    sendMessage: jest.fn(() => Promise.resolve({})),
  },
  action: {
    setBadgeText: jest.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: jest.fn(() => Promise.resolve()),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(() => Promise.resolve('notification-id')),
  },
} as any;

// Mock window.performance
global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

// Mock document
global.document = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    click: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    matches: jest.fn(() => false),
    closest: jest.fn(() => null),
  })),
} as any;

// Mock window
global.window = {
  scrollX: 0,
  scrollY: 0,
  pageXOffset: 0,
  pageYOffset: 0,
  scrollBy: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'https://example.com',
  },
} as any;

