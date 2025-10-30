# readerMain.js Breakdown Plan

## Current State
- **File:** `js/pages/readerMain.js`
- **Lines:** 1,486 lines
- **Concerns:** 8+ mixed concerns in one file

## Target Architecture

```
js/pages/readerMain/
├── ChapterNavigation.js      (~250 lines) - Chapter loading, routing, URL management
├── BookmarksDrawer.js         (~150 lines) - Bookmarks drawer UI
├── AnnotationsUI.js           (~200 lines) - Annotations panel, selection popover
├── FABController.js           (~100 lines) - Floating Action Button
├── MetadataManager.js         (~120 lines) - SEO meta tags, Open Graph
├── ReaderSettingsUI.js        (~100 lines) - Settings UI bindings
└── index.js                   (~300 lines) - Main coordinator

Total: ~1,220 lines (organized) vs 1,486 lines (monolithic)
```

## Module Responsibilities

### 1. ChapterNavigation.js
**Purpose:** Manages chapter loading, navigation, and routing

**Responsibilities:**
- Load chapters from repository
- Navigate between chapters (next/prev)
- Handle URL routing (path, hash, query params)
- Update URL on navigation
- Resolve "last read" chapter
- Prepare adjacent chapters for preloading

**Key Functions:**
- `selectChapter(index, options)`
- `applyRoute(route)`
- `pathSlug()`, `getHashSlug()`, `getChapterSlugFromQuery()`
- `replaceUrlWithPath(slug, params)`
- `resolveLastRead()`
- `prepareAdjacentChapters(index)`

**Dependencies:**
- ChaptersRepo
- LastReadStore
- Router

---

### 2. BookmarksDrawer.js
**Purpose:** Manages the bookmarks drawer UI

**Responsibilities:**
- Open/close drawer
- Render bookmarks list
- Filter bookmarks (all/current chapter)
- Handle bookmark clicks (jump to bookmark)
- Handle bookmark deletion
- Format relative timestamps
- Subscribe to bookmark changes

**Key Functions:**
- `openBookmarksDrawer()`
- `closeBookmarksDrawer()`
- `renderBookmarksDrawer()`
- `checkPendingBookmarkScroll()`

**Dependencies:**
- AnnotationStore
- ChaptersRepo
- formatRelativeTime utility

---

### 3. AnnotationsUI.js
**Purpose:** Manages annotations panel and selection popover UI

**Responsibilities:**
- Show/hide selection popover
- Handle highlight creation from selection
- Handle note creation
- Render annotations panel (highlights + bookmarks)
- Handle annotation clicks (jump to annotation)
- Handle annotation deletion
- Tab switching (bookmarks vs highlights)
- Update annotation counts

**Key Functions:**
- `updateAnnotationsPanel(slug)`
- Selection popover event handlers
- Annotation panel event handlers
- Tab switching logic

**Dependencies:**
- AnnotationStore
- annotationsController (from createAnnotations)

---

### 4. FABController.js
**Purpose:** Manages the Floating Action Button

**Responsibilities:**
- Show/hide FAB on scroll
- Handle FAB click (add bookmark)
- Show bookmark toast notification
- Hide FAB when search is focused
- Scroll direction detection

**Key Functions:**
- `showFAB()`
- `hideFAB()`
- `handleFABScroll()`
- `handleFABClick()`
- `showBookmarkToast(message)`

**Dependencies:**
- AnnotationStore
- Current chapter state

---

### 5. MetadataManager.js
**Purpose:** Manages SEO metadata and Open Graph tags

**Responsibilities:**
- Update page title
- Set meta description
- Set Open Graph tags
- Set canonical URL
- Extract chapter description
- Build absolute URLs

**Key Functions:**
- `updateChapterMeta(chapter)`
- `extractChapterDescription(chapter)`
- `setMetaTag(attribute, value, content)`
- `setCanonicalLink(url)`
- `buildCanonicalUrl(slug)`
- `toAbsoluteUrl(path)`

**Dependencies:**
- Chapter data
- Meta config

---

### 6. ReaderSettingsUI.js
**Purpose:** Binds reader settings to UI controls

**Responsibilities:**
- Load settings from storage
- Apply settings to DOM
- Handle font size slider
- Handle line height slider
- Handle theme buttons
- Handle layout toggle
- Persist settings changes
- Sync modal theme

**Key Functions:**
- `loadReaderSettings()`
- `applyReaderSettings()`
- `persistReaderSettings()`
- `syncModalTheme()`
- `updateReaderLayoutLabel()`

**Dependencies:**
- ReaderSettingsStore
- Progress trackers

---

### 7. index.js (Main Coordinator)
**Purpose:** Initialize and coordinate all modules

**Responsibilities:**
- DOM element references
- Initialize services (ChaptersRepo, ThemeService)
- Initialize modules (navigation, annotations, etc.)
- Set up keyboard shortcuts
- Initialize reader view and modal
- Initialize progress trackers
- Initialize ToC list
- Initialize search controller
- Wire up basic event listeners (theme toggle, layout toggle)
- Coordinate module interactions

**Keeps:**
- State variables (currentChapterIndex, chapters, etc.)
- Module initialization
- Cross-module coordination
- Main event loop setup

---

## Migration Strategy

### Phase 1: Extract Simple Modules (Low Risk)
1. ✅ MetadataManager.js - Pure utility functions, no dependencies
2. ✅ FABController.js - Self-contained UI logic

### Phase 2: Extract UI Modules (Medium Risk)
3. ✅ BookmarksDrawer.js - Self-contained drawer UI
4. ✅ ReaderSettingsUI.js - Settings UI bindings

### Phase 3: Extract Complex Modules (Higher Risk)
5. ✅ AnnotationsUI.js - Complex UI with state
6. ✅ ChapterNavigation.js - Core navigation logic

### Phase 4: Finalize
7. ✅ Create index.js - Wire everything together
8. ✅ Test all functionality
9. ✅ Remove old readerMain.js

---

## Benefits

### Maintainability
- Each module < 300 lines (easy to understand)
- Clear separation of concerns
- Single responsibility per module

### Testability
- Each module can be unit tested
- Mock dependencies easily
- Test in isolation

### Collaboration
- Multiple developers can work on different modules
- Less merge conflicts
- Clearer ownership

### Future Work
- Easy to add features to specific modules
- Easy to refactor individual modules
- Easy to replace modules (e.g., different bookmark UI)

---

## Implementation Notes

### Module Pattern
Each module will export a factory function:

```javascript
/**
 * Creates metadata manager
 * @param {Object} config - Configuration
 * @returns {Object} Public API
 */
export function createMetadataManager(config) {
  // Private state
  const metaConfig = config.metaConfig;

  // Private functions
  function setMetaTag(...) { }

  // Public API
  return {
    updateChapterMeta,
    buildCanonicalUrl
  };
}
```

### State Management
- Each module manages its own internal state
- Shared state passed via constructor/config
- Modules communicate via callbacks or events

### Dependencies
- Explicit dependencies passed to factory functions
- No hidden global dependencies
- Easy to mock for testing

---

## Estimated Time
- Extraction: 2-3 hours
- Testing: 30-60 minutes
- Total: 3-4 hours

## Risk Mitigation
- Extract one module at a time
- Test after each extraction
- Keep git commits small and focused
- Easy to rollback if issues arise
