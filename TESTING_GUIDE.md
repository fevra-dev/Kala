# Kala Testing Guide

## ✅ Extension Loaded Successfully!

Now let's test all the features to make sure everything works correctly.

---

## 🧪 Step-by-Step Testing

### 1. **Basic Console Logging Test**

**Goal**: Verify the extension is running and logging correctly.

1. Open any website (e.g., `example.com` or `google.com`)
2. Open **DevTools Console** (Press `F12` or `Cmd+Option+I` on Mac)
3. Look for initialization messages:
   ```
   [Kala] Content script loaded, initializing...
   [Kala] Content script initializing...
   [Kala] Domain: example.com
   [Kala] Protection ENABLED
   ```

**✅ Success**: You should see initialization logs with `[Kala]` prefix.

---

### 2. **Event Interception Test**

**Goal**: Verify keyboard events are being intercepted and delayed.

1. On any website, click in a text input field (search bar, form field, etc.)
2. Open DevTools Console (F12)
3. Type some characters (e.g., "hello")
4. Watch the console for logs like:
   ```
   [Kala] Intercepted keydown: h
   [Kala] Context: { gaming: false, formField: true, ... }
   [Kala] Calculated delay: 65.23ms
   [Kala] Enqueued event 0: h scheduled for +65ms
   [Kala] Dispatching delayed keydown: h
   ```

**✅ Success**: 
- You see "Intercepted keydown" for each key
- Delay values are shown (50-100ms range)
- Events are queued and dispatched
- Text still appears in the input (slightly delayed)

---

### 3. **Popup UI Test**

**Goal**: Verify the popup interface works correctly.

1. Click the **Kala extension icon** in your browser toolbar
2. The popup should open showing:
   - 🛡️ Kala title
   - Current website domain
   - Protection toggle (should be ON by default)
   - Privacy Level dropdown (should show "Medium")
   - Settings and Help buttons

**Test the toggle:**
- Click the toggle to disable protection
- Console should show: `[Kala] Protection disabled`
- Click again to enable
- Console should show: `[Kala] Protection enabled`

**Test privacy levels:**
- Change dropdown from "Medium" to "High"
- Type in an input field
- Check console - delays should be larger (80-150ms range)
- Change to "Low"
- Delays should be smaller (30-50ms range)

**✅ Success**: Popup opens, shows current site, toggle works, privacy level changes affect delays.

---

### 4. **Event Ordering Test**

**Goal**: Verify events maintain correct order despite delays.

1. Open a text input field
2. Type quickly: "abc"
3. Watch the console logs
4. Verify the text appears as "abc" (not "bac" or "acb")

**Expected console output:**
```
[Kala] Enqueued event 0: a scheduled for +65ms
[Kala] Enqueued event 1: b scheduled for +72ms
[Kala] Enqueued event 2: c scheduled for +68ms
[Kala] Processing event 0: a
[Kala] Processing event 1: b
[Kala] Processing event 2: c
```

**✅ Success**: Text appears in correct order, events processed by original index.

---

### 5. **Context Detection Test**

**Goal**: Verify context detection adjusts delays appropriately.

**Test Gaming Context:**
1. Visit a website with WebGL/Canvas (e.g., a game site)
2. Type in an input field
3. Check console - should show: `Context: { gaming: true, ... }`
4. Delays should be reduced (gaming adjustment: -20ms)

**Test Form Field:**
1. Visit a website with a form (e.g., login page)
2. Type in an input field
3. Check console - should show: `Context: { formField: true, ... }`
4. Delays should be slightly increased (+10ms)

**Test Search Field:**
1. Visit Google or any site with a search bar
2. Type in the search field
3. Check console - should show: `Context: { searchField: true, ... }`
4. Delays should be reduced (-10ms)

**✅ Success**: Context is detected correctly and delays adjust accordingly.

---

### 6. **Tracker Detection Test**

**Goal**: Verify tracker detection works.

**Note**: Most websites won't have behavioral trackers, but the system should still scan.

1. Visit any website
2. Open DevTools Console
3. Look for tracker scan messages:
   ```
   [Kala] Scanning page for trackers...
   [Kala] Found 0 potential trackers
   ```

4. If a tracker is detected, you'll see:
   ```
   [Kala] New tracker detected: BioCatch
   [Kala] Tracker detected, notifying service worker: BioCatch
   ```

5. Check the popup - if trackers are detected, you'll see a "Trackers Detected" alert

**✅ Success**: Tracker scanning runs every 5 seconds, detections are logged.

---

### 7. **Service Worker Test**

**Goal**: Verify background service worker is running.

1. Go to `brave://extensions` (or `chrome://extensions`)
2. Find "Kala" in the list
3. Click "service worker" link (or "Inspect views: service worker")
4. A new DevTools window opens for the service worker
5. Check the console for:
   ```
   [Kala] Service worker script loaded
   [Kala] Service worker starting...
   [Kala] Service worker initialized successfully
   ```

**✅ Success**: Service worker console shows initialization logs.

---

### 8. **Settings Persistence Test**

**Goal**: Verify settings are saved and persist across page reloads.

1. Open the popup
2. Change privacy level to "High"
3. Disable protection (toggle OFF)
4. Reload the page (F5)
5. Open popup again
6. Settings should be remembered:
   - Privacy level should still be "High"
   - Protection should still be "OFF"

**✅ Success**: Settings persist across page reloads.

---

### 9. **Performance Test**

**Goal**: Verify extension doesn't cause noticeable lag.

1. Open a website with a text input
2. Type rapidly (e.g., type a sentence quickly)
3. Observe:
   - Text should appear with minimal delay (50-100ms per character)
   - No freezing or stuttering
   - Page remains responsive

**✅ Success**: Typing feels smooth, delays are barely noticeable.

---

### 10. **Multiple Tabs Test**

**Goal**: Verify extension works independently per tab.

1. Open two tabs with different websites
2. In Tab 1: Enable protection, set privacy to "High"
3. In Tab 2: Disable protection
4. Type in both tabs
5. Tab 1 should have delays, Tab 2 should not

**✅ Success**: Each tab has independent settings.

---

## 🐛 Troubleshooting

### No console logs appearing?
- Make sure DevTools Console is open (F12)
- Check that you're looking at the correct console (page console, not service worker console)
- Try refreshing the page

### Extension not intercepting events?
- Check popup - is protection enabled?
- Check console for errors
- Verify content script loaded: Look for `[Kala] Content script initialized`

### Popup not opening?
- Check if extension icon is visible in toolbar
- Try right-clicking icon → "Inspect popup"
- Check for errors in popup console

### Settings not saving?
- Check service worker console for errors
- Verify Chrome storage permissions in manifest
- Check browser console for storage errors

---

## 📊 Expected Behavior Summary

| Feature | Expected Result |
|---------|----------------|
| Event Interception | All keystrokes intercepted, logged, delayed |
| Delay Range | 30-150ms depending on privacy level |
| Event Ordering | Text appears in correct order |
| Context Detection | Delays adjust for gaming/form/search |
| Tracker Detection | Scans every 5 seconds, logs detections |
| Popup UI | Opens, shows current site, settings work |
| Settings Persistence | Settings saved across reloads |
| Performance | <2ms overhead, smooth typing |

---

## ✅ All Tests Passed?

If all tests pass, your extension is working correctly! 🎉

You can now:
- Use it on any website
- Customize privacy levels per site
- Monitor tracker detections
- Enjoy behavioral privacy protection!

