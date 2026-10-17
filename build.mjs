// Gera um index.html autocontido (three.js + jogo embutidos), que abre direto no navegador.
//   npm run build      → versão minificada
//   npm run build:dev  → sem minificação (mensagens de erro legíveis)
//   npm run watch      → reconstrói a cada alteração em src/
//   npm run build:netlify → site pronto para publicar em dist/ (index.html + assets/)
// Uso avançado: node build.mjs [--dev] [--watch] [--entry arquivo.js] [--out saida.html] [--with-assets]
import * as esbuild from 'esbuild';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const dev = flag('--dev'), watch = flag('--watch');
const entry = opt('--entry', 'src/main.js'), out = opt('--out', 'index.html');
const withAssets = flag('--with-assets');   // copia assets/ (música) para junto do html gerado

async function inject(js) {
  const tpl = await readFile('src/template.html', 'utf8');
  const safe = js.replace(/<\/script/gi, '<\\/script');
  await mkdir(dirname(out), { recursive: true });
  if (withAssets && dirname(out) !== '.') await cp('assets', join(dirname(out), 'assets'), { recursive: true });
  await writeFile(out, tpl.replace('<!--BUNDLE-->', () => `<script>\n${safe}\n</script>`));
  console.log(`✔ ${out} (${(Buffer.byteLength(safe) / 1024).toFixed(0)} KB)`);
}

const options = {
  entryPoints: [entry], bundle: true, format: 'iife', target: 'es2020',
  minify: !dev, legalComments: 'none', write: false, logLevel: 'warning',
  loader: { '.ogg': 'dataurl', '.mp3': 'dataurl' },            // honk.ogg vai embutido no html (funciona abrindo o arquivo direto)
};

if (watch) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: 'inject', setup(b) { b.onEnd(async r => { if (!r.errors.length) await inject(r.outputFiles[0].text); }); } }],
  });
  await ctx.watch();
  console.log('observando src/ …');
} else {
  const r = await esbuild.build(options);
  await inject(r.outputFiles[0].text);
}
