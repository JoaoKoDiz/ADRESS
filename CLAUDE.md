# ADRESS — contexto para continuar o projeto

> Este arquivo é para um novo chat do Claude (ou outra pessoa) continuar o projeto sem perder nada.
> O Claude Code lê o `CLAUDE.md` da raiz sozinho. No claude.ai, cole este texto no começo da conversa.

## 1. Como trabalhar com o dono do projeto

- **Responda sempre em português.**
- **Velocidade acima de tudo.** O pedido mais repetido é "AGILIZE" ("faça o mais rápido possível").
  - Implemente direto; respostas curtas.
  - Entregue uma versão jogável logo e conserte detalhes depois.
  - Testes enxutos, só os necessários.
- **Não mude o que não foi pedido.** Exemplo: "Não mude a estrutura do bairro 3, também." Mantenha tudo como está, exceto o que foi pedido.
- **Ambiguidades.** Se uma ambiguidade muda o resultado, pergunte uma vez, curto, com opções. Para o resto, escolha o óbvio e avise.
  - Exemplo de ambiguidade real: missões que exigiam posto e prédio comercial num bairro que não tinha nenhum dos dois.
- **Depois de cada mudança:**
  1. `npm run build` (gera o `index.html` jogável; o dono abre e aperta F5).
  2. `npm run build:netlify`.
  3. Recriar os dois zips (seção 3).
  4. Commit e push no GitHub (seção 3).
- Ao terminar, diga em poucas linhas o que mudou e como testar (geralmente: "aperte F5").

## 2. O jogo

ADRESS é um jogo 3D de entregas, aconchegante e meio cômico.

**A rodada:**
- Uma pista descreve a casa pelas características visíveis (cor do telhado, objetos no quintal etc.). Ex.: "Entrega para a casa com telhado azul e um flamingo".
- A van vai até a frente da casa e aperta **E**.
- O morador da casa errada reclama e dá um palpite (nada confiável) da próxima casa.
- Cada partida tem **5 entregas: 4 erradas + a 5ª correta** (`ROUTE_LEN = 5` em `logic.js`).
- As pistas são sempre únicas dentro do bairro da partida (`makeClue`).

**Telas:**
- **Tela inicial:** bairro desfocado ao fundo + **Jogar / Configurações / Sair**. Configurações ainda não faz nada.
- **Painel Jogar:** **Carreira | Livre** (metade de cima) e **Shop** (metade de baixo). Shop ainda não faz nada.
- **Motorista animado:** à direita do painel, na van, com braço para fora e cabeça balançando.
- **Transições:** Carreira = a van sai dirigindo + fade. Livre = helicóptero decola + fade.

**Modo Livre:**
- Ao clicar em **Livre**, abre a seleção de bairro (`levelSelect.js`): as 6 miniaturas na tela, setas mudam a seleção, **E**/Enter ou clique joga (depois o helicóptero decola).
- Entregas sem fim no bairro escolhido (`freeLevel`; mesma grade/composição/bloqueios da Carreira, sem parede de entrada).
- Tem helicóptero (H; no Bairro 6 dá para **pousar no terraço dos prédios**: Shift desce, H desliga o motor e fica parado; H de novo decola), míssil (F), van imparável e explosões.
- Destruir todas as casas leva a van automaticamente para fora do bairro e aparece um **monstro gigante** (barra de chefe).
- Durante a contagem final, **T** transforma a van em robô por ~10 s. O monstro mata e a partida recomeça.

**Modo Carreira:**
- **Mapa 3D** de seleção com cara de menu 2D: estrada curva, 6 maquetes de bairros, câmera distante fixa seguindo a van.
  - Só **A/D** movem a van; **E** joga; **M** abre as missões da maquete.
  - A van começa ao lado do último bairro desbloqueado.
- **Cadeado** no canto inferior direito do mapa (no lugar do botão DICA): senha **`1225`** desbloqueia todos os bairros (salvo no navegador).
- **Na partida:**
  - Entrada do bairro fechada (parede invisível).
  - Sem destruição, míssil, helicóptero ou explosões.
  - Botão **MISSÕES x/5** no canto superior direito (ou tecla **M**).
  - Botão **Voltar** no canto superior esquerdo.

**Controles:**

| Tecla | Ação |
|---|---|
| W/S/A/D ou setas | dirigir |
| E / Espaço / Enter | entregar, abastecer (no posto), continuar o diálogo, jogar (no mapa) |
| L | descer da van e andar a pé (van parada, fora do helicóptero); **E** perto da van volta a dirigir. A pé não há entregas, mas dá para entrar nos quintais e na praça (`walker.js`) |
| C | câmera: atrás da van ↔ bairro inteiro |
| botão direito do mouse (segurar e arrastar) | olhar em volta com a câmera atrás da van; ao soltar, volta |
| T ou botão DICA | seta gigante cai do céu na casa indicada e quebra o telhado (1× por entrega) |
| M | missões (Carreira) |
| H / F | helicóptero / míssil (só Livre) |
| Esc ou botão MENU | opções: "Casa explode na entrega errada", "Van imparável" |
| botão ♪ (só ícone) | pausar/continuar a música (`assets/musica-fundo.mp3`) |

## 3. Tecnologia, build e publicação

**Base:**
- Three.js 0.170 + esbuild 0.24, JavaScript puro (ES modules), Node 18+.
- `node_modules` já está instalado; se não estiver, `npm install`.
- `build.mjs` empacota `src/main.js` (IIFE) e injeta no `src/template.html` no lugar de `<!--BUNDLE-->`.
- Resultado: um **`index.html` autocontido** que funciona até abrindo o arquivo direto (`file://`). Só a música fica fora, em `assets/`.

**Comandos:**
- `npm run build` → `index.html` na raiz (é o que o dono abre para jogar).
- `npm run build:netlify` → `dist/index.html` + `dist/assets/`.
- `npm run watch` → build de desenvolvimento a cada alteração.

**GitHub:**
- Repositório: <https://github.com/JoaoKoDiz/ADRESS> (público, branch `main`).
  - Autor dos commits: `JoaoKoDiz <JoaoKoDiz@users.noreply.github.com>`, já configurado no git local do projeto.
  - O `index.html` da raiz **vai no commit**, porque é o que o GitHub Pages serve.
- GitHub Pages: Settings → Pages → Deploy from a branch → `main` / `(root)`. Link: <https://joaokodiz.github.io/ADRESS/>.
  - O arquivo `.nojekyll` desliga o Jekyll.
- O dono também tem um quadro de Projeto no GitHub (users/JoaoKoDiz/projects/5). É só um kanban, não um repositório.
- Fluxo depois de mudar algo:
  ```
  npm run build && git add -A && git commit -m "…" && git push
  ```
- Push e login: o push usa o Git Credential Manager do Windows, que abre uma janela de login do GitHub para o dono. **Nunca peça nem digite senhas ou tokens.**
- `gh` (GitHub CLI) **não está instalado**.

**Netlify:**
- `netlify.toml`: build `npm run build:netlify`, pasta `dist`, Node 20.

**Zips** (na raiz; atualizar depois de cada mudança; são ignorados pelo git):
```bash
rm -f ADRESS-netlify.zip ADRESS-projeto-completo.zip && /c/Windows/System32/tar.exe -a -c -f ADRESS-netlify.zip -C dist index.html assets && /c/Windows/System32/tar.exe -a -c -f ADRESS-projeto-completo.zip README.md CLAUDE.md netlify.toml .gitignore package.json package-lock.json build.mjs index.html adress-2d.html assets src
```
(Use o `tar.exe` do Windows; o `Compress-Archive` deu problema.)

**Ambiente:** Windows 11, pasta `C:\Users\ACER\Downloads\ADRESS`. Há Git Bash e PowerShell. Chrome em `C:/Program Files/Google/Chrome/Application/chrome.exe`.

## 4. Mapa do código (`src/`)

| Arquivo | O que faz |
|---|---|
| `main.js` | Laço do jogo e **máquina de estados** (detalhe abaixo). Também: troca de bairro (`useNeighborhood`), composição sorteada (`composeRound`), bloqueios (`refreshBarriers`), abastecer (`atPump`), HUD (`updateHUD`) e ganchos de teste `window.ADRESS`. |
| `layout.js` | Geometria e grade **configurável** (seção 5). |
| `logic.js` | `Game` (rodada, rota, `visit`), `makeClue(h, pool)` (pista única no bairro), `ref(h)` ("a casa"/"o prédio"), `phrase`. |
| `data.js` | `HOUSES` (casas, prédios comerciais, prédios residenciais), cores, `PHRASE` (texto de cada característica), falas `HINTS`/`REPEATS`, `REF`, `SHOPS`. |
| `world.js` | Cena de um bairro: céu, luz, chão, sebe com portal "VILA ADRESS", árvores, lotes, praça, moradores, postos. |
| `models/` | Modelos: `house.js`, `yard.js` (objetos de quintal), `shop.js`, `apt.js`, `gas.js` (posto), `resident.js`, `kit.js` (`box`, `cyl`, `cone`, `sphere`, `at`, `mat`, `dynamic`, `bakeStatic`, `textTexture`). |
| `van.js`, `camera.js` | Física da van e colisão com `SOLIDS`; câmera chase/overview (braço desvia de casas via `CAM_BOXES`). |
| `career.js` | Progresso das missões (localStorage), desbloqueio, regras de cada missão (`tick`, `visit`, `refuel`, `hint`), avisos (toasts). |
| `missions.js` | `LEVEL_NAMES`, `MISSIONS` (definições), tela de missões, botão MISSÕES. |
| `careerMap.js` | Mapa 3D da Carreira e **maquetes** dos 6 bairros (`miniNeighborhood(kind)`; `MINI_KINDS`). |
| `barriers.js` | Bloqueios de rua sorteados (cavalete/caminhão/buraco) com garantia de alcance. |
| `hint.js`, `boom.js`, `heli.js`, `monster.js` | Seta da dica, explosões/míssil, helicóptero, monstro/robô. |
| `hud.js`, `title.js`, `titleDriver.js`, `menu.js`, `music.js`, `audio.js` | Interface, tela inicial, motorista, opções, música, sons (WebAudio). |
| `levelSelect.js` | Seleção de bairro do modo Livre (miniaturas via `renderMiniThumbnails` em `careerMap.js`). |
| `jamSound.js` | Música `assets/honk.ogg` (embutida no html via loader `dataurl` do esbuild) em loop perfeito (`AudioBufferSourceNode.loop`) só no Bairro 7, a menos de 45 de um engarrafamento, com fade-in/out (~2 s). |
| `backButton.js`, `hintButton.js`, `lockButton.js`, `input.js` | Botões Voltar / DICA / cadeado; teclado. |

`adress-2d.html` é a primeira versão, em 2D (só histórico).

**Máquina de estados (`main.js`):**
- Estados: `title`, `fadeIn`, `drive`, `ring`, `dialog`, `fuel`, `missile`, `boss`, `fadeOut`, `mapIn`, `map`, `mapOut`.
- `IN_GAME` = `drive`, `ring`, `dialog`, `missile`, `fuel`.

## 5. Conceitos importantes

**Coordenadas:**
- X = leste, Z = sul (na direção da câmera), Y = cima.
- Lote 17.2, rua 7.6, sebe 1.6, calçada 0.4.
- As casas têm a frente para o sul (+Z).
- A entrada do bairro fica no meio da borda norte.

**Grade (`layout.js`):**
- `configureGrid(kind)` muda `GRID`, `MAP`, `HOUSE_SLOTS`, `PLAZA`, `ENTRANCE`, `VAN_START` etc. São *live bindings*: importe e use direto.
- Tipos de grade: `'grid4' | 'plaza6' | 'grid5' | 'grid6s' | 'city6'`.

**Obstáculos (`SOLIDS`, caixas AABB) — ordem importa (`wreck()` em `main.js` depende dela):**
1. Lotes (na ordem de `HOUSE_SLOTS`).
2. Praça.
3. Peças dos postos (`GAS_LIST.length × GAS_PARTS.length`).
4. 5 pedaços de sebe.
5. Troncos de árvore de fora (`world.extraSolids`).
6. `ENTRANCE_WALL` (só Carreira).
7. Bloqueios de rua.

**Postos de gasolina:**
- `setGasStations([[s, s+1], …])` define `GAS_LIST`; cada posto ocupa 2 lotes vizinhos da mesma linha + a rua entre eles.
- A van **entra** no posto: só loja, ilhas das bombas, pilares, totem, calibrador e lixeira são sólidos (`GAS_PARTS`, coordenadas locais do modelo).
- A cobertura fica transparente com a van embaixo (`world.updateGas`).
- **Abastecer:** parado embaixo da cobertura, ao lado das bombas, aparece "E — Abastecer" (`atPump()`).
  - Não conta como entrega.
  - Para valer de novo, a van precisa sair da área das bombas e voltar.

**Casas/prédios (`HOUSES`) — índices fixos (não reordenar!):**

| Índices | O que é | Campos |
|---|---|---|
| 0–31 | casas | `roof`, `door`, `f` (características) |
| 32–37 e 66–69 | prédios comerciais (`kind: 'shop'`; lista em `SHOPS`) | `awning`, `facade`, `top` |
| 38–65 | prédios residenciais (`kind: 'apt'`) | `balcony`, `atop`, `extra` |

Casas especiais usadas em missões:
- Galo de metal: 4, 15, 19, 22.
- Fonte pequena: 11, 12, 24.

**Bairros (por `careerLevel`, índice 0–5; nos textos, "Nível/Bairro N" = índice + 1):**

| Bairro | Grade | Como é |
|---|---|---|
| 1 | `grid4` 4×4 | 16 casas (também o modo Livre) |
| 2 | `plaza6` 6×6 | praça 2×2 central (lotes 14, 15, 20, 21, a van não entra) + 32 casas |
| 3 | `grid4` 4×4 | + 3 a 5 cavaletes de obra por partida |
| 4 | `grid5` 5×5 | 1 posto, 2 prédios comerciais, casas (sempre com as de galo/fonte) + 4 a 6 bloqueios (cavalete/caminhão/buraco) |
| 5 | `grid6s` 6×6 | 1 ou 2 postos (linhas diferentes), 5 a 8 prédios comerciais, resto casas |
| 6 | `city6` 6×6 | 28 prédios residenciais cinza e altos + 8 casas; grama seca amarelada fora do bairro |
| 7 | `city7` 6×6 (grade `city6`, cena própria) | cidade como a do Bairro 6, mas com **1 ou 2 postos** (2 lotes cada), **4 ou 5 prédios comerciais**, 4 casas e o resto de prédios residenciais; 4 a 6 caminhões na diagonal (sem buracos nem cavaletes) e **3 a 4 engarrafamentos** (`barriers.js`, tipo `jam`): fila de carros que tampa um trecho inteiro de rua (só trechos horizontais com lote ao norte). O lote ao norte do trecho fica sem acesso, então `barriers.jammedSlots` o exclui das entregas (`applyJams` em `main.js`, via `game.newDelivery`). Missões ainda são modelos vazios |

- **Bloqueios de rua** (`barriers.js`): o sorteio só é aceito se, pelo grafo de ruas (cruzamentos + meio de cada trecho, onde ficam os portões), **todas** as casas continuam alcançáveis. Nunca ficam na rua por dentro de um posto.
- **Composição a cada partida:** `composeRound()` sorteia a composição dos Bairros 4–6; os demais usam `game.newRound()`. O botão Voltar sempre começa uma partida nova.

## 6. Carreira e missões

- **Regra de desbloqueio:** um bairro abre quando **todas as 5 missões** do anterior estão concluídas (ou com a senha do cadeado).
- **Onde fica o progresso:** localStorage `adress.career.v1` (`progress[nível][missão]`; só aumenta).
- **Marcas no localStorage:**
  - `.dizzy` e `.l4v2`: migrações que zeraram missões trocadas.
  - `.all`: cadeado aberto.
- **Opções do menu:** `adress.explodeWrong`, `adress.unstoppable`.
- **Onde ficam as regras:** `career.js` (`level === n` usa o índice).
- Missões de uma **mesma partida** usam contadores que zeram em `startMatch`.
- Na tabela, os nomes estão completos; as descrições estão resumidas. O texto exato está em `missions.js`.

| Nível | Missões (id → nome — regra) |
|---|---|
| 1 Primeiros Dias | `firstShift` Primeiro Turno — partida completa (4 erradas + correta) · `streets` Conhecendo a Vizinhança — 5 ruas antes da correta · `noRepeat` Sem Voltar Atrás — não entrar 4× na mesma rua · `lap` Volta no Quarteirão — 4 cantos antes da 5ª entrega · `wrongWay` Duplo Erro — entrega errada numa casa que não era a da pista |
| 2 Olhos Abertos | `blue` Telhado Azul ×3 · `redWrong` Telhado Vermelho Errado · `fountain` Fonte Pequena (2 falsas) · `trampoline` Insistir no Pulo (4× na mesma casa com pula-pula) · `hint` Pequena Dica (3 partidas) |
| 3 Entregador Teimoso | `tenSame` Dez Vezes é Demais · `tourist` Turista do Bairro (mesma rua 10×) · `nextDoor` Não Era Aqui? (lote vizinho do indicado) · `opposite` Do Outro Lado (3× num canto e 3× no canto oposto) · `dizzy` Manobras Enjoativas (5 voltas em torno da mesma casa) |
| 4 Péssimo Senso de Direção | `colors` Confundi as Cores (pista falsa para algo azul → entregar em algo vermelho; casa = telhado, prédio = toldo) · `roosters` Viciado em Galos (3 falsas em cada uma de 2 casas com galo, mesma partida; meta 2) · `fountainSwap` Fonte Errada · `expensive` É Muito Caro! (abastecer 2× na mesma partida) · `knowHouse` Eu Conheço Essa Casa (3 erradas no mesmo lote em 2 partidas seguidas) |
| 5, 6 e 7 | ainda são **modelos vazios** (`PLACEHOLDER()`, sem `id`): o dono vai mandar as missões |

**Como adicionar missões de um nível:**
1. Defina em `MISSIONS[n]` (`id`, `name`, `desc`, `goal`).
2. Escreva a regra em `career.js` (`visit`, `tick`, `refuel` ou `hint`), usando `setProgress` / `add` / `idx`.
3. Se uma missão já salva mudar de significado, crie uma nova marca de migração no localStorage que zere aquele índice.
4. `LEVEL_NAMES[n]` dá o subtítulo do bairro.

**Maquetes do mapa (`careerMap.js`):**

| Bairro | Maquete |
|---|---|
| 1 | 4 casinhas |
| 2 | 8 casinhas menores + pracinha com chafariz |
| 3 | 4 casinhas + 2 cavaletes fixos |
| 4 | 4 casinhas + caminhão na rua da frente + buraco no cruzamento |
| 5 | posto + prédio comercial + 1 casinha |
| 6 | 3 prédios + 1 casinha |

Fases bloqueadas usam a versão cinza.

## 7. Como testar (Chrome headless)

O `requestAnimationFrame` quase não roda em headless. Por isso os testes:
- injetam um script síncrono no `index.html`;
- avançam o jogo com `ADRESS.step(n)`;
- escrevem o resultado em `document.title`, lido com `--dump-dom`.

**Ganchos em `window.ADRESS`:**
- `startGame(mode)`, `setCareerLevel(l)`, `skipFade()`, `step(n)`.
- `placeVanAtDoor(h)`, `input._press('KeyE')`.
- `game`, `van`, `career`, `missions`, `careerMap`, `barriers`, `SOLIDS`.
- `doorPoint`, `slotOrigin`, `gas` (lista de postos), `nearPump`, `GAS_CANOPY`, `GAS_ISLANDS`.
- `world`, `neighborhood`, `state`, `dialog`, `titleDriver`.

Executor (salve fora do projeto, ex. numa pasta temporária, como `run_page.mjs`). Uso: `node run_page.mjs teste.js [foto.png]`:

```js
import fs from 'fs';
import { execFileSync } from 'child_process';
const dir = process.cwd();
const [testFile, shot] = process.argv.slice(2);
const test = fs.readFileSync(dir + '/' + testFile, 'utf8');
let html = fs.readFileSync('C:/Users/ACER/Downloads/ADRESS/index.html', 'utf8');
const pre = '<script>window.__errs=[];addEventListener("error",e=>__errs.push(e.message));</script>';
const post = `<script>(()=>{try{const A=window.ADRESS;A.skipFade();${test}}catch(e){document.title="ERR "+e.message+" "+String(e.stack).slice(0,300)}})()</script>`;
html = html.replace('<div id="app">', pre + '<div id="app">').replace(/<\/body>/i, () => post + '</body>');
const page = dir + '/page_' + testFile.replace(/\W/g, '_') + '.html';
fs.writeFileSync(page, html);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = ['--headless=new', '--window-size=1600,900', '--hide-scrollbars', '--virtual-time-budget=4000'];
const out = execFileSync(chrome, [...base, '--dump-dom', 'file:///' + page], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });
console.log((out.match(/<title>[^<]*/) || ['(sem título)'])[0]);
if (shot) execFileSync(chrome, [...base, '--screenshot=' + dir + '/' + shot, 'file:///' + page], { stdio: 'ignore' });
```

Exemplo de teste (`teste.js`):
```js
A.setCareerLevel(3); A.startGame('career'); A.step(30);
const h = A.game.route[0]; A.placeVanAtDoor(h); A.step(2); A.input._press('KeyE'); A.step(70);
document.title = 'OK ' + A.dialog.text + ' errs=' + JSON.stringify(window.__errs);
```

**Dicas:**
- Para entrar no mapa da Carreira no teste:
  1. Clique em `[data-act=play]` e depois em `.title-card.career`.
  2. Rode `A.titleDriver._tick(130)`.
  3. Espere `A.state === 'map'` (`setInterval`).
  4. Use `A.careerMap.enter(i)`.
- **Teste de alcance** já usado: *flood fill* numa grade de 0.5 com raio 1.3 da van contra `SOLIDS`; todas as portas (`doorPoint`) devem ser alcançáveis.
- Cuidado com aspas simples dentro de `node -e '…'` no Bash. Prefira escrever scripts de edição em arquivo.

## 8. Pendências / próximos passos conhecidos

- Missões dos Níveis 5 e 6: aguardando o dono mandar.
- **Configurações** e **Shop** na tela inicial: ainda sem função.
- Se o GitHub Pages ainda não estiver ligado: Settings → Pages → `main` / `(root)`.
- A senha do cadeado (`1225`) aparece no código público. O dono foi avisado; é só um "código de trapaça".

## 9. Histórico resumido dos pedidos (ordem)

1. Versão 2D.
2. Conversão para 3D.
3. Câmera em 3ª pessoa seguindo a van.
4. Botão DICA (seta do céu que quebra o telhado).
5. Casas que explodem, menu de opções, míssil.
6. Música com pausar.
7. Mundo aberto fora do bairro.
8. Van imparável.
9. Helicóptero (H).
10. Monstro final + robô "transformers".
11. Zip para o Netlify.
12. Tela inicial com motorista animado e transições.
13. Mapa da Carreira.
14. Diferenças Livre × Carreira e botão Voltar.
15. Tela de missões (M).
16. 5 entregas por partida.
17. Bloqueio de fases e missões dos Níveis 1–4.
18. Estruturas dos Bairros 2–6.
19. Botão MISSÕES.
20. Botão da música só com ícone.
21. Mapa começa no último bairro desbloqueado.
22. Novas missões do Nível 4 + posto onde a van entra e abastece.
23. Cadeado com senha.
24. Maquetes novas no mapa.
25. Bairro 5 com 5–8 prédios comerciais e 1–2 postos.
26. Deploy no GitHub.
