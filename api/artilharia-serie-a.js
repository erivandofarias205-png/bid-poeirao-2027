
export default async function handler(req, res) {
  try {
    const resposta = await fetch(
      'https://ge.globo.com/futebol/brasileirao-serie-a/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!resposta.ok) {
      throw new Error(`O ge respondeu com erro: ${resposta.status}`);
    }

    const html = await resposta.text();

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res.status(200).json({
      sucesso: true,
      fonte: 'ge.globo.com',
      html
    });

  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
}

