# Qualidade e acessibilidade do website D'Pylar

Data: 14 de julho de 2026

## Objetivo

Melhorar a experiência mobile e desktop do site sem alterar sua identidade visual aprovada. O trabalho deve corrigir barreiras de acessibilidade, reduzir a competição entre ações no mobile, tornar o detalhe de ambientes resiliente sem JavaScript e uniformizar conteúdo e metadados.

## Público e tarefa principal

O site atende pessoas de Campina Grande que querem conhecer os serviços e o espaço antes de agendar. A tarefa principal de todas as páginas é levar ao agendamento; WhatsApp, localização e conteúdo institucional são apoios contextuais.

## Direção visual preservada

- **Cores:** fundo `#F7FAF8`, verde profundo `#163C2C`, verde de ação `#267653`, verde claro `#DCEDE3`, rosa de assinatura `#C4788A` e branco `#FFFFFF`.
- **Tipografia:** Newsreader permanece nos títulos; Manrope permanece em texto, navegação e controles.
- **Layout:** hero editorial com fotografia real, seções em largura máxima de 1140 px e componentes empilhados no mobile.
- **Assinatura:** o recorte assimétrico da fotografia principal e o apóstrofo rosa continuam sendo os elementos distintivos. Não serão adicionados novos ornamentos.

Wireframe mobile da ação principal:

```text
┌────────────────────────────┐
│ logo                  menu │
├────────────────────────────┤
│ conteúdo da página         │
│                            │
│                            │
├────────────────────────────┤
│      Agendar horário       │
└────────────────────────────┘
```

O WhatsApp continuará no menu e nos CTAs contextuais. O botão flutuante e a ação secundária da barra serão ocultados até 900 px.

## Acessibilidade

1. Todas as páginas terão link “Pular para o conteúdo” e um único `<main id="main-content">`.
2. Texto normal deve atingir contraste WCAG AA de 4,5:1. Botões do tema escuro usarão texto escuro sobre o verde claro de ação; controles WhatsApp usarão texto/ícone escuro em todos os tamanhos.
3. O lightbox do Local será aberto por botões acessíveis, declarado como diálogo modal, começará oculto, moverá o foco para o botão de fechar, conterá Tab/Shift+Tab e devolverá o foco ao controle de origem.
4. Os diálogos de Serviços e Equipe também conterão o foco, preservarão Escape e devolverão o foco.
5. Os indicadores da equipe serão botões de navegação simples, sem semântica incompleta de abas.

## Conteúdo resiliente de ambientes

`ambiente.html` terá a Recepção como conteúdo HTML inicial completo: título, descrição, imagem, textos e benefícios. O JavaScript continuará substituindo esse conteúdo quando houver um `id` válido na URL. Assim, falha ou bloqueio de JavaScript não produzirá imagem quebrada nem página vazia.

Os textos “acesso para deficientes” serão substituídos por “acessível para pessoas com deficiência”. Afirmações de esterilização serão redigidas como protocolos de higiene e uso de materiais individuais, evitando promessas técnicas mais amplas do que o restante do site sustenta.

## Conteúdo e consistência

- “O que dizem quem já veio” passará a “O que dizem nossos clientes”.
- Chamadas institucionais evitarão gênero quando a mensagem se destinar a todo o público.
- Logos de navegação terão `width`, `height` e texto alternativo consistentes.
- Links externos com nova aba terão `rel="noopener"`.
- Preços e serviços existentes não serão modificados neste ciclo.

## Metadados

As páginas internas receberão `og:url` e cartão Twitter coerente com o logo quadrado atual (`summary`). `local.html` receberá `og:type` e `og:locale`; `ambiente.html` receberá o conjunto social básico. A estratégia atual de canonical único para `ambiente.html` será mantida porque os detalhes por query string não serão tratados como páginas SEO independentes neste ciclo.

## Estrutura técnica

As mudanças permanecerão nos arquivos estáticos atuais:

- HTML: landmarks, conteúdo padrão, semântica e copy;
- CSS: skip link, contraste, barra mobile e estados dos diálogos;
- JavaScript: utilitário compartilhado de contenção de foco e integração nos três diálogos;
- testes Node: contratos para cada comportamento novo.

Não será introduzido framework, build step ou sistema de templates. A duplicação de cabeçalho/rodapé e a conversão das imagens para WebP/AVIF ficam registradas como evolução posterior, pois exigem uma mudança arquitetural ou pipeline de assets independente.

## Estratégia de testes

Os testes devem falhar antes das alterações de produção e cobrir:

- um `<main>` e um skip link por página;
- uma única ação visível na barra mobile e ocultação do WhatsApp flutuante;
- regras de contraste para WhatsApp e tema escuro;
- semântica e abertura por teclado do lightbox Local;
- conteúdo padrão não vazio em `ambiente.html`;
- contenção de foco nos diálogos de Serviço e Equipe;
- metadados sociais das páginas internas;
- manutenção dos 60 testes atuais.

## Critérios de aceite

- Todos os testes Node passam em execução direta.
- `node --check script.js` passa.
- Nenhuma referência local de asset fica quebrada.
- As seis rotas respondem HTTP 200.
- Nenhuma página apresenta overflow horizontal pelas novas regras.
- Desktop preserva o layout atual.
- Mobile exibe apenas o agendamento como ação fixa.
- Conteúdo principal continua utilizável quando JavaScript está indisponível.

## Revisão de especificidade

A direção evita um redesenho genérico de “site de beleza”. Em vez de adicionar cards, gradientes ou animações, remove competição visual e reforça o elemento já particular da D'Pylar: fotografia real com recorte assimétrico, verde profundo e apóstrofo rosa. Não há placeholders, requisitos contraditórios ou decisões pendentes nesta especificação.
