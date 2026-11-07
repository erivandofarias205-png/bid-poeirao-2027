
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
      'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!resposta.ok) {
      throw new Error(`GE respondeu com status ${resposta.status}`);
    }

    const html = await resposta.text();

    const scripts = [
      ...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
    ].map(match => match[1]);

    const objetos = [];

    function percorrer(valor, profundidade = 0) {
      if (!valor || profundidade > 12) return;

      if (Array.isArray(valor)) {
        if (valor.length) objetos.push(valor);
        valor.forEach(item => percorrer(item, profundidade + 1));
        return;
      }

      if (typeof valor === 'object') {
        Object.values(valor).forEach(item =>
          percorrer(item, profundidade + 1)
        );
      }
    }

    for (const script of scripts) {
      const conteudo = script.trim();

      if (!conteudo.startsWith('{') && !conteudo.startsWith('[')) {
        continue;
      }

      try {
        percorrer(JSON.parse(conteudo));
      } catch (_) {
        // Ignora scripts que não são JSON puro.
      }
    }

    function encontrarCampo(obj, nomes) {
      if (!obj || typeof obj !== 'object') return undefined;

      for (const nome of nomes) {
        if (obj[nome] !== undefined && obj[nome] !== null) {
          return obj[nome];
        }
      }

      return undefined;
    }

    function normalizar(lista) {
      return lista.map(item => {
        const jogador = encontrarCampo(item, [
          'jogador', 'atleta', 'player'
        ]);

        const clube = encontrarCampo(item, [
          'clube', 'time', 'equipe', 'team'
        ]);

        const nome = typeof jogador === 'object'
          ? encontrarCampo(jogador, ['nome', 'name', 'nomeCompleto'])
          : jogador || encontrarCampo(item, [
              'nome', 'name', 'nomeJogador'
            ]);

        const nomeClube = typeof clube === 'object'
          ? encontrarCampo(clube, ['nome', 'name', 'nomePopular'])
          : clube;

        const gols = encontrarCampo(item, [
          'gols', 'totalGols', 'goals', 'gol'
        ]);

        const foto = encontrarCampo(item, [
          'foto', 'imagem', 'image', 'urlFoto'
        ]) || (typeof jogador === 'object'
          ? encontrarCampo(jogador, ['foto', 'imagem', 'urlFoto'])
          : '');

        const escudo = encontrarCampo(item, [
          'escudo', 'logo', 'urlEscudo'
        ]) || (typeof clube === 'object'
          ? encontrarCampo(clube, ['escudo', 'logo', 'urlEscudo'])
          : '');

        return {
          nome: nome || '',
          clube: nomeClube || '',
          foto: foto || '',
          escudo: escudo || '',
          gols: Number(gols || 0)
        };
      }).filter(item =>
        item.nome &&
        Number.isFinite(item.gols) &&
        item.gols > 0
      ).sort((a, b) => b.gols - a.gols);
    }

    const candidatas = objetos
      .map(lista => normalizar(lista))
      .filter(lista => lista.length >= 2);

    if (!candidatas.length) {
      return res.status(200).json({
        sucesso: false,
        competicao: 'Champions League',
        artilheiros: [],
        erro: 'A página do GE não disponibilizou uma lista de artilheiros reconhecível.',
        atualizado_em: new Date().toISOString()
      });
    }

    candidatas.sort((a, b) => b.length - a.length);

    return res.status(200).json({
      sucesso: true,
      competicao: 'Champions League',
      fonte: 'GE Globo',
      total: candidatas[0].length,
      artilheiros: candidatas[0],
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na artilharia Champions:', erro);

    return res.status(502).json({
      sucesso: false,
      competicao: 'Champions League',
      artilheiros: [],
      erro: erro.message
    });
  }
}

