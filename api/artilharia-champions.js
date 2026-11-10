
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido.'
    });
  }

  try {
    const europa = req.query.competicao === 'europa';

    const competitionId = europa ? '14' : '1';
    const nomeCompeticao = europa
      ? 'Europa League'
      : 'Champions League';

    const url = new URL(
      'https://compstats.uefa.com/v2/player-ranking'
    );

    url.searchParams.set('competitionId', competitionId);
    url.searchParams.set('limit', '100');
    url.searchParams.set('offset', '0');
    url.searchParams.set('optionalFields', 'PLAYER,TEAM');
    url.searchParams.set('order', 'DESC');
    url.searchParams.set('phase', 'TOURNAMENT');
    url.searchParams.set('seasonYear', '2027');
    url.searchParams.set(
      'stats',
      'goals,goals_scored_with_right,goals_scored_with_left,goals_scored_head,goals_scored_other,goals_scored_inside_penalty_area,goals_scored_outside_penalty_area,penalty_scored,matches_appearance'
    );

    const resposta = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!resposta.ok) {
      throw new Error(`UEFA respondeu com status ${resposta.status}`);
    }

    const dados = await resposta.json();

    const artilheiros = (Array.isArray(dados) ? dados : [])
      .map(item => {
        const estatistica = nome =>
          Number(
            item.statistics?.find(s => s.name === nome)?.value || 0
          );

        return {
          jogador: item.player?.internationalName || '',
          foto: item.player?.imageUrl || '',
          equipe: item.team?.translations?.displayName?.PT ||
                  item.team?.internationalName || '',
          escudo: item.team?.logoUrl || '',
          gols: estatistica('goals'),
          participacoes: estatistica('matches_appearance'),
          gols_penalti: estatistica('penalty_scored')
        };
      })
      .filter(jogador => jogador.jogador)
      .sort((a, b) => b.gols - a.gols);

    return res.status(200).json({
      sucesso: true,
      competicao: nomeCompeticao,
      temporada: '2026/2027',
      fonte: 'UEFA',
      total: artilheiros.length,
      artilheiros,
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na artilharia UEFA:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message,
      artilheiros: []
    });
  }
}
