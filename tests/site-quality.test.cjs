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
