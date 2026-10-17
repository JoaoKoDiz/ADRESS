# Revisão de qualidade do ADRESS (17/10/2026)

**Última atualização:** 16/10 23:40 (horário de Brasília)

## Ponto de partida
- Estado salvo antes da revisão: commit `7b8aba7` (tag local `pre-revisao-qualidade`; o envio da tag ao GitHub foi recusado, a branch tem o commit).
- MP3 adaptado do Finale: entregue fora do jogo (`scratchpad/finale/finale-batalha-revisao.wav` + `-320k.mp3`), NÃO integrado.
- Fora do escopo (não mexo): músicas, história secundária (diálogos, cenas, sinos, extras, batalha). Estruturas como a igreja só recebem correções físicas (geometria/colisão).

## Como a revisão está sendo feita
- Leitura do código dos sistemas compartilhados + 4 auditorias detalhadas (encaixe de superfícies, colisões, ciclo de vida/recursos, interface).
- Execução real no Chromium sem tela (Playwright + swiftshader): fotos, testes de alcance (portas acessíveis), colisões, trocas de bairro.
- Testes usam perfil de navegador temporário (localStorage separado): o progresso real não é tocado.

## Atualização intermediária (05:50)
- Há uma mensagem agendada para esta sessão às 05:45; o resumo só sai se a sessão estiver ativa. Este arquivo é sempre atualizado e enviado ao GitHub (branch `claude/adress-game-access-28eyb7`).

## Correções concluídas

Legenda: **[E]** verificado em execução (jogo rodando no Chromium) · **[C]** verificado só por código/teste automatizado.

### Controles e menus (`04de67e`)
- [E] MENU (Esc) pausa a partida de verdade (van parada, cronômetro parado); só abre durante o jogo (não na tela inicial, mapa, cenas). `main.js`, `menu.js`.
- [E] Ctrl/Alt/Cmd + tecla não disparam ações do jogo (Ctrl+F, Ctrl+R etc.). `input.js`.
- [C] Botão direito: teclas presas são soltas ao abrir o menu de contexto. `input.js`.
- [C] F5/F11 voltam a funcionar com as Configurações abertas. `settings.js`.
- [C] Painel do MENU rola em telas baixas e quebra linha em telas estreitas. `menu.js`.
- [C] Botão MISSÕES não abre por cima do MENU nem fora do jogo; Carreira não pode ser clicada durante a decolagem do Livre. `main.js`.
- [C] Nomes de todos os 24 bairros na tela de missões (antes faltavam do 8 em diante). `missions.js`.

### Superfícies disputando a mesma altura (tremulação)
- [E] Bairro 24: o chão interno estava na mesma altura da grama do Medieval e piscava; baixado 2 cm. `world.js` (`7349b1d`).
- [E] Igreja do Bairro 24: um piso extra a 0,11 cobria o tapete e as luzes do chão; removido (com a correção acima o piso original aparece inteiro). Foto conferida. `main.js` (`7349b1d`).
- [E] Nevasca: atalhos de neve batida tinham o mesmo topo dos discos dos cruzamentos; baixados 2 cm. `models/snow.js` (`345902f`).
- [E] Nevasca e Bosque: buraco de 0,6 entre o alto das ladeiras e o patamar (o recorte avançava também no sentido da rampa). Fotos das 6 ladeiras conferidas. `models/snow.js`, `models/forest.js` (`345902f`).
- [C] Bosque: tapetes de folhas sobrepostos com diferença de até 1 cm piscavam; agora em 6 alturas separadas por 1,2 cm. `forestFx.js` (`345902f`).

### Colisões
- [C] Terraço com piscina (Bairro 6 etc.): a piscina inteira era sólida e quase não sobrava laje para andar; agora só a água é sólida (a borda é piso, como já era a altura). `main.js` `roofSolids` (`81477be`).
- [E] Bonde passava por cima do personagem a pé (que ficava preso dentro dele); agora para e espera, e volta a andar quando ele sai (testado no Bairro 12). Não conta para o dilema do bonde. `train.js` (`81477be`).
- [C] Bonde olhava só o centro da van; agora também a frente e a traseira sobre o trilho. `train.js` (`81477be`).
- [C] Descer da van sem lugar livre ao lado colocava o personagem dentro de um sólido; agora procura o ponto livre mais perto em volta. `walker.js` (`81477be`).
- [E] Casas giradas: a caixa de colisão a pé era feita com 2 cantos e ficava fina (atravessava-se a casa) ou encolhida. Agora é caixa orientada exata (`src/obb.js`) no Medieval, Bosque, Nevasca, Jardins e Modernista. Teste: em todos os 5 bairros o centro de todas as casas está bloqueado e nenhuma porta ficou bloqueada a mais que antes. (`30a9844`)

### Igreja (física) (`dc2aeb8`)
- [E] O sólido lateral ia até 16,8 contínuo (3,8 de parede invisível entre os contrafortes); agora parede em 13 + cada contraforte. Ábside em degraus seguindo o meio círculo. Plataforma do altar (degraus, mesa, cruz) sólida. Teste por pontos na igreja do Bairro 24 (entre contrafortes livre, contraforte/altar bloqueados, corredor livre). `models/church.js`.

### Mais colisões e comportamento (`1e67365`, `30cb602`, `2a05d03`)
- [C] Cancelas dos Jardins e do Modernista: ficam abertas com a van perto mesmo com o jogador a pé longe (antes fechavam em cima da van e a empurravam). `main.js`.
- [C] Barcos de Veneza esperam a lancha à frente e, se ela não sair em 4 s, dão meia-volta (antes empurravam a lancha). `main.js`.
- [C] Aproximação automática da igreja (Bairro 1): a van desvia de troncos/arbustos à frente. Não deu para testar em execução: a sequência depende do áudio, que não carrega no Chromium sem som. `main.js`.
- [E] Veneza: a pé não atravessa mais as lojinhas nem os pilares do pórtico da Ponte de Rialto (corredor do meio e vão do pórtico livres; teste por pontos). `layout.js`.
- [E] Bairro 2: a pé, coreto, troncos, canteiros, bancos, postes e cerquinha da praça têm colisão; caminhos livres (teste: andando para o coreto o personagem para na borda). `world.js` `plazaFootSolids`, `main.js`.

### Memória e reinício (`1e67365`, `bf1f798`)
- [C] Explosões: os entulhos com tamanhos aleatórios criavam geometrias novas a cada explosão e nunca liberavam (cache do kit); tamanhos em passos de 0,1. `boom.js`.
- [E] Trânsito (Fluxo/Penumbra/Cachoeira) e enfeites noturnos da Penumbra: ao recriar, liberam as geometrias/materiais antigos (`disposeTree` em `models/kit.js`). Medido: a troca Penumbra → Fluxo ficou com ~160 geometrias a menos na GPU.
- [C] Partida nova zera o contador de entregas em todos os reinícios e põe os montes de neve da Nevasca de volta. `main.js`.

### Interface no celular (`bf1f798`, `32a4f49`, `b484e59`)
- [E] Shop: em pé (360×740) virou uma coluna que rola com Salvar preso embaixo; deitado (740×360) as 3 colunas voltam com altura mínima (antes as listas sumiam). `shop.js`.
- [E] HUD em pé: contador "Entregas" inteiro na tela e a pista não passa por baixo do Voltar. `hud.js`.
- [E] Seleção do Livre em pé: setas abaixo da grade (a da direita saía da tela). Deitado: painel Jogar (logo/Shop) e seleção (botão Jogar) cabem. `levelSelect.js`, `title.js`.
- Conferido por fotos; no computador (1280×600 e maiores) nada muda.

### Encaixe (`9c6d01d`)
- [C] Colheita: trilhas das rodas 2 cm acima da estrada de terra. Jardins: água do meio do lago 3 cm acima da de fora; piso do parquinho acima da grama.

## Em andamento / próximos passos (identificados, pendentes)
Prioridade aproximada:
1. Helicóptero acima de 6,5 atravessa prédios altos que não são residenciais/futuristas (contemporâneos, galpões, igreja, torres). É o comportamento previsto ("passa por cima de tudo"), mas visualmente atravessa; corrigir muda a mecânica — fica para decisão.
2. Encaixe: calçadas na beira dos patamares das Encostas, caminho do Grillby's 6 cm acima da rua, poça de luz da Penumbra, chão queimado, degraus da Cachoeira, faixa de 2 cm dos paredões.
3. Interface: toque no balão E durante arraste da câmera, pinça/zoom no celular, áreas seguras (entalhe), Esc no cadeado, "Sair" sem saída no navegador.
4. Menores: cercas/objetos de quintal a pé, bancos `vanOnly`, postes da Penumbra, guarita/moto, porta da oficina, veículos de laço que se atravessam depois de 6 s esperando.
5. Ciclo de vida: galinhas/tratores sem liberar ao trocar de bairro; mundos guardados em cache (memória cresce visitando muitos bairros).

Observado e mantido (não é defeito): na Nevasca (ponto 6) e no Medieval (ponto 10) o ponto de entrega fica a menos de 0,55 da quina de um obstáculo; a van entrega normalmente.

## Limitações e riscos
- Sem GPU nem áudio: verificação visual por capturas do Chromium com swiftshader. Desempenho medido assim não representa o PC do dono; só comparações relativas.
- Os zips (`tar.exe` do Windows) não podem ser gerados aqui.
- O build está em ~16,7 MB (perto do limite de 16 MiB do artifact); a revisão não adiciona recursos pesados.

## Commits
- `7b8aba7` — ponto de partida (antes da revisão).
- `63f0c42` — relatório inicial.
- `04de67e` — controles e menus.
- `7349b1d` — Bairro 24: chão e piso da igreja.
- `345902f` — Nevasca/Bosque: ladeiras, atalhos, tapetes de folhas.
- `81477be` — piscina, bondes, desembarque.
- `30a9844` — caixas orientadas das casas giradas.
- `7e03ed2` — relatório.
- `dc2aeb8` — igreja (colisão).
- `1e67365` — cancelas, barcos, aproximação, memória.
- `bf1f798` — Shop no celular, reinício.
- `32a4f49` — HUD no celular.
- `30cb602` — Rialto.
- `2a05d03` — praça do Bairro 2.
- `9c6d01d` — Colheita/Jardins (encaixe).
- `b484e59` — menus no celular.
