# CSS Organization Guide

## Overview

The `styles.css` file is **74KB (approximately 1,800 lines)** and contains all styles for the Novel Website application. This guide helps you navigate and understand the structure.

## Quick Navigation

Use your editor's "Go to line" feature or search for these key selectors:

### Core Layout & Theme

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **CSS Variables** | `:root` | 1-28 |
| **Dark Theme** | `body.dark-shell` | 30-52 |
| **Reset & Base** | `*, body` | 54-65 |
| **Container** | `.container` | 98-102 |

### Navigation & Header

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Site Header** | `.site-header` | ~105 |
| **Brand/Logo** | `.brand` | ~120 |
| **Primary Nav** | `.primary-nav` | ~135 |
| **Header Actions** | `.header-actions` | ~150 |
| **Header Search** | `.header-search` | ~165 |

### Search Feature

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Search Page** | `.search-page` | ~250 |
| **Search Hero** | `.search-hero` | ~270 |
| **Search Form** | `.search-page-form` | ~290 |
| **Trending Section** | `.trending-section` | ~320 |
| **Search Results** | `.search-results` | ~380 |
| **Result Items** | `.result-item` | ~200 |

### Immersive Reader

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Immersive Layout** | `.immersive-layout` | ~450 |
| **Reader Stage** | `.immersive-stage` | ~470 |
| **Reader Article** | `.immersive-article` | ~500 |
| **Reader Toolbar** | `.immersive-toolbar` | ~550 |
| **Reader Topbar** | `.immersive-topbar` | ~600 |
| **Progress Indicators** | `.immersive-progress` | ~650 |
| **Theme Pills** | `.theme-pill` | ~680 |
| **Typography Controls** | `.slider-group` | ~700 |

### Landing Page

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Hero Section** | `.hero` | ~750 |
| **Hero Actions** | `.hero-actions` | ~800 |
| **Continue Reading** | `.continue-reading-card` | ~820 |
| **Hero Visual** | `.hero-visual` | ~860 |
| **Floating Cards** | `.floating-card` | ~900 |
| **Section Headers** | `.section-header` | ~920 |

### Discovery & Cards

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Discovery Grid** | `.discovery-grid` | ~980 |
| **Story Cards** | `.story-card` | ~1000 |
| **Story Cover** | `.story-cover` | ~1020 |
| **Story Meta** | `.story-meta` | ~1050 |
| **Feature Cards** | `.feature-card` | ~1080 |

### Reader Lab (Main Reader)

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Reader Lab** | `.reader-lab` | ~1120 |
| **Reader Grid** | `.reader-grid` | ~1140 |
| **Reader Content** | `.reader-content` | ~1170 |
| **Chapter Text** | `.chapter-text` | ~1200 |
| **TOC Drawer** | `.toc-drawer` | ~1250 |
| **TOC List** | `.toc ol` | ~1280 |
| **Reader Settings** | `.reader-settings` | ~1320 |
| **Annotations** | `.annotation` | ~1360 |
| **Reader Progress** | `[data-progress="reader"]` | ~1190 |

### Writer Studio

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Writer Studio** | `.writer-studio` | ~1400 |
| **Writer Layout** | `.writer-layout` | ~1420 |
| **Writer Panels** | `.writer-panels` | ~1450 |
| **Writer Tabs** | `.writer-tabs` | ~1480 |
| **Editor** | `#draft-body` | ~1510 |
| **Preview** | `.preview-panel` | ~1540 |
| **Music Controls** | `.music-controls` | ~1570 |
| **Note List** | `.note-list` | ~1600 |

### UI Components

| Component | Key Selector | Approximate Line |
|-----------|--------------|------------------|
| **Buttons** | `.btn` | ~740 |
| **FAB** | `.fab` | ~1650 |
| **Modal** | `.modal` | ~1680 |
| **Toast** | `.toast` | ~1710 |
| **Progress Bar** | `.progress-bar` | ~780 |
| **Sliders** | `input[type="range"]` | ~710 |
| **Pills** | `.pill` | ~670 |

### Responsive Design

| Breakpoint | Media Query | Approximate Line |
|-----------|-------------|------------------|
| **Tablet** | `@media (max-width: 768px)` | ~1750 |
| **Mobile** | `@media (max-width: 480px)` | ~1780 |

## Design System Reference

### Color Variables

#### Light Theme
```css
--bg-base: #f5f7fb
--surface: #ffffff
--primary: #3a70ff
--text-strong: #121926
--text-body: #334155
--text-muted: #64748b
```

#### Dark Theme
```css
--bg-base: #0b1120
--surface: rgba(15, 23, 42, 0.85)
--primary: #8da2ff
--text-strong: #f8fafc
--text-body: #e2e8f0
--text-muted: #94a3b8
```

### Spacing System

The app uses consistent spacing values:
- **Container**: `width: min(1120px, 92vw)`
- **Section padding**: Typically `3rem` to `5rem`
- **Card padding**: `1.5rem` to `2rem`
- **Gap between items**: `1rem` to `2rem`

### Border Radius

```css
--radius-lg: 26px   /* Large cards, modals */
--radius-md: 18px   /* Medium components */
--radius-sm: 12px   /* Small elements, buttons */
```

### Transitions

```css
--transition: 220ms ease  /* Standard transition duration */
```

### Typography Scale

Typography is handled through:
- **Font size range**: 0.875rem to 2.5rem
- **Line height**: 1.4 to 1.8
- **Font weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## Common Patterns

### Glass Morphism Effect

Many components use a glass morphism effect:
```css
background: var(--surface-blur);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
```

### Shadow System

```css
--shadow-soft: 0 18px 40px rgba(15, 23, 42, 0.08)  /* Light mode */
--shadow-soft: 0 18px 40px rgba(2, 6, 23, 0.65)     /* Dark mode */
```

Additional shadows used:
- `box-shadow: 0 4px 20px rgba(...)` - Medium elevation
- `box-shadow: 0 8px 32px rgba(...)` - High elevation
- `box-shadow: 0 1px 3px rgba(...)` - Subtle borders

### Hover States

Most interactive elements use:
```css
transition: var(--transition);
transform: translateY(-2px);  /* Lift effect */
box-shadow: /* Enhanced shadow */
```

### Focus States

Keyboard focus uses:
```css
outline: 2px solid var(--primary);
outline-offset: 2px;
```

## Modifying Styles

### Finding the Right Selector

1. **Inspect element** in browser DevTools
2. **Note the class names** from the element
3. **Search for the class** in styles.css using table above
4. **Make changes** in that section

### Adding New Styles

**Best Practices**:

1. **Use existing variables** - Don't hardcode colors or spacing
   ```css
   /* Good */
   color: var(--text-body);
   padding: 1.5rem;

   /* Avoid */
   color: #334155;
   padding: 24px;
   ```

2. **Follow naming conventions**:
   - Component: `.story-card`
   - Element: `.story-card-title`
   - Modifier: `.story-card--featured`

3. **Group related styles** together
4. **Add comments** for complex sections
5. **Consider mobile** from the start

### Testing Changes

After modifying styles:
- ✅ Test in both light and dark themes
- ✅ Check responsive behavior
- ✅ Verify in different browsers
- ✅ Test keyboard navigation focus styles
- ✅ Check for contrast accessibility

## Performance Considerations

### Current Optimizations

- ✅ `content-visibility: auto` for heavy sections
- ✅ `contain-intrinsic-size` for layout stability
- ✅ CSS variables for dynamic theming
- ✅ Efficient selectors (mostly single class)

### Recommendations

1. **Avoid overly specific selectors**
   ```css
   /* Good */
   .card-title { }

   /* Avoid */
   .container .section .card .title { }
   ```

2. **Use CSS containment** for isolated components
   ```css
   .card {
     contain: layout style paint;
   }
   ```

3. **Minimize layout thrashing**
   - Avoid reading layout properties in JS
   - Batch DOM reads and writes

## Future Refactoring Options

### Option 1: Split into Multiple Files

Recommended structure:
```
css/
├── base/
│   ├── variables.css      (design tokens)
│   ├── reset.css          (base styles)
│   └── typography.css     (font styles)
├── layout/
│   ├── container.css
│   ├── grid.css
│   └── responsive.css
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── modals.css
│   ├── navigation.css
│   └── forms.css
├── features/
│   ├── reader.css
│   ├── writer.css
│   ├── search.css
│   └── immersive.css
└── utilities/
    └── helpers.css
```

Import in main HTML:
```html
<link rel="stylesheet" href="/css/base/variables.css">
<link rel="stylesheet" href="/css/base/reset.css">
<!-- etc -->
```

Or use a build tool to concatenate.

### Option 2: CSS Modules with Build Tool

Use a bundler (Vite, Webpack) to:
- Split CSS by component
- Scope styles automatically
- Generate optimized bundles
- Enable CSS-in-JS if needed

### Option 3: Adopt Utility-First (Tailwind-like)

Migrate gradually to utility classes:
- Reduce custom CSS
- Increase consistency
- Improve maintainability
- Faster development

## Accessibility Notes

### Current Accessibility Features

✅ Color contrast meets WCAG AA
✅ Focus indicators on interactive elements
✅ Reduced motion support ready
✅ Semantic color naming

### Improvements Needed

⚠️ Add `prefers-reduced-motion` support:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

⚠️ High contrast mode support
⚠️ Larger touch targets for mobile (min 44x44px)

## Common Issues & Solutions

### Issue: Theme not applying
**Solution**: Check `body.dark-shell` class is added

### Issue: Layout breaking on mobile
**Solution**: Check responsive media queries at end of file

### Issue: Colors looking wrong
**Solution**: Ensure CSS variables are properly set in `:root`

### Issue: Hover effects not smooth
**Solution**: Check `--transition` variable is applied

## Questions & Support

When working with styles:
1. **Check this guide first** for location references
2. **Use browser DevTools** to inspect live styles
3. **Reference design tokens** in `:root` section
4. **Test thoroughly** across themes and devices

## Version History

- **v1.0** (Current): Single-file CSS with all styles
- **Future**: Consider modular CSS architecture

---

**Note**: Line numbers are approximate. Use selector names to search in your editor.
