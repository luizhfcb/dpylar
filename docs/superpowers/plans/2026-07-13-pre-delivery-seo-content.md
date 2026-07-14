# Pre-delivery SEO and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the verified sharing, indexing, canonical, deploy-size, and testimonial-integrity issues before the D'Pylar site is delivered.

**Architecture:** Add a focused Node built-in contract test for SEO/deploy metadata, then make minimal static-file edits. Preserve the current honest Google-reviews section because the placeholder testimonials are already absent and no attributable Google review text could be verified publicly; do not fabricate quotes or prices.

**Tech Stack:** HTML5 metadata, XML sitemap, Vercel ignore rules, Node.js `node:test`.

---

### Task 1: Add the pre-delivery contract

**Files:**
- Create: `tests/pre-delivery.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('social pages use an absolute Open Graph image', () => {
  for (const page of ['servicos.html', 'sobre.html', 'equipe.html', 'local.html']) {
    assert.match(
      read(page),
      /<meta\s+property="og:image"\s+content="https:\/\/dpylar\.vercel\.app\/assets\/logo\.png">/,
      page,
    );
  }
});

test('sitemap includes every public static page', () => {
  const sitemap = read('sitemap.xml');
  for (const url of [
    'https://dpylar.vercel.app/',
    'https://dpylar.vercel.app/servicos.html',
    'https://dpylar.vercel.app/sobre.html',
    'https://dpylar.vercel.app/equipe.html',
    'https://dpylar.vercel.app/local.html',
  ]) {
    assert.match(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
  }
});

test('environment detail page declares a canonical URL', () => {
  assert.match(
    read('ambiente.html'),
    /<link\s+rel="canonical"\s+href="https:\/\/dpylar\.vercel\.app\/ambiente\.html">/,
  );
});

test('the site does not publish the known placeholder testimonials', () => {
  const html = ['index.html', 'sobre.html'].map(read).join('\n');
  assert.doesNotMatch(html, />\s*(?:M\.S\.|A\.R\.|L\.C\.)\s*</);
  assert.match(html, /Ver avalia(?:ç|Ã§)(?:ões|Ãµes) (?:reais|no Google)/i);
});

test('unused heavy source assets stay out of Vercel deploys', () => {
  const ignore = read('.vercelignore');
  for (const asset of [
    'assets/logo.original.png',
    'assets/icon-loc.original.png',
    'assets/img4.jpg',
    'assets/img5.jpg',
  ]) {
    assert.match(ignore, new RegExp(`^${asset.replace('.', '\\.')}$$`, 'm'));
  }
});

test('home hero uses the high-resolution reception asset', () => {
  assert.match(read('index.html'), /src="assets\/ambiente-recepcao\.jpg"[^>]+width="1280"[^>]+height="2276"/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/pre-delivery.test.cjs`

Expected: Open Graph, sitemap, canonical, and `.vercelignore` tests fail; placeholder-integrity and reception-hero tests pass.

### Task 2: Apply the verified metadata and deploy fixes

**Files:**
- Modify: `servicos.html`
- Modify: `sobre.html`
- Modify: `equipe.html`
- Modify: `local.html`
- Modify: `ambiente.html`
- Modify: `sitemap.xml`
- Create: `.vercelignore`

- [ ] **Step 1: Replace the four relative Open Graph images**

```html
<meta property="og:image" content="https://dpylar.vercel.app/assets/logo.png">
```

- [ ] **Step 2: Add the missing canonical to `ambiente.html`**

```html
<link rel="canonical" href="https://dpylar.vercel.app/ambiente.html">
```

- [ ] **Step 3: Add the public About and Team URLs to `sitemap.xml`**

```xml
  <url><loc>https://dpylar.vercel.app/sobre.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://dpylar.vercel.app/equipe.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
```

- [ ] **Step 4: Exclude unused source assets from deploys**

```gitignore
assets/logo.original.png
assets/icon-loc.original.png
assets/img4.jpg
assets/img5.jpg
```

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/pre-delivery.test.cjs`

Expected: 6 tests pass.

### Task 3: Final validation and content decision record

**Files:**
- Verify: all files above

- [ ] **Step 1: Run all automated checks**

Run: `node --test tests/mobile-layout.test.cjs tests/pre-delivery.test.cjs`

Expected: 60 tests pass, 0 fail.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 2: Confirm content decisions**

The current site contains no `M.S.`, `A.R.`, or `L.C.` testimonials. Keep the honest Google profile link rather than adding unattributable quotations. Keep prices absent until the establishment confirms whether public pricing is desired; existing service CTAs continue to the live Trinks page.

- [ ] **Step 3: Leave implementation uncommitted for review**

Do not create a code commit because the edited HTML files already contain user-owned uncommitted work.
