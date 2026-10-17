# Revisão de qualidade do ADRESS (17/10/2026)

**Última atualização:** 16/10 22:50 (horário de Brasília)

## Ponto de partida
- Estado salvo antes da revisão: commit `7b8aba7` (tag `pre-revisao-qualidade`). Nada estava pendente no Git.
- MP3 adaptado do Finale: já entregue fora do jogo (`scratchpad/finale/finale-batalha-revisao.wav` + `-320k.mp3`), NÃO integrado.
- Fora do escopo (não mexo): músicas, história secundária (diálogos, cenas, sinos, extras, batalha). Estruturas como a igreja só recebem correções físicas (geometria/colisão).

## Como a revisão está sendo feita
- Leitura do código dos sistemas compartilhados (chão/ruas/lotes em `world.js`, colisão em `van.js`/`walker.js`, câmera, geração em `main.js`/`layout.js`/planos de cada bairro).
- Execução real no Chromium sem tela (Playwright + swiftshader): fotos de cada bairro, testes de alcance (portas acessíveis), colisões e trocas de bairro.
- Testes usam um perfil de navegador temporário (localStorage separado): o progresso real não é tocado.

## Atualização intermediária (05:50)
- O ambiente permite agendar uma mensagem para esta sessão (agendada para 05:45) e enviar notificação; o envio só acontece se a sessão estiver ativa. Este arquivo é sempre atualizado e enviado ao GitHub (branch `claude/adress-game-access-28eyb7`).

## Correções concluídas
_(nenhuma ainda)_

## Em andamento
- Levantamento inicial dos problemas.

## Problemas identificados / próximos passos
_(em levantamento)_

## Limitações e riscos
- Sem áudio/tela de verdade: verificação visual por capturas do Chromium sem GPU (swiftshader). Desempenho medido assim não representa o PC do dono; só comparações relativas.

## Commits
- `7b8aba7` — ponto de partida (antes da revisão).
