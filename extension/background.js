// Browse - Browser Extension
// Auto-connects to daemon and relays commands to active tab

const WS_URL = 'ws://127.0.0.1:9222';
let socket = null;
let isConnected = false;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

// Connection state badge
function updateBadge(connected) {
  isConnected = connected;
  chrome.action.setBadgeText({ text: connected ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: connected ? '#22c55e' : '#ef4444' });
}

// Connect to daemon WebSocket server
function connect() {
  console.log('connect() called, socket state:', socket?.readyState);

  // Don't create new connection if one is already open or connecting
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('Already connected/connecting, skipping');
    return;
  }

  try {
    console.log('Creating WebSocket to', WS_URL);
    const ws = new WebSocket(WS_URL);
    socket = ws;
    console.log('WebSocket created, readyState:', ws.readyState);

    // Keep service worker alive while connecting (MV3 workaround)
    const keepAliveInterval = setInterval(() => {
      console.log('Waiting for connection, state:', ws.readyState);
      if (ws.readyState !== WebSocket.CONNECTING) {
        clearInterval(keepAliveInterval);
      }
    }, 500);

    ws.onopen = () => {
      clearInterval(keepAliveInterval);
      console.log('Connected to Browse daemon');
      updateBadge(true);
      reconnectDelay = 1000; // Reset backoff on successful connection

      // Identify as extension client
      ws.send(JSON.stringify({ type: 'extension' }));
    };

    ws.onclose = () => {
      clearInterval(keepAliveInterval);
      console.log('Disconnected from Browse daemon');
      updateBadge(false);
      if (socket === ws) {
        socket = null;
      }
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      clearInterval(keepAliveInterval);
      console.error('WebSocket error:', error);
      updateBadge(false);
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle daemon acknowledgment
        if (message.type === 'connected') {
          console.log('Daemon acknowledged connection');
          return;
        }

        await handleMessage(message);
      } catch (error) {
        console.error('Error handling message:', error);
        sendError(error.message);
      }
    };
  } catch (error) {
    console.error('Failed to connect:', error);
    updateBadge(false);
    scheduleReconnect();
  }
}

// Schedule reconnection with exponential backoff
function scheduleReconnect() {
  console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
  setTimeout(() => {
    if (!isConnected) {
      connect();
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }
  }, reconnectDelay);
}

// Handle incoming messages from CLI (via daemon)
async function handleMessage(message) {
  const { action, id } = message;

  console.log('Received:', action);

  try {
    let result;

    switch (action) {
      case 'getPageContent':
        result = await getPageContent(message.selector, message.prune !== false);
        break;

      case 'getPageInfo':
        result = await getPageInfo();
        break;

      case 'navigate':
        result = await navigateTo(message.url);
        break;

      case 'scroll':
        result = await scrollPage(message.pixels || 1000);
        break;

      case 'click':
        result = await clickElement(message.selector);
        break;

      case 'type':
        result = await typeText(message.selector, message.text);
        break;

      case 'ping':
        result = { pong: true };
        break;

      default:
        result = { error: `Unknown action: ${action}` };
    }

    sendResponse(id, result);
  } catch (error) {
    sendResponse(id, { error: error.message });
  }
}

// Send response back to daemon
function sendResponse(id, data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ id, ...data }));
  }
}

// Send error to daemon
function sendError(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'error', message }));
  }
}

// Get active tab
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error('No active tab found');
  }
  return tab;
}

// Execute content script and get result
async function executeInTab(func, args = []) {
  const tab = await getActiveTab();

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func,
    args,
  });

  if (results && results[0]) {
    return results[0].result;
  }
  throw new Error('No result from content script');
}

// Get page content (HTML)
async function getPageContent(selector, prune = true) {
  const safeSelector = selector === undefined || selector === null ? '' : selector;
  const safePrune = prune === true;

  const result = await executeInTab(
    (selector, prune) => {
      // Main content selectors (priority order)
      const mainContentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '#content',
        '#main',
        '.content',
        '.main',
        '.post',
        '.article',
        '.post-content',
        '.article-content',
        '.entry-content',
      ];

      // Noise elements to remove
      const noiseSelectors = [
        'nav', 'header', 'footer', 'aside',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.nav', '.navbar', '.navigation', '.menu', '.sidebar', '.footer', '.header',
        '.advertisement', '.ad', '.ads', '.advert', '.social-share', '.share-buttons',
        '.cookie-banner', '.cookie-notice', '.popup', '.modal', '.overlay',
        '.comments', '.comment-section', '#comments',
        '.related-posts', '.recommended', '.suggested',
        '.newsletter', '.subscribe', '.signup',
        'iframe:not([src*="youtube"]):not([src*="vimeo"])',
        'form:not([role="search"])',
      ];

      let element = document;
      if (selector && selector !== '') {
        element = document.querySelector(selector);
        if (!element) {
          return { error: `Selector not found: ${selector}` };
        }
      }

      let html = element === document
        ? document.documentElement.outerHTML
        : element.outerHTML;

      if (prune) {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Remove script/style/meta elements first
        doc.querySelectorAll('script, style, noscript, link, meta').forEach(el => el.remove());

        // Remove noise elements (nav, footer, ads, etc.)
        noiseSelectors.forEach(sel => {
          try {
            doc.querySelectorAll(sel).forEach(el => el.remove());
          } catch (e) {
            // Invalid selector, skip
          }
        });

        // Try to extract main content
        let mainContent = null;
        if (!selector) {
          for (const sel of mainContentSelectors) {
            try {
              const found = doc.querySelector(sel);
              if (found && found.textContent.trim().length > 200) {
                mainContent = found;
                break;
              }
            } catch (e) {
              // Invalid selector, skip
            }
          }
        }

        // Remove comments
        const walker = document.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
        const comments = [];
        while (walker.nextNode()) comments.push(walker.currentNode);
        comments.forEach(c => c.remove());

        // Clean attributes (but preserve href, src, alt for markdown conversion)
        doc.querySelectorAll('*').forEach(el => {
          const attrsToRemove = [];
          for (const attr of el.attributes) {
            if (attr.name.startsWith('data-') && attr.name !== 'data-testid') {
              attrsToRemove.push(attr.name);
            } else if (attr.name === 'class' || attr.name === 'style') {
              attrsToRemove.push(attr.name);
            } else if (['onclick', 'onload', 'onerror', 'onmouseover'].includes(attr.name)) {
              attrsToRemove.push(attr.name);
            }
          }
          attrsToRemove.forEach(name => el.removeAttribute(name));
        });

        // Collapse SVGs (but keep a placeholder)
        doc.querySelectorAll('svg').forEach(svg => {
          svg.innerHTML = '';
        });

        // Remove empty divs/spans that add noise
        doc.querySelectorAll('div, span').forEach(el => {
          if (!el.textContent.trim() && !el.querySelector('img, video, audio, iframe, svg')) {
            el.remove();
          }
        });

        // Use main content if found, otherwise use pruned body
        if (mainContent) {
          html = mainContent.outerHTML;
        } else if (selector) {
          html = doc.body.innerHTML;
        } else {
          html = doc.body ? doc.body.innerHTML : doc.documentElement.outerHTML;
        }
      }

      return { html, url: window.location.href, title: document.title };
    },
    [safeSelector, safePrune]
  );

  return result;
}

// Get page info
async function getPageInfo() {
  const tab = await getActiveTab();
  return {
    url: tab.url,
    title: tab.title,
  };
}

// Navigate to URL
async function navigateTo(url) {
  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { url });

  return new Promise((resolve) => {
    const listener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve({ success: true, url });
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve({ success: true, url, timeout: true });
    }, 30000);
  });
}

// Scroll page
async function scrollPage(pixels) {
  await executeInTab(
    (pixels) => {
      window.scrollBy(0, pixels);
      return { scrolled: pixels };
    },
    [pixels]
  );
  return { success: true, scrolled: pixels };
}

// Click element
async function clickElement(selector) {
  return await executeInTab(
    (selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return { error: `Element not found: ${selector}` };
      }
      element.click();
      return { success: true, selector };
    },
    [selector]
  );
}

// Type text into element
async function typeText(selector, text) {
  return await executeInTab(
    (selector, text) => {
      const element = document.querySelector(selector);
      if (!element) {
        return { error: `Element not found: ${selector}` };
      }
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, selector, text };
    },
    [selector, text]
  );
}

// Icon click shows status (manual reconnect)
chrome.action.onClicked.addListener(() => {
  if (!isConnected) {
    reconnectDelay = 1000; // Reset backoff
    connect();
  }
});

// Keepalive alarm to prevent service worker from being killed
const KEEPALIVE_ALARM = 'keepalive';

chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.4 }); // Every 24 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) {
    // Just check connection state and reconnect if needed
    if (!isConnected && (!socket || socket.readyState === WebSocket.CLOSED)) {
      console.log('Keepalive: reconnecting...');
      connect();
    }
  }
});

// Auto-connect on extension load
console.log('Browse extension loaded - auto-connecting...');
updateBadge(false);
// Small delay to let service worker fully initialize
setTimeout(() => connect(), 100);
