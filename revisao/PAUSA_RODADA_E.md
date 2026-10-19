# Rodada E — pausada em 19/10/2026 (para priorizar a lista de correções do dono)

## O que estava sendo feito
Rodada E da revisão de 19/10: **batalha** (itens aprovados pelo dono, seção 9 do pedido) + **mecânicas do jogo principal**
(seção 8). Era um workflow com dois implementadores e dois verificadores independentes.

| Agente | Estado na pausa |
|---|---|
| Implementador da batalha (`battle.js`, `reflectPlus.js`, `battlePose.js`) | **terminou** (relatório salvo) |
| Implementador de mecânicas (`main.js`, `career.js`, `settings.js`, `boom.js`…) | **terminou** (relatório salvo) |
| Verificador independente da batalha | **interrompido** no meio |
| Verificador independente das mecânicas | **interrompido** no meio |

## Onde está o trabalho
- Commits no branch `claude/adress-game-access-28eyb7`: `5671145`, `bd8c6ab` e `e3c7530` (o último = estado completo no
  momento da pausa).
- Diferença completa da rodada E sobre o estado verificado `9beb62a`: `revisao/rodadaE_wip.patch` (só `src/`).
- Relatórios dos dois implementadores: `revisao/rodadaE_relatorios_implementadores.json`.
- Depois da pausa, o `src/` voltou ao estado verificado (`9beb62a`) num commit próprio ("Pausa da rodada E…"), para que as
  correções urgentes sejam publicadas sem misturar trabalho não verificado. Nada foi apagado do histórico.

## O que a rodada E fez (implementado, NÃO verificado de forma independente, NÃO publicado)
**Batalha:**
- câmera de jogo baixa e próxima, atrás e à direita do jogador (129°, distância 5,7, altura 2,3), com a arena adaptada (grade 14×11,
  marcas no chão sob os projéteis, prévia da placa, avisos mais largos);
- CONDUZIR aprimorado novo (a figura segura o objeto por um fio; puxar a ponta falha; os projéteis atraídos racham o objeto e, com
  duas batidas, a fenda abre);
- intensificação real depois do 2º azul (rajadas, ataques cruzados, leques);
- o K assume projéteis já no lançamento a partir do nível 2;
- correções de gesto no REFLETIR; o CONDUZIR comum ficou mais fácil de conduzir.

**Mecânicas:**
- helicóptero na serra da Cachoeira e nos prédios de fora das cidades;
- sons de porteira e de batida;
- aviso discreto de missão cumprida (salva na entrega certa);
- aviso "Nível 10 desbloqueado!";
- fala do frentista sem repetir e por mais tempo;
- DICA também a pé;
- textos da barra (lancha em Veneza, versão de toque);
- sem teclas de dirigir nas cenas da história;
- lascas da cor certa com a van imparável;
- lista de controles.

## O que ainda NÃO foi verificado
- Tudo acima: os dois verificadores independentes foram interrompidos antes de relatar.
- O implementador da batalha pediu confirmação do dono sobre a interpretação da câmera baixa como câmera de jogo (para voltar à
  elevada: `CAMS.game = CAMS.high` e restaurar `GRID/LIM/FIS/SD` antigos).

## Como retomar
1. Reaplicar as mudanças: `git apply revisao/rodadaE_wip.patch` (ou `git checkout e3c7530 -- src/battle.js src/battlePose.js
   src/reflectPlus.js src/boom.js src/career.js src/settings.js` e mesclar `src/main.js` à mão, porque a lista de correções
   também mexe em `main.js` e `settings.js`).
2. Rodar de novo só os dois verificadores (workflow `scratchpad/rev/wf/fullE.js` com `resumeFromRunId: wf_eef19c16-567`: os
   implementadores voltam do cache) sobre o código reaplicado.
3. Depois: rodada F (desempenho + regressão final), já escrita em `scratchpad/rev/wf/fullF.js`.
