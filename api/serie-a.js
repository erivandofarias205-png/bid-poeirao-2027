const brasileirao = require('campeonato-brasileiro-api');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const dados = await brasileirao.getCompetition('a');

    return res.status(200).json(dados);
  } catch (erro) {
    console.error('Erro ao consultar Série A:', erro);

    return res.status(502).json({
      erro: 'Não foi possível consultar os dados da Série A.',
      detalhe: erro.message
    });
  }
};
