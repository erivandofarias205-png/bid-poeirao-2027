
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const url = 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026/2098?documento=IMT';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      }
    });

    if (!resposta.ok) {
      return res.status(502).json({
        sucesso: false,
        erro: 'Não foi possível consultar a classificação da Série C na CBF.',
        status: resposta.status
      });
    }

    const html = await resposta.text();

    function limpar(texto) {
      return texto
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;|&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function extrairGrupo(nome) {
      const inicio = html.indexOf(`<h2>${nome}</h2>`);

      if (inicio === -1) return [];

      const inicioTabela = html.indexOf('<table', inicio);
      if (inicioTabela === -1) return [];

      const fimTabela = html.indexOf('</table>', inicioTabela);
      if (fimTabela === -1) return [];

      const tabela = html.slice(inicioTabela, fimTabela + 8);
      const linhas = tabela.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

      return linhas.map(linha => {
        const nomeEquipe = linha.match(
          /class="[^"]*styles_teamName[^"]*"[^>]*>([\s\S]*?)<\/strong>/i
        );

        const celulas = [...linha.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
          .map(celula => limpar(celula[1]));

        if (!nomeEquipe || celulas.length < 12) return null;

        return {
          posicao: celulas[0].match(/^\s*(\d)/)?.[1] || '',
          equipe: limpar(nomeEquipe[1]),
          pontos: celulas[1],
          jogos: celulas[2],
          vitorias: celulas[3],
          empates: celulas[4],
          derrotas: celulas[5],
          gols_pro: celulas[6],
          gols_contra: celulas[7],
          saldo_gols: celulas[8],
          cartoes_amarelos: celulas[9],
          cartoes_vermelhos: celulas[10],
          aproveitamento: celulas[11]
        };
      }).filter(Boolean);
    }

    const grupoB = extrairGrupo('GRUPO B');
    const grupoC = extrairGrupo('GRUPO C');

    if (grupoB.length === 0 || grupoC.length === 0) {
      return res.status(502).json({
        sucesso: false,
        erro: 'A CBF não retornou a classificação completa dos grupos B e C.',
        total_grupo_b: grupoB.length,
        total_grupo_c: grupoC.length
      });
    }

    return res.status(200).json({
      sucesso: true,
      fonte: 'CBF',
      competicao: 'Brasileirão Série C 2026',
      fase: 'Segunda fase',
      grupos: {
        B: grupoB,
        C: grupoC
      },
      total_equipes: grupoB.length + grupoC.length,
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na API da Série C:', erro);

    return res.status(500).json({
      sucesso: false,
      erro: 'Erro ao consultar a classificação da Série C.',
      detalhe: erro.message
    });
  }
}

