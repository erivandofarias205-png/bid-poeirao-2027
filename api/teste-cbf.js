export default async function handler(req, res) {
  try {
    const url = 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026?documento=IMT';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      }
    });

    const html = await resposta.text();

    return res.status(200).json({
      sucesso: resposta.ok,
      status: resposta.status,
      tamanho: html.length,
      fonte: 'CBF',
      html
    });

  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
}
