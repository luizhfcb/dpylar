# Design mobile compacto da D'Pylar

Data: 13 de julho de 2026

## Objetivo

Reajustar a experiência mobile do site da D'Pylar sem alterar a composição aprovada para desktop. O mobile deve funcionar como um site compacto, com páginas separadas, hierarquia clara, menos competição entre ações e carregamento visual mais direto.

O resultado deve priorizar três objetivos em equilíbrio:

- facilitar o agendamento;
- transmitir higiene e confiança;
- manter uma presença acolhedora e premium.

## Direção aprovada

A composição aprovada é a **A — Compacto editorial**.

Características principais:

- texto e proposta de valor aparecem antes da imagem;
- a hero utiliza `assets/ambiente-recepcao.jpg`;
- a imagem aparece em formato panorâmico, com cantos arredondados;
- a avaliação 5,0 aparece como selo sobre a imagem;
- o CTA principal fica visível na hero e é repetido como ação fixa inferior;
- “Ver serviços” vira link textual secundário;
- WhatsApp deixa de competir com o agendamento na primeira tela.

## Escopo

O reajuste se aplica a:

- `index.html`;
- `servicos.html`;
- `sobre.html`;
- `equipe.html`;
- `local.html`;
- `ambiente.html`;
- regras responsivas em `style.css`;
- comportamento mobile em `script.js`.

O desktop a partir de 901 px deve manter a composição, dimensões e navegação atuais, exceto pela troca explícita da imagem da hero da home.

## Breakpoints

Serão usados dois níveis responsivos:

- até 900 px: navegação compacta, CTA fixo único e páginas internas empilhadas;
- até 600 px: ajustes finos para telefones, com espaçamento e tipografia reduzidos;
- acima de 900 px: comportamento desktop atual.

O CSS mobile deve ficar concentrado em um bloco final e específico, evitando regras duplicadas ou seletores mortos.

## Navegação mobile

O cabeçalho mobile terá:

- altura aproximada de 64 px;
- logo e nome D'Pylar à esquerda;
- botão do menu à direita;
- sem botão de tema ocupando espaço no cabeçalho;
- controle de tema movido para dentro do menu mobile.

O menu continuará abrindo como overlay acessível, preservando:

- `aria-expanded`;
- `aria-hidden`;
- foco inicial no botão de fechar;
- bloqueio de rolagem do conteúdo ao fundo;
- fechamento por Escape.

As páginas permanecem separadas. O código incompleto de abas mobile e os estilos associados serão removidos, pois não correspondem à arquitetura aprovada.

## CTA fixo

No mobile haverá apenas uma barra inferior com o botão **Agendar horário**, apontando para o Trinks.

O WhatsApp flutuante e o botão secundário da barra inferior serão ocultados até 900 px. O WhatsApp continuará disponível:

- no menu mobile;
- nas seções de contato;
- nos CTAs contextuais de serviços.

A barra deve respeitar `env(safe-area-inset-bottom)` e o `body` deve receber espaço inferior suficiente para que nenhum conteúdo fique coberto.

## Hero da home

Ordem visual:

1. localização;
2. título;
3. descrição curta;
4. CTA primário e link “Ver serviços”;
5. foto da recepção;
6. selo de avaliação;
7. linha compacta com provas de confiança.

Regras:

- alinhamento à esquerda;
- título entre 2 e 2,2 rem em telefones;
- descrição com largura total e entrelinha próxima de 1,5;
- foto com proporção aproximada de 16:9;
- `object-position` ajustado para manter o logo da recepção visível;
- hero sem altura mínima artificial;
- primeira tela deve mostrar título, CTA e a maior parte da foto em 390 × 844 px.

Os avatares com letras da versão atual serão removidos no mobile. As provas serão apresentadas como três itens curtos: “10 mil+”, “Desde 2016” e “Higiene”.

## Páginas internas

### Hero interna

As páginas internas usarão uma hero entre 210 e 240 px, em vez dos atuais 324–353 px observados no mobile.

- padding superior suficiente para o header fixo;
- título entre 1,75 e 1,9 rem;
- descrição com máximo de três linhas quando o texto permitir;
- espaçamento inferior reduzido.

### Serviços

- cards em coluna única;
- imagem com altura limitada entre 220 e 260 px;
- conteúdo e CTA visíveis sem uma imagem ocupar toda a primeira tela;
- espaçamento menor entre cards;
- nenhuma mudança estrutural nos dados dos serviços.

### Sobre

- imagem da recepção limitada a aproximadamente 260 px;
- selos reposicionados para não colidir com a barra inferior;
- texto com espaçamento vertical compacto;
- benefícios em duas colunas somente quando houver largura suficiente.

### Equipe

- retrato principal limitado a aproximadamente 300 px;
- setas e indicadores com alvos de toque de pelo menos 44 px;
- conteúdo textual visível logo após a imagem;
- correção de imagens ausentes permanece dentro do escopo caso as referências atuais estejam inválidas.

### Local e ambientes

- carrossel de ambientes com altura reduzida;
- cards em duas colunas apenas quando as imagens continuarem legíveis;
- detalhes de ambiente com imagem panorâmica;
- CTA fixo sem sobrepor texto ou imagem;
- imagens ausentes devem exibir fallback visual coerente, não espaços quebrados.

## Sistema visual

O mobile continua usando a identidade aprovada do desktop:

- fundo claro e verde profundo;
- verde de ação para botões;
- títulos serifados;
- textos e controles em fonte sem serifa;
- cantos arredondados entre 14 e 20 px;
- sombras discretas.

Não serão introduzidas novas cores, tipografias ou componentes exclusivos sem necessidade.

## Movimento e acessibilidade

- respeitar `prefers-reduced-motion`;
- manter foco visível em links, botões e menu;
- botões com área mínima de 44 × 44 px;
- manter conteúdo visível quando JavaScript estiver desativado;
- evitar texto sobre foto sem contraste garantido;
- não usar truncamento que esconda informações essenciais;
- impedir overflow horizontal em todas as páginas.

## Implementação

A implementação deve:

- preservar todas as alterações atuais do usuário;
- evitar reescrever o CSS desktop;
- remover apenas regras mobile comprovadamente sem uso;
- adicionar seletores mobile específicos e previsíveis;
- manter o HTML sem duplicar conteúdo apenas para apresentação;
- usar a imagem da recepção já otimizada no repositório.

## Verificação

Testes visuais obrigatórios:

- 390 × 844 px;
- 430 × 932 px;
- 768 × 1024 px;
- 1280 × 720 px para verificar ausência de regressão desktop.

Páginas verificadas em cada viewport:

- home;
- serviços;
- sobre;
- equipe;
- local;
- um detalhe de ambiente.

Critérios de aceite:

- nenhum overflow horizontal;
- apenas um CTA fixo no mobile;
- WhatsApp flutuante oculto no mobile;
- menu abre, fecha e responde a Escape;
- título, CTA e foto da recepção aparecem na primeira tela da home;
- heroes internas ficam visivelmente mais compactas;
- nenhuma imagem quebrada nas páginas verificadas;
- barra inferior não cobre conteúdo;
- desktop mantém layout e navegação atuais;
- console sem erros JavaScript.
