# ADRESS — versão experimental: história completa (rodada 2)

> Experimento separado da versão principal. Nada aqui muda o jogo principal nem o progresso salvo dele.
> Esta é a 2ª rodada: o pedido original foi reavaliado inteiro e boa parte foi reconstruída. A rodada 1 continua jogável e
> preservada (abaixo).

## 1. Onde está cada versão

| | Versão principal (preservada) | Experimento — rodada 2 (atual) | Experimento — rodada 1 (preservada) |
|---|---|---|---|
| Jogar | <https://joaokodiz.github.io/ADRESS/> | <https://joaokodiz.github.io/ADRESS/experimento/> | <https://joaokodiz.github.io/ADRESS/experimento/rodada1/> |
| Código | branch `main` | branch `experimento/historia-completa` · cópia fixa `experimento/rodada2-2026-10-18` | branch `experimento/rodada1-2026-10-18` (commit `53587d1`) |
| Antes do experimento | branch `preservado/2026-10-18` (commit `acee819`) | — | — |
| Progresso salvo | chaves `adress.*` | chaves `adressx2.*` | chaves `adressx.*` |

**Salvamento isolado.** As três páginas estão no mesmo site e dividem o `localStorage`. Antes de o jogo carregar, a rodada 2 troca toda
chave `adress.*` por `adressx2.*` (script em `src/template.html`). Na 1ª abertura ela **copia** o progresso da principal para
`adressx2.*` (nunca move nem apaga; marca `adressx2.__copied`). A rodada 1 continua em `adressx.*`. **Testado** (seção 6): depois de
concluir a história na rodada 2, as chaves `adress.*` e `adressx.*` continuam exatamente iguais.

**Música da batalha:** `assets/finale-batalha-v2.mp3` (nova edição, seção 8) foi **acrescentada** ao lado da anterior;
`assets/finale-batalha.mp3` (usada pela rodada 1 e pela principal) não foi alterada. O remix original não foi modificado.

### Como rodar
- **Principal:** `git checkout main` → `npm run build` → `index.html` (ou o link).
- **Rodada 2:** `git checkout experimento/historia-completa` → `npm run build:experimento` → `experimento/index.html` (a música vem de
  `../assets/`). Para abrir direto do disco: `node build.mjs --dev --out <pasta>/index.html` com uma pasta `assets/` ao lado.
- **Rodada 1:** `git checkout experimento/rodada1-2026-10-18` → `node build.mjs --out experimento/rodada1/index.html --asset-base ../../assets/`.

### Como restaurar
- Principal como antes de qualquer experimento: o conteúdo de `preservado/2026-10-18`; os experimentos só acrescentaram a pasta
  `experimento/` e o arquivo `assets/finale-batalha-v2.mp3` (apagar os dois volta ao estado anterior).
- Voltar o experimento publicado para a rodada 1: publicar o build de `experimento/rodada1-2026-10-18` em `experimento/`.
- Apagar só o progresso da rodada 2 (console da página experimental):
  `Object.keys(localStorage).filter(k => k.startsWith('adressx2.')).forEach(k => localStorage.removeItem(k))`.

## 2. Avaliação da rodada 1 (o que a experiência realmente entregava)

Joguei e reli a rodada 1 contra o pedido original. Funcionava de ponta a ponta, mas em vários pontos estava superficial ou contrariava
a direção:
- **Terror sem construção.** A figura aparecia cedo e de perto; quase não havia distância, silêncio ou antecipação; o som era pouco usado.
- **Extra 3 errado no conceito:** o K atravessava a nevasca *carregando alguém* — virava uma cena de coragem, quando o pedido é o K
  sozinho, precisando de ajuda e com vergonha de mostrar.
- **Sem linguagem visual de lembrança.** Lembrança e presente tinham o mesmo aspecto; por isso o "K aparece fisicamente pela primeira
  vez" no fim do extra 4 não significava nada.
- **Fragmentos desviados do pedido:** R1 sem os pequenos ajustes do K; M2 com o K pondo a própria cadeira de volta (o pedido diz que
  ela continua ausente); C sem a silhueta que oferece ajuda; frases do M não saíam de falas comuns do K.
- **A batalha não desenvolvia a mudança do K pela jogabilidade:** a defesa dele era por sorteio; nada marcava a 1ª defesa
  hesitante, o momento claro em que ele protege o jogador nem o S2 (ele abrir a fenda).
- **Música:** a 2ª metade estava espremida (fragmentos de 26 s em tempos provisórios); as repetições não tinham espaço próprio.
- **Interlúdio e encerramento** eram réplicas da arena em outra cena (trocas de cena onde o pedido pede continuidade).
- **Final acrescentado, não preparado:** o lugar bonito era um largo pronto (não "ainda sendo preparado"); o K não deixava a ferramenta
  no chão; a voz da figura só sumia (em vez de ficar ininteligível); faltava o descanso antes das palavras.

## 3. O que decidi preservar
- A estrutura (4 extras → batalha emendada → encerramento → volta ao jogo), os 4 cartões e as imagens deles.
- O extra 1: estrutura, despedida do dono (o K olhando a R), diálogos aprovados da figura, fluxo de áudio ("just us" → loop com 6 s de
  transição, ~3 s de fade, vento a 40%). Só ganhou a borda azul de lembrança (seção 4).
- Os três mecanismos e as regras das barreiras (não expiram, no máximo 2, substituição da posicionada por último, troca só ao soltar no
  REFLETIR, as do K não contam), o REFLETIR aprimorado (grade erguida, trocas), a física do CONDUZIR (míssil, portal, vazio branco),
  a câmera principal baixa atrás/à direita e as marcas no chão.
- A arquitetura "a música é o relógio da batalha"; os checkpoints depois dos fragmentos; salvar só no fim efetivo.
- Menus da fase de terror (chuva até o extra 1, noite no Bairro 1 sem van até o extra 2, "snow" nos menus); textos do dono (falas da
  figura, falas do K nos fragmentos, conversa final) sem reescrever.

## 4. O que refiz ou criei nesta rodada — e por quê

**Música (nova edição, `finale-batalha-v2.mp3`).** A estrutura antiga não deixava as repetições respirarem. A nova edição corta só
em limites naturais (estáticas e entradas de seção), sem mudar velocidade nem afinação: 1ª metade contida (episódios com alarme), a
virada no interlúdio (parte calma do Finale), cada repetição com o próprio tema sem alarme (~33 s), a intensificação depois do R2 e o
fim que respira (o "Você vem?" cai no silêncio do fim da faixa). Tabela na seção 8.

**Linguagem visual das lembranças (`src/memorySets.js`).** Os mesmos cenários servem aos extras, aos fragmentos e às imagens dos
cacos: o cubo da despedida, a mesa, a rua com neve, a oficina destruída (a mesma do Bairro 24). Tudo que é lembrança tem uma borda
de luz na cor da experiência e um pouco menos de cor; o presente (jogador branco, figura, o K no fim do extra 4, a arena) não tem.
Assim o fim do extra 4 ganha sentido: o K aparece sem a borda, de verdade, pela primeira vez.

**Extra 2 — Maledicência (reescrito).** Um lugar preparado (chão que se forma, uma cadeira que se puxa sozinha); M recebe o K; chega a
pessoa de fora; o jogador leva a cadeira; uma passagem se forma e o K puxa a cadeira para ela (o mesmo gesto que recebeu). A pessoa
acolhida tira frases **comuns** do K (cansaço, "eu disse que vinha", "não foi isso que eu quis dizer", "deixa, eu resolvo") e as leva ao
grupo; cada uma vira uma cadeira, uma voz some do murmúrio e a cadeira do K escorrega. Ninguém ri; só costas, silêncio. A figura
chega aos poucos e termina entre ele e o grupo; a cadeira dele vira pó verde; a que o jogador trouxe fica.

**Extra 3 — Covardia (refeito do zero).** O K sozinho, caído na neve, a mão que treme no peito. O jogador atravessa junto, no ritmo dele
(passo pesado, rajadas, sem controles invertidos). Sinais de esforço que a figura ignora: levanta escorregando, cai de joelhos e
levanta, a respiração vira vapor. No poste, uma silhueta oferece a mão; a dele quase vai — e vai para trás das costas; ele endireita o
corpo e apressa o passo para parecer bem (e continua mancando). De trás, só o jogador vê a mão escondida tremendo. O abrigo fica um
pouco mais longe. Ele chega sozinho; a luz se apaga antes do alívio; corte: o jogador se volta, o poste pequeno no vazio e, além da luz
dele, a figura — "Até a sua coragem precisa de uma testemunha que não faça perguntas."

**Extra 4 — Sacrifício (reescrito).** Silêncio e goteiras ao entrar. Duas peças na bancada ("Ainda falta."); pôr a última faz o
escoramento da viga escorregar. Segurar (E) sustenta — e a vela roxa queima mais depressa enquanto se segura; ao segurar a viga, a porta
se solta lá na entrada; depois a bancada racha e derruba o que foi posto; por fim tudo junto. Cada exigência tem o seu tempo (não
cascateia). A oficina se desfaz, ficam a bancada e a vela muito pequena (acesa); a figura tenta ocupar o quadro; o K aparece de verdade,
abatido, entre os dois; a grade nasce no chão e a batalha começa sem menu. Pedaços que ficam entre a câmera e o jogador ficam
translúcidos.

**Fragmentos (todos refeitos, `src/fragments.js`).** Mesmo cenário, enquadramento e gestos nas duas passagens; muda a resposta do K. O
jogador está presente só como o círculo branco (tenta, sustenta, recolhe — sem poder mudar a lembrança). 1ª passagem: no alarme a
lembrança abre em rachaduras da cor; estática; cena; estática no fim.
- **R1:** a R vai embora pelo fundo; o K faz pequenos ajustes (meio passo, a mão que sobe e desce, voltar ao lugar), cada vez mais perto da
  frente, enquanto a moldura se estreita; o círculo segurado no vão cria folga, mas ela fecha mesmo assim; ele termina preso na fresta.
- **R2:** mesma despedida; a mão dele vai à moldura e solta; ele recolhe um pedacinho azul que ficou e atravessa enquanto ainda há
  espaço — a moldura fecha atrás dele, vazia (sem carregar a porta nas costas).
- **M1:** cada exposição vira uma cadeira; cada resposta do K se parte em duas acusações; a cadeira dele se afasta enquanto ele explica;
  o jogador recolhe frases (elas ficam girando no círculo), mas a exclusão acontece igual.
- **M2:** mesma exposição; ele começa "Não foi…" e para; olha a cadeira que trouxe; diz as falas e vai embora; a cadeira dele some e não
  volta; ninguém se reconcilia.
- **C1:** a mão escondida; ele desvia da mão oferecida — e também do círculo, se o jogador o puser no caminho; chega sozinho.
- **C2:** ele para e olha a mão que treme, sem esconder; "Estou com medo."; aceita a mão; "Você pode ficar comigo até eu atravessar?"; a
  silhueta vai junto, a mão no braço dele; as placas à frente racham e o círculo as sustenta; chega ao mesmo abrigo, ainda com medo.
- **S1:** segura a viga e estica a outra mão para a ferramenta (longe demais); a vela diminui; a estrutura cede; ele termina ajoelhado.
- **S2:** mesma viga; percebe que segurar não salva; o círculo pode segurar um instante para ele chegar à bancada; pega a ferramenta e
  o caderno, solta e recua antes de cair; põe a vela, muito pequena, sobre a pedra firme.

**Interlúdio S1→R2 (na própria arena, `src/battleScenes.js`).** Quatro cacos de vidro com as **imagens reais** das quatro lembranças saem
de trás da figura e cercam o K. O azul para de obedecer (pisca, fica), depois os outros se soltam. O círculo aparece; o jogador o leva
até perto do azul e sustenta uma pequena barreira (a pose de guarda; sem o jogador ela aparece sozinha — nada falha); os outros cacos
se afastam. O K anda até o azul, estende a mão, recua, estende de novo e toca. Os quatro continuam rachados; o azul ganha luz primeiro.
O diálogo do dono passa sincronizado. O azul cresce até encher a tela — e o R2 começa na mesma imagem.

**Batalha (reorganizada, `src/battle.js`, `src/reflectPlus.js`).**
- 18 trechos + 8 fragmentos + interlúdio + encerramento nos tempos da nova edição. Ensino gradual na 1ª metade (BLOQUEAR → REFLETIR →
  CONDUZIR, curtos e contidos); depois do R2, trechos de ~20 s.
- **O K conquista a iniciativa por roteiro, sem sorteio:** nenhuma defesa antes do R2 · logo depois do R2, a 1ª defesa própria (placa
  pequena, gesto hesitante, mas funciona) e depois às vezes · depois do M2, firme · depois do C2, antecipa no aviso, e há um momento
  marcado em que dois disparos vêm no jogador ao mesmo tempo — o jogador cobre um, o K se vira e cobre o outro (traço de luz do braço
  dele até a placa) · depois do S2, no combate final, ele faz uma barreira para si, depois uma para o jogador, e puxa sozinho a ponta
  do objeto que rasga a fenda.
- **CONDUZIR aprimorado** (depois do M2): a demonstração protegida mostra o ataque quebrando o REFLETIR; o objeto aparece onde a fenda
  vai rasgar; **o próprio jogador puxa a ponta** (círculo no objeto + botão direito/E) e só então os grupos começam (2, depois 3).
  No combate final quem puxa é o K — o jogador só guia a corrente (grupos de 3, 4, 10 e uma corrente de 14).
- **Combate final:** as quatro imagens das lembranças voltam em volta da figura com as frases dela ("Uma escolha certa.", "Explique
  melhor.", "Não deixe perceberem.", "Mais um pouco.").
- **Encerramento (na arena):** a figura tenta começar outra exigência e nada sai; o diálogo do dono; ela tenta crescer, mas a câmera
  gira devagar para um plano lateral dos dois e ela sai do quadro sem ser perseguida; o K se volta para o jogador: "Você vem?".
- **Estabilidade discreta:** um arco fino em volta do círculo (jogador) e as linhas da grade em volta do K (perdem força e tremem quando
  a dele cai). Sem anéis aos pés, sem HUD.
- **Falha:** a música volta ao começo do trecho e ele recomeça com tudo limpo; cada nova tentativa do mesmo trecho dói um pouco menos.

**Epílogo (refeito, `src/epilogue.js`).** A caminhada no ritmo dos dois (o K espera se o jogador parar). A voz da figura continua atrás,
cada vez menos inteligível — as letras viram pontos com a distância, sem uma última palavra. A grade perde linhas, a luz suaviza, as
quatro cores aparecem de leve no ar e em reflexos no chão. Surge um **terreno ainda sendo preparado** perto do bairro medieval depois do
temporal: estacas e barbante marcando algo que ainda não existe, tábuas empilhadas, pedras, um balde, poças, grama molhada, uma árvore
pingando, a muralha ao longe na névoa. O K põe a ferramenta e o caderno na bancada provisória, abre o caderno, alinha uma tábua — ela
escorrega; ele olha, respira, muda a mão de lugar e tenta de novo; o jogador segura a tábua enquanto ele fixa (três batidas). Ele deixa a
ferramenta no chão e senta; "Sentar ao lado". Cinco segundos sentados sem fala. A conversa (manual) muda de plano conforme o que ele diz
(os dois; só ele; ele olhando o jogador; a bancada; aberto). Silêncio. Uma anotação pequena e o caderno fechado. O jogador vai até a
saída; a última imagem olha de volta: o K continua ali, sentado. Fade.

**Menus ecoando cada extra (sem revelar o fim).** Depois do 2º: a cadeira de balanço do K não está mais no quintal. Depois do 3º: a
luz do quintal apaga (o lampião continua lá) e só um poste laranja fica aceso no fim da rua. Com o 4º feito e a batalha pendente: uma
chama roxa pequena no quintal. Fim: manhã depois da chuva no bairro medieval, música normal, a van de volta.

**Celular.** As falas automáticas (cenas sincronizadas) não tiram mais os controles de toque (antes o joystick e o botão sumiam
enquanto uma fala estava na tela). Em telas baixas, essas falas ficam compactas e no alto; as conversas manuais ficam embaixo, menores.

## 5. Mapa das cenas e checkpoints

Cadeado 1225 → **Checkpoint da história** (posição no painel = índice + 1):
- **12** Missa e temporal completos → os extras começam pelo cartão 1.
- **13** Batalha após Sacrifício (teste) → o cartão Sacrifício começa a batalha do início (não conclui extras).
- **14** Batalha — REFLETIR aprimorado (teste) → começa no passo 18.
- **15** História completa — extras 1 a 3 feitos (cartões liberados).
- **16** … batalha no interlúdio (passo 15).
- **17** … combate final, encerramento e epílogo (passo 26).
- **18** … concluída (manhã depois da chuva).
- **19** … batalha depois do R2 (passo 17: a 1ª defesa do K).

Passos da batalha (`ADRESS.battle._jump(n)`): 0 S0 · 1 S1 · **2 R1** · 3 S2 · 4 S3 · **5 M1** · 6 S4 · 7 S5 · **8 C1** · 9 S6 · 10 S7 ·
**11 S1** · 12 S8 · 13 S9 · 14 S10 · **15 interlúdio** · **16 R2** · 17 S11 (1ª defesa do K) · 18 S12 (REFLETIR aprimorado A) · **19 M2** ·
20 S13 (CONDUZIR aprimorado, o jogador rasga a fenda) · 21 S14 · **22 C2** · 23 S15 (o K protege o jogador) · 24 S16 (REFLETIR aprimorado B) ·
**25 S2** · 26 S17 (combate final) · **27 encerramento**.

Ganchos de teste (console): `ADRESS.pickExtra(i)` · `ADRESS.extra` (`phase`, `_jump`) · `ADRESS.battle` (`_jump`, `kLevel`, `log`,
`_inter`, `_finale`, `_plus`) · `ADRESS.frag` (`code`, `t`, `ev`) · `ADRESS.epi` (`phase`, `shot`, `_jump('area'|'talk')`) ·
`ADRESS.startEpilogue()` · `ADRESS.finishStory()` · `ADRESS.menuBg()`.

## 6. O que executei e verifiquei (Chromium headless + SwiftShader, de verdade, com capturas)
- **Extra 1** inteiro: andar → despedida dentro do cubo (o K de frente para a R, com a borda azul) → saída pela esquerda → quebra →
  figura → diálogos 2 e 3 → deslocamento → puxão → tela inicial; salvo; fundo do menu na etapa certa.
- **Extra 2** inteiro (pegar e pôr a cadeira, as quatro exposições, a figura entre ele e o grupo, a cadeira dele some) → salvo → menu.
- **Extra 3** inteiro (~50 s): queda de joelhos (o tempo dela corrigido), oferta da mão sob o poste, mão escondida vista de trás, luz que
  apaga, poste no vazio com a figura além da luz → salvo → menu.
- **Extra 4** inteiro: peças → escoramento cede → viga/porta/bancada uma de cada vez → sobrecarga → dissolução → o K presente → grade →
  estado `battle`, salvo.
- **Os 8 fragmentos** (cada um até o fim, voltando à arena no passo certo) com 3 capturas cada; **interlúdio** com o jogador sustentando a
  barreira e o K tocando o caco; **combate final** com o K se protegendo, protegendo o jogador e rasgando a fenda (31 projéteis
  atravessaram); **encerramento** até "Você vem?" e a passagem para o epílogo no fim exato da música.
- **Momentos do K por roteiro** pelo registro da batalha: `kdef:first` no S11, `p:tear P` no S13, `kclaim:early` e `kdef:protect` no S15.
- **Percurso completo, duas vezes** (a 2ª com o build final): missa feita (fundo chuva, "snow" nos menus) → extra 1 (noite, sem van) →
  extra 2 (`night2`) → extra 3 (`night3`) → extra 4 → batalha (os 28 passos em ordem, nenhum pulado) → epílogo → tela inicial:
  `extra.done` salvo, chuva desligada, fundo `morning`, van de volta, "snow" desligada. **Nenhum erro** no console.
- **Epílogo** sozinho: o K espera quando o jogador para; a voz da figura vira pontos; a tábua escorrega e é refeita; a ferramenta vai ao
  chão; os 27 trechos da conversa com os planos; anotação; saída; olhar para trás; menu.
- **Fundos dos menus** em cada etapa (capturas): noite com a cadeira; sem a cadeira; luz apagada + poste laranja; chama roxa; manhã.
- **Celular** (toque, 844×390 e 390×844) e **redimensionamento** no meio da batalha (844 → 390×844 → 1280×720): joystick e botões nos
  extras, na batalha e nos fragmentos (depois da correção), falas compactas.
- **Isolamento do salvamento:** com chaves da principal e da rodada 1 já gravadas, concluir a história na rodada 2 não mudou nenhuma
  delas.

**Não verifiquei de verdade:** o som (o navegador de teste não tem saída de áudio; toda sincronização foi testada pelo relógio da
música, que a batalha segue); a dificuldade com pessoas (só robôs; no percurso completo o robô não perde estabilidade, para testar as
transições); aparelhos reais e desempenho em máquinas fracas (só SwiftShader).

## 7. Limitações e pendências
- **Dificuldade não calibrada com pessoas**, sobretudo os REFLETIR aprimorados (velocidades da rodada 1) e o CONDUZIR com puxar.
- As pessoas das lembranças usam o corpo antigo, de uma cor, com animação simples (andam deslizando um pouco; gestos por braço).
- Os cacos e as imagens acusadoras são fotos do enquadramento inicial de cada lembrança (não mudam entre as passagens).
- No celular em pé, a câmera da batalha corta parte do jogador (o campo de visão vai até 80°); deitado está bem.
- O arquivo da nova edição tem 27,6 MB (320 kbps a partir do remix decodificado, para não perder qualidade); toca em streaming.
- Sons das cenas continuam procedurais e simples (passos, vento, madeira, vidro).
- O extra 1 manteve a estrutura da rodada 1 (como pedido); só ganhou a borda de lembrança.

## 8. Música: `assets/finale-batalha-v2.mp3` (689,21 s) — tabela de tempos

Feita a partir do remix original (que não foi alterado), só com cortes em limites naturais e transições de 4–150 ms; sem mudar
velocidade nem afinação. A tabela completa (com as posições no remix) está em `marks-v2.json`, ao lado deste relatório; os tempos
também estão em `src/battle.js` (`MUS`).

| Início (s) | Passo | Trecho da faixa |
|---|---|---|
| 0 | apresentação + S0 | Apresentação |
| 39,31 | S1 | Batalha 1 |
| 64,54 | R1 | episódio azul (alarme, estática, tema, estática) |
| 102,09 | S2 · S3 | Batalha 2 (dividida) |
| 124,92 | M1 | episódio verde |
| 162,42 | S4 · S5 | Batalha 3 (dividida) |
| 182,92 | C1 | episódio laranja |
| 220,70 | S6 · S7 | Batalha 4 (dividida) |
| 245,98 | S1 | episódio roxo |
| 283,86 | S8 | Batalha 5a |
| 304,35 | S9 · S10 | Batalha 5b (dividida) |
| 327,18 | interlúdio | estática do Finale + parte calma B (a virada) |
| 360,12 | R2 | tema azul, reprise sem alarme |
| 393,27 | S11 · S12 | Finale forte 1 |
| 433,48 | M2 | tema verde, reprise |
| 466,50 | S13 · S14 | Finale mais forte 1 |
| 506,77 | C2 | tema laranja, reprise |
| 539,61 | S15 · S16 | Finale forte 2 |
| 580,02 | S2 | tema roxo, reprise |
| 612,86 | S17 | Finale mais forte 2 (combate final) |
| 653,12 → 689,21 | encerramento | fim do Finale (silêncio a partir de ~683) |

- **Sincronizadas** (falas automáticas curtas, com tempo de leitura): fragmentos, interlúdio, encerramento; falas da figura nos extras 2–4.
- **Manuais** (E/Espaço/toque): despedida e diálogos da figura no extra 1, conversa final.
