/**
 * Browser Compatibility Layer
 * 
 * Provides unified API for Chrome and Firefox extensions
 * Handles differences between Manifest V2 (Firefox) and V3 (Chrome)
 */

// Declare browser API for Firefox (WebExtensions API)
declare const browser: any;

// Detect browser
// SECURITY: Safe browser detection (no user data exposed)
export const isFirefox = typeof browser !== 'undefined' && 
                         typeof (chrome as any) === 'undefined';

export const isChrome = typeof chrome !== 'undefined' && 
                        chrome.runtime && 
                        chrome.runtime.id;

// Unified browser API
export const browserAPI = isFirefox ? (browser as any) : chrome;

/**
 * Unified storage API
 */
export const storage = {
  local: {
    get: (keys: string | string[] | null): Promise<any> => {
      if (isFirefox) {
        return browserAPI.storage.local.get(keys);
      } else {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, resolve);
        });
      }
    },
    
    set: (items: any): Promise<void> => {
      if (isFirefox) {
        return browserAPI.storage.local.set(items);
      } else {
        return new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      }
    },
    
    remove: (keys: string | string[]): Promise<void> => {
      if (isFirefox) {
        return browserAPI.storage.local.remove(keys);
      } else {
        return new Promise((resolve, reject) => {
          chrome.storage.local.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      }
    },
    
    clear: (): Promise<void> => {
      if (isFirefox) {
        return browserAPI.storage.local.clear();
      } else {
        return new Promise((resolve, reject) => {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      }
    },
    
    /**
     * Get bytes in use for storage
     * SECURITY: Used for quota management
     */
    getBytesInUse: (keys?: string | string[] | null): Promise<number> => {
      if (isFirefox) {
        return browserAPI.storage.local.getBytesInUse(keys || null);
      } else {
        return new Promise((resolve, reject) => {
          chrome.storage.local.getBytesInUse(keys || null, (bytesInUse) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(bytesInUse);
            }
          });
        });
      }
    },
  },
};

/**
 * Unified tabs API
 */
export const tabs = {
  query: (queryInfo: any): Promise<any[]> => {
    if (isFirefox) {
      return browserAPI.tabs.query(queryInfo);
    } else {
      return new Promise((resolve) => {
        chrome.tabs.query(queryInfo, resolve);
      });
    }
  },
  
  get: (tabId: number): Promise<any> => {
    if (isFirefox) {
      return browserAPI.tabs.get(tabId);
    } else {
      return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      });
    }
  },
  
  sendMessage: (tabId: number, message: any): Promise<any> => {
    if (isFirefox) {
      return browserAPI.tabs.sendMessage(tabId, message);
    } else {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          // Check for runtime errors (e.g., tab doesn't have content script)
          // This prevents "Unchecked runtime.lastError" warnings in console
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError;
            const errorMessage = error.message || '';
            
            // Suppress expected errors - these are normal for chrome:// pages, extension pages, etc.
            // Resolve with error response instead of rejecting to avoid console noise
            if (errorMessage.includes('Could not establish connection') ||
                errorMessage.includes('Receiving end does not exist') ||
                errorMessage.includes('Extension context invalidated')) {
              resolve({ success: false, error: errorMessage });
              return;
            }
            
            // For unexpected errors, reject normally
            reject(new Error(errorMessage));
          } else {
            resolve(response);
          }
        });
      });
    }
  },
  
  create: (createProperties: any): Promise<any> => {
    if (isFirefox) {
      return browserAPI.tabs.create(createProperties);
    } else {
      return new Promise((resolve, reject) => {
        chrome.tabs.create(createProperties, (tab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      });
    }
  },
  
  onActivated: {
    addListener: (callback: (activeInfo: any) => void): void => {
      if (isFirefox) {
        browserAPI.tabs.onActivated.addListener(callback);
      } else {
        chrome.tabs.onActivated.addListener(callback);
      }
    }
  },
  
  onUpdated: {
    addListener: (callback: (tabId: number, changeInfo: any, tab: any) => void): void => {
      if (isFirefox) {
        browserAPI.tabs.onUpdated.addListener(callback);
      } else {
        chrome.tabs.onUpdated.addListener(callback);
      }
    }
  }
};

/**
 * Unified runtime API
 */
export const runtime = {
  sendMessage: (message: any): Promise<any> => {
    if (isFirefox) {
      return browserAPI.runtime.sendMessage(message);
    } else {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          // Check for runtime errors to prevent "Unchecked runtime.lastError" warnings
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError;
            // Clear the error to prevent Chrome from logging "Unchecked runtime.lastError"
            reject(new Error(error.message));
          } else {
            resolve(response);
          }
        });
      });
    }
  },
  
  onMessage: {
    addListener: (callback: (message: any, sender: any, sendResponse: any) => void): void => {
      if (isFirefox) {
        browserAPI.runtime.onMessage.addListener(callback);
      } else {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          callback(message, sender, sendResponse);
          return true; // Indicate async response
        });
      }
    },
    
    removeListener: (callback: (...args: unknown[]) => void): void => {
      if (isFirefox) {
        browserAPI.runtime.onMessage.removeListener(callback as any);
      } else {
        chrome.runtime.onMessage.removeListener(callback as any);
      }
    },
  },
  
  id: isFirefox ? (browserAPI.runtime as any).id : chrome.runtime.id,
  
  openOptionsPage: (): void => {
    if (isFirefox) {
      browserAPI.runtime.openOptionsPage();
    } else {
      chrome.runtime.openOptionsPage();
    }
  },
};

/**
 * Unified action/browserAction API
 */
export const action = {
  setBadgeText: (details: { text: string; tabId?: number }): Promise<void> => {
    if (isFirefox) {
      return browserAPI.browserAction.setBadgeText(details);
    } else {
      return new Promise((resolve) => {
        chrome.action.setBadgeText(details, resolve);
      });
    }
  },
  
  setBadgeBackgroundColor: (details: { color: string; tabId?: number }): Promise<void> => {
    if (isFirefox) {
      return browserAPI.browserAction.setBadgeBackgroundColor(details);
    } else {
      return new Promise((resolve) => {
        chrome.action.setBadgeBackgroundColor(details, resolve);
      });
    }
  },
  
  onClicked: {
    addListener: (callback: (tab: any) => void): void => {
      if (isFirefox) {
        browserAPI.browserAction.onClicked.addListener(callback);
      } else {
        chrome.action.onClicked.addListener(callback);
      }
    },
  },
};

/**
 * Unified notifications API
 * Fails gracefully if notification permission not granted
 */
export const notifications = {
  create: (options: any): Promise<string> => {
    try {
      if (isFirefox && browserAPI.notifications) {
        return browserAPI.notifications.create(options);
      } else if (typeof chrome !== 'undefined' && chrome.notifications) {
        return new Promise((resolve) => {
          chrome.notifications.create(options, resolve);
        });
      }
    } catch {
      // Notification permission not available, fail silently
    }
    return Promise.resolve('');
  },
};

