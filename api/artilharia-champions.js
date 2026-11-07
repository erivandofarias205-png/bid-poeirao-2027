
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido.'
    });
  }

  try {
    const url =
      'https://placar.com.br/tabelas/uefa-champions-league-2026-27/artilharia/';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!resposta.ok) {
      throw new Error(`Fonte respondeu com status ${resposta.status}`);
    }

    const html = await resposta.text();

    function limparTexto(valor) {
      return valor
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&aacute;/gi, 'á')
        .replace(/&eacute;/gi, 'é')
        .replace(/&iacute;/gi, 'í')
        .replace(/&oacute;/gi, 'ó')
        .replace(/&uacute;/gi, 'ú')
        .replace(/&atilde;/gi, 'ã')
        .replace(/&otilde;/gi, 'õ')
        .replace(/&ccedil;/gi, 'ç')
        .replace(/&#(\d+);/g, (_, n) =>
          String.fromCodePoint(Number(n))
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
          String.fromCodePoint(parseInt(n, 16))
        )
        .replace(/\s+/g, ' ')
        .trim();
    }

    const tabela = html.match(/<table[\s\S]*?<\/table>/i);

    if (!tabela) {
      throw new Error('Tabela de artilharia não encontrada na fonte.');
    }

    const linhas = [
      ...tabela[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)
    ];

    const artilheiros = [];

    for (const linha of linhas) {
      const colunas = [
        ...linha[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)
      ].map(coluna => limparTexto(coluna[1]));

      if (colunas.length < 4) continue;

      const nome = colunas[1];
      const clube = colunas[2];
      const gols = Number(colunas[3]);

      if (
        !nome ||
        !clube ||
        !Number.isFinite(gols) ||
        gols <= 0
      ) {
        continue;
      }

      artilheiros.push({
        nome,
        clube,
        foto: '',
        escudo: '',
        gols
      });
    }

    if (!artilheiros.length) {
      throw new Error('A fonte não retornou jogadores reconhecíveis.');
    }

    artilheiros.sort((a, b) => b.gols - a.gols);

    return res.status(200).json({
      sucesso: true,
      competicao: 'Champions League',
      fonte: 'PLACAR',
      total: artilheiros.length,
      artilheiros,
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na artilharia Champions:', erro);

    return res.status(502).json({
      sucesso: false,
      competicao: 'Champions League',
      fonte: 'PLACAR',
      artilheiros: [],
      erro: erro.message
    });
  }
}
