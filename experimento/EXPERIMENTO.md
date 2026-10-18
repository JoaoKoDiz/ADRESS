# ADRESS — versão experimental: história completa

> Versão experimental, separada da principal. Nada aqui muda o jogo principal nem o progresso salvo dele.

## 1. Onde está cada versão

| | Versão principal (preservada) | Versão experimental |
|---|---|---|
| Jogar | <https://joaokodiz.github.io/ADRESS/> | <https://joaokodiz.github.io/ADRESS/experimento/> |
| Código | branch `main` (intocada pelo experimento, só ganhou a pasta `experimento/`) | branch `experimento/historia-completa` |
| Cópia de segurança | branch `preservado/2026-10-18` = commit `acee819` (o `main` antes do experimento) | — |
| Progresso salvo | chaves `adress.*` do navegador | chaves `adressx.*` (separadas) |

**Salvamento isolado.** As duas páginas ficam no mesmo site, então dividem o mesmo `localStorage`. A experimental troca, antes de o jogo
carregar, toda chave `adress.*` por `adressx.*` (script no `src/template.html` da branch experimental). Na 1ª abertura ela **copia** o
progresso da principal para `adressx.*` (nunca move nem apaga nada da principal; marca `adressx.__copied`). Testado: depois de jogar a
experimental até o fim, as chaves `adress.*` continuam exatamente como estavam.

**Arquivos fora do Git** (registrados, não publicados): `finale-batalha-revisao.wav` (edição aprovada da música da batalha, 102 MB) e
`marks.json` (tabela de cortes) estavam só na pasta temporária da sessão anterior; o MP3 publicado (`assets/finale-batalha.mp3`) é o
mesmo usado pelas duas versões. Os zips do Netlify são gerados no Windows e ficam fora do Git.

### Como rodar
- **Principal:** `git checkout main` → `npm run build` → abrir `index.html` (ou o link do GitHub Pages).
- **Experimental:** `git checkout experimento/historia-completa` → `npm run build:experimento` → gera `experimento/index.html`
  (a música externa vem de `../assets/`, os arquivos da principal). Para testar abrindo direto, copie `assets/` para junto ou use o link.

### Como restaurar
- Voltar o `main` ao estado de antes: `git checkout main && git reset --hard preservado/2026-10-18` (ou só apagar a pasta `experimento/`).
- Apagar o progresso experimental (sem tocar no principal): no console do navegador da página experimental,
  `Object.keys(localStorage).filter(k => k.startsWith('adressx.')).forEach(k => localStorage.removeItem(k))`.

## 2. O que está completo (jogável de ponta a ponta)

Depois do 4º sino: **Extra 1 → 2 → 3 → 4 → batalha (emendada no fim do extra 4, sem voltar ao menu) → encerramento → epílogo → volta ao jogo.**

- **Cartões** (página dos extras no Livre): os 4 continuam; cada um libera o seguinte; todos repetíveis. Imagens: Rigidez (estátua de
  vidro azul), Maledicência (lápide com musgo), **Covardia (nova: lanterninha laranja acesa, vidro rachado, facho tremido)**, Sacrifício
  (vela quase no fim, chama roxa). Fundo preto.
- **Extra 1 — Rigidez:** refinado. Novo diálogo 1 (a despedida, texto do dono, avanço manual), dentro do cubo, o K de frente para a R;
  o gatilho é a distância (não precisa encostar no cubo). Os diálogos 2 e 3 da figura ficaram como estavam. Vento a 40% (já estava),
  "just us" → loop com 6 s de transição, fade de 3 s na volta.
- **Extra 2 — Maledicência** (`src/extra2.js`): chão em pedaços no vazio, mesa, cadeiras, silhuetas, acento verde. Quem acolheu o K o
  leva à mesa; chega alguém novo; **o jogador pega e coloca a cadeira dela**; ela senta. A figura (11 falas, manual) leva frases comuns
  do K até as silhuetas e cada uma vira a cadeira; a cadeira do K desliza para longe; a figura passa para entre ele e o grupo. Fim: a
  cadeira que o jogador trouxe fica; a do K some. Salva, volta ao menu. Música: "Once Upon A Terrible Time" (já existia no jogo).
- **Extra 3 — Covardia** (`src/extra3.js`): rua curta com neve, poste laranja, lugar quente ao longe, vento e passo reduzido (sem
  inverter controles). Memória inventada coerente com o resgate: o K atravessa a nevasca levando alguém caído no poste (escorrega,
  ajoelha, levanta a pessoa, vapor da respiração, pegadas). Uma silhueta oferece a mão; ele desvia o rosto e esconde a mão que treme.
  10 falas da figura (automáticas, o jogador continua andando). Ao chegar, a luz do lugar se apaga; o poste fica. Salva, menu.
  Música: "It's Raining Somewhere Else".
- **Extra 4 — Sacrifício** (`src/extra4.js`): pedaços da oficina destruída; o jogador leva 4 peças à bancada; cada uma faz outra parte
  perder o apoio (esteio tomba, painel escorrega, a tábua cai da bancada, viga despenca); a vela roxa diminui a cada tentativa. 10 falas.
  Fim: a oficina se desfaz (ficam a bancada e a vela acesa), a figura tenta ocupar o quadro, o K aparece cabisbaixo entre os dois, a
  grade branca nasce no chão → **batalha** direto. Nada do progresso normal/Shop é tocado.
- **Batalha:**
  - Ordem: ◼◼ R1 ◼◼ M1 ◼◼ C1 ◼◼ S1 ◼ **interlúdio** R2 ◼◼ M2 ◼◼ C2 ◼◼ S2 ◼ encerramento (o interlúdio ocupa a passagem antes do Finale).
  - **8 fragmentos** (`src/fragments.js`): cenas reais, sincronizadas com o relógio da música, com o círculo do jogador ativo:
    - R: a moldura estreita; o jogador segura a passagem (R1). No R2 o K não segura; pega um pedacinho azul.
    - M: o K explica, a cadeira se afasta; o jogador recolhe fragmentos verdes (M1). No M2 o K põe a própria cadeira num lugar dele.
    - C: o K esconde a mão e chega sozinho (C1). No C2 pede companhia; só anda bem com o círculo perto.
    - S: o K segura a viga; a vela diminui; a estrutura cede e ele ajoelha (S1). No S2 solta a viga, pega ferramenta e caderno e põe
      a vela numa pedra firme (o círculo marca a pedra).
  - **Interlúdio S1→R2:** 4 cacos em volta da figura, o azul desobedece e desce; o jogador segura uma barreirinha com o círculo; o K
    hesita, recua a mão e toca. Diálogo do dono.
  - **Autonomia do K:** nenhuma barreira antes do R2 · depois do R2: às vezes, a si mesmo · M2: mais firme · C2: protege o jogador ·
    S2: abre a fenda no combate final. Não é invulnerável.
  - **Combate final** (trecho 18): as imagens dos 4 fragmentos voltam girando, acusadoras; o K faz uma barreira para si, depois outra
    para o jogador, depois abre a fenda sozinho; o jogador conduz a última corrente. Nenhum ataque à figura.
  - **Encerramento:** a conversa do dono com a figura (sincronizada com os últimos 40 s da música); a câmera deixa de seguir a figura;
    "Você vem?".
  - **Câmera:** sem as trocas dramáticas periódicas (a de impacto só na apresentação); nunca troca durante traço/condução.
  - **Checkpoints:** depois de cada fragmento (`adressx.battle.cp`); o cartão Sacrifício volta ao último.
- **Epílogo** (`src/epilogue.js`):
  - Caminhada junto, para longe da figura. O K espera se o jogador parar; sem cronômetro. Os ecos da figura somem com a distância.
  - A grade perde linhas, a luz suaviza, as 4 cores aparecem de leve. Surge o bairro medieval de manhã, depois da chuva: pedras
    molhadas, poças, casas, árvore, gotas.
  - O K põe ferramenta e caderno na bancada provisória; o ajuste falha uma vez; o jogador segura a tábua enquanto ele conserta.
  - O K senta; "E — Sentar". Conversa final do dono (manual).
  - Alguns segundos de silêncio. Ele escreve no caderno e o fecha. O jogador sai; o K fica; fade.
  - Música: "Once Upon An Innocent Time", baixa, só no lugar bonito; some antes do silêncio.
- **Fim efetivo:** só aqui salva os extras 1–4 + `adressx.extra.done`. A chuva forçada acaba. O fundo do menu vira a manhã no bairro
  medieval. A música normal volta ("snow" sai). A van volta ao menu com a customização salva.
- **Menus:**
  - Chuva até o extra 1; noite no Bairro 1 até o extra 2; depois variações discretas da mesma noite (a luz do quintal mais fraca
    depois do extra 2 e mais ainda depois do extra 3).
  - Dentro dos extras: sem MENU, DICA, controles normais, botão de música, cronômetro ou batidas.
  - Celular: joystick + toque no balão/indicação; na batalha, "Segurar" nos fragmentos.

## 3. Mapa de cenas e checkpoints de teste

Cadeado 1225 → **Checkpoint da história**:
- **15** "extras 1 a 3 feitos": libera os 4 cartões.
- **16** "batalha no interlúdio": o cartão Sacrifício começa no passo 13.
- **17** "combate final, encerramento e epílogo": cartão Sacrifício no passo 24.
- **18** "concluída": manhã depois da chuva.

(Posições no painel = índice + 1.)

Ganchos de teste (console):
- `ADRESS.pickExtra(i)` · `ADRESS.extra` (`phase`, `_jump`) · `ADRESS.battle._jump(passo)` · `ADRESS.frag` (`code`, `t`, `blue`, `ev`) ·
  `ADRESS.epi` (`phase`, `prog`, `_jump('area'|'talk')`) · `ADRESS.startEpilogue()` · `ADRESS.finishStory()`.

Passos da batalha:
- 0–1 S · 2 R1 · 3–4 S · 5 M1 · 6–7 S · 8 C1 · 9–10 S · 11 S1 · 12 S · 13 interlúdio · 14 R2 · 15–16 S (16 = Refletir aprimorado A)
- 17 M2 · 18–19 S · 20 C2 · 21–22 S (21 = aprimorado B) · 23 S2 · 24 combate final · 25 encerramento.

## 4. Música (tabela de tempos)

Arquivo: `assets/finale-batalha.mp3` (a edição aprovada; **não foi feita nova edição** nesta rodada — os tempos abaixo são da mesma faixa).

| Trecho | Início (s) |
|---|---|
| Apresentação | 0 |
| Batalha 1 | 39,3 |
| R1 (azul) | 64,6 |
| Batalha 2 | 102,2 |
| M1 (verde) | 125,0 |
| Batalha 3 | 162,5 |
| C1 (laranja) | 183,1 |
| Batalha 4 | 220,9 |
| S1 (roxo) | 246,2 |
| Batalha 5a | 284,0 |
| **Interlúdio** (5b inteira) | 304,6 |
| R2 (entrada do Finale) | 327,4 |
| 2ª passagem | fragmentos de 26 s, trechos de ~15,5 s (`FIN_PLAN`) |
| Encerramento | 541,9 → 581,9 |

- **Sincronizadas:** fragmentos, interlúdio e encerramento (falas automáticas na hora marcada).
- **Manuais:** despedida (extra 1), figura do extra 2, conversa final.
- **Automáticas enquanto o jogador anda:** extras 3 e 4.

## 5. Testes feitos (Chromium headless, de verdade)
- Extra 2 inteiro: andar → cena → pegar/colocar a cadeira → 11 falas → fim salvo → menu (sem erros).
- Extra 3 inteiro: andar → levantar a pessoa → travessia (oferta recusada) → luz apagada → salvo → menu.
- Extra 4 inteiro: 4 peças (vela 1 → 0,24) → desfaz → figura → K → grade → **estado `battle`** com `adressx.extra.4`.
- Os 8 fragmentos + interlúdio pelos passos da batalha: todos começam e terminam na janela; K autonomia 0→1→2→3→4.
- Combate final → encerramento → epílogo → caminhada (o K espera/acompanha) → bancada → segurar a tábua → sentar → 27 falas → silêncio
  → escrever → sair → **tela inicial** com `extra.done`, sem `battle.cp`, sem chuva, fundo `morning`, van de volta.
- Isolamento do salvamento (acima).

**Não testado:** som real (o navegador de teste não tem áudio); celular de verdade; a dificuldade com pessoas (só robô); o extra 1 novo
de ponta a ponta com a música.

## 6. Limitações e próximos passos
- **Música:** não foi feita nova edição (cortes/loops). A 2ª passagem usa tempos provisórios. A janela de 26 s dos fragmentos da 2ª
  passagem é curta para respirar.
- **Câmera principal** da batalha (baixa, atrás/à direita) e **arena mais larga e rasa**: não implementadas. Hoje fica a câmera de jogo
  elevada, sem as trocas periódicas.
- **Conduzir aprimorado** (Refletir superado, demonstração protegida, fenda grande atrás da grade vertical): não implementado.
- **Personagens das memórias** (silhuetas) usam o corpo antigo com uma cor; animação simples (deslizam).
- **Batidas na madeira, vapor, pegadas:** procedurais e simples.
