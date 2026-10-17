# Revisão de qualidade do ADRESS (17/10/2026)

**Última atualização:** 16/10 23:12 (horário de Brasília)

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

## Em andamento / próximos passos (identificados, pendentes)
Prioridade aproximada:
1. Igreja (geometria física): sólido lateral contínuo até 16,8 (paredes em 13, entre os contrafortes); ábside retangular (modelo é meio cilindro); degraus do altar sem sólido.
2. Cancelas dos Jardins/Modernista fecham sobre a van estacionada quando o jogador está a pé longe.
3. Barcos de Veneza empurram a lancha (não param).
4. Aproximação automática da igreja (Bairro 1): árvores no caminho podem prender a van.
5. Helicóptero atravessa prédios altos que não são residenciais/futuristas.
6. Ponte de Rialto: a pé atravessa lojinhas e pilares; praça do Bairro 2: objetos sem colisão a pé.
7. Encaixe: calçadas na beira dos patamares das Encostas, caminho do Grillby's flutuando, caixa de areia/lago dos Jardins, marcas de pneu da Colheita, poça de luz da Penumbra, chão queimado, degraus da Cachoeira.
8. Recursos: geometrias criadas a cada explosão/dica sem liberar (`boom.js`/`hint.js`), trânsito e enfeites noturnos recriados sem `dispose`; montes de neve e `game.delivered` no reinício.
9. Interface: Shop no celular (Salvar fora da tela), contador "Entregas" cortado em 360 px, setas da seleção em retrato, telas baixas.
10. Menores: cercas/objetos de quintal a pé, bancos `vanOnly`, postes da Penumbra, veículos de laço se atravessando.

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
