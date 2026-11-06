
export default async function handler(req, res) {
  try {
    const url = 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026/2098?documento=IMT';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      }
    });

    const html = await resposta.text();

    const grupos = ['GRUPO B', 'GRUPO C'];

    const trechos = {};

    for (const grupo of grupos) {
      const posicao = html.indexOf(grupo);

      trechos[grupo] = posicao >= 0
        ? html.slice(posicao, posicao + 12000)
        : 'Grupo não encontrado';
    }

    return res.status(200).json({
      sucesso: resposta.ok,
      status: resposta.status,
      fonte: 'CBF',
      trechos
    });

  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
}
