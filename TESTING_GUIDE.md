# Testing Guide for Refactoring Changes

This guide helps you verify that all refactored code works correctly.

## 🚀 Quick Start

1. Start a local web server in the project directory
2. Open your browser's Developer Console (F12)
3. Follow the test sections below
4. ✅ Check off each item as you test

---

## 📋 Test Checklist

### ✅ 1. Landing Page & Catalog Search (main.js)

**Modified:** `js/main.js` - Uses shared `escapeHtml`, `TIMING.CATALOG_SEARCH_DEBOUNCE`, `createCatalogSearch()`

**Test Steps:**
- [ ] Open the landing page (index.html or main page)
- [ ] Check console for any JavaScript errors
- [ ] Locate the site-wide search box (usually in header)
- [ ] Type a search query (e.g., "novel" or a book title)
- [ ] **Expected:** Search results should appear below the input
- [ ] **Expected:** Results should have properly escaped HTML (no raw tags visible)
- [ ] **Expected:** Search should debounce (not search on every keystroke instantly)
- [ ] Try typing quickly - verify it doesn't lag
- [ ] Try special characters like `<script>alert('test')</script>`
- [ ] **Expected:** Should display as text, not execute
- [ ] Clear the search input
- [ ] **Expected:** Results should clear

**Console Check:**
- [ ] No errors about `escapeHtml` undefined
- [ ] No errors about `TIMING` or `createCatalogSearch`

---

### ✅ 2. Search Page (search.js)

**Modified:** `js/pages/search.js` - Uses shared `escapeHtml`, `createCatalogSearch`, `truncate`

**Test Steps:**
- [ ] Navigate to the dedicated search page (e.g., `/search.html` or `/search`)
- [ ] Check console for errors
- [ ] Enter a search query in the search input
- [ ] **Expected:** Results should display with book cards
- [ ] **Expected:** Long descriptions should be truncated with "…"
- [ ] Verify book titles, authors, and tags are properly escaped
- [ ] Try searching for: `<img src=x onerror=alert('xss')>`
- [ ] **Expected:** Should show as text in results, not execute
- [ ] Try different sort options (if available: trending, popularity, updated)
- [ ] **Expected:** Results should re-sort without errors
- [ ] Click on a search result
- [ ] **Expected:** Should navigate to the book's reader page

**Console Check:**
- [ ] No errors about `escapeHtml`, `truncate`, or `createCatalogSearch`

---

### ✅ 3. Reader Page - Annotations & Highlighting (Annotations.js)

**Modified:** `js/reader/Annotations.js` - Uses shared `escapeHtml`, `LIMITS.MAX_HIGHLIGHTS_PER_CHAPTER`, `TIMING.HIGHLIGHT_FLASH_DURATION`

**Test Steps:**
- [ ] Open any book's reader page
- [ ] Check console for errors
- [ ] Select some text in the chapter
- [ ] **Expected:** A highlight/annotation popover should appear
- [ ] Click "Highlight" or add a highlight
- [ ] **Expected:** Text should be highlighted with a color
- [ ] **Expected:** Highlight should flash/animate for ~2 seconds (HIGHLIGHT_FLASH_DURATION)
- [ ] Add a note/annotation to the highlighted text
- [ ] **Expected:** Note should save and display properly
- [ ] View your annotations list (usually in a sidebar/panel)
- [ ] **Expected:** Annotations should display with escaped HTML
- [ ] Try highlighting text that contains `<b>bold tags</b>`
- [ ] **Expected:** Tags should be escaped, not rendered as bold
- [ ] Jump to a highlight from the annotations list
- [ ] **Expected:** Should scroll to and flash the highlight

**Console Check:**
- [ ] No errors about `LIMITS.MAX_HIGHLIGHTS_PER_CHAPTER`
- [ ] No errors about `TIMING.HIGHLIGHT_FLASH_DURATION`
- [ ] No errors about `escapeHtml`

---

### ✅ 4. Reader Page - Chapter Search (indexer.js)

**Modified:** `js/search/indexer.js` - Uses shared `escapeHtmlDom`

**Test Steps:**
- [ ] On a reader page, locate the in-chapter search feature
- [ ] Check console for errors
- [ ] Enter a search term that appears in the current chapter
- [ ] **Expected:** Search results/highlights should appear
- [ ] **Expected:** Matching text should be highlighted in the chapter
- [ ] **Expected:** Search snippets should have escaped HTML
- [ ] Navigate through search results (next/previous)
- [ ] **Expected:** Should jump between matches smoothly
- [ ] Clear the search
- [ ] **Expected:** Highlights should disappear

**Console Check:**
- [ ] No errors about `escapeHtml` or `escapeHtmlDom`

---

### ✅ 5. Reader Page - Main Reader (readerMain.js)

**Modified:** `js/pages/readerMain.js` - Uses shared `escapeHtml`, `LIMITS.SEARCH_HIGHLIGHT_CAP`, `TIMING.SEARCH_DEBOUNCE`

**Test Steps:**
- [ ] Open a book's reader page
- [ ] Check console for errors
- [ ] Test chapter navigation (previous/next)
- [ ] **Expected:** Chapters should load without errors
- [ ] Open the bookmarks drawer/panel
- [ ] **Expected:** Bookmarks should display with proper formatting
- [ ] Add a bookmark
- [ ] **Expected:** Bookmark should save and appear in the list
- [ ] Test bookmark relative time display (e.g., "5 minutes ago")
- [ ] **Expected:** Time should display in Chinese/localized format
- [ ] Adjust reader settings (font size, line height)
- [ ] **Expected:** Settings should apply immediately
- [ ] Change theme (day/night/sepia)
- [ ] **Expected:** Theme should change without errors
- [ ] Test in-chapter search (if different from #4)
- [ ] **Expected:** Search should work with debouncing

**Console Check:**
- [ ] No errors about constants or utilities
- [ ] No errors about `formatRelativeTime`

---

### ✅ 6. Immersive Reader (immersiveReader.js)

**Modified:** `js/pages/immersiveReader.js` - Uses shared `escapeHtml`

**Test Steps:**
- [ ] Open a book in immersive/fullscreen reader mode
- [ ] Check console for errors
- [ ] Verify chapter content displays correctly
- [ ] Test any annotation features in immersive mode
- [ ] **Expected:** Annotations should display with escaped HTML
- [ ] Adjust font size and theme
- [ ] **Expected:** Settings should apply without errors
- [ ] Navigate between chapters
- [ ] **Expected:** Navigation should work smoothly
- [ ] Exit immersive mode
- [ ] **Expected:** Should return to normal view without errors

**Console Check:**
- [ ] No errors about `escapeHtml`

---

## 🔍 General Console Checks

After testing all sections, check the browser console for:

- [ ] **No import errors** (e.g., "Failed to load module")
- [ ] **No undefined function errors** (e.g., "escapeHtml is not defined")
- [ ] **No constant errors** (e.g., "TIMING is not defined")
- [ ] **No unexpected warnings**

---

## 🐛 Common Issues to Watch For

### Import Path Issues
**Symptom:** `Failed to load module` errors
**Cause:** Incorrect relative import paths in the new utility files
**Check:** Verify all imports in modified files use correct paths

### Missing Exports
**Symptom:** `X is not defined` errors
**Cause:** Function not exported from utility module
**Check:** Verify all utilities use `export` keyword

### Constant Mismatches
**Symptom:** Features behave differently (timing feels off)
**Cause:** Wrong constant value used
**Check:** Compare behavior before/after refactoring

### HTML Escaping Issues
**Symptom:** HTML tags visible as text, or XSS vulnerabilities
**Cause:** Wrong escapeHtml variant used (escapeHtml vs escapeHtmlDom)
**Check:** Test with special characters `<>&"'`

---

## ✅ Success Criteria

**All tests pass if:**
1. ✅ No console errors related to new utilities
2. ✅ All search features work correctly
3. ✅ Annotations and highlights work correctly
4. ✅ Reader settings apply correctly
5. ✅ HTML is properly escaped (no XSS)
6. ✅ Timing/debouncing feels the same as before
7. ✅ All navigation works smoothly

---

## 🚨 If You Find Issues

1. **Note the error message** from the console
2. **Note which test step** caused the error
3. **Check the browser Network tab** for failed file loads
4. **Let me know** and I can help fix it!

---

## 📝 Testing Notes

Use this space to record any issues:

```
Issue 1:
- Page:
- Test:
- Error:
- Console output:

Issue 2:
- Page:
- Test:
- Error:
- Console output:
```

---

## 🎉 After Testing

Once all tests pass:
1. ✅ Mark this refactoring as validated
2. 📝 Create a pull request if not already done
3. 🚀 Ready to move on to next improvements!
