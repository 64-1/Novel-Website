# styles.css Reorganization Plan

## Current State
- **File:** `styles.css`
- **Lines:** 4,252 lines
- **Issues:** Single monolithic file, hard to navigate, difficult to maintain

## Target Structure

```
css/
├── base/
│   ├── variables.css       (~100 lines) - CSS variables, themes
│   ├── reset.css          (~50 lines)  - Resets & normalization
│   └── typography.css      (~80 lines)  - Font styles, headings
│
├── layout/
│   ├── container.css       (~50 lines)  - Container, grid basics
│   ├── header.css          (~200 lines) - Site header & navigation
│   └── sections.css        (~100 lines) - Page sections
│
├── components/
│   ├── buttons.css         (~150 lines) - Button styles
│   ├── cards.css           (~200 lines) - Card components
│   ├── forms.css           (~150 lines) - Form elements
│   ├── modals.css          (~200 lines) - Modal dialogs
│   ├── progress.css        (~100 lines) - Progress bars
│   ├── badges.css          (~80 lines)  - Badge components
│   ├── search.css          (~300 lines) - Search UI components
│   └── trending.css        (~250 lines) - Trending section
│
├── reader/
│   ├── immersive.css       (~500 lines) - Immersive reader
│   ├── toolbar.css         (~300 lines) - Reader toolbar
│   ├── audio-player.css    (~250 lines) - Audio controls
│   ├── annotations.css     (~400 lines) - Bookmarks, highlights
│   └── fab.css             (~150 lines) - Floating action button
│
├── pages/
│   ├── landing.css         (~300 lines) - Landing page specific
│   ├── search-page.css     (~200 lines) - Search page specific
│   └── reader-page.css     (~200 lines) - Reader page specific
│
├── utilities/
│   ├── helpers.css         (~100 lines) - Utility classes
│   └── responsive.css      (~150 lines) - Media queries
│
└── main.css                (~50 lines)  - Import all CSS files
```

## Category Breakdown

### 1. Base (~230 lines)
- CSS variables (light/dark themes)
- Resets and normalization
- Typography (body, headings, links)
- Base element styles

### 2. Layout (~350 lines)
- Container and grid
- Site header
- Navigation
- Page sections
- Footer

### 3. Components (~1,430 lines)
- Buttons (primary, secondary, ghost, icon)
- Cards (trending, result, various types)
- Forms (inputs, selects, checkboxes)
- Modals and overlays
- Progress bars
- Badges and labels
- Search components
- Trending section

### 4. Reader (~1,600 lines)
- Immersive reader layout
- Reader toolbar and controls
- Audio player
- Annotations (bookmarks, highlights, drawer)
- FAB and toast notifications

### 5. Pages (~700 lines)
- Landing page specific styles
- Search page specific styles
- Reader page specific styles

### 6. Utilities (~250 lines)
- Helper classes (.visually-hidden, etc.)
- Responsive utilities
- Theme-specific overrides

## Migration Strategy

### Phase 1: Create Structure (Low Risk)
1. Create directory structure
2. Extract variables and base styles
3. Test - nothing should break

### Phase 2: Extract Components (Medium Risk)
4. Extract common components (buttons, cards, forms)
5. Test each extraction

### Phase 3: Extract Features (Higher Risk)
6. Extract reader styles
7. Extract page-specific styles
8. Test thoroughly

### Phase 4: Finalize
9. Create main.css with all imports
10. Update HTML to use main.css
11. Remove old styles.css
12. Final testing

## Benefits

### Maintainability
- Each file < 500 lines (easy to navigate)
- Clear organization by purpose
- Easy to find and update styles

### Performance
- Can lazy-load page-specific CSS
- Better caching (change one file, don't invalidate all)
- Easier to optimize and remove unused styles

### Collaboration
- Multiple developers can work on different files
- Less merge conflicts
- Clear ownership

### Developer Experience
- IDE file search works better
- Easier to understand component styles
- Self-documenting structure

## File Naming Convention

- Use kebab-case: `audio-player.css`
- Be specific: `reader-toolbar.css` not `toolbar.css`
- Group related: `buttons.css`, `forms.css`, `cards.css`

## Import Order in main.css

```css
/* 1. Base - foundational styles */
@import 'base/variables.css';
@import 'base/reset.css';
@import 'base/typography.css';

/* 2. Layout - page structure */
@import 'layout/container.css';
@import 'layout/header.css';
@import 'layout/sections.css';

/* 3. Components - reusable UI */
@import 'components/buttons.css';
@import 'components/cards.css';
@import 'components/forms.css';
@import 'components/modals.css';
@import 'components/progress.css';
@import 'components/badges.css';
@import 'components/search.css';
@import 'components/trending.css';

/* 4. Reader - reader-specific */
@import 'reader/immersive.css';
@import 'reader/toolbar.css';
@import 'reader/audio-player.css';
@import 'reader/annotations.css';
@import 'reader/fab.css';

/* 5. Pages - page-specific */
@import 'pages/landing.css';
@import 'pages/search-page.css';
@import 'pages/reader-page.css';

/* 6. Utilities - last to override */
@import 'utilities/helpers.css';
@import 'utilities/responsive.css';
```

## Testing Checklist

After each extraction:
- [ ] Visual regression test on all pages
- [ ] Test light/dark theme switching
- [ ] Test responsive behavior
- [ ] Check browser DevTools for CSS errors
- [ ] Verify no missing styles

## Rollback Plan

If issues arise:
1. Keep original `styles.css` as backup
2. Can quickly revert HTML to use original
3. Git makes rollback easy

## Timeline Estimate

- Structure creation: 10 minutes
- Base extraction: 20 minutes
- Components extraction: 45 minutes
- Reader extraction: 45 minutes
- Pages extraction: 30 minutes
- Testing: 30 minutes
- **Total: ~3 hours**

## Success Criteria

✅ All styles work identically
✅ No visual regressions
✅ Each file < 500 lines
✅ Clear, logical organization
✅ Easy to find and update styles
✅ Better developer experience
