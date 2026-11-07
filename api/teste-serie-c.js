const brasileirao = require('campeonato-brasileiro-api');

module.exports = async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  try {
    const dados = await brasileirao.getCompetition('c');

    return res.status(200).json({
      sucesso: true,
      fonte: 'campeonato-brasileiro-api',
      competicao: 'Brasileirão Série C',
      dados
    });

  } catch (erro) {
    console.error('Erro no teste Série C:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message
    });
  }
};
