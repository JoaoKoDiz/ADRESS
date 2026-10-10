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
- **Tela inicial:** bairro desfocado ao fundo (a barra e os botões da partida somem: `body.title-on`) + logo ADRESS reto (laranja, contorno escuro) e **Jogar / Configurações / Sair** centralizados, mesma largura/altura (creme #FFF3D6 com borda #FF7A1A; Sair marrom #302014 com texto/borda creme). Configurações ainda não faz nada.
- **Painel Jogar** (`title.js`): bairro desfocado ao fundo; à esquerda logo ADRESS, botão "← Voltar" próprio (`.tp-back`; o Voltar fixo não aparece aqui), "Escolha como jogar", botões largos creme com borda laranja **Carreira** (ícone de mapa, "Avance pelos bairros") e **Livre** (bússola, "Explore no seu ritmo") e um menor **Shop** (caixa, borda roxa). Ícones em SVG embutido. Tela em pé: botões em cima, van embaixo.
- **Van à direita** (`titleDriver.js`): a van inteira (de frente e de lado, enquadrada pela caixa da van — cabe até a torre de caixas) com a customização salva (cores compartilhadas + `registerVan`), motorista na janela balançando a cabeça; `refit()` reenquadra ao voltar do Shop.
- **Transições:** Carreira = a van sai dirigindo + fade. Livre = helicóptero decola + fade.

**Modo Livre:**
- Ao clicar em **Livre**, abre a seleção de bairro (`levelSelect.js`): "Escolha o bairro", 8 cartões creme (4×2) com as miniaturas (enquadradas pela caixa da maquete), "BAIRRO N" + nome só desta tela (`NAMES`: Raízes, Horizontes, Constância, Veredas, Ofício, Mirante, Altitude, Ápice); setas ou clique selecionam (borda laranja, leve ampliação), botão "Jogar no Bairro N" ou **E**/Enter joga (depois o helicóptero decola). O painel Jogar some atrás (`body.lsel-on`).
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
| botão direito do mouse (segurar e arrastar) | girar (volta completa) e inclinar a câmera atrás da van/personagem; **a câmera fica onde você deixar** (não volta sozinha; nova partida/tela volta ao padrão) |
| roda do mouse | zoom: só aproxima (e desfaz); nunca afasta além da distância normal. A câmera não muda sozinha com a van parada/andando nem se vira para as casas (braço fixo; só encolhe para não atravessar casas) |
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
| `world.js` | Cena de um bairro: céu, **sol fixo** (`buildSun`: sprite a ~18° de altura na direção de quem entra, sul; aparece inclinando a câmera com o botão direito), luz, chão, sebe com portal "VILA ADRESS", árvores, lotes, praça, moradores, postos. |
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
| `shop.js` | **Shop** (card roxo do painel Jogar): categorias VAN (Rodas, Bagageiro, Pintura, Estampas) e PERSONAGEM (Bonés, Camisas, Calças, Sapatos, Tom de pele); pré-visualização 3D à direita (nas da van, a setinha à esquerda alterna item sozinho × na van). Arrastar com o mouse na pré-visualização gira o objeto; a rotação automática pausa 10 s (renova a cada movimento) e depois continua. Itens à venda: nenhum ainda (layout). **Rodas**: 8 modelos (`models/wheels.js`: Padrão, Esportiva, Off-road, Retrô, Turbina, Neon, Dourada, Arco-íris; `van.setWheelModel(i)`); só a padrão está equipada e só nela dá para trocar as cores (aro e centro, painel pequeno no canto superior esquerdo da pré-visualização; `wheelTire`/`wheelHub` em `adress.shop.v1`); as outras 7 só podem ser vistas (ainda não à venda). **Estampas**: 18 desenhos à mão + 'Sem estampa' (`models/decals.js`; canvas 2D transparente por lado desenhado em coordenadas de mundo, nunca cobrindo o ADRESS — só as asas — e diferente nos dois lados, exceto asas e xadrez; `van.setDecalModel(i)` / `refreshDecal()`). Ordem: Rota pontilhada, Mapa do bairro, Etiquetas postais, Símbolos de embalagem, Caixinhas desenhadas, Quadrinhos, Rabiscos do motorista, Marcas de pneu, Chamas, Faixa xadrez (2 cores editáveis `decalCheckA/B`), Montanhas e estrada, Entrega na chuva, Encomenda aérea, Asas de entrega, Encomendas espaciais, Entrega fantasma, Tentáculos, Entrega real. Só podem ser vistas (nada à venda/equipado). **Bagageiro**: 16 modelos (`models/racks.js`: Caixas (padrão), Caixotes de madeira, Mudança, Eletrodoméstico, Carga toda remendada, Pneus novos, Entrega de brinquedos, Jardim portátil, Encomenda suspeita, Excesso de encomendas (a torre balança nas curvas/freadas: pêndulo `sway` em `van.js`), Caixa pesada demais (a van afunda: `userData.squat`), Equipamento científico (luzes piscando: `tickRackBlink`), Entrega medieval, Van dentro da van (mini van na cor da pintura), Baú de tesouro, Encomenda alienígena (objeto flutuando preso por cordas; animações em `rackAnims`); `van.setRackModel(i)`), nenhum com cor editável; só o padrão está equipado, os outros só podem ser vistos. Cores (Pintura, camisa, calça, sapatos, pele) são grátis, têm cores prontas + código HEX, valem no jogo todo (`setVanPaint` em `models/paint.js` (reexportado por `van.js`), `CHAR_MATS`/`setCharColors` em `walker.js`) e ficam em `adress.shop.v1`. |
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
- Tipos de grade: `'grid4' | 'plaza6' | 'grid5' | 'grid6s' | 'city6' | 'city7' | 'city8'` (7 = 6×6 como o 6; 8 = 8×8).

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
| 70–85 | prédios futuristas (`kind: 'fut'`; lista em `FUTS`, só no Bairro 8) | `glow`, `crown`, `tone` |
| 38–65 | prédios residenciais (`kind: 'apt'`) | `balcony`, `atop`, `extra` |

Casas especiais usadas em missões:
- Galo de metal: 4, 15, 19, 22.
- Fonte pequena: 11, 12, 24.

**Bairros (por `careerLevel`, índice 0–5; nos textos, "Nível/Bairro N" = índice + 1):**

| Bairro | Grade | Como é |
|---|---|---|
| 1 | `grid4` 4×4 | 16 lotes: o lote 15 (canto mais longe da entrada, à esquerda de quem entra) tem SEMPRE a casa fixa 86 "K" (telhado vermelho, galo, girassóis à esquerda, árvore sem folhas à direita mais perto da casa; `L1_FIXED` em `data.js`, `yardZ` muda a posição de um item do quintal); os outros 15 lotes sorteiam 15 das casas 0–15 (uma fica de fora a cada partida). A fixa entra normalmente nas entregas (falsas ou a certa). No espaço livre do quintal (direita, na frente da árvore) ele fica SEMPRE sentado numa cadeira de balanço lendo jornal (`models/reader.js`, low-poly: loiro, óculos, casaco vermelho #C01212 aberto com mangas dobradas, camisa branca, calça vinho, tênis brancos; balança de leve e "lê"); `reader` em `data.js`. Ele não atende a porta: `narrator: true` faz as falas dessa casa serem pensamentos do narrador entre parênteses (`NARRATOR` em `data.js`, `Game.narratorVisit` em `logic.js`); o palpite que vem dele aparece no topo como "(Talvez seja … )" (`hintByNarrator`). **Caixa do K** (`main.js`, bloco "Bairro 1: a caixa"): 1 caixa por partida no lote 0 (canto oposto), à direita da casa, perto do encontro das cercas; só se pega a pé (E); entrar na van com ela a devolve ao lugar. Entregue a ele (E na frente dele), ele deixa o jornal de lado no braço da cadeira (`setAside` em `reader.js`), a câmera fica fixa (estado `talk`) e aparece a caixa de diálogo (`talkBox.js`: texto progressivo, E completa/avança, borda #FF7A1A, fundo #FFF3D6, negrito em "o topo de um prédio alto"). Concluída, fica salva em `adress.l1.kParcel`: a caixa some e, a pé, "Conversar" repete só a última fala. **Igreja** (`models/church.js`, bloco "a igreja na direção do sol" em `main.js`): só no Bairro 1, só no Modo Livre e só com as duas conversas salvas (`adress.l1.kParcel` + `adress.l6.roofTalk`, gravado ao fim das falas do terraço). Fica 1150 ao sul da sebe (`CHURCH_Z`; na direção do sol; o limite do mundo ao sul vai até `BOUNDS.zMax`, o gramado tem 4000 e o sol acompanha a câmera para ficar sempre no mesmo lugar do céu), invisível até a **aproximação** (bloco "Aproximação" em `main.js` + `churchMusic.js`): gatilho = linha imaginária na borda de fora da sebe sul (z > MAP); além dela, ~1 s seguido indo para o sul (parar/voltar zera a contagem; dentro do bairro nada conta) → a van segue sozinha (velocidade imposta `van.setForceSpeed`, sobe suave até ~55 para chegar no ponto certo; soltar W não para; L/H/F bloqueados) e toca `assets/dark-sanctuary.mp3` (embutido no html, do início, fade-in 4 s, pausa a música de fundo com `music.suspend` sem mudar a preferência salva). Quando a posição REAL do áudio chega a 14 s, a igreja surge (fade 1,2 s) a ~360 da fachada e os controles voltam (acima do máximo a velocidade cai aos poucos). Na aproximação a mira da câmera sobe (`rig.setLookLift`) e a névoa ao sul se afasta. Botão ♪ durante a faixa (`music.setOverride`): pausa/continua do mesmo ponto antes da revelação (pausada, o tempo do áudio para e a van freia suave e espera; a igreja só aparece quando a reprodução chega a 14 s); depois da revelação só pausa (não volta nesta visita). A faixa só termina (fade 1 s) quando o jogador entra a pé na igreja; aí o botão volta a controlar a música de fundo. Uma vez por partida. A igreja ganha colisão até o fim da partida. Inspirada em Notre-Dame (fachada 46 × 68, como a referência): 2 torres idênticas largas (aberturas altas emolduradas, pilares de canto, pináculos), corredor aberto com 4 vãos largos em TODA a largura (arcos abatidos, pilares grossos, piso contínuo, balaustrada baixa, arcada da frente e de trás com céu através, 1 vão em cada lateral; sob as torres tem teto, entre elas fica a céu aberto), rosácea em arco com 2 grupos de janelas em par, galeria dos reis (figuras em nichos), 3 portais largos e fundos (5 arquivoltas, tímpano com relevos, estátuas nos batentes), contrafortes salientes, nave encurtada com contrafortes até o beiral e flecha. Tudo é fundido em 1 malha por material no fim de `buildChurch`. **Interior** (bloco INTERIOR em `church.js`): porta do meio aberta (folhas encostadas por dentro), vestíbulo sob a fachada, nave com pilares compostos em x = ±7 alinhados com os contrafortes, arcos ogivais, trifório com nichos e figurinhas, abóbada ogival com nervuras transversais, diagonais e cumeeira (o telhado é oco), 2 fileiras de 15 bancos, tapete vinho até os degraus, altar com toalha e cruz, vitrais (quadradinhos coloridos com brilho próprio) nas naves laterais, no fundo e uma rosácea sobre a entrada. Interior em cores `i*` mais escuras (penumbra), sem luzes. **K** fica sentado no 6º banco contando da entrada, do lado direito de quem entra (`buildPewReader` em `reader.js`: óculos redondos normais, sem jornal, mãos nas pernas, parado; fora da fusão de malhas). **1ª conversa na igreja** (`main.js`, bloco "Igreja: 1ª conversa"; estado `cine`): a pé perto dele, E ("Conversar") → controles suspensos, 9 falas `CHURCH_LINES` que passam sozinhas (`talkBox.show(..., { auto: true })`; `{ p: s }` = pausa dentro da fala; tempo de leitura proporcional ao texto, `lineDuration`), câmera indo devagar de `camA` (jogador de costas + ele de frente) para `camB` (só ele). Depois da 6ª fala: aviso do jogo com contagem real (`talkBox.warn`), calculada com folga; se zerar fora do bairro, reinicia a partida (`fadeOut`). Jogador e van ficam brancos (`whiten()` em `whiteout.js`, temporário e reutilizável; não mexe na customização) assim que o jogador sai inteiro do quadro durante a aproximação (teste de frustum). No fim: grava `adress.church.talk1`; a câmera fica parada onde chegou e só gira até o jogador (2,2 s), segura ~1,4 s, ele sai da igreja, corte para fora (igreja + van branca), entra na van, ela sai e (tela preta) aparece na rua sul do bairro com as cores, câmera e controles normais. A conversa pode ser repetida (o progresso fica salvo) e tem prioridade sobre "Entrar na van" (a van pode ter entrado pela porta). Colisão: `CHURCH_SOLIDS` (paredes, pilares, bancos, folhas da porta, altar; passagens laterais livres); a câmera não atravessa as paredes (`CHURCH_CAM` → `rig.setExtraBoxes`). Vale na Carreira e no Livre do Bairro 1; o Bairro 3 (mesma grade) não tem |
| 2 | `plaza6` 6×6 | praça 2×2 central (lotes 14, 15, 20, 21, a van não entra) + 32 casas |
| 3 | `grid4` 4×4 | + 3 a 5 cavaletes de obra por partida |
| 4 | `grid5` 5×5 | 1 posto, 2 prédios comerciais, casas (sempre com as de galo/fonte) + 4 a 6 bloqueios (cavalete/caminhão/buraco) |
| 5 | `grid6s` 6×6 | 1 ou 2 postos (linhas diferentes), 5 a 8 prédios comerciais, resto casas |
| 6 | `city6` 6×6 | 28 prédios residenciais cinza e altos + 7 casas + **prédio fixo 87** na quadra **C5** (lote 16; letras A–H = linhas se afastando da rua de entrada, números = colunas a partir do canto à direita de quem entra = A1): sacadas vermelhas, piscina, plantas, moto (`L6_FIXED` em `data.js`). Se a conversa da caixa do Bairro 1 já foi feita (`adress.l1.kParcel`), o K aparece reclinado na 2ª espreguiçadeira do terraço, de óculos de sol (`buildLoungerReader` em `reader.js`). Chega-se de helicóptero (Livre): pousado num terraço, **L desce e anda pela laje** (`roofWalk`, `walker.setFloor`). E perto dele: o helicóptero some só na cena, câmera fixa, 7 falas (`ROOF_LINES`, negritos), depois o aviso "ORIENTAÇÃO DO JOGO" (`talkBox.note`), fade-out 3 s → partida encerrada → tela inicial → fade-in 1,5 s (`talkBox.fadeBlack`). Grama seca amarelada fora do bairro |
| 7 | `city7` 6×6 (grade `city6`, cena própria) | cidade como a do Bairro 6, mas com **1 ou 2 postos** (2 lotes cada), **4 ou 5 prédios comerciais**, 4 casas e o resto de prédios residenciais; 4 a 6 caminhões na diagonal (sem buracos nem cavaletes) e **3 a 4 engarrafamentos** (`barriers.js`, tipo `jam`): fila de carros que tampa um trecho inteiro de rua (só trechos horizontais com lote ao norte). O lote ao norte do trecho fica sem acesso, então `barriers.jammedSlots` o exclui das entregas (`applyJams` em `main.js`, via `game.newDelivery`). Missões ainda são modelos vazios |
| 8 | `city8` 8×8 | como o Bairro 7 (1–2 postos, 4–5 prédios comerciais, 4–6 caminhões, 3–4 engarrafamentos, música `honk.ogg`), só que 8×8 e com **prédios mais altos** (residenciais com 9 andares: `APT_BUILD.floors` em `models/apt.js`, definido em `useNeighborhood`; câmera `BUILD_H` = 31) e, **desligado por enquanto** (`USE_FUTS = false` em `main.js`; o dono pediu para guardar o design), um **2º tipo de prédio, futurista** (`kind: 'fut'`, `models/fut.js`, índices 70–85 = `FUTS`: 4 cores de neon × 4 coroas — antena, anéis, domo, esfera; tags `glow:*` e `crown:*`). Hoje entram os 28 residenciais, 4–5 comerciais e casas nos lotes que sobram (com `USE_FUTS = true`, entram também os 16 futuristas). O helicóptero pousa no terraço dos residenciais e no topo dos futuristas. Missões são modelos vazios |
| 9 | `hill8` 8×8 "Encostas" | nível 1 (H1=3) ao sul da rua 4, nível 2 (H2=6) nas linhas 6–7/colunas 4–7 (`TERRAIN` em `layout.js`, visual em `terrain.js`). 3 ladeiras (a van sobe; `van.js` segue `TERRAIN.h` e inclina), 2 escadarias só a pé (sólidos `vanOnly`, filtrados em `walkSolids`). 1–2 postos só na parte baixa, 4–5 comerciais, 28 residenciais, casas no resto; 1–2 caminhões + 1–2 engarrafamentos. Pistas com lugar (`slotPlaceTags`: `loc:top/ramp/stairs`) |
| 10 | `canal8` 8×8 "Travessia" | canal norte–sul nas colunas 3–4 (`CANAL`), 3 pontes (ruas 1, 4, 7) com placas LADO LESTE/OESTE, 2 passarelas só a pé. 1–2 postos e 2–3 **galpões** (`kind: 'ware'`, índices 88–103, `models/ware.js`; ocupam 2 lotes + a rua entre eles, como o posto) sempre de um lado só; 2–3 pares de **casas gêmeas** (104–109 = cópias de `TWINS`) sempre em lados opostos (`game.arrange`); prédios das 2 alturas (`APT_BUILD.mixed`). Pistas com `side:east/west` (`game.placeTags` → `setPlaceTags` em `logic.js`). Poucos bloqueios; `roadTopology()` garante o alcance |

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
| 5 a 10 | ainda são **modelos vazios** (`PLACEHOLDER()`, sem `id`): o dono vai mandar as missões |

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
- **Configurações** na tela inicial: ainda sem função. **Shop**: só o layout e as cores grátis; nenhum item à venda ainda (não há moeda).
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

## 10. Atualizações recentes (bagageiros, shop, câmera)

- **Bagageiros** (`models/racks.js`): 16 modelos; todos apoiam no teto (y≈2.30), exceto a Encomenda alienígena (flutua, cordas esticam ao subir, brilho verde). Caixa pesada demais usa cavidade real no teto (`PIT` em `van.js`). Baú e alienígena têm brilho pulsante (`glowSprite`, `tickRack`).
- **Salvar no Shop** (`shop.js` `saveBar`, `models/vanLook.js`): barra fixa no rodapé do meio, em TODAS as categorias (Bonés: "Nada para salvar ainda"). Rodas/Bagageiro/Estampas: "Salvar" equipa o modelo (`adress.shop.equip.v1`, `registerVan`) e salva junto as cores do painel (roda padrão/xadrez). Cores (Pintura, Camisas, Calças, Sapatos, Tom de pele, painéis) são rascunho (`draft`) até apertar Salvar (`adress.shop.v1`); trocar de categoria ou fechar o Shop sem salvar volta às cores salvas (`revertColors`).
- **Câmera** (`camera.js`, reescrita): braço em raio que para antes de casas/sebe (sem saltos), pivô, giro, inclinação e zoom suavizados. Botão direito arrastando gira/inclina e **fica** onde o jogador deixou; roda só aproxima; **botão do meio** volta ao padrão. Nada muda sozinho.
- **Personagem** (`models/driver.js`): mesma fisionomia e estilo do K (história paralela): cabeça grande facetada (esfera de poucas faces), nariz e orelhas arredondados, olhos simples, sobrancelhas retas, boca pequena e reta (sério e tranquilo), nuca e mechas de cabelo, boné e óculos escuros (aro octogonal) do jogador; corpo compacto, pernas curtas (`BODY` exporta as medidas), ombros embutidos no tronco, mãos simples (`flatHand`), tênis um pouco maiores; tudo fosco e facetado (`flatShading`). As cores NÃO são as do K: camisa/calça/tênis/pele continuam sendo os materiais únicos do Shop. No menu, o motorista fica sentado dentro da cabine: `models/seatedDriver.js` (`buildSeatedDriver(van.body)`) usa o MESMO `buildBody()` (escala 0,4, girado para a janela, preso à carroceria — acompanha a suspensão e o bagageiro pesado), janela aberta de verdade (o vão escuro grava stencil e apaga a profundidade só ali; as peças de dentro da cabine usam stencil e só aparecem pela janela), braço resolvido pelos pontos reais (ombro → cotovelo apoiado no peitoril → antebraço pendurado por fora, rente à porta; `flatHands` = mão com palma, dedos juntos e polegar). Só a cabeça balança (em volta do pescoço). Testes: `ADRESS.titleDriver._tick(n, dt)`, `_view(pos, alvo)`, `_seated`. `buildBody()` (a pé, `walker.js`) e `buildHead()` (também na janela da van, `titleDriver.js`). `CHAR_MATS`/`CHAR_DEFAULT`/`setCharColors` agora moram aí (reexportados por `walker.js`). Camisa, calça e tênis têm 1 material cada; dobras/gola/barras/cadarço são só geometria no mesmo material. Boné (vermelho) e cabelo ainda são cores fixas.
