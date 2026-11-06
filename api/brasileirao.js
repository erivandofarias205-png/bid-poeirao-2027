
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

    const dados = await brasileirao.getCompetition(serie);

    return res.status(200).json({
      sucesso: true,
      serie,
      dados
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

