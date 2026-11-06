
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

    if (caractere === fechamento ||
        (abertura === '[' && caractere === '}') ||
        (abertura === '{' && caractere === ']')) {
      nivel--;
    }

    if (nivel === 0) {
      return JSON.parse(script.slice(inicio, i + 1));
    }
  }

  throw new Error(`JSON incompleto em "${variavel}".`);
}

async function consultarGE(config) {
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

  const listaJogos = extrairJSON(script, 'listaJogos');
  const classificacao = extrairJSON(script, 'classificacao');
console.log('DIAGNOSTICO GE:', JSON.stringify({
  rodada: classificacao.rodada,
  fases: classificacao.fases_navegacao,
  listaJogosUnica: classificacao.lista_jogos_unica,
  listaTipoUnica: classificacao.lista_tipo_unica
}));
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

  const jogos = listaJogos.map(jogo => {
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
    fase: fase?.slug || '',
    regulamento: edicao?.regulamento || '',
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
      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/'
    },

    europa: {
      nome: 'UEFA Europa League',
      url: 'https://ge.globo.com/futebol/futebol-internacional/liga-europa/'
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

    const resultados = {};

    for (const [chave, config] of selecionadas) {
      resultados[chave] = await consultarGE(config);
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
