# ADRESS

Jogo 3D de entregas: descubra, pelas características das casas e pelos palpites (nada confiáveis) dos moradores, para quem é a encomenda.

## Jogar

- **No computador:** abra `index.html` no navegador (a pasta `assets/` precisa ficar ao lado dele, por causa da música).
- **Na internet:** <https://joaokodiz.github.io/ADRESS/> (GitHub Pages) — ou publique no Netlify (abaixo).

### Controles

| Tecla | Ação |
|---|---|
| W / ↑ | acelerar |
| S / ↓ | frear e dar ré |
| A D / ← → | virar |
| E / Espaço / Enter | entregar / abastecer no posto / continuar o diálogo |
| C | alternar câmera (atrás da van / bairro inteiro) |
| T ou botão **DICA** | seta gigante cai na casa indicada (1× por rodada) |
| H | vira helicóptero (Espaço sobe, Shift desce; H de novo pousa) |
| F | míssil da van (a rodada reinicia) |
| M ou botão **MISSÕES** | missões do bairro (Carreira) |
| botão **♪** | pausar / continuar a música |
| Esc ou botão **MENU** | opções (casas explodem na entrega errada, van imparável) |

## Publicar no GitHub Pages

O `index.html` da raiz já vem pronto (autocontido) e a música fica em `assets/`, então basta:
**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
O arquivo `.nojekyll` evita o processamento do Jekyll. Depois de mudar algo em `src/`, rode `npm run build` e faça commit do `index.html`.

## Publicar no Netlify

### Opção 1 — arrastar e soltar (mais fácil, sem build)

1. Acesse <https://app.netlify.com/drop> (entre na sua conta).
2. Arraste o arquivo **`ADRESS-netlify.zip`** (ou a pasta `dist/`) para a página.
3. Pronto: o Netlify mostra o link do jogo.

### Opção 2 — pelo Git (GitHub/GitLab), com build automático

1. Suba esta pasta para um repositório (o `.gitignore` já ignora `node_modules/`, `dist/` e `.dev/`).
2. No Netlify: **Add new site → Import an existing project** e escolha o repositório.
3. As configurações vêm do `netlify.toml`: build `npm run build:netlify`, pasta publicada `dist`, Node 20.

## Desenvolvimento

Requer Node.js 18+.

```bash
npm install
npm run build          # gera index.html (autocontido: three.js + jogo)
npm run build:netlify  # gera dist/ (index.html + assets/) para publicar
npm run watch          # reconstrói a cada alteração em src/
```

Estrutura:

- `src/main.js` — laço do jogo e máquina de estados
- `src/logic.js`, `src/data.js` — regras da rodada, casas, pistas e falas
- `src/world.js`, `src/models/` — bairro, casas, objetos do quintal, moradores
- `src/van.js`, `src/camera.js`, `src/heli.js` — van, câmeras e helicóptero
- `src/hint.js`, `src/boom.js`, `src/monster.js` — dica da seta, explosões/míssil, chefe final
- `src/hud.js`, `src/menu.js`, `src/music.js`, `src/audio.js` — interface, menu, música e sons
- `src/careerMap.js`, `src/career.js`, `src/missions.js`, `src/lockButton.js` — Carreira: mapa dos bairros, missões, desbloqueio
- `src/layout.js`, `src/barriers.js` — grade de cada bairro, posto de gasolina e bloqueios de rua
- `adress-2d.html` — a primeira versão, em 2D

Música de fundo: "Another day in hometown" (arquivo fornecido pelo autor do projeto).
