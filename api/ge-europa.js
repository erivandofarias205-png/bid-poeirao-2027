
export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );

  const competicoes = {
    champions: {
      nome: 'UEFA Champions League',
      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/'
    },
    europa: {
      nome: 'UEFA Europa League',
      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-europa/'
    }
  };

  try {
    const resultados = {};

    for (const [chave, competicao] of Object.entries(competicoes)) {
      const resposta = await fetch(competicao.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });

      const html = await resposta.text();

      const titulo =
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';

      const descricao =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || '';

     const scripts = [
  ...html.matchAll(/<script[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/gi)
].map(item => {
  const conteudo = item[2];

  const palavras = [
    'jogos',
    'partidas',
    'classificacao',
    'classificação',
    'standings',
    'matches',
    'fixtures',
    'artilharia'
  ];

  const trechos = [];

  for (const palavra of palavras) {
    const posicao = conteudo.toLowerCase().indexOf(palavra);

    if (posicao >= 0) {
      trechos.push(
        conteudo.slice(
          Math.max(0, posicao - 500),
          Math.min(conteudo.length, posicao + 1500)
        )
      );
    }
  }

  return {
    id: item[1],
    tamanho: conteudo.length,
    trechos: [...new Set(trechos)].slice(0, 5)
  };
});
      resultados[chave] = {
        competicao: competicao.nome,
        fonte: competicao.url,
        status_http: resposta.status,
        sucesso: resposta.ok,
        titulo,
        descricao,
        tamanho_html: html.length,
        scripts,
        palavrasEncontradas: {
          jogos: /jogos|partidas|confrontos/i.test(html),
          classificacao: /classificação|classificacao|tabela/i.test(html),
          escudos: /escudo|badge|crest/i.test(html),
          artilharia: /artilheiro|artilharia|gols/i.test(html)
        }
      };
    }

    return res.status(200).json({
      sucesso: true,
      fonte: 'GE Globo',
      competicoes: resultados,
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: 'Erro ao consultar o GE.',
      detalhe: erro.message
    });
  }
}

