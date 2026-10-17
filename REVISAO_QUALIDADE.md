# Revisão de qualidade do ADRESS (17/10/2026)

**Última atualização:** 17/10 05:48 (horário de Brasília)

## Ponto de partida
- Estado salvo antes da revisão: commit `7b8aba7` (tag local `pre-revisao-qualidade`; o envio da tag ao GitHub foi recusado, a branch tem o commit).
- MP3 adaptado do Finale: entregue fora do jogo (`scratchpad/finale/finale-batalha-revisao.wav` + `-320k.mp3`), NÃO integrado.
- Fora do escopo (não mexo): músicas, história secundária (diálogos, cenas, sinos, extras, batalha). Estruturas como a igreja só recebem correções físicas (geometria/colisão).

## Como a revisão está sendo feita
- Leitura do código dos sistemas compartilhados + 4 auditorias detalhadas (encaixe de superfícies, colisões, ciclo de vida/recursos, interface).
- Execução real no Chromium sem tela (Playwright + swiftshader): fotos, testes de alcance (portas acessíveis), colisões, trocas de bairro.
- Testes usam perfil de navegador temporário (localStorage separado): o progresso real não é tocado.

## Atualização intermediária (05:50)
**Resumo para o dono (05:48):**
- 51 commits pequenos desde `7b8aba7`, todos na branch `claude/adress-game-access-28eyb7`; jogo republicado no artifact principal (versão 182).
- Feito e verificado em execução: colisões a pé (cercas, quintais, praça, igreja, casas giradas, Rialto, pracinhas), encaixe de superfícies em ~30 pontos, piscina/bondes/pouso do helicóptero que prendiam o jogador, casas de beco do Morro que nunca recebiam entrega, Shop/menus/HUD no celular, desempenho (Bosque, Nevasca, engarrafamentos), achados de 6 auditorias independentes.
- **Atenção:** 3 regressões criadas por mim no 1º commit da noite (botão Carreira travava o painel; arrastar a câmera soltava as teclas; MENU não pausava algumas cenas) foram achadas pela revisão independente e **corrigidas** (`748f5cb`, `ef79c5c`).
- Pausa: a sessão ficou parada de ~03:00 a 05:45 (sem trabalho nesse intervalo); retomada agora.
- Próximo: nova rodada de busca (outras áreas) até ~13:00.

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

### Cercas e características das casas (`ae07633`, `9ee58b4`)
- [E] Casas (lote padrão): a pé, as cercas do fundo, laterais e frente agora barram (entra-se pelo portão); árvores, fonte, piscina, cama elástica, casinha do cachorro, pneus, cacto, arbustos, flamingo, anão, bicicleta e a cadeira do K têm colisão pelo miolo. Teste: em 5 bairros (1, 2, 4, 5 e 14 com várias composições) todos os quintais continuam alcançáveis a pé pelo portão, e a caixa do K no Bairro 1 também. `main.js` (`lotFootExtras`).
- [E] Prédios residenciais: muro baixo da frente (portão livre), caçamba, moto, guarita e bicicletário com colisão a pé; quintais alcançáveis nos Bairros 6, 7, 9 e 14. `main.js` (`aptFootExtras`).
- [C] Bancos públicos (Nevasca, Bosque, Medieval, Jardins…): a pé o banco tem o tamanho real (girado); antes atravessava-se. `layout.js`.
- [C] Penumbra: postes com colisão a pé; os 168 postes passaram a compartilhar geometria e material. `night.js`.

### Encaixe e outros
- [E] Encostas: a calçada dos lotes da beira dos patamares ficava no ar (0,4 sobre a rua de baixo); o paredão avança só embaixo dos lotes, sem invadir ladeiras/escadarias. Foto conferida. `terrain.js`.
- [C] Caminho do Grillby's desce até a rua (ficava 6 cm no ar fora do lote). `models/grillby.js`.
- [C] Paredões (Encostas, Nevasca, Bosque, Morro): faixa de 2 cm de sobreposição entre a parede e o topo, que tremia na face, removida.
- [C] Marcas de queimado (Ursa Menor/Sistema Solar) em alturas separadas.
- [E] Partida nova volta a câmera para trás da van no padrão (antes podia continuar na visão geral). `main.js`.
- [C] Celular com entalhe: Voltar, MENU, ♪, DICA e MISSÕES respeitam a área segura (no computador as posições ficaram idênticas — medido). `template.html`.
- [C] Tela do "Sair" ganhou "Voltar ao jogo" (antes ficava sem saída). `title.js`.
- [E] Reteste completo de alcance das portas: 24 bairros × 2 sorteios, sem regressão.

### Lote da meia-noite
- [E] Fluxo/Penumbra: pracinhas e estacionamentos agora são "só a van" (como no Operário): a pé dá para entrar; árvores, bancos, carros parados e postes dos outdoors têm colisão. Teste nos dois bairros: centros livres, 8/8 árvores e 8/8 carros bloqueiam, o personagem para no banco. (`5c13859`)
- [E] Veneza: mesas/cadeiras/sombrinhas da praça roxa com colisão a pé; todas as 12 zonas das praças continuam alcançáveis a pé (inclusive a outra praça pela Rialto). (`veneza mesas`)
- [E] Medieval: sebes do jardim barram quem está a pé; entra-se pelo arco de rosas (testado).
- [E] Helicóptero acima de 6,5: continua passando por cima de casas e árvores, mas para na fachada de prédio contemporâneo, galpão ou igreja mais alto que ele; subindo acima, passa. Testado no Fluxo. (`f53e530`) `van.js` (`setGhost(v, lista)`), `main.js` (`heliTall`).
- [E] Carreira (auditoria de missões): tocar de novo na mesma casa não conta mais como outra entrega — antes "Entrega próxima" (Bairro 4) saía tocando duas vezes a mesma campainha, e o mesmo valia para "Parada para abastecer" e "Duas paradas". Reteste: não fica mais pendente. "Fonte errada" passa a exigir que a pista cite a fonte (como diz a descrição). (`a2b11dd`)
- [C] Shop: reabrir mostra o que está equipado (antes ficava a última prévia não salva). Mapa da Carreira começa no maior bairro aberto (antes parava no primeiro buraco quando o painel de teste deixava bairros alternados).
- [E] Conferência visual (fotos) das Encostas, Morro, Nevasca e Bosque depois das mudanças de terreno: normal.

Auditoria de missões/persistência (somente leitura, outro agente): nenhum defeito grave; migrações rodam uma vez, todo `JSON.parse`/localStorage protegido (testado com valores corrompidos), pendentes descartados corretamente, sem listeners duplicados. Mantido sem mudar (interpretação, decisão do dono): "Endereço errado"/"Fora da rota" aceitam uma casa que foi a indicada num passo anterior.

### Teste de fumaça (24 bairros × 2, Livre; Carreira Bairros 1 e 4) — outro agente, em execução
Dirigir, dica, entrega errada e certa, descer/subir, câmera geral, helicóptero, MENU, míssil: **nenhum erro de página, nenhum NaN, nenhum estado travado** em nenhum bairro. Único problema real:
- [E] Pousar o helicóptero no meio do casario (Medieval, Morro) podia deixar a van presa dentro de casas/enchimento (2 de 8 pousos no Medieval). Agora, ao descer abaixo da altura de passagem, se a van estiver dentro de algo ela vai para o ponto livre mais perto (com folga). Teste de pouso em cima de casas: Bairro 1 3/3 livres; Morro 3/3 sem sobreposição (antes 0/3). `main.js` (`unstickVan`). (`a1dcf64`)
- [E] Helicóptero no Medieval com as novas alturas (castelo, torres, casas): voo de 10 s a 10 m sem terminar dentro de nenhuma casa e sem erros. Não verificado se encostou em alguma no trajeto.

### 2ª auditoria de encaixe visual (detector de empate de profundidade nos 24 bairros + leitura dos modelos) — `ec4ed38`
Corrigidas as faces coplanares e peças enterradas/atravessando que a auditoria confirmou em foto:
- Penumbra: painéis laterais furados pelas janelas, janelas acesas e vitrines escondidas atrás do vidro, neon coplanar, painel vertical atravessando sacadas, marquise atravessando a sacada (agora usa a marquise do próprio prédio). [E] foto conferida.
- Portas coplanares: prédio contemporâneo, casas de Veneza (persianas), bondinho, casa da Colheita; ripas da porta do galpão da fazenda. [C]
- Modernista: pilares do muro e gramado dos lotes. Lojas: postes do outdoor. Operário: laje das oficinas, barrado e telhados vizinhos sobrepostos. Guarita dos Jardins, pórtico da Rialto, pilares do portal, chassi do caminhão. [C]
- Jardineira do prédio contemporâneo flutuando; espreguiçadeiras do terraço com piscina para fora da platibanda e água acima da borda; itens do pátio dos galpões 6 cm enterrados. [C]
- Manchas de grama fora do bairro e grafite dos prédios em alturas separadas. [C]
- Reteste do detector (Penumbra, Modernista, Operário, Fluxo): restam só empates com folga de 1–5 cm (ruído do renderizador sem GPU), nenhum dos itens corrigidos.

### Desempenho (auditoria por bairro + correções seguras, sem mudar aparência)
Medição: chamadas de desenho por bairro (média ~407 no passe principal; picos na Penumbra 1686, Fluxo 767, Nevasca 703, Bairro 8 640) e CPU do update (< 3 ms/quadro em todos; picos periódicos só no Bosque).
- [E] Bosque: o teste das copas que ficam transparentes varria as 22.655 copas a cada 0,08 s (picos de até 6,6 ms); agora pula as que estão longe do segmento câmera→alvo. A camada de copas transparentes desenhava sempre as 22.655 instâncias escondidas; agora desenha só as do momento (4–13). Quadro ~17% mais rápido no renderizador sem GPU; fotos conferidas. (`c8693b7`)
- [E] Nevasca: neve dos telhados e detalhes de inverno de cada casa fundidos como o resto do lote: chamadas de desenho (com sombra) 1739 → 855, mesmos triângulos; fotos conferidas. (`c8693b7`)
- [E] Engarrafamentos: peças dos 6 carros fundidas (a carroceria, que muda de cor, fica separada): Bairro 7 922 → 563, Bairro 8 1106 → 847 (com sombra); foto conferida. (`e968da3`)
- [C] Penumbra: poças de luz e faróis compartilham material/geometria (centenas de materiais a menos; mesmas chamadas). (`…`)
- [E] Veículos (trânsito, tratores, Operário, bondes) deixaram de varrer a lista de obstáculos inteira a cada quadro (`ensureSolid`); contagem de obstáculos idêntica ao build anterior em 4 bairros, sem duplicados.
- [E] A pé: obstáculos das casas e quintais calculados só quando a composição muda (antes, centenas de objetos novos por quadro). Testes de alcance dos quintais iguais.
Não feito (mudaria visual ou é estrutural): instanciar o trânsito e os enfeites da Penumbra, reduzir luzes da Penumbra, galinhas/K da cadeira.

### 3ª rodada (auditorias de interface e de interações)
- [E] **Regressão desta revisão, corrigida:** o botão **Carreira** do painel Jogar não fazia nada e travava o painel (introduzido em `04de67e`: a trava de clique duplo bloqueava a própria ação). Reteste pela interface: chega ao mapa. Artifact republicado logo em seguida. (`748f5cb`)
- [E] **Morro:** as duas casas de cada beco tinham o mesmo ponto de entrega e uma delas nunca recebia (7 de 64 casas; ~45% das rodadas tinham uma na rota e a partida podia travar). Porta do lado de cada casa; reteste: 18/18 casas de beco entregam a casa certa (antes 11/18). (`952de5a`)
- [E] A pé, logo ao descer, E entrava de novo na entrega em vez de entrar na van (bairros com entrega a pé). Agora a van ganha quando está tão perto quanto a porta; reteste: E volta para a van. (`952de5a`)
- [E] Esc com a lista de missões aberta abria o MENU escondido por baixo (e pausava); agora fecha a lista. [C] Esc fecha o painel de desenvolvimento do cadeado; painel cabe em telas baixas; MENU some no mapa (não abria lá); aviso de missão e cabeçalho das missões em telas estreitas; balão do mapa sem quebrar; indicação "E — …" não sai da tela; Tab/Enter/setas funcionam nas Configurações; "Partida concluída!" no fim da Carreira. (`501699b`)
- [E] HUD em 800–1100 px: dicas de teclado completas em 2 linhas (antes cortadas). Contador de entregas escondido no mapa. (`último commit`)
- [E] Dica (T): no Medieval e nos Jardins a seta pousa no topo real do telhado (antes afundava dentro). (`eed6c4c`)
- Interações conferidas sem problema: todos os destinos dos 24 bairros entregam a casa certa de van; entregas a pé em todos os bairros com ponto de casa (exceto o caso do Morro, corrigido); postos, porteiras, atracar/descer em Veneza, dica 1×/2×, centenas de entregas seguidas no Livre sem travar.

### Revisão de regressões (todos os commits desta noite, outro agente, com o build antigo lado a lado)
Encontrou 2 regressões minhas além da do botão Carreira — corrigidas e retestadas:
- [E] Arrastar a câmera com o botão direito soltava as teclas seguradas (a van parava) — vinha da limpeza de teclas no menu de contexto (`04de67e`). Agora só limpa se o menu do navegador abrir de fato; reteste: W continua segurado e a van andando.
- [E] O MENU deixou de abrir nas cenas que pausam por ele (cronômetro do resgate, missa/temporal, montagem da igreja) — a trava de `04de67e` era estreita demais. Reteste: MENU abre e o tempo da missa para.
- Desfeita a mudança "teclado nas Configurações" (`501699b`): os controles do painel não recebem foco por projeto, então não tinha efeito útil.
Verificado sem problema pela revisão: fluxos completos de interface (Livre, Carreira até voltar ao mapa com missões salvas, Shop, Configurações, cadeado), alcance a pé de todas as portas nos 24 bairros comparado ao build antigo (nenhuma perdida), caixa e frente do K, praça do Bairro 2, porta do Grillby's, igreja e oficina do Bairro 24, Rialto, pouso no terraço do Bairro 6 e L, dica, e o restante das mudanças de código.

### Recursos do Modo Livre (auditoria: helicóptero, míssil, explosões, monstro, efeitos)
- [E] Monstro/robô do fim: eram presos à cena do 1º bairro criado; em qualquer outro bairro visitado depois o chefe ficava invisível. Agora vão para a cena do bairro atual (`monster.attach`). Teste: Bairros 1, 13 e 24, monstro na cena certa.
- [E] Casa destruída deixava "Entregar" e contava entrega. Agora é ignorada; destruir de van uma casa que ainda estava na rota sorteia rota nova com as que sobraram (antes a partida podia travar).
- [C] Entulho, bola de fogo, destroços e alvo do míssil na altura do patamar (Encostas, Morro, Nevasca…), antes ficavam no nível 0, dentro do morro. O míssil não mira casa já destruída.
- [E] Efeitos da entrega errada (Laser, Ursa Menor, Sistema Solar, Devolução da Realidade): liberam na GPU o que criaram a cada execução, inclusive as texturas dos shaders do Sol/planetas (antes acumulavam geometrias/texturas a cada casa). Medido: Sistema Solar 412/6 → 433/27 durante → 411/6 depois (geometrias/texturas); Laser e Ursa estáveis entre rodadas. Começar partida nova cancela qualquer efeito em andamento.
- [E] Helicóptero acima de 6,5 para no maciço e nos degraus de pedra da Cachoeira (antes atravessava).

### Robustez e regressão (07:00–08:00)
- [E] Dados salvos: com o localStorage bloqueado (exceção em todo acesso), com JSON quebrado em todas as chaves e com valores absurdos (cores inválidas, modelos fora da lista, volumes em texto), o jogo abre, entrega no Livre e entra na Carreira sem erro; os valores inválidos voltam ao padrão. Nada a corrigir.
- [E] Teste de fumaça nos 24 bairros (Livre: dirigir, dica, entrega errada/certa, a pé, câmera, helicóptero, MENU, míssil) + Carreira (Bairros 1 e 4 até o mapa) com o build atual: 0 erros de JavaScript. As 2 falhas de entrega do teste (Colheita casa 278, Jardins casa 336) são as mesmas da rodada anterior e vêm do posicionamento do teste (porteira fechada / casa só a pé), não do jogo.
- [E] Teclas aleatórias (900 quadros por bairro, teclas seguradas/soltas e apertadas fora de hora — E, L, H, F, C, T, M, Esc, Shift, Espaço — e van levada à porta no meio): 24 bairros no Livre + Bairros 1–7 na Carreira. 0 erros de JavaScript, nenhuma posição/câmera inválida (NaN), todos os estados (míssil, fades, diálogo, a pé) voltam ao jogo.
- [E] Câmera com o helicóptero voando baixo entre os prédios (Bairros 6, 8 e 9; 18 poses, subindo/virando): nenhum objeto entre a câmera e a van.
- [C] Toque no balão "E — …" durante o arraste da câmera no celular: o toque no balão é capturado antes e vira um E (já tratado). Pinça para zoom no celular não existe — seria um controle novo, fora do escopo.
- [E] Memória visitando os 24 bairros duas vezes seguidas: as cenas ficam guardadas (≈6.100 geometrias/300 texturas na GPU com todas visitadas) e a 2ª volta fica praticamente estável. O pouco que ainda sobe são prédios que aparecem pela primeira vez numa composição sorteada (enviados à GPU no primeiro uso) — tem teto, não é vazamento. Trocar entre dois bairros repetidamente não acumula.
- Câmera na Rialto: tentei caixas para as lojinhas, mas como a ponte é diagonal e a câmera só usa caixas alinhadas aos eixos, elas cobriam o corredor do meio e a câmera encolhia à toa. Desfeito; segue como limitação.
- Porta da oficina do Medieval: continua sem colisão de propósito — abre/fecha nas cenas da história secundária (fora do escopo), e uma colisão nela pode prender o personagem ou o K nessas cenas.

### Efeitos sonoros (auditoria do ciclo de vida, sem mexer em música) — `bb5190b`
- [E] Com o MENU aberto (jogo pausado) os efeitos continuavam: motor em marcha lenta, trânsito, cachoeira, vida do Medieval, chuva, rotor do helicóptero, cidade. Agora o barramento de efeitos cala enquanto o MENU está aberto e volta ao fechar; a música dos engarrafamentos também some com o MENU (como já sumia com a lista de missões). A música não muda.
- [E] Com a aba escondida o laço do jogo para e os laços de som ficavam tocando no último volume (cachoeira, trânsito, Medieval, chuva). Agora os efeitos calam com a aba escondida e voltam ao reabrir. (A música dos engarrafamentos sai pelo canal de música e segue as outras músicas.)
- [E] `traffic(0)` não zerava ganhos pequenos: um resíduo do trânsito/tratores ficava tocando para sempre em todos os bairros e menus. Agora zero sempre zera.
- [C] Helicóptero pousado num terraço (motor desligado com H) mantinha o ronco do motor. Corrigido.
- [C] Safari/iOS: depois de uma ligação ou do app ir para o fundo, o áudio ficava no estado "interrupted" e o jogo podia ficar mudo até recarregar; agora é retomado na próxima interação.
- [C] Medieval: um som pontual atrasado (balde) podia remontar todos os laços do burgo depois de sair do bairro. Agora só o laço do bairro remonta.
- [C] Compressor do efeito Ursa Menor desconectado junto (só acontecia num caso forçado).
- [E] Ainda no MENU aberto: carros, tratores, bondes, barcos, moradores do Medieval, galinhas, bichos do Morro, cancelas e efeitos continuavam se mexendo (só a van parava). Agora o mundo também espera; a câmera continua normal. Teste: Fluxo, Trilhos, Medieval e Veneza — nada se move com o MENU aberto e tudo volta ao fechar. O mesmo vale para a lista de missões (M) na Carreira (testado no Fluxo).
- Verificado sem problema [E]: nenhum acúmulo de nós de áudio depois de 10 trocas de bairro; Voltar silencia tudo; descer da van zera o motor; pousar no chão para o rotor; efeitos cancelados cortam o próprio som; nada fica mudo para sempre depois de pausar.

### 2ª revisão de regressões (commits `7b69307`..`da346e1`, outro agente, build antigo lado a lado)
Encontrou 3 regressões minhas — corrigidas e retestadas com os mesmos testes:
- [E] Voltar com o MENU aberto deixava os efeitos mudos nos menus e no mapa (o MENU ficava "aberto" escondido). Agora o silêncio só vale nos estados de jogo e o Voltar fecha o MENU.
- [E] Com o MENU/missões abertos logo depois de uma explosão ou da seta da DICA, a câmera tremia sem parar (o tremor não diminuía). Agora o tremor espera junto com o mundo.
- [E] A música dos engarrafamentos não sumia mais com a lista de missões aberta (o fade usava o tempo do mundo). Fades de som voltaram a usar o tempo real.
Ajustes das suspeitas: sprites e texturas reaproveitadas do Sistema Solar não são mais liberadas a cada partícula (evita reenvio à GPU); buracos/cratera dos efeitos liberam também as texturas; destruir uma casa da rota com menos de 5 casas de pé recomeça a partida (antes a rota ficava com um destino impossível).
Conferido sem problema: cenas que pausam pelo MENU (resgate, missa, montagem) não são afetadas pela pausa do mundo; aproximação da igreja segue o tempo da música; monstro nos Bairros 1, 13, 23, 24; Veneza termina a saída; Lua sem chefe.

## Em andamento / próximos passos (identificados, pendentes)
Prioridade aproximada:
1. Helicóptero: o maciço da Cachoeira ainda é atravessado acima de 6,5 (castelo/torres/casas do Medieval, igrejas, galpões e contemporâneos já colidem).
2. Encaixe: poça de luz da Penumbra e degraus da Cachoeira (a conferir).
4. Menores: porta da oficina do Medieval sem sólido; veículos de laço (tratores, carros do Bosque, limpa-neve, carroças) se atravessam depois de 6 s esperando — é a saída anti-travamento atual; trocar exige outra lógica de prioridade.
5. Ciclo de vida: mundos de todos os bairros visitados ficam guardados (medido: cresce até todos os 24 estarem em memória e depois estabiliza). Descartar mundos mexe em vários sistemas presos a cada bairro; não alterado.

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
- `ae07633`, `9ee58b4` — cercas e objetos de quintal/térreo a pé.
- `7b69307` — Livre: monstro, casa destruída, entulho, helicóptero na Cachoeira.
- `f18eded` — efeitos da entrega errada liberam memória.
- `bb5190b` — efeitos sonoros: MENU, aba escondida, trânsito, helicóptero pousado, iOS, Medieval.
- bancos/postes, Encostas/Grillby's, paredões, área segura/Sair, postes compartilhados, câmera na partida nova (ver `git log`).
