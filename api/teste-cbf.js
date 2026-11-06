
export default async function handler(req, res) {
  try {
    const url = 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026/2098?documento=IMT';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      }
    });

    if (!resposta.ok) {
      return res.status(502).json({
        sucesso: false,
        erro: 'Erro ao consultar a CBF',
        status: resposta.status
      });
    }

    const html = await resposta.text();

    function limpar(texto) {
      return texto
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;|&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function extrairGrupo(nome) {
      const inicio = html.indexOf(`<h2>${nome}</h2>`);

      if (inicio === -1) return [];

      const inicioTabela = html.indexOf('<table', inicio);
      if (inicioTabela === -1) return [];

      const fimTabela = html.indexOf('</table>', inicioTabela);
      if (fimTabela === -1) return [];

      const tabela = html.slice(inicioTabela, fimTabela + 8);
      const linhas = tabela.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
     
     
return linhas.map(linha => {
  const nomeEquipe = linha.match(
    /class="[^"]*styles_teamName[^"]*"[^>]*>([\s\S]*?)<\/strong>/i
  );

  const celulas = [...linha.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
    .map(celula => limpar(celula[1]));

  if (!nomeEquipe || celulas.length < 12) return null;

  return {
   posicao: celulas[0].match(/^\s*(\d)/)?.[1] || '',
    equipe: limpar(nomeEquipe[1]),
    pontos: celulas[1],
    jogos: celulas[2],
    vitorias: celulas[3],
    empates: celulas[4],
    derrotas: celulas[5],
    gols_pro: celulas[6],
    gols_contra: celulas[7],
    saldo_gols: celulas[8],
    cartoes_amarelos: celulas[9],
    cartoes_vermelhos: celulas[10],
    aproveitamento: celulas[11]
  };
}).filter(Boolean);


         }

    const grupoB = extrairGrupo('GRUPO B');
    const grupoC = extrairGrupo('GRUPO C');

const linksJogos = [
  ...html.matchAll(
    /href="([^"]*\/serie-c\/2026\/2098\/\d+)"/gi
  )
].map(item => item[1]);

const diagnosticoJogos = [...new Set(linksJogos)];

const termosBusca = [
  'Jogo',
  'RODADA',
  'styles_teamPositionContent',
  'BOT'
];

const diagnosticoEstrutura = {};

for (const termo of termosBusca) {
  const posicao = html.toLowerCase().indexOf(termo.toLowerCase());

  diagnosticoEstrutura[termo] = posicao >= 0
    ? html.slice(Math.max(0, posicao - 1000), posicao + 2500)
    : 'Não encontrado';
}

    let diagnosticoPartida = null;

if (diagnosticoJogos.length > 0) {
  const urlPartida = new URL(
    diagnosticoJogos[0],
    'https://www.cbf.com.br'
  ).toString();

  const respostaPartida = await fetch(urlPartida, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html'
    }
  });

  const htmlPartida = await respostaPartida.text();

  diagnosticoPartida = {
    status: respostaPartida.status,
    tamanho: htmlPartida.length,
    titulo: htmlPartida.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '',
    html: htmlPartida.slice(0, 8000)
  };
}
   
return res.status(200).json({
  sucesso: true,
  fonte: 'CBF',
  competicao: 'Brasileirão Série C 2026',
  grupos: {
    B: grupoB,
    C: grupoC
  },
  otal_equipes: grupoB.length + grupoC.length,
diagnostico_jogos: diagnosticoJogos,
diagnostico_partida: diagnosticoPartida,
diagnostico_estrutura: diagnosticoEstrutura,
});


  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
}
