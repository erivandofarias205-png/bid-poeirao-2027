module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido. Utilize GET.'
    });
  }

  const competicao = String(req.query.competicao || '').toLowerCase();
  const rodada = String(req.query.rodada || '1');

  const competicoesPermitidas = [
    'brasileirao-a',
    'brasileirao-b',
    'brasileirao-c',
    'brasileirao-d',
    'champions',
    'europa'
  ];

  if (!competicoesPermitidas.includes(competicao)) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Competição não reconhecida.',
      competicoes_disponiveis: competicoesPermitidas
    });
  }

  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

  async function consultarAPI(caminho) {
    const resposta = await fetch(`${host}${caminho}`);

    const texto = await resposta.text();

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      throw new Error(`A API ${caminho} retornou uma resposta inválida.`);
    }

    if (!resposta.ok) {
      throw new Error(
        dados.erro || `Falha ao consultar ${caminho}.`
      );
    }

    if (dados.sucesso === false) {
      throw new Error(dados.erro || `Falha ao consultar ${caminho}.`);
    }

    return dados;
  }

  try {
    let resultado;

    // BRASILEIRÃO SÉRIE A
    if (competicao === 'brasileirao-a') {
      const [classificacao, jogos] = await Promise.all([
        consultarAPI('/api/serie-a'),
        consultarAPI(
          `/api/ge-serie-a-jogos?rodada=${encodeURIComponent(rodada)}`
        )
      ]);

      resultado = {
        sucesso: true,
        fonte: 'GE Globo',
        competicao: 'Brasileirão Série A',
        serie: 'a',
        rodada: Number(rodada),
        classificacao: classificacao,
        jogos: jogos
      };
    }

    // BRASILEIRÃO SÉRIE B, C E D
    else if (
      ['brasileirao-b', 'brasileirao-c', 'brasileirao-d'].includes(competicao)
    ) {
      const serie = competicao.slice(-1);

      const dados = await consultarAPI(
        `/api/brasileirao?serie=${serie}`
      );

      resultado = {
        sucesso: true,
        fonte: 'Campeonato Brasileiro API',
        competicao: `Brasileirão Série ${serie.toUpperCase()}`,
        serie: serie,
        rodada: Number(rodada),
        dados: dados.dados
      };
    }

    // CHAMPIONS LEAGUE E EUROPA LEAGUE
    else if (competicao === 'champions' || competicao === 'europa') {
      const dados = await consultarAPI(
        `/api/ge-europa?competicao=${competicao}&rodada=${encodeURIComponent(rodada)}`
      );

      const informacao = dados.competicoes?.[competicao];

      if (!informacao) {
        throw new Error(
          `Não foram encontrados dados para ${competicao}.`
        );
      }

      resultado = {
        sucesso: true,
        fonte: 'GE Globo',
        competicao: competicao === 'champions'
          ? 'Champions League'
          : 'Europa League',
        rodada: Number(rodada),
        dados: informacao
      };
    }

    return res.status(200).json(resultado);

  } catch (erro) {
    console.error('Erro na API central de competições:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: 'Não foi possível consultar a competição.',
      detalhe: erro.message,
      competicao: competicao
    });
  }
};
