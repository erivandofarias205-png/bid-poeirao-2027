
function extrairJSON(script, variavel) {
  const marcador = new RegExp(`\\bconst\\s+${variavel}\\s*=\\s*`);
  const encontro = marcador.exec(script);

  if (!encontro) {
    throw new Error(`Dados "${variavel}" não encontrados no GE.`);
  }

  const inicio = encontro.index + encontro[0].length;
  const primeiro = script[inicio];

  if (primeiro !== '[' && primeiro !== '{') {
    throw new Error(`Formato inválido para "${variavel}".`);
  }

  const abertura = primeiro;
  const fechamento = abertura === '[' ? ']' : '}';

  let nivel = 0;
  let dentroString = false;
  let escape = false;

  for (let i = inicio; i < script.length; i++) {
    const caractere = script[i];

    if (dentroString) {
      if (escape) {
        escape = false;
      } else if (caractere === '\\') {
        escape = true;
      } else if (caractere === '"') {
        dentroString = false;
      }
      continue;
    }

    if (caractere === '"') {
      dentroString = true;
      continue;
    }

    if (caractere === abertura || caractere === '{' || caractere === '[') {
      nivel++;
    }

    if (
      caractere === fechamento ||
      (abertura === '[' && caractere === '}') ||
      (abertura === '{' && caractere === ']')
    ) {
      nivel--;
    }

    if (nivel === 0) {
      return JSON.parse(script.slice(inicio, i + 1));
    }
  }

  throw new Error(`JSON incompleto em "${variavel}".`);
}

function mapearJogos(listaJogos) {
  return listaJogos.map(jogo => {
    const mandante = jogo.equipes?.mandante || {};
    const visitante = jogo.equipes?.visitante || {};

    const golsMandante = jogo.placar_oficial_mandante;
    const golsVisitante = jogo.placar_oficial_visitante;

    const temPlacar =
      golsMandante !== null &&
      golsMandante !== undefined &&
      golsVisitante !== null &&
      golsVisitante !== undefined;

    return {
      id: jogo.id,
      data: jogo.data_realizacao || '',
      hora: jogo.hora_realizacao || '',
      estadio: jogo.sede?.nome_popular || '',

      status: temPlacar
        ? 'ENCERRADA'
        : jogo.jogo_ja_comecou
          ? 'EM_ANDAMENTO'
          : 'AGENDADA',

      mandante: {
        id: mandante.id || null,
        nome: mandante.nome_popular || '',
        sigla: mandante.sigla || '',
        escudo: mandante.escudo || ''
      },

      visitante: {
        id: visitante.id || null,
        nome: visitante.nome_popular || '',
        sigla: visitante.sigla || '',
        escudo: visitante.escudo || ''
      },

      placar: temPlacar
        ? {
            mandante: golsMandante,
            visitante: golsVisitante
          }
        : null,

      penalidades: {
        mandante: jogo.placar_penaltis_mandante,
        visitante: jogo.placar_penaltis_visitante
      },

      transmissao: jogo.transmissao || null
    };
  });
}

async function consultarGE(config, rodadaSolicitada) {
  // Busca a página do GE para obter classificação e informações da competição.
  const resposta = await fetch(config.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  if (!resposta.ok) {
    throw new Error(`GE respondeu com HTTP ${resposta.status}.`);
  }

  const html = await resposta.text();

  const scriptReact = [
    ...html.matchAll(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
    )
  ].find(item =>
    /\bid=["']scriptReact["']/.test(item[1])
  );

  if (!scriptReact) {
    throw new Error('Script de dados do GE não encontrado.');
  }

  const script = scriptReact[2];

  const classificacao = extrairJSON(script, 'classificacao');

  const faseEncontrada = script.match(
    /const\s+fase\s*=\s*(\{[\s\S]*?\});/
  );

  let fase = null;

  if (faseEncontrada) {
    try {
      fase = JSON.parse(faseEncontrada[1]);
    } catch {}
  }

  const edicaoEncontrada = script.match(
    /"edicao"\s*:\s*(\{[\s\S]*?\})\s*,\s*"faixas_classificacao"/
  );

  let edicao = null;

  if (edicaoEncontrada) {
    try {
      edicao = JSON.parse(edicaoEncontrada[1]);
    } catch {}
  }

  // Identifica a rodada atual e a quantidade de rodadas da primeira fase.
  const rodadaAtual = Number(classificacao.rodada?.atual || 1);
  const ultimaRodada = Number(classificacao.rodada?.ultima || 8);

  const rodada = rodadaSolicitada || rodadaAtual;

  if (rodada < 1 || rodada > ultimaRodada) {
    throw new Error(
      `Rodada inválida para ${config.nome}. Disponíveis: 1 a ${ultimaRodada}.`
    );
  }

  // Busca os jogos diretamente na API oficial do GE.
  const urlJogos =
    `https://api.globoesporte.globo.com/tabela/` +
    `${config.tabelaId}/fase/${config.faseSlug}/rodada/${rodada}/jogos/`;

  console.log('URL DE JOGOS GE:', urlJogos);
  
  const respostaJogos = await fetch(urlJogos, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
    'Referer': config.url,
    'Origin': 'https://ge.globo.com'
  }
});

const textoResposta = await respostaJogos.text();

console.log('STATUS GE:', respostaJogos.status);
console.log('RESPOSTA GE:', textoResposta.slice(0, 1000));

if (!respostaJogos.ok) {
  throw new Error(
    `API GE HTTP ${respostaJogos.status}: ${textoResposta.slice(0, 300)}`
  );
}

const listaJogos = JSON.parse(textoResposta);
  if (!Array.isArray(listaJogos)) {
    throw new Error('O GE não retornou uma lista válida de jogos.');
  }

  const jogos = mapearJogos(listaJogos);

  // Mantém a classificação original do GE.
  const tabela = (classificacao.classificacao || []).map(item => ({
    posicao: item.ordem,
    equipe: item.nome_popular,
    sigla: item.sigla,
    escudo: item.escudo,
    pontos: item.pontos,
    jogos: item.jogos,
    vitorias: item.vitorias,
    empates: item.empates,
    derrotas: item.derrotas,
    gols_pro: item.gols_pro,
    gols_contra: item.gols_contra,
    saldo_gols: item.saldo_gols,
    aproveitamento: item.aproveitamento,
    ultimos_jogos: item.ultimos_jogos,
    faixa_classificacao: item.faixa_classificacao?.cor || null
  }));

  return {
    competicao: config.nome,
    temporada: edicao?.nome || '',
    fase: fase?.slug || config.faseSlug,
    regulamento: edicao?.regulamento || '',

    rodada: {
      atual: rodadaAtual,
      selecionada: rodada,
      ultima: ultimaRodada
    },

    jogos,
    total_jogos: jogos.length,
    classificacao: tabela,
    total_equipes: tabela.length,
    atualizado_em: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );

  const competicoes = {
    champions: {
      nome: 'UEFA Champions League',

      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/',

      tabelaId: '18a2ea40-9c94-4098-a183-ca69f79c5548',

      faseSlug: 'primeira-fase-liga-dos-campeoes-2026-2027'
    },

    europa: {
      nome: 'UEFA Europa League',

      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-europa/',

      tabelaId: '39ef948e-c896-45bf-b844-06cc70872b52',

      faseSlug: 'primeira-fase-liga-europa-2026-27'
    }
  };

  try {
    const solicitada = String(
      req.query.competicao || 'todas'
    ).toLowerCase();

    const selecionadas = solicitada === 'todas'
      ? Object.entries(competicoes)
      : competicoes[solicitada]
        ? [[solicitada, competicoes[solicitada]]]
        : null;

    if (!selecionadas) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Competição inválida. Use champions, europa ou todas.'
      });
    }

    let rodadaSolicitada = null;

    if (req.query.rodada !== undefined) {
      rodadaSolicitada = Number(req.query.rodada);

      if (
        !Number.isInteger(rodadaSolicitada) ||
        rodadaSolicitada < 1 ||
        rodadaSolicitada > 8
      ) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Rodada inválida. Informe um número de 1 a 8.'
        });
      }
    }

    const resultados = {};

    for (const [chave, config] of selecionadas) {
      resultados[chave] = await consultarGE(
        config,
        rodadaSolicitada
      );
    }

    return res.status(200).json({
      sucesso: true,
      fonte: 'GE Globo',
      competicoes: resultados,
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na integração GE:', erro);

    return res.status(500).json({
      sucesso: false,
      fonte: 'GE Globo',
      erro: 'Não foi possível extrair os dados das competições.',
      detalhe: erro.message
    });
  }
}
