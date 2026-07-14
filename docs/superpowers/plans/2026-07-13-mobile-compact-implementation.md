# Compact Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the D'Pylar mobile experience into a compact, editorial layout with the reception photo in the home hero, one persistent scheduling action, and no regression to the approved desktop design.

**Architecture:** Keep the current multi-page static site and existing JavaScript navigation. Add a small Node built-in test suite that treats the HTML/CSS/JS structure as a contract, normalize the shared mobile markup in all six pages, remove the abandoned home-tab experiment, and replace the current scattered mobile rules with one final scoped layer at the end of `style.css`. Work in the current directory because the approved design is based on the user's uncommitted files; do not reset, overwrite, or include unrelated asset changes.

**Tech Stack:** HTML5, CSS custom properties and media queries, vanilla JavaScript, Node.js `node:test`, in-app Browser visual QA.

---

## Task 1: Add a failing mobile structure contract

**Files:**
- Create: `tests/mobile-layout.test.cjs`
- Test: `tests/mobile-layout.test.cjs`

- [ ] **Step 1: Create the test directory and the complete contract test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html',
  'servicos.html',
  'sobre.html',
  'equipe.html',
  'local.html',
  'ambiente.html',
];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function getBlock(html, className) {
  const match = html.match(
    new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'i'),
  );
  assert.ok(match, `Expected .${className}`);
  return match[1];
}

test('every page has one mobile scheduling CTA and no duplicate WhatsApp CTA', () => {
  for (const page of pages) {
    const bar = getBlock(read(page), 'mobile-bar');
    assert.equal((bar.match(/mb-primary/g) || []).length, 1, page);
    assert.doesNotMatch(bar, /mb-secondary|wa\.me/i, page);
    assert.match(bar, /Agendar hor[aá]rio/i, page);
  }
});

test('every mobile menu keeps WhatsApp and theme controls accessible', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /class="mobile-menu-whatsapp"[^>]*>[\s\S]*?WhatsApp/i, page);
    assert.match(html, /class="mobile-theme-toggle"[^>]*>[\s\S]*?tema/i, page);
  }
});

test('home hero uses the reception image with meaningful dimensions and alt text', () => {
  const html = read('index.html');
  assert.match(
    html,
    /<img[^>]+src="assets\/ambiente-recepcao\.jpg"[^>]+width="1280"[^>]+height="2276"[^>]+alt="Recepção da D'Pylar em Campina Grande"/,
  );
});

test('the abandoned mobile-tab implementation is removed', () => {
  const script = read('script.js');
  const css = read('style.css');
  assert.doesNotMatch(script, /mobile-tab|m-tab-panel|openHomeTab/);
  assert.doesNotMatch(css, /body\.page-home|mobile-tabs|home-shortcuts/);
});

test('the final compact mobile layer includes the approved behavior', () => {
  const css = read('style.css');
  const layer = css.slice(css.indexOf('/* MOBILE COMPACTO */'));
  assert.ok(layer.length > 0, 'Missing compact mobile layer marker');
  assert.match(layer, /@media\s*\(max-width:\s*900px\)/);
  assert.match(layer, /\.float-wa\s*{[^}]*display:\s*none/s);
  assert.match(layer, /\.page-hero\s*{[^}]*padding:\s*96px 16px 28px/s);
  assert.match(layer, /\.hero-photo\s*{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  assert.match(layer, /\.mobile-bar\s+\.mb-primary\s*{[^}]*flex:\s*1/s);
});

test('all non-empty local image references resolve to files', () => {
  for (const page of pages) {
    const html = read(page);
    for (const [, source] of html.matchAll(/\bsrc="(assets\/[^"]+)"/g)) {
      assert.ok(fs.existsSync(path.join(root, source)), `${page}: missing ${source}`);
    }
  }
});
```

- [ ] **Step 2: Run the contract test and confirm the intended failures**

Run: `node --test tests/mobile-layout.test.cjs`

Expected: FAIL for the duplicate mobile WhatsApp CTA, missing menu theme control, old eyebrow hero image, dead tab code, and missing compact layer. The asset-resolution test should pass.

- [ ] **Step 3: Capture the baseline without committing user work**

Run: `git diff -- tests/mobile-layout.test.cjs`

Expected: only the newly created test is shown. Keep it unstaged until the implementation has passed visual review because the working tree already contains user-owned changes.

## Task 2: Normalize the shared mobile actions on all pages

**Files:**
- Modify: `index.html`
- Modify: `servicos.html`
- Modify: `sobre.html`
- Modify: `equipe.html`
- Modify: `local.html`
- Modify: `ambiente.html`
- Test: `tests/mobile-layout.test.cjs`

- [ ] **Step 1: Add the two mobile-menu utilities before the existing scheduling link in every `.mobile-overlay`**

Use the page's current WhatsApp message parameter and insert this structure after the last navigation link:

```html
<a class="mobile-menu-whatsapp" href="https://wa.me/5583986249039" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
<button type="button" class="mobile-theme-toggle" onclick="toggleTheme()" aria-label="Alternar tema">Alternar tema</button>
```

Keep the existing `Agendar agora` Trinks link as the final primary action in the overlay. Do not alter the desktop navigation links or their active state.

- [ ] **Step 2: Replace the two-button bottom bar on every page with one scheduling action**

```html
<div class="mobile-bar" role="navigation" aria-label="Agendamento rápido">
  <a href="https://dpylarbeautycare.trinks.com/" target="_blank" rel="noopener noreferrer" class="mb-primary">Agendar horário</a>
</div>
```

- [ ] **Step 3: Run the mobile-action tests**

Run: `node --test --test-name-pattern="mobile scheduling|mobile menu" tests/mobile-layout.test.cjs`

Expected: PASS for both tests.

- [ ] **Step 4: Review only the six shared-markup diffs**

Run: `git diff -- index.html servicos.html sobre.html equipe.html local.html ambiente.html`

Expected: navigation content remains unchanged; each page gains the two menu utilities and loses only the secondary bottom-bar CTA.

## Task 3: Recompose the home hero around the reception

**Files:**
- Modify: `index.html`
- Test: `tests/mobile-layout.test.cjs`

- [ ] **Step 1: Replace only the hero image element**

```html
<img src="assets/ambiente-recepcao.jpg" width="1280" height="2276" alt="Recepção da D'Pylar em Campina Grande" fetchpriority="high" decoding="async">
```

Keep the hero copy, rating badge, testimonial proof, Trinks action, and service link in place; CSS will change their mobile hierarchy.

- [ ] **Step 2: Run the hero contract test**

Run: `node --test --test-name-pattern="home hero" tests/mobile-layout.test.cjs`

Expected: PASS.

- [ ] **Step 3: Verify that desktop receives no structural redesign**

Run: `git diff --word-diff=plain -- index.html`

Expected: inside `.hero-photo`, only `src`, dimensions, and `alt` change; all other home hero markup is preserved.

## Task 4: Remove the unfinished home-tab branch

**Files:**
- Modify: `script.js`
- Modify: `style.css`
- Test: `tests/mobile-layout.test.cjs`

- [ ] **Step 1: Remove dead JavaScript from the top of `script.js`**

Delete the complete block that defines or references:

```js
const mobileTabs = document.querySelectorAll('.mobile-tab[data-tab]');
const mobilePanels = document.querySelectorAll('.m-tab-panel[data-panel]');
function openHomeTab() {}
```

Remove the related tab click handlers and URL-hash synchronization through the end of that feature block. Preserve `toggleMenu`, `closeMenu`, `toggleTheme`, scroll reveal, lightboxes, and page-specific behavior.

- [ ] **Step 2: Remove the dead CSS selectors and their complete rule blocks**

Delete all rules for:

```css
body.has-mobile-tabs
.mobile-tabs
.mobile-tab
.m-tab-panel
body.page-home
.home-shortcuts
```

Do not remove generic service, about, team, local, footer, or desktop component rules that are shared by the live pages.

- [ ] **Step 3: Run the dead-code test**

Run: `node --test --test-name-pattern="abandoned mobile-tab" tests/mobile-layout.test.cjs`

Expected: PASS.

- [ ] **Step 4: Confirm JavaScript syntax**

Run: `node --check script.js`

Expected: exit code 0 with no output.

## Task 5: Add the final compact mobile CSS layer

**Files:**
- Modify: `style.css`
- Test: `tests/mobile-layout.test.cjs`

- [ ] **Step 1: Add the shared control defaults before the final media layer**

```css
.mobile-theme-toggle {
  display: none;
  appearance: none;
  border: 1px solid var(--border-soft);
  background: transparent;
  color: var(--mobile-overlay-text);
  font: inherit;
  cursor: pointer;
}
```

- [ ] **Step 2: Append the approved mobile layer at the end of `style.css`**

```css
/* MOBILE COMPACTO */
@media (max-width: 900px) {
  body.has-mobile-bar {
    padding-bottom: calc(76px + env(safe-area-inset-bottom));
  }

  .nav-inner {
    height: 64px;
    padding-inline: 16px;
  }

  .nav-controls > .theme-toggle {
    display: none;
  }

  .mobile-overlay {
    gap: 18px;
    padding: 84px 24px 32px;
    overflow-y: auto;
  }

  .mobile-overlay a {
    font-size: 1.05rem;
  }

  .mobile-overlay .mobile-menu-whatsapp {
    margin-top: 10px;
    color: var(--green);
    font-weight: 700;
  }

  .mobile-theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 10px 18px;
    border-radius: 999px;
  }

  .mobile-bar {
    left: 12px;
    right: 12px;
    bottom: max(10px, env(safe-area-inset-bottom));
    width: auto;
    padding: 8px;
    border: 1px solid var(--border-soft);
    border-radius: 18px;
    box-shadow: var(--shadow-lg);
  }

  .mobile-bar .mb-primary {
    flex: 1;
    min-height: 48px;
    border-radius: 13px;
  }

  .float-wa {
    display: none;
  }

  .hero {
    min-height: 0;
    padding: 82px 16px 14px;
  }

  .hero-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
  }

  .hero-copy {
    max-width: none;
  }

  .hero h1 {
    max-width: 13ch;
    margin: 8px 0 10px;
    font-size: clamp(2rem, 9vw, 2.7rem);
    line-height: 0.98;
  }

  .hero-desc {
    max-width: 35rem;
    margin-bottom: 16px;
    font-size: 0.94rem;
    line-height: 1.55;
  }

  .hero-actions {
    align-items: center;
    gap: 14px;
    margin-bottom: 0;
  }

  .hero-actions .btn-primary {
    min-height: 44px;
    padding: 11px 18px;
  }

  .hero-actions .btn-ghost {
    min-height: auto;
    padding: 4px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--green);
    font-size: 0.82rem;
    text-decoration: underline;
    text-underline-offset: 4px;
    box-shadow: none;
  }

  .hero-proof {
    display: none;
  }

  .hero-photo {
    width: 100%;
    min-height: 0;
    aspect-ratio: 16 / 9;
    border-radius: 20px;
  }

  .hero-photo img {
    object-position: center 58%;
  }

  .hero-badge {
    right: 10px;
    bottom: 10px;
    padding: 8px 11px;
    border-radius: 12px;
  }

  .marquee {
    display: none;
  }

  .trust-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 16px 12px;
  }

  .trust-item {
    min-width: 0;
    padding: 0 7px;
    font-size: 0.7rem;
    line-height: 1.25;
    text-align: center;
  }

  .trust-item:nth-child(n + 4) {
    display: none;
  }

  .page-hero {
    min-height: 0;
    padding: 96px 16px 28px;
  }

  .page-hero .container {
    text-align: left;
  }

  .page-hero h1 {
    margin-bottom: 8px;
    font-size: clamp(1.9rem, 8vw, 2.5rem);
    line-height: 1;
  }

  .page-hero p {
    max-width: 34rem;
    margin-inline: 0;
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .section {
    padding: 44px 16px;
  }

  .srv-detail-img {
    max-height: 240px;
  }

  .srv-detail-body {
    padding: 20px 18px 22px;
  }

  .about-frame,
  .founder-frame {
    max-height: 300px;
  }

  .tf-photo {
    max-height: 300px;
    aspect-ratio: 4 / 3;
  }

  .local-carousel-section {
    padding-block: 32px;
  }

  .local-slide {
    flex-basis: 168px;
    height: 126px;
  }

  .env-frame,
  .env-detail-frame {
    aspect-ratio: 16 / 10;
  }

  .footer {
    padding-bottom: 94px;
  }
}

@media (max-width: 600px) {
  .hero-actions {
    flex-wrap: wrap;
  }

  .trust-item svg,
  .trust-item img {
    width: 18px;
    height: 18px;
  }

  .srv-detail-img,
  .about-frame,
  .founder-frame,
  .tf-photo {
    max-height: 260px;
  }
}
```

- [ ] **Step 3: Run the full static contract suite**

Run: `node --test tests/mobile-layout.test.cjs`

Expected: all six tests PASS.

- [ ] **Step 4: Inspect cascade conflicts**

Run: `rg -n "MOBILE COMPACTO|float-wa|page-hero|hero-photo|mobile-bar|mobile-theme-toggle" style.css`

Expected: the final `MOBILE COMPACTO` rules are last in cascade; old base rules may remain, but no later mobile rule overrides the approved values.

## Task 6: Verify the responsive result in the Browser

**Files:**
- Verify: `index.html`
- Verify: `servicos.html`
- Verify: `sobre.html`
- Verify: `equipe.html`
- Verify: `local.html`
- Verify: `ambiente.html`
- Verify: `style.css`
- Verify: `script.js`

- [ ] **Step 1: Start or reuse a local static server**

Run: `python -m http.server 4173 --bind 127.0.0.1`

Expected: site responds at `http://127.0.0.1:4173/`.

- [ ] **Step 2: Check the approved phone viewport**

Use the in-app Browser at `390 × 844` and inspect all six pages.

Expected on home: title, description, primary action, text service link, full reception crop, rating badge, and three trust items fit without the floating WhatsApp overlap. Expected on internal pages: compact hero, first meaningful content visible earlier, capped image height, and one unobstructed bottom scheduling action.

- [ ] **Step 3: Check the larger phone and tablet breakpoints**

Use `430 × 932` and `768 × 1024`.

Expected: no horizontal scroll, no clipped menu content, no CTA overlap, and readable 44px-or-larger touch targets.

- [ ] **Step 4: Check desktop preservation**

Use `1280 × 720` on home and at least two internal pages.

Expected: desktop navigation, grids, floating WhatsApp, typography, and spacing remain visually unchanged; the home hero now uses the reception image.

- [ ] **Step 5: Exercise interactions**

Open and close the hamburger menu; activate the mobile theme toggle; follow the service text link; inspect Trinks and WhatsApp targets without submitting external actions.

Expected: Escape/close behavior works, theme switches without closing access to navigation, links are correct, and focus is visible.

## Task 7: Final verification and safe handoff

**Files:**
- Verify: all files above

- [ ] **Step 1: Run final automated checks from a clean terminal prompt**

Run: `node --check script.js`

Expected: exit code 0.

Run: `node --test tests/mobile-layout.test.cjs`

Expected: 6 tests, 6 PASS, 0 FAIL.

- [ ] **Step 2: Audit the final diff and repository state**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: the user's pre-existing asset and page changes remain present; no temporary screenshots, servers, or visual-companion files are added.

- [ ] **Step 3: Do not create an implementation commit without an explicit review decision**

Because `index.html`, `style.css`, `script.js`, and internal pages already contain uncommitted user work, a path-based commit would bundle that work. Present the verified diff first and ask whether the user wants it committed as one reviewed snapshot.

