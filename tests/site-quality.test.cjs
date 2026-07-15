const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

function attributeTokens(tag, name) {
  return (attribute(tag, name) || '').split(/\s+/).filter(Boolean);
}

function namedFunctionSource(source, functionName) {
  const match = new RegExp(`function\\s+${functionName}\\s*\\(`).exec(source);
  assert.ok(match, `script deve declarar function ${functionName}`);
  const openingBrace = source.indexOf('{', match.index);
  const closingBrace = matchingBrace(source, openingBrace);
  return source.slice(match.index, closingBrace + 1);
}

function assignedArrowSource(source, variableName, afterMarker) {
  const markerIndex = source.indexOf(afterMarker);
  assert.notEqual(markerIndex, -1, `script deve conter ${afterMarker}`);
  const match = new RegExp(`const\\s+${variableName}\\s*=\\s*\\(\\)\\s*=>\\s*\\{`)
    .exec(source.slice(markerIndex));
  assert.ok(match, `script deve declarar const ${variableName} após ${afterMarker}`);
  const declarationStart = markerIndex + match.index;
  const openingBrace = source.indexOf('{', declarationStart);
  const closingBrace = matchingBrace(source, openingBrace);
  return source.slice(declarationStart, closingBrace + 2);
}

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
  };
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

test('local.html e ambiente.html: logos da navegação declaram dimensões e texto alternativo', () => {
  for (const page of ['local.html', 'ambiente.html']) {
    const logo = openingTags(read(page), 'img')
      .filter((tag) => hasClass(tag, 'brand-logo'));

    assert.equal(logo.length, 2, `${page} deve conter os logos das duas navegações`);
    for (const image of logo) {
      assert.equal(attribute(image, 'width'), '44');
      assert.equal(attribute(image, 'height'), '44');
      assert.equal(attribute(image, 'alt'), "D'Pylar");
    }
  }
});

test('páginas: links que abrem nova aba protegem window.opener', () => {
  const violations = [];
  for (const page of Object.keys(PAGES)) {
    const externalTabs = openingTags(read(page), 'a')
      .filter((tag) => attribute(tag, 'target')?.toLowerCase() === '_blank');

    for (const link of externalTabs) {
      if (!attributeTokens(link, 'rel').some((token) => token.toLowerCase() === 'noopener')) {
        violations.push(`${page}: ${attribute(link, 'href')}`);
      }
    }
  }
  assert.deepEqual(violations, [], `links sem noopener:\n${violations.join('\n')}`);
});

test('local.html: imagens dos cards de ambientes declaram suas dimensões reais', () => {
  const cards = elementsByClass(read('local.html'), 'env-frame')
    .flatMap((element) => openingTags(element.innerHtml, 'img'));
  const dimensions = {
    'assets/ambiente-recepcao.jpg': ['1280', '2276'],
    'assets/ambiente-sala-cera.jpg': ['1280', '1382'],
    'assets/ambiente-sala-multiuso.jpg': ['1280', '1560'],
    'assets/ambiente-sobrancelha.jpg': ['1092', '1161'],
    'assets/ambiente-cilios.jpg': ['581', '658'],
    'assets/ambiente-copa.jpg': ['1280', '2276'],
    'assets/ambiente-banheiro.jpg': ['1280', '2276'],
  };

  assert.equal(cards.length, 7, 'local.html deve conter sete imagens nos cards de ambientes');
  for (const [src, [width, height]] of Object.entries(dimensions)) {
    const matches = cards.filter((tag) => attribute(tag, 'src') === src);
    assert.equal(matches.length, 1, `${src} deve aparecer em um único card`);
    const [image] = matches;
    assert.equal(attribute(image, 'width'), width, `${src} deve declarar width=${width}`);
    assert.equal(attribute(image, 'height'), height, `${src} deve declarar height=${height}`);
  }
});

test('index.html: avatares decorativos declaram dimensões reais', () => {
  const avatars = openingTags(read('index.html'), 'img')
    .filter((tag) => (
      /(?:^|\/)team-[^/]*\.(?:avif|gif|jpe?g|png|webp)$/i.test(attribute(tag, 'src') || '')
      && attribute(tag, 'alt') === ''
    ));

  assert.ok(avatars.length > 0, 'index.html deve conter avatares decorativos');
  for (const avatar of avatars) {
    assert.equal(attribute(avatar, 'width'), '640', `${attribute(avatar, 'src')} deve declarar width=640`);
    assert.equal(attribute(avatar, 'height'), '800', `${attribute(avatar, 'src')} deve declarar height=800`);
  }
});

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

test('style.css: CTA da equipe vence a regra importante e preserva hover e active', () => {
  const css = read('style.css');
  const legacySelector = '.team-lightbox .lightbox-side .btn';
  const darkSelector = '[data-theme="dark"] .team-lightbox .lightbox-side .btn';
  const specificity = (selector) => [
    (selector.match(/#[\w-]+/g) || []).length,
    (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length,
    (selector.match(/(?:^|[\s>+~])(?:[a-z][\w-]*|\*)/gi) || [])
      .filter((token) => !token.trim().startsWith('*')).length,
  ];
  const compareSpecificity = (left, right) => {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  };

  assertRuleDeclaration(css, legacySelector, 'color', /^#fff\s*!important$/i);
  assertRuleDeclaration(css, darkSelector, 'color', /^#0F1A15\s*!important$/i);
  assert.ok(
    compareSpecificity(specificity(darkSelector), specificity(legacySelector)) > 0,
    'override dark deve ser mais específico que a regra legada com !important',
  );

  for (const state of ['hover', 'active']) {
    const stateSelector = `${darkSelector}:${state}`;
    assertRuleDeclaration(css, stateSelector, 'color', /^#fff\s*!important$/i);
    assert.ok(
      compareSpecificity(specificity(stateSelector), specificity(darkSelector)) > 0,
      `${state} deve vencer o estado normal no cascade`,
    );
  }
});

test('style.css: mapa e índice têm override dark global no desktop', () => {
  const css = read('style.css');

  for (const selector of [
    '[data-theme="dark"] .map-overlay-btn',
    '[data-theme="dark"] .env-index',
  ]) {
    assertRuleDeclaration(css, selector, 'color', /^#0F1A15$/i);
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

test('script.js: diálogos mantêm o foco do teclado dentro do modal', () => {
  const script = read('script.js');

  assert.match(script, /function trapDialogFocus\s*\(/);
  assert.match(script, /trapDialogFocus\(event,\s*modal\)/);
  assert.match(script, /trapDialogFocus\(e,\s*lightbox\)/);
  assert.match(
    read('servicos.html'),
    /<div class="srv-modal" id="srvModal" role="dialog" aria-modal="true" aria-labelledby="srvModalTitle" aria-describedby="srvModalSummary" aria-hidden="true" hidden>/,
  );
});

test('script.js: clique no marcador abre o mapa sem expor window.opener', () => {
  const script = read('script.js');
  const start = script.indexOf('// Lazy-load map when near viewport');
  const end = script.indexOf("document.addEventListener('keydown', handleMobileMenuKeydown);", start);
  assert.notEqual(start, -1, 'script deve manter o bloco de lazy-load do mapa');
  assert.notEqual(end, -1, 'script deve encerrar o bloco do mapa antes do menu mobile');

  let markerClick;
  const openCalls = [];
  const mapInstance = {
    setView() { return this; },
    on() {},
    invalidateSize() {},
    scrollWheelZoom: { enable() {}, disable() {} },
  };
  const mapElement = { dataset: {} };
  const context = vm.createContext({
    document: { getElementById: (id) => (id === 'dpylar-map' ? mapElement : null) },
    window: { open: (...args) => openCalls.push(args) },
    L: {
      map: () => mapInstance,
      tileLayer: () => ({ addTo() {} }),
      icon: () => ({}),
      marker: () => ({
        addTo() { return this; },
        on(type, listener) { if (type === 'click') markerClick = listener; },
      }),
    },
    setTimeout: (callback) => callback(),
    encodeURIComponent,
  });

  vm.runInContext(script.slice(start, end), context);
  assert.equal(typeof markerClick, 'function');
  markerClick();

  assert.equal(openCalls.length, 1);
  assert.match(openCalls[0][0], /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.deepEqual(Array.from(openCalls[0].slice(1)), ['_blank', 'noopener']);
});

test('script.js: helper de foco exclui controles desabilitados ou não renderizados', () => {
  const script = read('script.js');
  const focusableSource = script.slice(0, script.indexOf('function trapDialogFocus'));
  const candidate = (overrides = {}) => ({
    hidden: false,
    getAttribute: () => null,
    matches: () => false,
    getClientRects: () => [{}],
    computedStyle: { display: 'inline', visibility: 'visible' },
    ...overrides,
  });
  const enabled = candidate();
  const disabled = candidate({ matches: (selector) => selector === ':disabled' });
  const ariaHidden = candidate({ getAttribute: (name) => (name === 'aria-hidden' ? 'true' : null) });
  const noClientRects = candidate({ getClientRects: () => [] });
  const displayNone = candidate({ computedStyle: { display: 'none', visibility: 'visible' } });
  const visibilityHidden = candidate({ computedStyle: { display: 'inline', visibility: 'hidden' } });
  const sandbox = {
    container: {
      querySelectorAll: () => [
        enabled,
        disabled,
        ariaHidden,
        noClientRects,
        displayNone,
        visibilityHidden,
      ],
    },
    window: { getComputedStyle: (element) => element.computedStyle },
  };

  vm.runInNewContext(`${focusableSource}\nresult = focusableElements(container);`, sandbox);

  assert.deepEqual(Array.from(sandbox.result), [enabled]);
});

test('script.js: trap circula Tab e Shift+Tab sem interceptar outras teclas', () => {
  const script = read('script.js');
  const helpersSource = script.slice(0, script.indexOf('// Mark JS available'));
  let documentStub;
  const focusable = () => ({
    hidden: false,
    getAttribute: () => null,
    matches: () => false,
    getClientRects: () => [{}],
    focus() { documentStub.activeElement = this; },
  });
  const first = focusable();
  const middle = focusable();
  const last = focusable();
  const dialog = { querySelectorAll: () => [first, middle, last] };
  documentStub = { activeElement: last };
  const sandbox = vm.createContext({
    document: documentStub,
    window: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
  });
  vm.runInContext(helpersSource, sandbox);
  const dispatch = (key, shiftKey = false) => {
    const event = {
      key,
      shiftKey,
      prevented: 0,
      preventDefault() { this.prevented += 1; },
    };
    sandbox.event = event;
    sandbox.dialog = dialog;
    vm.runInContext('trapDialogFocus(event, dialog)', sandbox);
    return event;
  };

  const forward = dispatch('Tab');
  assert.equal(documentStub.activeElement, first);
  assert.equal(forward.prevented, 1);

  const backward = dispatch('Tab', true);
  assert.equal(documentStub.activeElement, last);
  assert.equal(backward.prevented, 1);

  const escape = dispatch('Escape');
  assert.equal(documentStub.activeElement, last);
  assert.equal(escape.prevented, 0);
});

test('local.html: lightbox executa abertura, Escape, backdrop e restauração de foco', () => {
  const html = read('local.html');
  const inlineScript = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g))
    .map((match) => match[1])
    .find((source) => source.includes('Carrossel local'));
  assert.ok(inlineScript, 'local.html deve manter o script local do carrossel');

  let documentStub;
  const node = (overrides = {}) => {
    const listeners = {};
    const attributes = {};
    return {
      listeners,
      attributes,
      hidden: false,
      classList: createClassList(),
      addEventListener(type, listener) { listeners[type] = listener; },
      getAttribute(name) { return attributes[name] ?? null; },
      setAttribute(name, value) {
        attributes[name] = value;
        if (name === 'hidden') this.hidden = true;
      },
      removeAttribute(name) {
        delete attributes[name];
        if (name === 'hidden') this.hidden = false;
      },
      matches: () => false,
      getClientRects: () => [{}],
      focus() { documentStub.activeElement = this; },
      ...overrides,
    };
  };
  const images = Array.from({ length: 14 }, (_, index) => node({
    complete: true,
    src: `ambiente-${index % 7}.jpg`,
    alt: `Ambiente ${index % 7}`,
  }));
  const slides = images.map((image) => node({ disabled: true, querySelector: () => image }));
  const section = node();
  const track = node({ querySelectorAll: () => images });
  const lightboxImg = node({ src: '', alt: '' });
  const closeButton = node();
  const previousButton = node();
  const nextButton = node();
  const lightbox = node({
    hidden: true,
    querySelectorAll: () => [closeButton, previousButton, nextButton],
  });
  lightbox.setAttribute('aria-hidden', 'true');
  const body = { classList: createClassList() };
  const documentListeners = {};
  const byId = {
    localTrack: track,
    lightbox,
    lightboxImg,
    lightboxClose: closeButton,
    lightboxPrev: previousButton,
    lightboxNext: nextButton,
  };
  documentStub = {
    activeElement: slides[0],
    body,
    querySelector: (selector) => (selector === '.local-carousel-section' ? section : null),
    querySelectorAll: (selector) => (selector === '#localTrack .local-slide' ? slides : []),
    getElementById: (id) => byId[id] || null,
    addEventListener: (type, listener) => { documentListeners[type] = listener; },
  };
  const helpersSource = read('script.js').slice(0, read('script.js').indexOf('// Mark JS available'));
  const context = vm.createContext({
    document: documentStub,
    window: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
    setTimeout: (callback) => callback(),
  });
  vm.runInContext(`${helpersSource}\n${inlineScript}`, context);

  assert.equal(slides.every((slide) => slide.disabled === false), true);

  slides[0].listeners.click();
  assert.equal(lightbox.hidden, false);
  assert.equal(lightbox.classList.contains('open'), true);
  assert.equal(lightbox.getAttribute('aria-hidden'), 'false');
  assert.equal(body.classList.contains('lightbox-open'), true);
  assert.equal(documentStub.activeElement, closeButton);
  assert.equal(lightboxImg.src, images[0].src);

  documentListeners.keydown({ key: 'Escape', shiftKey: false, preventDefault() {} });
  assert.equal(lightbox.hidden, true);
  assert.equal(lightbox.classList.contains('open'), false);
  assert.equal(lightbox.getAttribute('aria-hidden'), 'true');
  assert.equal(body.classList.contains('lightbox-open'), false);
  assert.equal(documentStub.activeElement, slides[0]);

  slides[0].listeners.click();
  lightbox.listeners.click({ target: lightbox });
  assert.equal(lightbox.hidden, true);
  assert.equal(body.classList.contains('lightbox-open'), false);
  assert.equal(documentStub.activeElement, slides[0]);
});

test('script.js: Serviços e Equipe executam estados de abertura e fechamento dos modais', () => {
  const script = read('script.js');
  let activeElement;
  let currentModal;
  const focusVisibility = [];
  const opener = { focus: () => { activeElement = opener; } };
  const closeButton = {
    focus: () => {
      focusVisibility.push(
        !currentModal.hidden
          && currentModal.classList.contains('open')
          && currentModal.getAttribute('aria-hidden') === 'false',
      );
      activeElement = closeButton;
    },
  };
  const body = { classList: createClassList() };
  const documentStub = {
    get activeElement() { return activeElement; },
    set activeElement(value) { activeElement = value; },
    body,
    getElementById: (id) => (id === 'lightboxClose' ? closeButton : null),
  };

  const serviceAttributes = { 'aria-hidden': 'true' };
  const serviceModal = {
    hidden: true,
    classList: createClassList(),
    querySelector: () => closeButton,
    getAttribute: (name) => serviceAttributes[name] ?? null,
    setAttribute: (name, value) => { serviceAttributes[name] = value; },
  };
  const card = {
    getAttribute: (name) => (['data-facts', 'data-prices'].includes(name) ? '[]' : ''),
  };
  activeElement = opener;
  const serviceContext = vm.createContext({
    document: documentStub,
    modal: serviceModal,
    card,
    lastFocus: null,
    imgEl: null,
    titleEl: null,
    chipEl: null,
    priceEl: null,
    summaryEl: null,
    pricesBlockEl: null,
    pricesEl: null,
    factsEl: null,
    ctaEl: null,
  });
  currentModal = serviceModal;
  vm.runInContext([
    namedFunctionSource(script, 'openService'),
    namedFunctionSource(script, 'closeService'),
  ].join('\n'), serviceContext);
  vm.runInContext('openService(card)', serviceContext);
  assert.equal(serviceModal.hidden, false);
  assert.equal(serviceModal.classList.contains('open'), true);
  assert.equal(serviceModal.getAttribute('aria-hidden'), 'false');
  assert.equal(body.classList.contains('srv-modal-open'), true);
  assert.equal(activeElement, closeButton);
  assert.equal(focusVisibility.at(-1), true);
  vm.runInContext('closeService()', serviceContext);
  assert.equal(serviceModal.hidden, true);
  assert.equal(serviceModal.getAttribute('aria-hidden'), 'true');
  assert.equal(body.classList.contains('srv-modal-open'), false);
  assert.equal(activeElement, opener);

  const teamAttributes = { 'aria-hidden': 'true' };
  const teamModal = {
    hidden: true,
    classList: createClassList(),
    removeAttribute: (name) => { if (name === 'hidden') teamModal.hidden = false; },
    setAttribute: (name, value) => {
      teamAttributes[name] = value;
      if (name === 'hidden') teamModal.hidden = true;
    },
    getAttribute: (name) => teamAttributes[name] ?? null,
  };
  const teamImage = { src: '', alt: '' };
  const animationFrames = [];
  activeElement = opener;
  currentModal = teamModal;
  const marker = 'if (lightbox && lightboxImg && photoBtn)';
  const teamContext = vm.createContext({
    document: documentStub,
    lightbox: teamModal,
    lightboxImg: teamImage,
    lightboxPanel: null,
    lbTag: null,
    lbName: null,
    lbRole: null,
    lbDesc: null,
    lbCta: null,
    roster: [{ full: 'full.jpg', img: 'thumb.jpg', name: 'Rosina', tag: '', role: '', desc: '' }],
    idx: 0,
    lastFocus: null,
    WA_BASE: '',
    requestAnimationFrame: (callback) => { animationFrames.push(callback); },
  });
  vm.runInContext([
    assignedArrowSource(script, 'open', marker),
    assignedArrowSource(script, 'close', marker),
  ].join('\n'), teamContext);
  vm.runInContext('open()', teamContext);
  assert.equal(teamModal.hidden, false);
  assert.equal(teamModal.classList.contains('open'), true);
  assert.equal(teamModal.getAttribute('aria-hidden'), 'false');
  assert.equal(body.classList.contains('lightbox-open'), true);
  assert.equal(activeElement, closeButton);
  assert.equal(focusVisibility.at(-1), true);
  assert.equal(animationFrames.length, 0, 'abertura não deve depender de um frame futuro');
  vm.runInContext('close()', teamContext);
  assert.equal(teamModal.hidden, true);
  assert.equal(teamModal.getAttribute('aria-hidden'), 'true');
  assert.equal(body.classList.contains('lightbox-open'), false);
  assert.equal(activeElement, opener);
});

test('style.css: carrossel Local pausa com foco ou lightbox aberto', () => {
  const css = read('style.css');

  assertRuleDeclaration(
    css,
    '.local-carousel-section:focus-within .local-carousel-track',
    'animation-play-state',
    /^paused$/i,
  );
  assertRuleDeclaration(
    css,
    'body.lightbox-open .local-carousel-section .local-carousel-track',
    'animation-play-state',
    /^paused$/i,
  );
});

test('local.html: carrossel e lightbox são operáveis por teclado', () => {
  const html = read('local.html');
  const slides = openingTags(html, 'button').filter((tag) => hasClass(tag, 'local-slide'));

  assert.match(html, /<div class="lightbox" id="lightbox" role="dialog" aria-modal="true"[^>]*aria-hidden="true" hidden>/);
  assert.equal((html.match(/<button type="button" class="local-slide"/g) || []).length, 14);
  assert.equal(slides.length, 14);
  assert.equal(slides.every((slide) => /\sdisabled(?:\s|>)/i.test(slide)), true);
  assert.match(html, /lastLightboxFocus/);
  assert.match(html, /trapDialogFocus\(e,\s*lightbox\)/);
});

test('equipe.html: indicadores do carrossel não simulam abas', () => {
  const html = read('equipe.html');

  assert.doesNotMatch(html, /role="tablist"/);
  assert.match(
    html,
    /<div class="lightbox team-lightbox" id="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightboxName" aria-describedby="lightboxDesc" aria-hidden="true" hidden>/,
  );
  assert.doesNotMatch(read('script.js'), /setAttribute\('role',\s*'tab'\)/);
});
