
const brasileirao = require('campeonato-brasileiro-api');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const dados = await brasileirao.getStandings('c');

    return res.status(200).json({
      sucesso: true,
      fonte: 'GE Globo',
      competicao: dados.competition,
      tabelas: dados.tables,
      total_equipes: (dados.tables || []).reduce(
        (total, tabela) => total + (tabela.entries || []).length,
        0
      )
    });

  } catch (erro) {
    console.error('Erro na classificação Série C:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message,
      codigo: erro.code || null
    });
  }
};
