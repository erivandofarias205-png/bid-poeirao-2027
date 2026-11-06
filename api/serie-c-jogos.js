
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const rodada = Number(req.query.rodada || 6);

    if (!Number.isInteger(rodada) || rodada < 1 || rodada > 6) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Rodada inválida.'
      });
    }

    const url = `https://www.cbf.com.br/api/cbf/jogos/campeonato/1260613/rodada/${rodada}/fase`;

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!resposta.ok) {
      return res.status(502).json({
        sucesso: false,
        erro: 'Não foi possível consultar os jogos na CBF.',
        status: resposta.status
      });
    }

    const dados = await resposta.json();

    const grupos = {};

    for (const grupo of dados.jogos || []) {
      if (!['GRUPO B', 'GRUPO C'].includes(grupo.grupo)) continue;

      grupos[grupo.grupo] = (grupo.jogo || []).map(jogo => ({
        id: jogo.id_jogo,
        numero: jogo.num_jogo,
        rodada: jogo.rodada,
        grupo: jogo.grupo,

        mandante: {
          nome: jogo.mandante?.nome || '',
          escudo: jogo.mandante?.url_escudo || '',
          gols: jogo.mandante?.gols ?? null
        },

        visitante: {
          nome: jogo.visitante?.nome || '',
          escudo: jogo.visitante?.url_escudo || '',
          gols: jogo.visitante?.gols ?? null
        },

        data: (jogo.data || '').trim(),
        hora: jogo.hora || '',
        local: jogo.local || '',
        penalidades: jogo.penalidades || []
      }));
    }

    return res.status(200).json({
      sucesso: true,
      fonte: 'CBF',
      competicao: 'Brasileirão Série C 2026',
      fase: 'Segunda fase',
      rodada,
      grupos,
      total_jogos: Object.values(grupos)
        .reduce((total, jogos) => total + jogos.length, 0),
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro nos jogos da Série C:', erro);

    return res.status(500).json({
      sucesso: false,
      erro: 'Erro ao consultar os jogos da Série C.',
      detalhe: erro.message
    });
  }
}

