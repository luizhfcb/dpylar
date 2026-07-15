const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = {
  'index.html': 'https://dpylar.vercel.app/',
  'servicos.html': 'https://dpylar.vercel.app/servicos.html',
  'sobre.html': 'https://dpylar.vercel.app/sobre.html',
  'equipe.html': 'https://dpylar.vercel.app/equipe.html',
  'local.html': 'https://dpylar.vercel.app/local.html',
  'ambiente.html': 'https://dpylar.vercel.app/ambiente.html',
};
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function matchingBrace(source, openingBrace) {
  let depth = 0;
  let quote = null;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (quote) {
      if (source[index] === '\\') index += 1;
      else if (source[index] === quote) quote = null;
      continue;
    }
    if (source[index] === '"' || source[index] === "'") {
      quote = source[index];
      continue;
    }
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  assert.fail('bloco CSS deve fechar todas as chaves');
}

function topLevelCssBlocks(source) {
  const blocks = [];
  let headerStart = 0;
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    if (quote) {
      if (source[index] === '\\') index += 1;
      else if (source[index] === quote) quote = null;
      continue;
    }
    if (source[index] === '"' || source[index] === "'") {
      quote = source[index];
      continue;
    }
    if (source[index] !== '{') continue;

    const closingBrace = matchingBrace(source, index);
    blocks.push({
      header: source.slice(headerStart, index).trim(),
      body: source.slice(index + 1, closingBrace),
    });
    headerStart = closingBrace + 1;
    index = closingBrace;
  }

  return blocks;
}

function splitCssTopLevel(source, delimiter) {
  const parts = [];
  let partStart = 0;
  let quote = null;
  let parentheses = 0;
  let brackets = 0;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === delimiter && parentheses === 0 && brackets === 0) {
      parts.push(source.slice(partStart, index));
      partStart = index + 1;
    }
  }

  parts.push(source.slice(partStart));
  return parts;
}

function normalizeSelector(selector) {
  return selector.trim().replace(/\s+/g, ' ');
}

function declarationValue(declarations, property) {
  for (const declaration of splitCssTopLevel(declarations, ';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    if (declaration.slice(0, colon).trim().toLowerCase() === property.toLowerCase()) {
      return declaration.slice(colon + 1).trim();
    }
  }
  return undefined;
}

function assertRuleDeclaration(css, selector, property, expected) {
  const normalizedSelector = normalizeSelector(selector);
  const matchingRules = topLevelCssBlocks(stripCssComments(css)).filter((block) => (
    splitCssTopLevel(block.header, ',')
      .some((candidate) => normalizeSelector(candidate) === normalizedSelector)
  ));
  assert.ok(matchingRules.length > 0, `CSS deve conter a regra ${selector}`);
  assert.ok(
    matchingRules.some((rule) => expected.test(declarationValue(rule.body, property) || '')),
    `${selector} deve declarar ${property} compatível com ${expected}`,
  );
}

function mobileCompactCss(css) {
  const marker = '/* MOBILE COMPACTO */';
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `style.css deve conter o marcador ${marker}`);
  const compactCss = stripCssComments(css.slice(markerIndex + marker.length));
  const media = topLevelCssBlocks(compactCss).find((block) => (
    /^@media\s*\(\s*max-width\s*:\s*900px\s*\)$/i.test(block.header)
  ));
  assert.ok(media, 'após MOBILE COMPACTO deve existir @media (max-width: 900px)');
  return media.body;
}

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(
    new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function hasClass(tag, className) {
  const classes = (attribute(tag, 'class') || '').split(/\s+/).filter(Boolean);
  return classes.includes(className);
}

function matchingClosingTag(html, tagName, contentStart) {
  if (VOID_ELEMENTS.has(tagName.toLowerCase())) return contentStart;

  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = contentStart;
  let depth = 1;
  let match;

  while ((match = tagPattern.exec(html)) !== null) {
    if (/^<\//.test(match[0])) {
      depth -= 1;
      if (depth === 0) return match.index;
    } else if (!/\/\s*>$/.test(match[0])) {
      depth += 1;
    }
  }

  assert.fail(`elemento deve ter fechamento </${tagName}>`);
}

function elementsByClass(html, className) {
  const elements = [];
  const openingPattern = /<([a-z][\w:-]*)\b[^>]*>/gi;
  let match;

  while ((match = openingPattern.exec(html)) !== null) {
    const [openingTag, tagName] = match;
    if (!hasClass(openingTag, className)) continue;

    const closingIndex = matchingClosingTag(html, tagName, openingPattern.lastIndex);
    elements.push({
      openingTag,
      innerHtml: html.slice(openingPattern.lastIndex, closingIndex),
    });
  }

  return elements;
}

function openingTags(html, tagName) {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<${escapedTagName}\\b[^>]*>`, 'gi')) || [];
}

for (const [page, canonicalUrl] of Object.entries(PAGES)) {
  test(`${page}: estrutura principal e metadados sociais`, () => {
    const html = read(page);
    const mains = openingTags(html, 'main');
    const skipLinks = elementsByClass(html, 'skip-link');
    const canonicalTags = openingTags(html, 'link')
      .filter((tag) => attribute(tag, 'rel') === 'canonical');
    const ogUrlTags = openingTags(html, 'meta')
      .filter((tag) => attribute(tag, 'property') === 'og:url');
    const twitterCardTags = openingTags(html, 'meta')
      .filter((tag) => attribute(tag, 'name') === 'twitter:card');

    assert.equal(mains.length, 1);
    assert.equal((html.match(/<\/main>/gi) || []).length, 1);
    assert.equal(attribute(mains[0], 'id'), 'main-content');

    assert.equal(skipLinks.length, 1);
    assert.equal(attribute(skipLinks[0].openingTag, 'href'), '#main-content');
    assert.equal(skipLinks[0].innerHtml, 'Pular para o conteúdo');

    assert.equal(canonicalTags.length, 1);
    assert.equal(attribute(canonicalTags[0], 'href'), canonicalUrl);
    assert.equal(ogUrlTags.length, 1);
    assert.equal(attribute(ogUrlTags[0], 'content'), canonicalUrl);
    assert.equal(twitterCardTags.length, 1);
    assert.equal(attribute(twitterCardTags[0], 'content'), 'summary');

    assert.equal(elementsByClass(html, 'footer').length, 1);
  });
}

test('ambiente.html: recepção é o conteúdo inicial', () => {
  const html = read('ambiente.html');

  assert.match(html, /<h1 id="envHeroTitle">Recepção<\/h1>/);
  assert.match(html, /<img id="envImg" src="assets\/ambiente-recepcao\.jpg"/);
  assert.match(html, /<div id="envBody">[\s\S]*?<p>[^<]+<\/p>/);

  const initialPerks = elementsByClass(html, 'about-perks')
    .find((element) => attribute(element.openingTag, 'id') === 'envPerks');
  assert.ok(initialPerks, 'ambiente.html deve conter #envPerks');
  assert.equal(elementsByClass(initialPerks.innerHtml, 'perk').length, 4);
  for (const perk of [
    'Ambiente climatizado',
    'Wi-Fi grátis',
    'Água e café à vontade',
    'Acessível para pessoas com deficiência',
  ]) {
    assert.match(initialPerks.innerHtml, new RegExp(`<span>${perk}<\\/span>`));
  }
});

test('páginas: conteúdo institucional usa a copy aprovada', () => {
  assert.doesNotMatch(
    `${read('local.html')}\n${read('ambiente.html')}`,
    /\b(?:acesso|acessibilidade) para deficientes\b/i,
  );
  assert.match(read('sobre.html'), /O que dizem nossos clientes/);
});

test('style.css: hierarquia mobile prioriza o agendamento', () => {
  const css = read('style.css');
  const compactCss = mobileCompactCss(css);

  assert.match(compactCss, /\.mobile-bar\s+\.mb-secondary\s*\{[^}]*display\s*:\s*none/s);
  assert.match(compactCss, /\.float-wa\s*\{[^}]*display\s*:\s*none/s);
});

test('style.css: recorte MOBILE COMPACTO exclui regras posteriores', () => {
  const fixture = `
    /* MOBILE COMPACTO */
    @media (max-width: 900px) {
      .float-wa { display: flex; }
    }
    .float-wa { display: none; }
  `;

  assert.doesNotMatch(mobileCompactCss(fixture), /\.float-wa\s*\{[^}]*display\s*:\s*none/s);
});

test('style.css: ações WhatsApp claras usam texto escuro', () => {
  const css = read('style.css');

  assert.match(css, /\.btn-whatsapp\s*\{[^}]*color\s*:\s*#0F1A15/is);
  assert.match(css, /\.float-wa\s*\{[^}]*color\s*:\s*#0F1A15/is);
});

test('style.css: overrides dark usam texto escuro nas ações claras', () => {
  const css = read('style.css');
  for (const selector of [
    '.btn-nav',
    '.btn-mint',
    '.mobile-bar .mb-primary',
    '.srv-square-price',
    '.teaser-badge',
    '.about-badge',
    '.founder-badge',
  ]) {
    assertRuleDeclaration(
      css,
      `[data-theme="dark"] ${selector}`,
      'color',
      /^#0F1A15\s*(?:!important)?$/i,
    );
  }
});

test('style.css: hover e active escuros mantêm texto branco', () => {
  const css = read('style.css');
  const compactCss = mobileCompactCss(css);
  for (const { selector, scope } of [
    { selector: '.btn-nav', scope: css },
    { selector: '.btn-mint', scope: css },
    { selector: '.mobile-bar .mb-primary', scope: compactCss },
  ]) {
    for (const [state, background] of [
      ['hover', /^#1f6346$/i],
      ['active', /^#1a553c$/i],
    ]) {
      assertRuleDeclaration(scope, `${selector}:${state}`, 'background', background);
      assertRuleDeclaration(
        css,
        `[data-theme="dark"] ${selector}:${state}`,
        'color',
        /^#fff\s*(?:!important)?$/i,
      );
    }
  }
});

test('style.css: skip link fica disponível ao receber foco', () => {
  const css = read('style.css');

  assert.match(css, /\.skip-link\s*\{[^}]*position\s*:\s*fixed[^}]*transform\s*:\s*translateY\s*\(\s*-\s*[^)]+\)/is);
  assert.match(css, /\.skip-link:focus(?:-visible)?\s*\{[^}]*transform\s*:\s*translateY\s*\(\s*0\s*\)/is);
});
