
export default async function handler(req, res) {
  try {
    const resposta = await fetch(
      'https://ge.globo.com/futebol/brasileirao-serie-a/',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!resposta.ok) {
      throw new Error(`Erro do ge: ${resposta.status}`);
    }

    const html = await resposta.text();

    const bloco = html.match(
      /<section class="artilharia-wrapper">([\s\S]*?)<\/section>/
    );

    if (!bloco) {
      throw new Error('Artilharia não encontrada na página do ge.');
    }

   const itens = bloco[1]
  .split('class="ranking-item-wrapper"')
  .slice(1);

    const limpar = texto =>
      texto
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .trim();

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
      throw new Error('Não foi possível extrair os jogadores.');
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res.status(200).json({
      sucesso: true,
      fonte: 'ge.globo.com',
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
