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

    let rodadas = [];
    let grupos = [];

    if (serie === 'd') {
      grupos = await brasileirao.getGroups('d');

      rodadas = await Promise.all(
        grupos.map(async grupo => {
          const resultado = await brasileirao.getRounds('d', {
            group: grupo.name
          });

          return {
            grupo: grupo.name,
            rodadas: resultado.rounds || []
          };
        })
      );
    } else {
     const numeroRodada = Number(req.query.rodada || 1);

if (serie === 'b') {
  const jogos = await brasileirao.rodadaAtual('b', numeroRodada);

  rodadas = [{
    number: numeroRodada,
    matches: jogos
  }];
    } else {
      const resultado = await brasileirao.getRounds(serie);
      rodadas = resultado.rounds || [];
    }

    const partidas = rodadas.flatMap(item =>
      item.matches
        ? item.matches
        : (item.rodadas || []).flatMap(r => r.matches || [])
    );

    return res.status(200).json({
      sucesso: true,
      serie,
      dados: {
        competition: competencia.competition,
        tables: classificacao.tables || [],
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
