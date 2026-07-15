# Site Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir acessibilidade, contraste, prioridade de ações mobile, resiliência de conteúdo e metadados do website D'Pylar sem redesenhar sua identidade.

**Architecture:** Manter o site estático e adicionar um contrato Node dedicado às melhorias. O HTML fornecerá semântica e conteúdo inicial; o CSS cuidará apenas da apresentação; `script.js` concentrará a contenção de foco dos diálogos, enquanto o script local continuará responsável pelo carrossel do Local.

**Tech Stack:** HTML5, CSS3, JavaScript sem dependências, Node.js `node:test`.

---

### Task 1: Contratos de estrutura, conteúdo e metadados

**Files:**
- Create: `tests/site-quality.test.cjs`
- Test: `index.html`
- Test: `servicos.html`
- Test: `sobre.html`
- Test: `equipe.html`
- Test: `local.html`
- Test: `ambiente.html`

- [ ] **Step 1: Write the failing tests**

Criar `tests/site-quality.test.cjs` com `node:test`, `node:assert/strict` e helpers `read()` e `elementsByClass()` equivalentes aos usados em `tests/mobile-layout.test.cjs`. Adicionar testes que exijam, em cada página:

```js
assert.equal((html.match(/<main\b/gi) || []).length, 1);
assert.equal((html.match(/<\/main>/gi) || []).length, 1);
assert.match(html, /<a\s+href="#main-content"\s+class="skip-link">Pular para o conteúdo<\/a>/);
assert.match(html, /<main\s+id="main-content">/);
assert.match(html, /<meta\s+property="og:url"\s+content="https:\/\/dpylar\.vercel\.app\//);
assert.match(html, /<meta\s+name="twitter:card"\s+content="summary">/);
```

Adicionar contratos específicos:

```js
assert.match(read('ambiente.html'), /<h1 id="envHeroTitle">Recepção<\/h1>/);
assert.match(read('ambiente.html'), /<img id="envImg" src="assets\/ambiente-recepcao\.jpg"/);
assert.match(read('ambiente.html'), /<div id="envBody">[\s\S]*?<p>[^<]+<\/p>/);
assert.doesNotMatch(`${read('local.html')}\n${read('ambiente.html')}`, /acesso para deficientes/i);
assert.match(read('sobre.html'), /O que dizem nossos clientes/);
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `node tests/site-quality.test.cjs`

Expected: FAIL para landmarks, conteúdo padrão, copy e metadados ainda ausentes.

- [ ] **Step 3: Implement the minimal HTML changes**

Em cada página:

```html
<body class="has-mobile-bar">
<a href="#main-content" class="skip-link">Pular para o conteúdo</a>
...
<main id="main-content">
  <!-- heroes e seções de conteúdo existentes -->
</main>
<footer class="footer">
```

Adicionar `og:url` e `<meta name="twitter:card" content="summary">` com a URL canônica de cada página. Em `local.html`, adicionar também `og:type="website"` e `og:locale="pt_BR"`; em `ambiente.html`, adicionar o conjunto Open Graph básico.

Preencher a Recepção como conteúdo inicial de `ambiente.html` e corrigir a copy especificada, sem mudar preços.

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `node tests/site-quality.test.cjs`

Expected: contratos de estrutura, conteúdo e metadados PASS.

- [ ] **Step 5: Commit**

```powershell
git add tests/site-quality.test.cjs index.html servicos.html sobre.html equipe.html local.html ambiente.html
git commit -m "feat: melhora estrutura e conteúdo do site"
```

### Task 2: Hierarquia mobile e contraste

**Files:**
- Modify: `tests/site-quality.test.cjs`
- Modify: `tests/mobile-layout.test.cjs`
- Modify: `style.css`

- [ ] **Step 1: Write the failing CSS contracts**

Adicionar testes que extraiam o bloco `MOBILE COMPACTO` e exijam:

```js
assert.match(compactCss, /\.mobile-bar\s+\.mb-secondary\s*\{[^}]*display\s*:\s*none/s);
assert.match(compactCss, /\.float-wa\s*\{[^}]*display\s*:\s*none/s);
assert.match(css, /\.btn-whatsapp\s*\{[^}]*color\s*:\s*#0F1A15/is);
assert.match(css, /\.float-wa\s*\{[^}]*color\s*:\s*#0F1A15/is);
assert.match(css, /\[data-theme="dark"\][^{]*\.btn-mint[\s\S]*?color\s*:\s*#0F1A15/is);
```

Atualizar o teste antigo da barra para continuar exigindo um `.mb-primary`, mas não exigir `.mb-secondary` visível no layout compacto.

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `node tests/site-quality.test.cjs`

Expected: FAIL porque WhatsApp ainda aparece fixo e usa texto branco.

- [ ] **Step 3: Implement the CSS rules**

Adicionar `.skip-link` visível ao foco. Alterar WhatsApp para texto escuro e, dentro de `@media (max-width: 900px)`, usar:

```css
.mobile-bar .mb-secondary { display: none; }
.float-wa { display: none; }
```

Adicionar overrides de tema escuro para `.btn-nav`, `.btn-mint`, `.mobile-bar .mb-primary`, `.srv-square-price` e badges de ação com texto `#0F1A15`; nos estados hover com fundo escuro, manter texto branco.

- [ ] **Step 4: Run the focused tests to verify GREEN**

Run: `node tests/site-quality.test.cjs`

Expected: PASS.

Run: `node tests/mobile-layout.test.cjs`

Expected: PASS com o contrato mobile atualizado.

- [ ] **Step 5: Commit**

```powershell
git add tests/site-quality.test.cjs tests/mobile-layout.test.cjs style.css
git commit -m "fix: melhora contraste e foco do mobile"
```

### Task 3: Diálogos acessíveis e carrossel operável por teclado

**Files:**
- Modify: `tests/site-quality.test.cjs`
- Modify: `local.html`
- Modify: `equipe.html`
- Modify: `servicos.html`
- Modify: `script.js`
- Modify: `style.css`

- [ ] **Step 1: Write the failing dialog contracts**

Adicionar testes para exigir:

```js
assert.match(read('script.js'), /function trapDialogFocus\s*\(/);
assert.match(read('script.js'), /trapDialogFocus\(event,\s*modal\)/);
assert.match(read('script.js'), /trapDialogFocus\(e,\s*lightbox\)/);
assert.match(read('local.html'), /<div class="lightbox" id="lightbox" role="dialog" aria-modal="true"[^>]*hidden>/);
assert.equal((read('local.html').match(/<button type="button" class="local-slide"/g) || []).length, 14);
assert.match(read('local.html'), /lastLightboxFocus/);
assert.match(read('local.html'), /trapDialogFocus\(e,\s*lightbox\)/);
assert.doesNotMatch(read('equipe.html'), /role="tablist"/);
assert.doesNotMatch(read('script.js'), /setAttribute\('role',\s*'tab'\)/);
```

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `node tests/site-quality.test.cjs`

Expected: FAIL para utilitário, semântica e controles ainda ausentes.

- [ ] **Step 3: Implement the shared focus helper**

Adicionar no início de `script.js`:

```js
function focusableElements(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function trapDialogFocus(event, dialog) {
  if (event.key !== 'Tab') return;
  const items = focusableElements(dialog);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
}
```

Chamar o helper nos handlers de teclado dos modais de Serviços e Equipe.

- [ ] **Step 4: Implement the Local lightbox semantics**

Trocar cada `.local-slide` por `<button type="button" class="local-slide" aria-label="Ampliar ...">`. Declarar o lightbox como modal oculto. Na abertura, guardar `document.activeElement`, remover `hidden`, bloquear rolagem e focar Fechar; no fechamento, restaurar `hidden`, rolagem e foco. Aplicar `trapDialogFocus` no handler local.

No CSS, zerar `padding`, `font` e aparência nativa de `.local-slide` sem alterar suas dimensões.

- [ ] **Step 5: Simplify team navigation semantics**

Remover `role="tablist"` do contêiner de indicadores, `role="tab"` e `aria-selected` dos botões. Manter `aria-label`, classe `active`, setas e swipe.

- [ ] **Step 6: Run the focused tests to verify GREEN**

Run: `node tests/site-quality.test.cjs`

Expected: PASS.

Run: `node tests/mobile-layout.test.cjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add tests/site-quality.test.cjs local.html equipe.html servicos.html script.js style.css
git commit -m "fix: torna diálogos acessíveis por teclado"
```

### Task 4: Consistência de assets e links externos

**Files:**
- Modify: `tests/site-quality.test.cjs`
- Modify: `local.html`
- Modify: `ambiente.html`
- Modify: `index.html`

- [ ] **Step 1: Write the failing consistency contracts**

Exigir `width="44" height="44" alt="D'Pylar"` nos logos de navegação de Local e Ambiente; exigir `rel="noopener"` em todo link com `target="_blank"`; exigir dimensões reais nas sete imagens de cards de ambientes.

- [ ] **Step 2: Run the tests to verify RED**

Run: `node tests/site-quality.test.cjs`

Expected: FAIL nas inconsistências conhecidas de Local e Ambiente.

- [ ] **Step 3: Implement the attribute fixes**

Usar as dimensões reais já verificadas no repositório:

```text
recepcao 1280x2276; sala-cera 1280x1382; sala-multiuso 1280x1560;
sobrancelha 1092x1161; cilios 581x658; copa 1280x2276; banheiro 1280x2276.
```

Adicionar `rel="noopener"` aos links externos restantes e dimensões nos avatares decorativos da home (`width="640" height="800"`).

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `node tests/site-quality.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tests/site-quality.test.cjs local.html ambiente.html index.html
git commit -m "fix: uniformiza imagens e links externos"
```

### Task 5: Verificação final

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run every test directly**

```powershell
node tests/pre-delivery.test.cjs
node tests/mobile-layout.test.cjs
node tests/site-quality.test.cjs
```

Expected: todos os testes PASS, zero falhas.

- [ ] **Step 2: Verify syntax and whitespace**

```powershell
node --check script.js
git diff --check
```

Expected: ambos saem com código 0 e sem mensagens de erro.

- [ ] **Step 3: Serve and probe routes**

Executar servidor HTTP local e confirmar status 200 para `index.html`, `servicos.html`, `sobre.html`, `equipe.html`, `local.html` e `ambiente.html?id=recepcao`.

- [ ] **Step 4: Review the complete diff**

Run: `git diff main...HEAD --stat` e `git diff main...HEAD`

Expected: somente alterações descritas nesta especificação e neste plano.

- [ ] **Step 5: Commit final test adjustments if needed**

```powershell
git add tests
git commit -m "test: cobre melhorias de qualidade do site"
```
