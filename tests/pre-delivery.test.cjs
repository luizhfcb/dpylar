const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readOptional(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

test('social pages use the production Open Graph image URL', () => {
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
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml: missing ${url}`);
  }
});

test('environment detail page declares its canonical URL', () => {
  assert.match(
    read('ambiente.html'),
    /<link\s+rel="canonical"\s+href="https:\/\/dpylar\.vercel\.app\/ambiente\.html">/,
  );
});

test('the site does not publish the known placeholder testimonials', () => {
  const about = read('sobre.html');
  const html = `${read('index.html')}\n${about}`;
  assert.doesNotMatch(html, />\s*(?:M\.S\.|A\.R\.|L\.C\.)\s*</);
  assert.match(html, /https:\/\/www\.google\.com\/maps\/search\//);

  for (const author of [
    'Antonio Henrique',
    'Ednalva Nascimento',
    'Marília Gabriela',
  ]) {
    assert.ok(about.includes(author), `sobre.html: missing real reviewer ${author}`);
  }

  for (const excerpt of [
    'Tudo é maravilhoso neste lugar.',
    'Atendimento impecável, ambiente acolhedor e resultados visíveis!',
    'Melhor lugar para depilação em Campina Grande.',
  ]) {
    assert.ok(about.includes(excerpt), `sobre.html: missing verified excerpt ${excerpt}`);
  }
});

test('unused heavy source assets stay out of Vercel deploys', () => {
  const ignored = new Set(
    readOptional('.vercelignore')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  for (const asset of [
    'assets/logo.original.png',
    'assets/icon-loc.original.png',
    'assets/img4.jpg',
    'assets/img5.jpg',
  ]) {
    assert.ok(ignored.has(asset), `.vercelignore: missing ${asset}`);
  }
});

test('home hero uses the high-resolution reception asset', () => {
  assert.match(
    read('index.html'),
    /<img\s+src="assets\/ambiente-recepcao\.jpg"\s+width="1280"\s+height="2276"/,
  );
});
