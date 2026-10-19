// Praça do Bairro 2: o que cada pessoa da praça diz quando o jogador conversa com ela (a pé, E perto dela). Falas curtas,
// ligadas a quem fala e ao que está fazendo — o casal no banco, a senhora dos pombos, o pipoqueiro e o rapaz do cachorro.
// Não são dicas, não falam de entregas nem de endereços e não mudam nada na partida (a sequência das encomendas e as
// missões continuam iguais). Formato de cada fala para a caixa de diálogo (talkBox): [{ b: 'Nome: ' }, '“…”'].

export const PLAZA_PEOPLE = {
  nestor: { name: 'Seu Nestor' },
  zila: { name: 'Dona Zilá' },
  erminia: { name: 'Dona Ermínia' },
  toninho: { name: 'Seu Toninho' },
  davi: { name: 'Davi' },
};

// falas do dia a dia (na ordem em que aparecem; a 1ª conversa começa num ponto qualquer da lista)
const LINES = {
  nestor: [
    'O jornal diz que vai chover amanhã. Ontem dizia que ia chover hoje.',
    'Eu começo pela página de esportes. O resto eu leio se o time ganhou.',
    'Sentamos neste banco todo dia depois do almoço. O banco já até sabe a hora.',
    'Palavra cruzada: ‘ave que não voa’, seis letras. A Zilá diz que é ‘Nestor’.',
    'Já li esta página duas vezes. É que a letra está cada vez menor.',
  ],
  zila: [
    'Esse cachecol é para o meu neto. Do jeito que eu tricoto, vai servir quando ele casar.',
    'O Nestor lê o jornal em voz baixa. Baixa para ele, né?',
    'Errei um ponto lá atrás e não vou desmanchar. Ninguém vai reparar.',
    'Daqui a gente vê a praça inteira. Hoje o movimento está bom.',
    'A pipoca do Toninho é a mesma há trinta anos. Ainda bem.',
  ],
  erminia: [
    'Milho de manhã e de tarde. Eles sabem o horário melhor do que eu.',
    'Aquele mais escuro é o Barão. Chega por último e come primeiro.',
    'Não chega muito perto, que eles se assustam. Depois voltam, mas meio ofendidos.',
    'Meu filho diz que pombo dá trabalho. Os pombos nunca disseram nada dele.',
    'Trago o milho num saquinho de pão. Eles reconhecem o barulho do papel.',
  ],
  toninho: [
    'Pipoca doce ou salgada? A doce acabou, mas a salgada está ótima.',
    'Trinta anos nesta praça. Já vi três reformas do coreto e nenhuma do meu carrinho.',
    'Essa manivela range desde o carnaval. Já faz parte da receita.',
    'Quando o vento ajuda, o cheiro atravessa a rua e o pessoal vem sozinho.',
    'Hoje está devagar. Ontem também estava, mas com mais gente.',
  ],
  davi: [
    'Este é o Paçoca. Ele não atendia por outro nome, então ficou esse.',
    'A gente dá a volta na praça todo dia. Quem escolhe o caminho é ele.',
    'Ele cheira todo poste como se fosse a primeira vez.',
    'Pode fazer carinho. Ele não morde; no máximo, pede mais.',
    'Saímos para dar uma voltinha rápida. Já faz quarenta minutos.',
  ],
};
// o que ela está fazendo agora muda a fala (quando faz sentido)
const NOW = {
  davi_sniff: 'Espera um pouquinho: ele está lendo as notícias do bairro.',
  erminia_scare: 'Lá vão eles. Já, já voltam. Sempre voltam.',
  toninho_bag: 'Um minutinho, que esse saquinho já tem dono.',
};
const AGAIN = {                                                         // depois de ouvir tudo: reconhecem que você voltou
  nestor: 'Você de novo? Pode sentar. O banco tem lugar para mais um.',
  zila: 'Gostou da conversa, hein? Volta amanhã, que tem mais.',
  erminia: 'Voltou? Os pombos também sempre voltam.',
  toninho: 'Voltou pela pipoca ou pela conversa? A conversa é de graça.',
  davi: 'Ele já te conhece. Olha o rabo dele.',
};

/** Próxima fala de `who` (estado guardado em `mem`: { i, n }). `now`: o que a pessoa está fazendo ('sniff', 'scare', 'bag'). */
export function plazaLine(who, mem, now) {
  const L = LINES[who], name = PLAZA_PEOPLE[who].name;
  let text;
  if (now && NOW[who + '_' + now] && !mem['now_' + now]) { mem['now_' + now] = true; text = NOW[who + '_' + now]; }
  else if (mem.n >= L.length && !mem.again) { mem.again = true; text = AGAIN[who]; }
  else {
    if (mem.i == null) mem.i = Math.floor(Math.random() * L.length);
    text = L[mem.i % L.length]; mem.i++; mem.n = (mem.n || 0) + 1;
  }
  return [[{ b: name + ': ' }, '“' + text + '”']];
}
