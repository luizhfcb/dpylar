const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  'index.html',
  'servicos.html',
  'sobre.html',
  'equipe.html',
  'local.html',
  'ambiente.html',
];
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function readHtml(relativePath) {
  return stripHtmlComments(read(relativePath));
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

function textContent(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchingBrace(source, openingBrace, javascript = false) {
  let depth = 0;
  let quote = null;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (quote) {
      if (source[index] === '\\') index += 1;
      else if (source[index] === quote) quote = null;
      continue;
    }

    if (javascript && source[index] === '/' && source[index + 1] === '/') {
      index = source.indexOf('\n', index + 2);
      if (index === -1) break;
      continue;
    }
    if (javascript && source[index] === '/' && source[index + 1] === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      if (commentEnd === -1) break;
      index = commentEnd + 1;
      continue;
    }

    if (source[index] === '"' || source[index] === "'" || (javascript && source[index] === '`')) {
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

function mobileCompactMedia(css) {
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

function declarationsFor(cssBlock, selector) {
  const expectedSelector = normalizeSelector(selector);
  const rule = topLevelCssBlocks(cssBlock).find((block) => (
    splitCssTopLevel(block.header, ',')
      .some((candidate) => normalizeSelector(candidate) === expectedSelector)
  ));
  assert.ok(rule, `@media mobile deve conter a regra ${selector}`);
  return rule.body;
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

function htmlStartTags(html) {
  const tags = [];
  const pattern = /<([a-z][\w:-]*)\b[^>]*>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    tags.push(match[0]);
    const tagName = match[1].toLowerCase();
    if (!['script', 'style'].includes(tagName) || /\/\s*>$/.test(match[0])) continue;

    const closing = new RegExp(`</${tagName}\\s*>`, 'gi');
    closing.lastIndex = pattern.lastIndex;
    const closingMatch = closing.exec(html);
    if (closingMatch) pattern.lastIndex = closing.lastIndex;
  }

  return tags;
}

function addLocalAsset(references, candidate) {
  if (typeof candidate !== 'string') return;
  const normalized = candidate.trim();
  const filePart = normalized.split(/[?#]/, 1)[0];
  if (/^assets\/.+/i.test(filePart)) references.add(normalized);
}

function addCssUrls(references, css) {
  const urlPattern = /(?:^|[^\w-])url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  let match;
  while ((match = urlPattern.exec(css)) !== null) {
    addLocalAsset(references, match[1] ?? match[2] ?? match[3]);
  }
}

function javascriptStrings(script) {
  const strings = [];

  for (let index = 0; index < script.length; index += 1) {
    if (script[index] === '/' && script[index + 1] === '/') {
      index = script.indexOf('\n', index + 2);
      if (index === -1) break;
      continue;
    }
    if (script[index] === '/' && script[index + 1] === '*') {
      const commentEnd = script.indexOf('*/', index + 2);
      if (commentEnd === -1) break;
      index = commentEnd + 1;
      continue;
    }

    const quote = script[index];
    if (!['"', "'", '`'].includes(quote)) continue;

    let value = '';
    for (index += 1; index < script.length; index += 1) {
      if (script[index] === '\\' && index + 1 < script.length) {
        value += script[index + 1];
        index += 1;
      } else if (script[index] === quote) {
        strings.push(value);
        break;
      } else {
        value += script[index];
      }
    }
  }

  return strings;
}

function namedFunctionSource(source, functionName) {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const signature = new RegExp(`\\bfunction\\s+${escapedName}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  assert.ok(signature, `script.js deve declarar function ${functionName}()`);
  const openingBrace = signature.index + signature[0].lastIndexOf('{');
  const closingBrace = matchingBrace(source, openingBrace, true);
  return source.slice(signature.index, closingBrace + 1);
}

function localAssetReferences(html) {
  const references = new Set();
  const tags = htmlStartTags(html);

  for (const tag of tags) {
    for (const name of ['src', 'href', 'content']) {
      addLocalAsset(references, attribute(tag, name));
    }
    const inlineStyle = attribute(tag, 'style');
    if (inlineStyle) addCssUrls(references, inlineStyle);
  }

  const styleBlockPattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let match;
  while ((match = styleBlockPattern.exec(html)) !== null) addCssUrls(references, match[1]);

  const scriptBlockPattern = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  while ((match = scriptBlockPattern.exec(html)) !== null) {
    for (const value of javascriptStrings(match[1])) addLocalAsset(references, value);
  }

  return [...references];
}

function assetExists(reference) {
  const fileReference = reference.split(/[?#]/, 1)[0];
  let decodedReference;
  try {
    decodedReference = decodeURIComponent(fileReference);
  } catch {
    return false;
  }

  const assetsRoot = path.resolve(ROOT, 'assets');
  const candidate = path.resolve(ROOT, decodedReference);
  const isInsideAssets = candidate.startsWith(`${assetsRoot}${path.sep}`);
  return isInsideAssets && fs.existsSync(candidate);
}

for (const page of PAGES) {
  test(`${page}: mobile-bar reúne contato e agendamento`, () => {
    const html = readHtml(page);
    const bars = elementsByClass(html, 'mobile-bar');

    assert.ok(bars.length > 0, `${page} deve conter ao menos uma .mobile-bar`);

    for (const [index, bar] of bars.entries()) {
      const label = `${page} .mobile-bar #${index + 1}`;
      const primaryCount = htmlStartTags(bar.innerHtml)
        .filter((tag) => hasClass(tag, 'mb-primary')).length;
      const secondaryCount = htmlStartTags(bar.innerHtml)
        .filter((tag) => hasClass(tag, 'mb-secondary')).length;

      assert.equal(primaryCount, 1, `${label} deve conter exatamente uma .mb-primary`);
      assert.equal(secondaryCount, 1, `${label} deve conter exatamente uma .mb-secondary`);
      assert.match(textContent(bar.innerHtml), /Agendar/i, `${label} deve exibir “Agendar”`);
      assert.match(textContent(bar.innerHtml), /WhatsApp/i, `${label} deve exibir “WhatsApp”`);
    }
  });

  test(`${page}: menu mobile oferece agendamento, WhatsApp e tema`, () => {
    const html = readHtml(page);
    const overlays = elementsByClass(html, 'mobile-overlay');
    assert.equal(overlays.length, 1, `${page} deve conter exatamente um .mobile-overlay`);

    const overlayHtml = overlays[0].innerHtml;
    const menuCtas = elementsByClass(overlayHtml, 'mobile-menu-cta');
    const whatsappItems = elementsByClass(overlayHtml, 'btn-wa-soft');
    const schedulingItems = elementsByClass(overlayHtml, 'btn-mint');
    const themeToggles = elementsByClass(overlayHtml, 'theme-toggle');

    assert.equal(menuCtas.length, 1, `${page} deve conter exatamente um .mobile-menu-cta`);
    assert.equal(whatsappItems.length, 1, `${page} menu deve conter exatamente um .btn-wa-soft`);
    assert.equal(schedulingItems.length, 1, `${page} menu deve conter exatamente um .btn-mint`);
    assert.match(textContent(whatsappItems[0].innerHtml), /WhatsApp/i);
    assert.match(textContent(schedulingItems[0].innerHtml), /Agendar/i);

    assert.equal(themeToggles.length, 1, `${page} menu deve conter exatamente um .theme-toggle`);
    for (const toggle of themeToggles) {
      const accessibleDescription = [
        textContent(toggle.innerHtml),
        attribute(toggle.openingTag, 'aria-label') || '',
        attribute(toggle.openingTag, 'title') || '',
      ].join(' ');
      assert.match(
        accessibleDescription,
        /tema|claro|escuro/i,
        `${page} .theme-toggle do menu deve ter texto ou aria relacionado a tema`,
      );
    }
  });

  test(`${page}: hamburger expõe o estado e controla o menu mobile`, () => {
    const html = readHtml(page);
    const hamburgers = elementsByClass(html, 'hamburger');
    const controlledMenus = htmlStartTags(html)
      .filter((tag) => attribute(tag, 'id') === 'mobileMenu');
    assert.equal(hamburgers.length, 1, `${page} deve conter exatamente um .hamburger`);
    assert.equal(controlledMenus.length, 1, `${page} deve conter exatamente um elemento #mobileMenu`);
    assert.ok(
      hasClass(controlledMenus[0], 'mobile-overlay'),
      `${page} #mobileMenu deve ser o .mobile-overlay`,
    );

    const hamburger = hamburgers[0].openingTag;
    const controlledMenuId = attribute(controlledMenus[0], 'id');
    assert.equal(attribute(hamburger, 'type'), 'button', `${page} hamburger deve ter type="button"`);
    assert.equal(
      attribute(hamburger, 'aria-controls'),
      controlledMenuId,
      `${page} hamburger deve apontar para o ID do .mobile-overlay`,
    );
    assert.equal(
      attribute(hamburger, 'aria-expanded'),
      'false',
      `${page} hamburger deve iniciar com aria-expanded="false"`,
    );
  });

  test(`${page}: overlay mobile declara diálogo inicialmente oculto`, () => {
    const overlays = elementsByClass(readHtml(page), 'mobile-overlay');
    assert.equal(overlays.length, 1, `${page} deve conter exatamente um .mobile-overlay`);

    const overlay = overlays[0].openingTag;
    assert.equal(attribute(overlay, 'aria-hidden'), 'true', `${page} overlay deve ter aria-hidden="true"`);
    assert.equal(attribute(overlay, 'role'), 'dialog', `${page} overlay deve ter role="dialog"`);
    assert.ok(
      (attribute(overlay, 'aria-label') || '').trim(),
      `${page} overlay deve ter aria-label não vazio`,
    );
  });

  test(`${page}: referências locais assets existem no disco`, () => {
    const references = localAssetReferences(readHtml(page));
    const missing = references.filter((reference) => !assetExists(reference));

    assert.deepEqual(missing, [], `${page} referencia assets ausentes: ${missing.join(', ')}`);
  });
}

test('páginas: ações mobile usam destinos canônicos', () => {
  const issues = [];
  for (const page of PAGES) {
    const html = readHtml(page);
    const overlays = elementsByClass(html, 'mobile-overlay');
    const menuWhatsapps = elementsByClass(overlays[0]?.innerHtml || '', 'btn-wa-soft');
    const menuScheduling = elementsByClass(overlays[0]?.innerHtml || '', 'btn-mint');
    const secondaries = elementsByClass(html, 'mobile-bar')
      .flatMap((bar) => htmlStartTags(bar.innerHtml))
      .filter((tag) => hasClass(tag, 'mb-secondary'));
    const primaries = elementsByClass(html, 'mobile-bar')
      .flatMap((bar) => htmlStartTags(bar.innerHtml))
      .filter((tag) => hasClass(tag, 'mb-primary'));

    if (menuWhatsapps.length !== 1
      || !(attribute(menuWhatsapps[0]?.openingTag || '', 'href') || '')
        .startsWith('https://wa.me/5583986697088')) {
      issues.push(`${page}: menu btn-wa-soft`);
    }
    if (menuScheduling.length !== 1
      || attribute(menuScheduling[0]?.openingTag || '', 'href') !== 'https://www.trinks.com/dpylarcg') {
      issues.push(`${page}: menu btn-mint`);
    }
    if (secondaries.length !== 1
      || !(attribute(secondaries[0] || '', 'href') || '')
        .startsWith('https://wa.me/5583986697088')) {
      issues.push(`${page}: mb-secondary`);
    }
    if (primaries.length !== 1
      || attribute(primaries[0] || '', 'href') !== 'https://www.trinks.com/dpylarcg') {
      issues.push(`${page}: mb-primary`);
    }
  }
  assert.deepEqual(issues, [], `destinos mobile incorretos: ${issues.join(', ')}`);
});

test('páginas: overlays mobile são diálogos modais', () => {
  const invalidPages = PAGES.filter((page) => {
    const overlays = elementsByClass(readHtml(page), 'mobile-overlay');
    return overlays.length !== 1 || attribute(overlays[0].openingTag, 'aria-modal') !== 'true';
  });
  assert.deepEqual(invalidPages, [], `aria-modal ausente em: ${invalidPages.join(', ')}`);
});

test('index.html: hero usa a foto da recepção com dimensões e alt definidos', () => {
  const html = readHtml('index.html');
  const heroes = elementsByClass(html, 'hero');
  assert.equal(heroes.length, 1, 'index.html deve conter exatamente uma seção .hero');

  const receptionImage = htmlStartTags(heroes[0].innerHtml)
    .filter((tag) => /^<img\b/i.test(tag))
    .find((tag) => attribute(tag, 'src') === 'assets/ambiente-recepcao.jpg');

  assert.ok(receptionImage, 'hero deve conter img src="assets/ambiente-recepcao.jpg"');
  assert.equal(attribute(receptionImage, 'width'), '1280', 'imagem da hero deve ter width="1280"');
  assert.equal(attribute(receptionImage, 'height'), '2276', 'imagem da hero deve ter height="2276"');
  assert.equal(
    attribute(receptionImage, 'alt'),
    "Recepção da D'Pylar em Campina Grande",
    'imagem da hero deve ter o texto alternativo definido',
  );
});

test('script.js: não mantém o sistema antigo de abas mobile', () => {
  const script = read('script.js');

  for (const prohibited of ['mobile-tab', 'm-tab-panel', 'openHomeTab']) {
    assert.equal(
      script.includes(prohibited),
      false,
      `script.js não deve conter ${prohibited}`,
    );
  }
});

test('script.js: closeMobile devolve o foco ao hamburger', () => {
  const script = read('script.js');
  const source = [
    namedFunctionSource(script, 'setHamburgerExpanded'),
    namedFunctionSource(script, 'closeMobile'),
  ].join('\n');
  const state = {
    menuOpen: true,
    menuAttributes: {},
    burgerAttributes: {},
    focusCount: 0,
  };
  const menu = {
    classList: {
      contains: (className) => className === 'open' && state.menuOpen,
      remove: (className) => {
        if (className === 'open') state.menuOpen = false;
      },
    },
    setAttribute: (name, value) => {
      state.menuAttributes[name] = value;
    },
  };
  const burger = {
    setAttribute: (name, value) => {
      state.burgerAttributes[name] = value;
    },
    focus: () => {
      state.focusCount += 1;
    },
  };
  const context = vm.createContext({
    document: {
      body: { style: { overflow: 'hidden' } },
      getElementById: (id) => (id === 'mobileMenu' ? menu : null),
      querySelector: (selector) => (
        ['.hamburger', '.hamburger[aria-controls=mobileMenu]'].includes(selector) ? burger : null
      ),
    },
  });

  vm.runInContext(source, context);
  vm.runInContext('closeMobile()', context);

  assert.equal(state.focusCount, 1, 'fechar um menu aberto deve devolver foco ao hamburger');
  assert.equal(state.menuAttributes['aria-hidden'], 'true');
  assert.equal(state.burgerAttributes['aria-expanded'], 'false');
  assert.equal(context.document.body.style.overflow, '');

  vm.runInContext('closeMobile()', context);
  assert.equal(state.focusCount, 1, 'fechar um menu já fechado não deve roubar foco');
});

test('script.js: teclado fica contido no menu mobile aberto', () => {
  const script = read('script.js');
  const source = [
    namedFunctionSource(script, 'setHamburgerExpanded'),
    namedFunctionSource(script, 'closeMobile'),
    namedFunctionSource(script, 'handleMobileMenuKeydown'),
  ].join('\n');
  const state = { menuOpen: true, firstFocus: 0, lastFocus: 0 };
  let documentStub;
  const first = { focus: () => { state.firstFocus += 1; documentStub.activeElement = first; } };
  const last = { focus: () => { state.lastFocus += 1; documentStub.activeElement = last; } };
  const burger = { setAttribute: () => {}, focus: () => {} };
  const menu = {
    classList: {
      contains: (name) => name === 'open' && state.menuOpen,
      remove: (name) => { if (name === 'open') state.menuOpen = false; },
    },
    getAttribute: (name) => (name === 'aria-hidden' ? (state.menuOpen ? 'false' : 'true') : null),
    setAttribute: () => {},
    querySelectorAll: () => [first, last],
  };
  documentStub = {
    activeElement: last,
    body: { style: { overflow: 'hidden' } },
    getElementById: (id) => (id === 'mobileMenu' ? menu : null),
    querySelector: (selector) => (
      ['.hamburger', '.hamburger[aria-controls=mobileMenu]'].includes(selector) ? burger : null
    ),
  };
  const context = vm.createContext({ document: documentStub });
  vm.runInContext(source, context);
  vm.runInContext(
    'globalThis.__closeCalls = 0; const originalCloseMobile = closeMobile; '
      + 'closeMobile = () => { __closeCalls += 1; return originalCloseMobile(); };',
    context,
  );
  const dispatch = (event) => {
    context.event = event;
    vm.runInContext('handleMobileMenuKeydown(event)', context);
  };
  const keyEvent = (key, shiftKey = false) => ({
    key,
    shiftKey,
    prevented: 0,
    preventDefault() { this.prevented += 1; },
  });

  const forwardTab = keyEvent('Tab');
  dispatch(forwardTab);
  assert.equal(forwardTab.prevented, 1);
  assert.equal(state.firstFocus, 1);

  documentStub.activeElement = first;
  const backwardTab = keyEvent('Tab', true);
  dispatch(backwardTab);
  assert.equal(backwardTab.prevented, 1);
  assert.equal(state.lastFocus, 1);

  state.menuOpen = false;
  const closedTab = keyEvent('Tab');
  dispatch(closedTab);
  assert.equal(closedTab.prevented, 0);

  state.menuOpen = true;
  dispatch(keyEvent('Escape'));
  assert.equal(context.__closeCalls, 1);
});

test('style.css: não mantém seletores do layout mobile antigo', () => {
  const css = stripCssComments(read('style.css'));

  for (const prohibited of ['body.page-home', 'mobile-tabs', 'home-shortcuts']) {
    assert.equal(
      css.includes(prohibited),
      false,
      `style.css não deve conter ${prohibited}`,
    );
  }
});

test('style.css: MOBILE COMPACTO inicia uma media query de até 900px', () => {
  mobileCompactMedia(read('style.css'));
});

test('style.css: MOBILE COMPACTO mantém .float-wa acima da barra', () => {
  const declarations = declarationsFor(mobileCompactMedia(read('style.css')), '.float-wa');
  assert.match(declarationValue(declarations, 'display') || '', /^flex$/i);
  assert.match(
    declarationValue(declarations, 'bottom') || '',
    /^calc\(\s*72px\s*\+\s*env\(\s*safe-area-inset-bottom\s*\)\s*\)$/i,
  );
});

test('style.css: MOBILE COMPACTO reduz o padding de .page-hero', () => {
  const declarations = declarationsFor(mobileCompactMedia(read('style.css')), '.page-hero');
  assert.match(declarationValue(declarations, 'padding') || '', /^96px\s+16px\s+28px$/i);
});

test('style.css: MOBILE COMPACTO usa proporção 16/9 na .hero-photo', () => {
  const declarations = declarationsFor(mobileCompactMedia(read('style.css')), '.hero-photo');
  assert.match(declarationValue(declarations, 'aspect-ratio') || '', /^16\s*\/\s*9$/i);
});

test('style.css: MOBILE COMPACTO expande .mobile-bar .mb-primary', () => {
  const declarations = declarationsFor(
    mobileCompactMedia(read('style.css')),
    '.mobile-bar .mb-primary',
  );
  assert.match(declarationValue(declarations, 'flex') || '', /^1$/);
});

test('style.css: ações da barra mobile mantêm contraste', () => {
  const media = mobileCompactMedia(read('style.css'));
  const primary = declarationsFor(media, '.mobile-bar .mb-primary');
  const secondary = declarationsFor(media, '.mobile-bar .mb-secondary');
  assert.match(declarationValue(primary, 'background') || '', /^var\(--action\)$/i);
  assert.match(declarationValue(primary, 'color') || '', /^#fff\s*(?:!important)?$/i);
  assert.match(declarationValue(secondary, 'background') || '', /^var\(--mint-whisper\)$/i);
  assert.match(declarationValue(secondary, 'color') || '', /^var\(--forest\)$/i);
});

test('style.css: nav mobile respeita o safe area superior', () => {
  const media = mobileCompactMedia(read('style.css'));
  const declarations = declarationsFor(media, '.nav');
  assert.match(
    declarationValue(declarations, 'padding-top') || '',
    /^env\(\s*safe-area-inset-top\s*\)$/i,
  );
  for (const selector of ['.hero', '.page-hero']) {
    const heroDeclarations = declarationsFor(media, selector);
    const topPadding = declarationValue(heroDeclarations, 'padding-top')
      || declarationValue(heroDeclarations, 'padding') || '';
    assert.match(topPadding, /env\(\s*safe-area-inset-top\s*\)/i);
  }
});

test('style.css: .tf-dot mobile tem alvo de 44px e indicador visual compacto', () => {
  const media = mobileCompactMedia(read('style.css'));
  const declarations = declarationsFor(media, '.tf-dot');
  for (const axis of ['width', 'height']) {
    const value = declarationValue(declarations, `min-${axis}`)
      || declarationValue(declarations, axis) || '';
    const pixels = /^(\d+(?:\.\d+)?)px$/i.exec(value);
    assert.ok(pixels, `.tf-dot deve declarar ${axis} ou min-${axis} em px`);
    assert.ok(Number(pixels[1]) >= 44, `.tf-dot ${axis} efetivo deve ser pelo menos 44px`);
  }

  const indicator = declarationsFor(media, '.tf-dot::before');
  assert.match(declarationValue(indicator, 'width') || '', /^12px$/i);
  assert.match(declarationValue(indicator, 'height') || '', /^12px$/i);
});

test('style.css: body reserva a barra e footer usa padding-bottom compacto', () => {
  const media = mobileCompactMedia(read('style.css'));
  const body = declarationsFor(media, 'body.has-mobile-bar');
  const footer = declarationsFor(media, '.footer');
  assert.match(
    declarationValue(body, 'padding-bottom') || '',
    /^calc\(\s*76px\s*\+\s*env\(\s*safe-area-inset-bottom\s*\)\s*\)$/i,
  );
  assert.match(declarationValue(footer, 'padding-bottom') || '', /^24px$/i);
});

test('style.css: mobile-bar e links de confiança têm limites mobile', () => {
  const media = mobileCompactMedia(read('style.css'));
  const bar = declarationsFor(media, '.mobile-bar');
  const trustLink = declarationsFor(media, '.trust-item a');
  assert.match(declarationValue(bar, 'max-width') || '', /^480px$/i);
  assert.match(declarationValue(trustLink, 'min-height') || '', /^44px$/i);
});

test('style.css: forced colors mobile mantém foco visível', () => {
  const css = read('style.css');
  const marker = '/* MOBILE COMPACTO */';
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `style.css deve conter o marcador ${marker}`);
  const compactCss = stripCssComments(css.slice(markerIndex + marker.length));
  const forcedColors = topLevelCssBlocks(compactCss).find((block) => (
    /^@media\s*\(\s*max-width\s*:\s*900px\s*\)\s*and\s*\(\s*forced-colors\s*:\s*active\s*\)$/i
      .test(block.header)
  ));
  assert.ok(forcedColors, 'deve existir media mobile para forced-colors: active');

  const focus = declarationsFor(forcedColors.body, ':focus-visible');
  const outline = declarationValue(focus, 'outline') || '';
  assert.ok(outline && !/^none(?:\s|$)/i.test(outline), ':focus-visible deve ter outline não-none');
});

test('style.css: contraste de mapa e índice fica escopado ao dark mobile', () => {
  const media = mobileCompactMedia(read('style.css'));
  for (const selector of [
    '[data-theme="dark"] .map-overlay-btn',
    '[data-theme="dark"] .env-index',
  ]) {
    const declarations = declarationsFor(media, selector);
    assert.match(declarationValue(declarations, 'color') || '', /^#0F1A15$/i);
  }
});

test('style.css: forced colors mobile sobrescreve o foco de .tf-dot', () => {
  const css = read('style.css');
  const marker = '/* MOBILE COMPACTO */';
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `style.css deve conter o marcador ${marker}`);
  const compactCss = stripCssComments(css.slice(markerIndex + marker.length));
  const forcedColors = topLevelCssBlocks(compactCss).find((block) => (
    /^@media\s*\(\s*max-width\s*:\s*900px\s*\)\s*and\s*\(\s*forced-colors\s*:\s*active\s*\)$/i
      .test(block.header)
  ));
  assert.ok(forcedColors, 'deve existir media mobile para forced-colors: active');

  const focus = declarationsFor(forcedColors.body, '.tf-dot:focus-visible');
  const outline = declarationValue(focus, 'outline') || '';
  assert.ok(outline && !/^none(?:\s|$)/i.test(outline), '.tf-dot:focus-visible deve ter outline não-none');
});

test('style.css: botão WhatsApp verde usa texto escuro no mobile', () => {
  const media = mobileCompactMedia(read('style.css'));
  const declarations = declarationsFor(media, '.btn-whatsapp');
  assert.match(declarationValue(declarations, 'background') || '', /^#25D366$/i);
  assert.match(declarationValue(declarations, 'color') || '', /^#0F1A15$/i);
});

test('style.css: badges claros mantêm texto escuro no dark mobile', () => {
  const media = mobileCompactMedia(read('style.css'));
  for (const selector of ['.teaser-badge', '.about-badge', '.founder-badge']) {
    const declarations = declarationsFor(media, `[data-theme="dark"] ${selector}`);
    assert.match(declarationValue(declarations, 'color') || '', /^#0F1A15$/i);
  }
});

test('style.css: cards de serviço mantêm grade quadrada compacta', () => {
  const css = read('style.css');
  const media = mobileCompactMedia(css);
  const grid = declarationsFor(media, '.srv-square-grid');
  const card = declarationsFor(css, '.srv-square');
  const image = declarationsFor(css, '.srv-square-img img');

  assert.match(declarationValue(grid, 'gap') || '', /^10px$/i);
  assert.match(declarationValue(card, 'width') || '', /^100%$/);
  assert.match(declarationValue(card, 'aspect-ratio') || '', /^1\s*\/\s*1$/);
  assert.match(declarationValue(image, 'width') || '', /^100%$/);
  assert.match(declarationValue(image, 'height') || '', /^100%$/);
  assert.match(declarationValue(image, 'object-fit') || '', /^cover$/i);
});

test('style.css: controles do carrossel não transbordam no mobile', () => {
  const media = mobileCompactMedia(read('style.css'));
  const dots = declarationsFor(media, '.tf-dots');
  assert.match(declarationValue(dots, 'flex-wrap') || '', /^wrap$/i);
  assert.match(declarationValue(dots, 'gap') || '', /^8px$/);
  assert.match(declarationValue(dots, 'max-width') || '', /^100%$/);
});
