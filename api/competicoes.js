
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido. Utilize GET.'
    });
  }

  const competicao = String(req.query.competicao || '').toLowerCase();
  const rodada = String(req.query.rodada || '1');

  const permitidas = [
    'brasileirao-a', 'brasileirao-b', 'brasileirao-c',
    'brasileirao-d', 'champions', 'europa'
  ];

  if (!permitidas.includes(competicao)) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Competição não reconhecida.',
      competicoes_disponiveis: permitidas
    });
  }

  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

  async function consultarAPI(caminho) {
    const resposta = await fetch(`${host}${caminho}`);
    const texto = await resposta.text();

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      throw new Error(`Resposta inválida da API ${caminho}.`);
    }

    if (!resposta.ok || dados.sucesso === false) {
      throw new Error(dados.erro || `Falha ao consultar ${caminho}.`);
    }

    return dados;
  }

  try {
    let fonte = '';
    let nome = '';
    let classificacao = [];
    let jogos = [];
    let dadosOriginais = {};
    let grupos = {};

    
if (competicao === 'brasileirao-a') {
  const [tabela, retornoJogos] = await Promise.all([
    consultarAPI('/api/serie-a'),
    consultarAPI(
      `/api/ge-serie-a-jogos?rodada=${encodeURIComponent(rodada)}`
    )
  ]);

  fonte = 'GE Globo';
  nome = 'Brasileirão Série A';

  // CLASSIFICAÇÃO NO FORMATO PADRÃO DO SITE
  classificacao = tabela.tables || [];

  // JOGOS NO FORMATO PADRÃO DO SITE
  jogos = (retornoJogos.jogos || []).map(jogo => {
    const placarDisponivel =
      jogo.mandante?.gols !== null &&
      jogo.mandante?.gols !== undefined &&
      jogo.visitante?.gols !== null &&
      jogo.visitante?.gols !== undefined;

    return {
      id: jogo.id,
      date: jogo.data ? jogo.data.split('T')[0] : '',
      time: jogo.hora || '',
      status: jogo.encerrado
        ? 'finished'
        : placarDisponivel
          ? 'live'
          : 'scheduled',

      homeTeam: {
        name: jogo.mandante?.nome || '',
        badge: jogo.mandante?.escudo || ''
      },

      awayTeam: {
        name: jogo.visitante?.nome || '',
        badge: jogo.visitante?.escudo || ''
      },

      score: placarDisponivel ? {
        home: Number(jogo.mandante.gols),
        away: Number(jogo.visitante.gols)
      } : null,

      venue: jogo.estadio || ''
    };
  });

  dadosOriginais = {
    classificacao: tabela,
    jogos: retornoJogos
  };
}


    else if (competicao === 'brasileirao-c') {
      const dados = await consultarAPI(
        `/api/serie-c-jogos?rodada=${encodeURIComponent(rodada)}`
      );

      fonte = 'CBF';
      nome = 'Brasileirão Série C';
      grupos = dados.grupos || {};
      jogos = Object.values(grupos).flat();
      dadosOriginais = dados;
    }

    else if (
      competicao === 'brasileirao-b' ||
      competicao === 'brasileirao-d'
    ) {
      const serie = competicao.slice(-1);
      const retorno = await consultarAPI(`/api/brasileirao?serie=${serie}`);
      const dados = retorno.dados || {};

      fonte = 'Campeonato Brasileiro API';
      nome = `Brasileirão Série ${serie.toUpperCase()}`;
      classificacao = dados.tables || [];
      jogos = dados.matches || [];
      dadosOriginais = dados;
      grupos = dados.grupos || {};
    }

    else {
      const retorno = await consultarAPI(
        `/api/ge-europa?competicao=${competicao}&rodada=${encodeURIComponent(rodada)}`
      );

      const dados = retorno.competicoes?.[competicao];

      if (!dados) {
        throw new Error(`Dados de ${competicao} não encontrados.`);
      }

      fonte = 'GE Globo';
      nome = competicao === 'champions'
        ? 'Champions League'
        : 'Europa League';

      classificacao = dados.classificacao || [];
      jogos = dados.jogos || [];
      dadosOriginais = dados;
    }

    return res.status(200).json({
      sucesso: true,
      fonte,
      chave: competicao,
      competicao: nome,
      rodada: Number(rodada),
      classificacao,
      jogos,
      grupos,
      dados_originais: dadosOriginais,
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na API central:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: 'Não foi possível consultar a competição.',
      detalhe: erro.message,
      competicao
    });
  }
};
