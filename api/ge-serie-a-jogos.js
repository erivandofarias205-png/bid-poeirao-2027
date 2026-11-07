
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const rodada = Number(req.query.rodada || 1);

    if (!Number.isInteger(rodada) || rodada < 1 || rodada > 38) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Rodada inválida. Escolha de 1 a 38.'
      });
    }

    const url = `https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2026/rodada/${String(rodada).padStart(2, '0')}/jogos/`;

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!resposta.ok) {
      throw new Error(`GE respondeu com status ${resposta.status}`);
    }

    const jogosGE = await resposta.json();

    const jogos = jogosGE.map(jogo => ({
      id: jogo.id,
      data: jogo.data_realizacao,
      hora: jogo.hora_realizacao,
      mandante: {
        nome: jogo.equipes?.mandante?.nome_popular || '',
        sigla: jogo.equipes?.mandante?.sigla || '',
        escudo: jogo.equipes?.mandante?.escudo || '',
        gols: jogo.placar_oficial_mandante
      },
      visitante: {
        nome: jogo.equipes?.visitante?.nome_popular || '',
        sigla: jogo.equipes?.visitante?.sigla || '',
        escudo: jogo.equipes?.visitante?.escudo || '',
        gols: jogo.placar_oficial_visitante
      },
      estadio: jogo.sede?.nome_popular || '',
      link: jogo.transmissao?.url || '',
      encerrado: jogo.jogo_ja_comecou === true &&
        jogo.placar_oficial_mandante !== null &&
        jogo.placar_oficial_visitante !== null
    }));

    return res.status(200).json({
      sucesso: true,
      fonte: 'GE Globo',
      competicao: 'Brasileirão Série A 2026',
      rodada,
      total_jogos: jogos.length,
      jogos
    });

  } catch (erro) {
    console.error('Erro GE Série A:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message
    });
  }
}

