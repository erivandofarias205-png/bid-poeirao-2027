const brasileirao = require('campeonato-brasileiro-api');

module.exports = async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );

  try {
    const serie = String(req.query.serie || '').toLowerCase();

    if (!['a', 'b', 'c', 'd'].includes(serie)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Informe uma série válida: a, b, c ou d.'
      });
    }

    const competencia = await brasileirao.getCompetition(serie);
    const classificacao = await brasileirao.getStandings(serie);

    let tabelas = classificacao.tables || [];
    let rodadas = [];
    let grupos = [];

    if (serie === 'd') {
      grupos = await brasileirao.getGroups('d');

      const rodadasPorGrupo = await Promise.all(
        grupos.map(grupo =>
          brasileirao.getRounds('d', { group: grupo.name })
        )
      );

      tabelas = grupos;

      rodadas = rodadasPorGrupo.flatMap(item =>
        item.rounds || []
      );
    } else {
      const resultadoRodadas = await brasileirao.getRounds(serie);
      rodadas = resultadoRodadas.rounds || [];
    }

    const partidas = rodadas.flatMap(rodada =>
      rodada.matches || []
    );

    return res.status(200).json({
      sucesso: true,
      serie,
      dados: {
        ...competencia,
        competition: competencia.competition,
        tables: tabelas,
        rounds: rodadas,
        matches: partidas,
        grupos
      }
    });

  } catch (erro) {
    console.error('Erro ao consultar Brasileirão:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: 'Não foi possível consultar esta competição.',
      detalhe: erro.message
    });
  }
};
