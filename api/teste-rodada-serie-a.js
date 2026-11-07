
const brasileirao = require('campeonato-brasileiro-api');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const rodada = Number(req.query.rodada || 1);

    const dados = await brasileirao.getRounds('a', {
      number: rodada
    });

    return res.status(200).json({
      sucesso: true,
      fonte: 'GE Globo',
      rodada_solicitada: rodada,
      dados
    });

  } catch (erro) {
    return res.status(502).json({
      sucesso: false,
      erro: erro.message,
      codigo: erro.code || null
    });
  }
};

