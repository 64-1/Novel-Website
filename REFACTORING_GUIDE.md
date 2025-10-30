# Code Refactoring Guide

## Overview

This document outlines the refactoring work completed and provides guidance for future improvements to maintain code quality and scalability.

## Refactoring Phase 1: Foundation (Completed)

### 1. Centralized Configuration (`js/config/constants.js`)

**Purpose**: Eliminate magic numbers and strings scattered throughout the codebase.

**What it provides**:
- `STORAGE_KEYS`: All localStorage keys in one place
- `TIMING`: Debounce delays, animation durations, auto-save timings
- `CACHE`: Cache size limits, service worker versions
- `SEARCH`: Fuzzy search thresholds and configuration
- `READER`: Font sizes, line heights, scroll offsets
- `AUDIO`: Volume settings, fade durations
- `SELECTORS`: Commonly used DOM selectors
- `ACTIONS`: Data-action attribute values
- `PATHS`: API endpoints and data file paths
- `THEMES`: Theme name constants
- `ERRORS`: Standardized error messages
- `FEATURES`: Feature flags for toggling functionality
- `VALIDATION`: Validation rules (max lengths, limits)

**Usage Example**:
```javascript
import { STORAGE_KEYS, TIMING, READER } from './js/config/constants.js';

// Instead of:
localStorage.getItem('novel:reader-settings');
setTimeout(debounce, 220);
const maxSize = 32;

// Use:
localStorage.getItem(STORAGE_KEYS.READER_SETTINGS);
setTimeout(debounce, TIMING.DEBOUNCE_DELAY);
const maxSize = READER.MAX_FONT_SIZE;
```

### 2. DOM Utilities (`js/utils/dom.js`)

**Purpose**: Reduce code duplication in DOM manipulation and queries.

**Key Functions**:

| Function | Purpose | Example |
|----------|---------|---------|
| `$(selector)` | Query single element | `const btn = $('.button')` |
| `$$(selector)` | Query all elements | `const btns = $$('.button')` |
| `$action(action)` | Query by data-action | `const toggle = $action('toggle-theme')` |
| `createElement(tag, attrs, ...children)` | Create elements | `createElement('div', {class: 'box'}, 'Text')` |
| `show(elements)` | Show element(s) | `show(modal)` |
| `hide(elements)` | Hide element(s) | `hide(modal)` |
| `toggleClass(el, class)` | Toggle class | `toggleClass(menu, 'open')` |
| `delegate(parent, event, selector, handler)` | Event delegation | `delegate(body, 'click', '.btn', onClick)` |
| `scrollTo(element, options)` | Smooth scroll | `scrollTo(section, {offset: 60})` |
| `trigger(el, event, detail)` | Dispatch custom events | `trigger(btn, 'custom', {data})` |

**Benefits**:
- Shorter, more readable code
- Consistent API across the application
- Easier to test and mock
- Built-in array return for `querySelectorAll`

**Migration Example**:
```javascript
// Before:
const buttons = Array.from(document.querySelectorAll('[data-action="toggle-theme"]'));
buttons.forEach(btn => btn.classList.add('active'));

// After:
import { $$action, addClass } from './js/utils/dom.js';
addClass($$action('toggle-theme'), 'active');
```

### 3. Event Utilities (`js/utils/events.js`)

**Purpose**: Standardize event handling patterns with proper cleanup.

**Key Functions**:

| Function | Purpose | Example |
|----------|---------|---------|
| `debounce(fn, wait)` | Debounce function calls | `const search = debounce(doSearch, 300)` |
| `throttle(fn, limit)` | Throttle function calls | `const scroll = throttle(onScroll, 100)` |
| `on(target, event, handler)` | Add listener with cleanup | `const cleanup = on(btn, 'click', onClick)` |
| `once(target, event, handler)` | One-time listener | `once(img, 'load', onLoad)` |
| `onMultiple(target, events)` | Multiple events at once | `onMultiple(el, {click: f1, hover: f2})` |
| `onKey(keys, handler, mods)` | Keyboard event handler | `onKey('Enter', submit, {ctrl: true})` |
| `onClickOutside(el, handler)` | Detect outside clicks | `onClickOutside(menu, closeMenu)` |
| `onEscape(handler)` | Escape key handler | `onEscape(closeModal)` |
| `createEventBus()` | Pub/sub event bus | `const bus = createEventBus()` |
| `createEventManager()` | Managed event collection | `const events = createEventManager()` |

**Benefits**:
- Automatic cleanup with returned functions
- Prevents memory leaks
- Consistent patterns across the app
- Advanced patterns (debounce, throttle, key combos)

**Migration Example**:
```javascript
// Before:
let timeout;
input.addEventListener('input', (e) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => search(e.target.value), 300);
});

// After:
import { debounce, on } from './js/utils/events.js';
on(input, 'input', debounce((e) => search(e.target.value), 300));
```

### 4. Error Handling (`js/utils/error-handler.js`)

**Purpose**: Centralized, consistent error handling with proper logging.

**Custom Error Classes**:
- `AppError`: Base error class with level and code
- `NetworkError`: Network-related errors
- `StorageError`: localStorage errors
- `ValidationError`: Input validation errors
- `NotFoundError`: Resource not found errors

**Key Functions**:

| Function | Purpose | Example |
|----------|---------|---------|
| `handleError(error, context)` | Log error with context | `handleError(err, {operation: 'load'})` |
| `withErrorHandling(fn, options)` | Wrap async function | `const safe = withErrorHandling(loadData)` |
| `retryWithBackoff(fn, options)` | Retry with exponential backoff | `await retryWithBackoff(fetchData, {maxRetries: 3})` |
| `withTimeout(promise, ms)` | Add timeout to promise | `await withTimeout(fetch(), 5000)` |
| `safeJsonParse(json, fallback)` | Safe JSON parsing | `const data = safeJsonParse(str, {})` |
| `validateRequired(obj, fields)` | Validate required fields | `validateRequired(user, ['id', 'name'])` |
| `createSafeStorage()` | Safe localStorage wrapper | `const storage = createSafeStorage()` |

**Benefits**:
- Consistent error reporting
- Error history tracking
- Custom error handlers
- Automatic global error catching
- Retry logic built-in
- Safe wrappers for common operations

**Usage Example**:
```javascript
import { withErrorHandling, NetworkError, handleError } from './js/utils/error-handler.js';

// Wrap functions for automatic error handling
const safeLoadChapter = withErrorHandling(
  async (id) => {
    const response = await fetch(`/chapters/${id}.json`);
    if (!response.ok) throw new NetworkError('Failed to load', response.status);
    return response.json();
  },
  {
    context: { operation: 'loadChapter' },
    fallback: null
  }
);

// Use it
const chapter = await safeLoadChapter(123);
```

## Refactoring Phase 2: Module Splitting (Recommended)

### Issues Identified

**Critical Files Requiring Refactoring**:

1. **`js/app/initApp.js` (1192 lines)** - Monolithic initialization
   - Mixed concerns: reader, writer, music, settings
   - ~90+ DOM queries at initialization
   - Difficult to test or modify

2. **`js/pages/readerMain.js` (1489 lines)** - Large page script
   - Similar structure to initApp.js
   - Duplicate patterns
   - Mixed concerns

3. **`styles.css` (74KB, 1800+ lines)** - Monolithic stylesheet
   - No clear organization
   - Could benefit from component structure

### Recommended Splitting Strategy

#### Split `initApp.js` into:

```
js/app/
├── initApp.js           # Main coordinator (reduced to ~200 lines)
├── initReader.js        # Reader-specific initialization
├── initWriter.js        # Writer studio initialization
├── initMusic.js         # Music player setup
├── initSettings.js      # Settings & theme management
└── initShortcuts.js     # Keyboard shortcuts (may already exist)
```

**Benefits**:
- Each module has single responsibility
- Easier to test individual features
- Parallel development possible
- Lazy loading opportunities
- Clearer dependencies

#### Example Split Structure:

**initApp.js (coordinator)**:
```javascript
import { initReader } from './initReader.js';
import { initWriter } from './initWriter.js';
import { initMusic } from './initMusic.js';
import { initSettings } from './initSettings.js';
import { $ } from '../utils/dom.js';

export function initApp(dependencies) {
  // Common setup
  const body = $('body');

  // Feature detection
  const hasReader = $('.reader-content');
  const hasWriter = $('#writer-editor');
  const hasMusic = $('#music-mood');

  // Initialize features based on presence
  if (hasReader) initReader(dependencies);
  if (hasWriter) initWriter(dependencies);
  if (hasMusic) initMusic(dependencies);

  // Always init settings
  initSettings(dependencies);
}
```

### Split `styles.css` into:

**Option A: Component-based CSS files**
```
css/
├── base/
│   ├── reset.css
│   ├── variables.css
│   └── typography.css
├── components/
│   ├── buttons.css
│   ├── modals.css
│   ├── reader.css
│   ├── writer.css
│   └── navigation.css
├── layouts/
│   ├── grid.css
│   └── responsive.css
└── utilities/
    └── helpers.css
```

**Option B: Keep single file but organize with comments**
- Add clear section headers
- Group related rules
- Add table of contents at top
- Document color/spacing systems

## Migration Guidelines

### How to Start Using New Utilities

1. **Start with new features**: Use utilities in all new code
2. **Gradual migration**: Refactor files as you touch them
3. **Test thoroughly**: Ensure behavior remains the same
4. **Update imports**: Add imports at top of files

### Example Migration Process

**Step 1**: Import utilities at top of file
```javascript
import { $, $$, show, hide, toggleClass } from '../utils/dom.js';
import { on, debounce, onKey } from '../utils/events.js';
import { STORAGE_KEYS, TIMING, SELECTORS } from '../config/constants.js';
```

**Step 2**: Replace old patterns
```javascript
// Before:
const button = document.querySelector('[data-action="submit"]');
button.addEventListener('click', handleClick);

// After:
const button = $action('submit');
on(button, 'click', handleClick);
```

**Step 3**: Test functionality
- Verify all interactions work
- Check console for errors
- Test edge cases

## Testing Recommendations

### Unit Testing Setup

Recommended libraries:
- **Vitest** or **Jest**: Test runner
- **@testing-library/dom**: DOM testing utilities
- **happy-dom** or **jsdom**: DOM environment

### Priority Test Coverage

1. **Utility functions** (high ROI):
   - `js/utils/dom.js`
   - `js/utils/events.js`
   - `js/utils/error-handler.js`

2. **Services** (business logic):
   - `js/services/Stores.js`
   - `js/services/ChaptersRepo.js`
   - `js/services/ThemeService.js`

3. **Components** (integration):
   - Reader view
   - Progress tracker
   - Annotations

### Example Test Structure

```javascript
// tests/utils/dom.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { $, $$, show, hide, toggleClass } from '../../js/utils/dom.js';

describe('DOM Utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="test hidden"></div>';
  });

  it('should query element', () => {
    const el = $('.test');
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('should show hidden element', () => {
    const el = $('.test');
    show(el);
    expect(el.classList.contains('hidden')).toBe(false);
  });
});
```

## Code Style Guidelines

### General Principles

1. **Single Responsibility**: Each function/module does one thing well
2. **DRY (Don't Repeat Yourself)**: Use utilities instead of duplicating
3. **Clear Naming**: Use descriptive names, avoid abbreviations
4. **Document Complex Logic**: Add comments for non-obvious code
5. **Error Handling**: Always handle errors, never silent fails
6. **Consistent Formatting**: Follow existing patterns

### Naming Conventions

- **Functions**: `camelCase`, verb-based (`loadChapter`, `updateProgress`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_SIZE`, `API_URL`)
- **Classes**: `PascalCase` (`ChapterRepo`, `ThemeService`)
- **Private**: Prefix with `_` (`_internalMethod`)
- **Boolean**: Prefix with `is`/`has`/`can` (`isOpen`, `hasError`)

### Import Order

```javascript
// 1. External libraries
import Fuse from 'https://cdn.jsdelivr.net/.../fuse.js';

// 2. Internal utilities
import { $, show, hide } from '../utils/dom.js';
import { on, debounce } from '../utils/events.js';

// 3. Config
import { STORAGE_KEYS, TIMING } from '../config/constants.js';

// 4. Services
import { ChaptersRepo } from '../services/ChaptersRepo.js';

// 5. Components
import { createReaderView } from '../reader/ReaderView.js';
```

## Performance Considerations

### Current Optimizations

✅ Service worker for offline caching
✅ Chapter caching (max 2 in memory)
✅ Debounced search and scroll handlers
✅ Lazy loading of chapters

### Recommended Improvements

1. **Code Splitting**: Load features only when needed
   ```javascript
   // Load writer only when user navigates to it
   const { initWriter } = await import('./initWriter.js');
   ```

2. **Virtual Scrolling**: For long chapter lists
3. **Web Workers**: For search indexing
4. **Image Optimization**: Lazy load, responsive images
5. **CSS Containment**: Use `contain` property for isolated components

## Browser Compatibility

**Target**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)

**Required Features**:
- ES6 Modules
- Async/Await
- Custom Elements (optional, for future)
- CSS Custom Properties
- Service Workers

**Polyfills Not Required**:
- Most ES6+ features are widely supported
- Drop support for IE11

## Next Steps

### Immediate Actions (Now)

1. ✅ Start using new utilities in new code
2. ✅ Read through utility documentation
3. ✅ Update constants.js with any missing values
4. Review REFACTORING_GUIDE.md with team

### Short Term (Next Sprint)

5. Split initApp.js into feature modules
6. Refactor readerMain.js similarly
7. Add JSDoc comments to existing services
8. Set up testing infrastructure

### Medium Term (Next Month)

9. Organize styles.css with clear sections
10. Add unit tests for utilities
11. Add integration tests for key flows
12. Create component documentation

### Long Term (Ongoing)

13. Migrate all files to use utilities
14. Achieve 70%+ test coverage
15. Consider build tool (Vite recommended)
16. Performance monitoring setup

## Questions & Support

For questions about:
- **Utilities usage**: Check JSDoc comments in source files
- **Migration strategy**: Refer to Migration Guidelines section
- **Testing**: See Testing Recommendations section
- **Architecture decisions**: Review this guide's Overview section

## Version History

- **v1.0** (2025-10-30): Initial refactoring - Added utilities and constants
- **Future**: Module splitting, testing infrastructure

---

**Remember**: Refactoring is iterative. Focus on steady improvement, not perfection.
