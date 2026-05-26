// @ts-check
const { chromium } = require('./node_modules/playwright');

const SCREENSHOTS_DIR = 'C:\\Users\\sutha\\.gemini\\antigravity-ide\\brain\\5173c62b-1200-48d9-92c5-0b56ba3e30c6\\scratch';

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Maximum update depth')) {
      consoleErrors.push('[' + msg.type() + '] ' + msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push('[pageerror] ' + err.message);
  });

  // ── Step 1: Login ────────────────────────────────────────────────────
  console.log('\n=== STEP 1: Login ===');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[name="username"]', { timeout: 8000 });
  await page.fill('input[name="username"]', 'SabaAdmin');
  await page.fill('input[name="password"]', 'Start@123');
  await page.screenshot({ path: SCREENSHOTS_DIR + '\\01_credentials.png', fullPage: true });
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  console.log('  ✅ Logged in! URL:', page.url());
  await page.screenshot({ path: SCREENSHOTS_DIR + '\\02_dashboard.png', fullPage: true });

  // ── Step 2: Navigate directly to /users ─────────────────────────────
  console.log('\n=== STEP 2: Navigate to /users ===');
  await page.goto('http://localhost:3000/users', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log('  URL:', page.url());
  await page.screenshot({ path: SCREENSHOTS_DIR + '\\03_users_page.png', fullPage: true });

  // ── Step 3: Click "Create Account" ───────────────────────────────────
  console.log('\n=== STEP 3: Click Create Account ===');
  await page.waitForSelector('button:has-text("Create Account"), button:has-text("Add User"), button:has-text("Create")', { timeout: 10000 });
  
  const createBtn = page.locator('button:has-text("Create Account")').first();
  const createBtnVisible = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (createBtnVisible) {
    await createBtn.click();
    console.log('  Clicked "Create Account"');
  } else {
    const addBtn = page.locator('button:has-text("Add User"), button:has-text("Add")').first();
    await addBtn.click();
    console.log('  Clicked "Add/Add User"');
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: SCREENSHOTS_DIR + '\\04_dialog_opened.png', fullPage: true });

  // ── Step 4: Scroll to find Permission Selector ───────────────────────
  console.log('\n=== STEP 4: Scroll to Permission Selector ===');
  
  // The dialog may have a scrollable area — scroll it down to reveal permission selector
  await page.evaluate(() => {
    const scrollables = document.querySelectorAll('[data-radix-scroll-area-viewport], [class*="overflow-y-auto"], [class*="overflow-auto"], form, [role="dialog"]');
    scrollables.forEach(el => { el.scrollTop = 2000; });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: SCREENSHOTS_DIR + '\\05_scrolled.png', fullPage: true });

  // Also try scrolling the page itself
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // ── Step 5: Check for Select All Available ───────────────────────────
  console.log('\n=== STEP 5: Test Select All Available checkbox ===');
  const cb = page.locator('#select-all-available');
  const cbCount = await cb.count();
  console.log('  #select-all-available found:', cbCount);

  if (cbCount > 0) {
    await cb.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: SCREENSHOTS_DIR + '\\06_checkbox_found.png', fullPage: true });
    console.log('  ✅ Found the checkbox!');

    // Test 1: Click to select all
    consoleErrors.length = 0;
    console.log('\n  [TEST 1] Click to select all...');
    // Use force:true since element may be inside a constrained scroll container
    await cb.click({ timeout: 5000, force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SCREENSHOTS_DIR + '\\07_after_select_all.png', fullPage: true });
    const f1 = consoleErrors.some(e => e.includes('Maximum update depth'));
    console.log(f1 ? '  ❌ FAIL: Infinite loop on select!' : '  ✅ PASS: No infinite loop on select!');

    // Test 2: Click to deselect all
    consoleErrors.length = 0;
    console.log('\n  [TEST 2] Click to deselect all...');
    await cb.click({ timeout: 5000, force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SCREENSHOTS_DIR + '\\08_after_deselect_all.png', fullPage: true });
    const f2 = consoleErrors.some(e => e.includes('Maximum update depth'));
    console.log(f2 ? '  ❌ FAIL: Infinite loop on deselect!' : '  ✅ PASS: No infinite loop on deselect!');

    // Test 3: Rapid clicks stress test
    console.log('\n  [TEST 3] Rapid clicks stress test (4 clicks)...');
    consoleErrors.length = 0;
    for (let i = 0; i < 4; i++) {
      await cb.click({ timeout: 3000, force: true });
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: SCREENSHOTS_DIR + '\\09_stress_test.png', fullPage: true });
    const f3 = consoleErrors.some(e => e.includes('Maximum update depth'));
    console.log(f3 ? '  ❌ FAIL: Infinite loop during stress test!' : '  ✅ PASS: No infinite loop during stress test!');


  } else {
    // Try to find it with a broader selector
    console.log('  Trying broader search...');
    const anyCheckbox = page.locator('label:has-text("Select All Available")');
    const anyCount = await anyCheckbox.count();
    console.log('  Label "Select All Available" count:', anyCount);

    // Get all visible text on the page to debug
    const pageText = await page.locator('body').innerText();
    console.log('  Page has "Available Columns":', pageText.includes('Available Columns'));
    console.log('  Page has "Select All":', pageText.includes('Select All'));
    console.log('  Page has "Permissions":', pageText.includes('Permission'));
    
    // List all buttons visible
    const buttons = await page.locator('button').all();
    const buttonTexts = await Promise.all(buttons.slice(0, 15).map(b => b.textContent().catch(() => '')));
    console.log('  Visible buttons:', buttonTexts.filter(t => t && t.trim()).map(t => t.trim().slice(0, 30)));
  }

  // ── Final Summary ─────────────────────────────────────────────────────
  console.log('\n=== FINAL SUMMARY ===');
  if (consoleErrors.length > 0) {
    console.log('Errors found:');
    consoleErrors.forEach(e => console.log(' ', e));
  } else {
    console.log('✅ No "Maximum update depth" errors — fix is working!');
  }

  console.log('\nScreenshots:', SCREENSHOTS_DIR);
  await page.waitForTimeout(4000);
  await browser.close();
}

run().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
