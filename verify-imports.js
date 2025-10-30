/**
 * Quick Import Verification Script
 * Run this in the browser console to verify all new imports load correctly
 *
 * Usage: Copy and paste this entire file into the browser console on any page
 */

(async function verifyImports() {
  console.log('🔍 Starting Import Verification...\n');

  const results = {
    passed: [],
    failed: []
  };

  // List of new modules to verify
  const modules = [
    { path: '/js/utils/htmlSanitize.js', exports: ['escapeHtml', 'escapeHtmlDom'] },
    { path: '/js/utils/constants.js', exports: ['TIMING', 'LIMITS', 'READING', 'HTTP_STATUS', 'STORAGE_KEYS', 'DEFAULTS'] },
    { path: '/js/utils/domHelpers.js', exports: ['$', '$$', 'byId', 'createElement', 'show', 'hide', 'debounce', 'throttle', 'runWhenIdle'] },
    { path: '/js/utils/formatters.js', exports: ['formatRelativeTime', 'formatReadingTime', 'countWordsApprox', 'truncate'] },
    { path: '/js/utils/storage.js', exports: ['getItem', 'setItem', 'removeItem', 'isAvailable'] },
    { path: '/js/services/SearchConfig.js', exports: ['getCatalogSearchConfig', 'createCatalogSearch'] },
    { path: '/js/services/ReaderSettingsManager.js', exports: ['createReaderSettingsManager', 'DEFAULT_SETTINGS', 'applyStandardReaderSettings', 'applyImmersiveReaderSettings'] }
  ];

  // Test each module
  for (const module of modules) {
    try {
      console.log(`Testing: ${module.path}`);
      const imported = await import(module.path);

      // Check if all expected exports exist
      const missingExports = module.exports.filter(exp => !(exp in imported));

      if (missingExports.length === 0) {
        console.log(`  ✅ PASS - All exports found: ${module.exports.join(', ')}`);
        results.passed.push(module.path);
      } else {
        console.error(`  ❌ FAIL - Missing exports: ${missingExports.join(', ')}`);
        results.failed.push({ path: module.path, missing: missingExports });
      }
    } catch (error) {
      console.error(`  ❌ FAIL - Import error:`, error.message);
      results.failed.push({ path: module.path, error: error.message });
    }
    console.log('');
  }

  // Test utility functions
  console.log('🧪 Testing Utility Functions...\n');

  try {
    const { escapeHtml } = await import('/js/utils/htmlSanitize.js');
    const testHTML = '<script>alert("test")</script>';
    const escaped = escapeHtml(testHTML);

    if (escaped.includes('&lt;') && !escaped.includes('<script>')) {
      console.log('  ✅ escapeHtml works correctly');
    } else {
      console.error('  ❌ escapeHtml failed to escape HTML');
      results.failed.push({ test: 'escapeHtml', reason: 'Not escaping properly' });
    }
  } catch (error) {
    console.error('  ❌ Error testing escapeHtml:', error.message);
  }

  try {
    const { TIMING } = await import('/js/utils/constants.js');
    if (typeof TIMING.CATALOG_SEARCH_DEBOUNCE === 'number' && TIMING.CATALOG_SEARCH_DEBOUNCE === 220) {
      console.log('  ✅ Constants loaded correctly');
    } else {
      console.error('  ❌ Constants have unexpected values');
      results.failed.push({ test: 'constants', reason: 'Unexpected values' });
    }
  } catch (error) {
    console.error('  ❌ Error testing constants:', error.message);
  }

  try {
    const { debounce } = await import('/js/utils/domHelpers.js');
    const debouncedFn = debounce(() => {}, 100);
    if (typeof debouncedFn === 'function') {
      console.log('  ✅ debounce function works');
    } else {
      console.error('  ❌ debounce failed');
      results.failed.push({ test: 'debounce', reason: 'Not a function' });
    }
  } catch (error) {
    console.error('  ❌ Error testing debounce:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION RESULTS\n');
  console.log(`✅ Passed: ${results.passed.length}/${modules.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${modules.length}\n`);

  if (results.failed.length === 0) {
    console.log('🎉 All imports verified successfully!');
    console.log('✨ You can now proceed with manual testing.');
  } else {
    console.log('⚠️  Some imports failed:');
    results.failed.forEach(fail => {
      console.log(`  - ${fail.path || fail.test}: ${fail.error || fail.missing?.join(', ') || fail.reason}`);
    });
    console.log('\n🔧 Please fix these issues before continuing.');
  }

  console.log('='.repeat(50));

  return results;
})();
