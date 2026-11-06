
export default async function handler(req, res) {
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
        erro: 'Erro ao consultar a CBF',
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

        if (!nomeEquipe || celulas.length < 10) return null;

        return {
          posicao: celulas[0],
          equipe: limpar(nomeEquipe[1]),
          pontos: celulas[3],
          jogos: celulas[4],
          vitorias: celulas[5],
          empates: celulas[6],
          derrotas: celulas[7],
          gols_pro: celulas[8],
          gols_contra: celulas[9],
          saldo_gols: celulas[10],
          cartoes_amarelos: celulas[11],
          cartoes_vermelhos: celulas[12],
          aproveitamento: celulas[13]
        };
      }).filter(Boolean);
    }

    const grupoB = extrairGrupo('GRUPO B');
    const grupoC = extrairGrupo('GRUPO C');

    return res.status(200).json({
      sucesso: true,
      fonte: 'CBF',
      competicao: 'Brasileirão Série C 2026',
      grupos: {
        B: grupoB,
        C: grupoC
      },
      total_equipes: grupoB.length + grupoC.length
    });

  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
}
