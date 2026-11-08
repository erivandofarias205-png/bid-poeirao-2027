
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido. Utilize GET.'
    });
  }

  const competicao = String(req.query.competicao || 'todas').toLowerCase();
  const rodada = String(req.query.rodada || '1');

  const permitidas = [
    'brasileirao-a',
    'brasileirao-b',
    'brasileirao-c',
    'brasileirao-d',
    'champions',
    'europa'
  ];

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
      throw new Error(`Resposta inválida: ${caminho}`);
    }

    if (!resposta.ok || dados.sucesso === false) {
      throw new Error(dados.erro || `Falha em ${caminho}`);
    }

    return dados;
  }

  async function consultarCompeticao(chave) {
    let fonte = '';
    let nome = '';
    let classificacao = [];
    let jogos = [];
    let grupos = {};
    let dadosOriginais = {};

    if (chave === 'brasileirao-a') {
      const [tabela, retornoJogos] = await Promise.all([
        consultarAPI('/api/serie-a'),
        consultarAPI(
          `/api/ge-serie-a-jogos?rodada=${encodeURIComponent(rodada)}`
        )
      ]);

      fonte = 'GE Globo';
      nome = 'Brasileirão Série A';
      classificacao = tabela.tables || [];

      jogos = (retornoJogos.jogos || []).map(jogo => {
        const temPlacar =
          jogo.mandante?.gols != null &&
          jogo.visitante?.gols != null;

        return {
          id: jogo.id,
          date: jogo.data ? jogo.data.split('T')[0] : '',
          time: jogo.hora || '',
          status: jogo.encerrado
            ? 'finished'
            : temPlacar
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
          score: temPlacar
            ? {
                home: Number(jogo.mandante.gols),
                away: Number(jogo.visitante.gols)
              }
            : null,
          venue: jogo.estadio || ''
        };
      });

      dadosOriginais = { classificacao: tabela, jogos: retornoJogos };
    }

    else if (chave === 'brasileirao-c') {
      const dados = await consultarAPI(
        `/api/serie-c-jogos?rodada=${encodeURIComponent(rodada)}`
      );

      fonte = 'CBF';
      nome = 'Brasileirão Série C';
      grupos = dados.grupos || {};
      jogos = Object.values(grupos).flat();
      dadosOriginais = dados;
    }

    else if (chave === 'brasileirao-b' || chave === 'brasileirao-d') {
      const serie = chave.slice(-1);
      const retorno = await consultarAPI(`/api/brasileirao?serie=${serie}`);
      const dados = retorno.dados || {};

      fonte = 'Campeonato Brasileiro API';
      nome = `Brasileirão Série ${serie.toUpperCase()}`;
      classificacao = dados.tables || [];
      jogos = dados.matches || [];
      grupos = dados.grupos || {};
      dadosOriginais = dados;
    }

    else if (chave === 'champions' || chave === 'europa') {
      const retorno = await consultarAPI(
        `/api/ge-europa?competicao=${chave}&rodada=${encodeURIComponent(rodada)}`
      );

      const dados = retorno.competicoes?.[chave];

      if (!dados) {
        throw new Error(`Dados de ${chave} não encontrados.`);
      }

      fonte = 'GE Globo';
      nome = chave === 'champions'
        ? 'Champions League'
        : 'Europa League';

      classificacao = dados.classificacao || [];
      jogos = dados.jogos || [];
      dadosOriginais = dados;
    }

    return {
      chave,
      fonte,
      competicao: nome,
      rodada: Number(rodada),
      classificacao,
      jogos,
      grupos,
      dados_originais: dadosOriginais,
      total_jogos: jogos.length,
      atualizado_em: new Date().toISOString()
    };
  }

  try {
    if (competicao !== 'todas' && !permitidas.includes(competicao)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Competição não reconhecida.',
        competicoes_disponiveis: ['todas', ...permitidas]
      });
    }

    const selecionadas = competicao === 'todas'
      ? permitidas
      : [competicao];

    const resultados = await Promise.all(
      selecionadas.map(async chave => {
        try {
          return {
            sucesso: true,
            ...await consultarCompeticao(chave)
          };
        } catch (erro) {
          return {
            sucesso: false,
            chave,
            erro: erro.message,
            jogos: [],
            classificacao: []
          };
        }
      })
    );

    const jogos = resultados.flatMap(item =>
      item.sucesso ? item.jogos : []
    );

    return res.status(200).json({
      sucesso: true,
      central: 'TVFP ESPORTES',
      competicoes: resultados,
      jogos,
      total_competicoes: resultados.length,
      total_jogos: jogos.length,
      falhas: resultados
        .filter(item => !item.sucesso)
        .map(item => ({
          competicao: item.chave,
          erro: item.erro
        })),
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na Central Geral:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message
    });
  }
};
