
export default async function handler(req, res) {
  const competicoes = {
    'serie-b': {
      nome: 'Brasileirão Série B',
      url: 'https://ge.globo.com/futebol/brasileirao-serie-b/'
    },
    'serie-c': {
      nome: 'Brasileirão Série C',
      url: 'https://ge.globo.com/futebol/brasileirao-serie-c/'
    },
    'serie-d': {
      nome: 'Brasileirão Série D',
      url: 'https://ge.globo.com/futebol/brasileirao-serie-d/'
    },
    'copa-do-brasil': {
      nome: 'Copa do Brasil',
      url: 'https://ge.globo.com/futebol/copa-do-brasil/'
    },
    'libertadores': {
      nome: 'Libertadores',
      url: 'https://ge.globo.com/futebol/libertadores/'
    },
    'sul-americana': {
      nome: 'Sul-Americana',
      url: 'https://ge.globo.com/futebol/copa-sul-americana/'
    },
    'champions-league': {
      nome: 'Champions League',
      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/'
    },
    'europa-league': {
      nome: 'Europa League',
      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-europa/'
    }
  };

  try {
    const chave = String(req.query.competicao || '').toLowerCase();
    const competicao = competicoes[chave];

    if (!competicao) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Competição não reconhecida.',
        competicoesDisponiveis: Object.keys(competicoes)
      });
    }

    const resposta = await fetch(competicao.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!resposta.ok) {
      throw new Error(`O ge respondeu com erro: ${resposta.status}`);
    }

    const html = await resposta.text();

    const bloco = html.match(
      /<section class="artilharia-wrapper">([\s\S]*?)<\/section>/
    );

    if (!bloco) {
      throw new Error(
        `O ge não disponibilizou a artilharia de ${competicao.nome}.`
      );
    }

    const limpar = texto => texto
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const itens = bloco[1]
      .split('class="ranking-item-wrapper"')
      .slice(1);

    const jogadores = [];

    for (const item of itens) {
      const nome = item.match(
        /class="jogador-nome">([\s\S]*?)<\/div>/
      )?.[1];

      const clube = item.match(
        /class="jogador-escudo">\s*<img[^>]*alt="([^"]+)"/
      )?.[1];

      const gols = item.match(
        /class="jogador-gols">\s*(\d+)/
      )?.[1];

      const foto = item.match(
        /class="jogador-foto">\s*<img[^>]*src="([^"]+)"/
      )?.[1];

      const posicao = item.match(
        /class="jogador-posicao">([\s\S]*?)<\/div>/
      )?.[1];

      const escudo = item.match(
        /class="jogador-escudo">\s*<img[^>]*src="([^"]+)"/
      )?.[1];

      if (nome && clube && gols) {
        jogadores.push({
          nome: limpar(nome),
          clube: limpar(clube),
          gols: Number(gols),
          foto: foto || '',
          escudo: escudo || '',
          posicao: limpar(posicao || '')
        });
      }
    }

    if (!jogadores.length) {
      throw new Error(
        `Não foi possível extrair os jogadores de ${competicao.nome}.`
      );
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res.status(200).json({
      sucesso: true,
      fonte: 'ge.globo.com',
      competicao: competicao.nome,
      total: jogadores.length,
      artilheiros: jogadores
    });

  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
}

