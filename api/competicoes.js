
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido. Utilize GET.'
    });
  }

  const competicao = String(req.query.competicao || 'todas').toLowerCase();
  const rodada = req.query.rodada
  ? String(req.query.rodada)
  : '';
const fase = String(req.query.fase || 'final').toLowerCase();
  const ligaNacoes = String(req.query.liga || 'A')
  .trim()
  .toUpperCase();

if (!['A', 'B', 'C', 'D'].includes(ligaNacoes)) {
  return res.status(400).json({
    sucesso: false,
    erro: 'Liga inválida. Informe A, B, C ou D.'
  });
}
  
  const permitidas = [
  'brasileirao-a',
  'brasileirao-b',
  'brasileirao-c',
  'brasileirao-d',
  'champions',
  'europa',
    'conference',
  'copa-do-brasil',
  'liga-das-nacoes',
  'amistosos',
  'libertadores',
  'sul-americana',
  'premier-league',
  'la-liga',
  'serie-a-italia',
  'bundesliga',
  'ligue-1'
];

  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

  async function consultarAPI(caminho) {
    const resposta = await fetch(`${host}${caminho}`);
    const texto = await resposta.text();

    let dados;

    try {
      dados = JSON.parse(texto);
    } catch {
      throw new Error(`Resposta inválida: ${caminho}`);
    }

    if (!resposta.ok || dados.sucesso === false) {
      throw new Error(dados.erro || `Falha em ${caminho}`);
    }

    return dados;
  }

 async function consultarArtilharia(chave) {
    
     const competicoes = {
       'serie-a': {
  nome: 'Brasileirão Série A',
  url: 'https://ge.globo.com/futebol/brasileirao-serie-a/'
},
      'serie-b': {
        nome: 'Brasileirão Série B',
        url: 'https://ge.globo.com/futebol/brasileirao-serie-b/'
      },
      'serie-c': {
        nome: 'Brasileirão Série C',
        url: 'https://ge.globo.com/futebol/brasileirao-serie-c/'
      },
      'serie-d': {
        nome: 'Brasileirão Série D',
        url: 'https://ge.globo.com/futebol/brasileirao-serie-d/'
      },
      'copa-do-brasil': {
        nome: 'Copa do Brasil',
        url: 'https://ge.globo.com/futebol/copa-do-brasil/'
      },
      'libertadores': {
        nome: 'Libertadores',
        url: 'https://ge.globo.com/futebol/libertadores/'
      },
      'sul-americana': {
        nome: 'Sul-Americana',
        url: 'https://ge.globo.com/futebol/copa-sul-americana/'
      },
      'champions': {
        nome: 'Champions League',
        url: 'https://ge.globo.com/futebol/futebol-internacional/liga-dos-campeoes/'
      },
      'europa': {
  nome: 'Europa League',
  url: 'https://ge.globo.com/futebol/futebol-internacional/liga-europa/'
},
'premier-league': {
  nome: 'Premier League',
  url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-ingles/'
},
'la-liga': {
  nome: 'La Liga',
  url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-espanhol/'
},
'serie-a-italia': {
  nome: 'Campeonato Italiano',
  url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-italiano/'
},
'bundesliga': {
  nome: 'Bundesliga',
  url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-alemao/'
},
'ligue-1': {
  nome: 'Campeonato Francês',
  url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-frances/'
}
    };

    if (chave === 'champions') {
      const url = new URL(
        'https://compstats.uefa.com/v2/player-ranking'
      );

      url.searchParams.set('competitionId', '1');
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');
      url.searchParams.set('optionalFields', 'PLAYER,TEAM');
      url.searchParams.set('order', 'DESC');
      url.searchParams.set('phase', 'TOURNAMENT');
      url.searchParams.set('seasonYear', '2027');
      url.searchParams.set(
        'stats',
        'goals,goals_scored_with_right,goals_scored_with_left,goals_scored_head,goals_scored_other,goals_scored_inside_penalty_area,goals_scored_outside_penalty_area,penalty_scored,matches_appearance'
      );

      const resposta = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      if (!resposta.ok) {
        throw new Error(`UEFA respondeu com status ${resposta.status}`);
      }

      const dados = await resposta.json();

      const artilheiros = (Array.isArray(dados) ? dados : [])
        .map(item => {
          const estatistica = nome =>
            Number(
              item.statistics?.find(s => s.name === nome)?.value || 0
            );

          return {
            nome: item.player?.internationalName || '',
            clube: item.team?.translations?.displayName?.PT ||
              item.team?.internationalName || '',
            gols: estatistica('goals'),
            foto: item.player?.imageUrl || '',
            escudo: item.team?.logoUrl || '',
            posicao: '',
            participacoes: estatistica('matches_appearance'),
            gols_penalti: estatistica('penalty_scored')
          };
        })
        .filter(jogador => jogador.nome)
        .sort((a, b) => b.gols - a.gols);

      return {
        chave,
        competicao: 'Champions League',
        temporada: '2026/2027',
        fonte: 'UEFA',
        total: artilheiros.length,
        artilheiros,
        atualizado_em: new Date().toISOString()
      };
    }

    if (chave === 'europa') {
      const url = new URL(
        'https://compstats.uefa.com/v2/player-ranking'
      );

      url.searchParams.set('competitionId', '14');
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');
      url.searchParams.set('optionalFields', 'PLAYER,TEAM');
      url.searchParams.set('order', 'DESC');
      url.searchParams.set('phase', 'TOURNAMENT');
      url.searchParams.set('seasonYear', '2027');
      url.searchParams.set(
        'stats',
        'goals,goals_scored_with_right,goals_scored_with_left,goals_scored_head,goals_scored_other,goals_scored_inside_penalty_area,goals_scored_outside_penalty_area,penalty_scored,matches_appearance'
      );

      const resposta = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      if (!resposta.ok) {
        throw new Error(`UEFA respondeu com status ${resposta.status}`);
      }

      const dados = await resposta.json();

      const artilheiros = (Array.isArray(dados) ? dados : [])
        .map(item => {
          const estatistica = nome =>
            Number(
              item.statistics?.find(s => s.name === nome)?.value || 0
            );

          return {
            nome: item.player?.internationalName || '',
            clube: item.team?.translations?.displayName?.PT ||
              item.team?.internationalName || '',
            gols: estatistica('goals'),
            foto: item.player?.imageUrl || '',
            escudo: item.team?.logoUrl || '',
            posicao: '',
            participacoes: estatistica('matches_appearance'),
            gols_penalti: estatistica('penalty_scored')
          };
        })
        .filter(jogador => jogador.nome)
        .sort((a, b) => b.gols - a.gols);

      return {
        chave,
        competicao: 'Europa League',
        temporada: '2026/2027',
        fonte: 'UEFA',
        total: artilheiros.length,
        artilheiros,
        atualizado_em: new Date().toISOString()
      };
    }

if (chave === 'conference') {
  const url = new URL(
    'https://compstats.uefa.com/v2/player-ranking'
  );

  url.searchParams.set('competitionId', '2019');
  url.searchParams.set('limit', '100');
  url.searchParams.set('offset', '0');
  url.searchParams.set('optionalFields', 'PLAYER,TEAM');
  url.searchParams.set('order', 'DESC');
  url.searchParams.set('phase', 'TOURNAMENT');
  url.searchParams.set('seasonYear', '2027');
  url.searchParams.set(
    'stats',
    'goals,penalty_scored,matches_appearance'
  );

  const resposta = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });

  if (!resposta.ok) {
    throw new Error(
      `UEFA Conference respondeu com status ${resposta.status}`
    );
  }

  const dados = await resposta.json();

  const artilheiros = (Array.isArray(dados) ? dados : [])
    .map((item, indice) => {
      const estatistica = nome =>
        Number(
          item.statistics?.find(s => s.name === nome)?.value || 0
        );

      return {
        nome: item.player?.internationalName || '',
        clube: item.team?.translations?.displayName?.PT ||
          item.team?.internationalName || '',
        gols: estatistica('goals'),
        foto: item.player?.imageUrl || '',
        escudo: item.team?.logoUrl || '',
        posicao: String(indice + 1),
        participacoes: estatistica('matches_appearance'),
        gols_penalti: estatistica('penalty_scored')
      };
    })
    .filter(jogador => jogador.nome)
    .sort((a, b) => b.gols - a.gols);

  return {
    chave,
    competicao: 'Conference League',
    temporada: '2026/2027',
    fonte: 'UEFA',
    total: artilheiros.length,
    artilheiros,
    atualizado_em: new Date().toISOString()
  };
}
    if (chave === 'serie-c' || chave === 'serie-d') {
      const apiKey = process.env.API_FOOTBALL_KEY;

      if (!apiKey) {
        throw new Error('Variável API_FOOTBALL_KEY não encontrada na Vercel.');
      }

      const temporada = new Date().getFullYear();
      const serie = chave === 'serie-c' ? 'C' : 'D';

      const consultarFootball = async (endpoint) => {
        const resposta = await fetch(
          `https://v3.football.api-sports.io/${endpoint}`,
          {
            headers: {
              'x-apisports-key': apiKey
            }
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok || (dados.errors &&
            Object.keys(dados.errors).length > 0)) {
          throw new Error(
            JSON.stringify(dados.errors || `HTTP ${resposta.status}`)
          );
        }

        return dados.response || [];
      };

      const ligas = await consultarFootball(
        `leagues?country=Brazil&season=${temporada}`
      );

      const ligaEncontrada = ligas.find(item =>
        new RegExp(`serie\\s*${serie}\\b`, 'i').test(
          item.league?.name || ''
        )
      );

      if (!ligaEncontrada) {
        throw new Error(
          `Série ${serie} não encontrada na API-Football para ${temporada}.`
        );
      }

      const cobertura = ligaEncontrada.seasons?.find(
        item => Number(item.year) === temporada
      )?.coverage || ligaEncontrada.coverage;

      if (!cobertura?.top_scorers) {
        throw new Error(
          `A API-Football não confirmou cobertura de artilharia para Série ${serie} em ${temporada}.`
        );
      }

      const ligaId = ligaEncontrada.league.id;

      const dadosArtilharia = await consultarFootball(
        `players/topscorers?league=${ligaId}&season=${temporada}`
      );

      const artilheiros = dadosArtilharia.map((item, indice) => {
        const estatistica = item.statistics?.[0] || {};
        const jogador = item.player || {};
        const clube = estatistica.team || {};

        return {
          nome: jogador.name || '',
          gols: Number(estatistica.goals?.total || 0),
          clube: clube.name || '',
          posicao: String(indice + 1),
          foto: jogador.photo ||
            (jogador.id
              ? `https://media.api-sports.io/football/players/${jogador.id}.png`
              : ''),
          escudo: clube.logo || '',
          participacoes: Number(estatistica.games?.appearences || 0),
          gols_penalti: Number(estatistica.penalty?.scored || 0)
        };
      }).filter(jogador => jogador.nome);

      return {
        chave,
        competicao: `Brasileirão Série ${serie}`,
        temporada: String(temporada),
        fonte: 'API-Football',
        total: artilheiros.length,
        artilheiros,
        atualizado_em: new Date().toISOString()
      };
    }

if (chave === 'premier-league') {
  const url = new URL(
    'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v3/competitions/8/seasons/2026/players/stats/leaderboard'
  );

  url.searchParams.set('_sort', 'goals:desc');
  url.searchParams.set('_limit', '100');

  const resposta = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });

  if (!resposta.ok) {
    throw new Error(
      `Premier League respondeu com HTTP ${resposta.status}`
    );
  }

  const dados = await resposta.json();

  const artilheiros = (dados.data || [])
    .map((item, indice) => ({
      nome: item.playerMetadata?.name || '',
      clube: item.playerMetadata?.currentTeam?.name || '',
      gols: Number(item.stats?.goals || 0),
      foto: '',
      escudo: '',
      posicao: String(indice + 1),
      participacoes: Number(item.stats?.gamesPlayed || 0),
      gols_penalti: Number(item.stats?.penaltyGoals || 0)
    }))
    .filter(jogador => jogador.nome)
    .sort((a, b) => b.gols - a.gols);

  return {
    chave,
    competicao: 'Premier League',
    temporada: '2026/2027',
    fonte: 'Premier League',
    total: artilheiros.length,
    artilheiros,
    atualizado_em: new Date().toISOString()
  };
}

    const config = competicoes[chave];

    if (!config) {
      throw new Error(`Artilharia não cadastrada: ${chave}`);
    }

    const resposta = await fetch(config.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!resposta.ok) {
      throw new Error(`GE respondeu com HTTP ${resposta.status}.`);
    }

    const html = await resposta.text();

console.log('[DEBUG HTML ARTILHARIA REAL]', {
  sectionArtilharia: (
    html.match(/<section[^>]*artilharia-wrapper/gi) || []
  ).length,

  rankingItem: (
    html.match(/ranking-item-wrapper/gi) || []
  ).length,

  jogadorNome: (
    html.match(/jogador-nome/gi) || []
  ).length,

  rankingHeader: (
    html.match(/ranking-header/gi) || []
  ).length,

  ocorrenciasArtilharia: (
    html.match(/artilharia/gi) || []
  ).length
});

   console.log('[DEBUG ARTILHARIA GE]', {
  competicao: config.nome,
  tamanhoHTML: html.length,
  wrapper: html.includes('artilharia-wrapper'),
  ranking: html.includes('ranking-item-wrapper'),
  scriptReact: /id=["']scriptReact["']/.test(html),
  termoArtilharia: /artilharia|artilheiro|top.?scorer/i.test(html)
});
  const indiceWrapper = html.indexOf('artilharia-wrapper');

const trechoWrapper = indiceWrapper >= 0
  ? html.slice(indiceWrapper, indiceWrapper + 5000)
  : '';

const classesGE = [
  ...new Set(
    [...trechoWrapper.matchAll(/class=["']([^"']+)["']/g)]
      .flatMap(item => item[1].split(/\s+/))
  )
];

const scriptArt = [
  ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)
].find(item => /\bid=["']scriptReact["']/.test(item[1]));

console.log('[DEBUG ESTRUTURA ARTILHARIA]', {
  classesEncontradas: classesGE,
  variaveisScript: scriptArt
    ? [...scriptArt[2].matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)]
        .map(item => item[1])
    : [],
  trecho: trechoWrapper.slice(0, 1500)
}); 
   const ocorrenciasWrapper = [
  ...html.matchAll(/artilharia-wrapper/gi)
].map(item => ({
  indice: item.index,
  trecho: html.slice(
    Math.max(0, item.index - 200),
    Math.min(html.length, item.index + 800)
  )
}));


console.log('[DEBUG OCORRENCIAS ARTILHARIA]', {
  total: ocorrenciasWrapper.length,
  ocorrencias: ocorrenciasWrapper.slice(0, 15)
});

const termosScript = [
  'artilharia',
  'artilheiro',
  'artilheiros',
  'goleadores',
  'ranking',
  'gols'
];

const diagnosticoScript = {};

for (const termo of termosScript) {
  const regex = new RegExp(termo, 'gi');

  diagnosticoScript[termo] = [
    ...scriptArt[2].matchAll(regex)
  ].slice(0, 5).map(item => ({
    indice: item.index,
    trecho: scriptArt[2].slice(
      Math.max(0, item.index - 150),
      item.index + 350
    )
  }));
}

console.log('[DEBUG SCRIPT ARTILHARIA]', diagnosticoScript);

 
   const bloco = html.match(
      /<section class="artilharia-wrapper">([\s\S]*?)<\/section>/
    );

    if (!bloco) {
      throw new Error(`Artilharia não encontrada: ${config.nome}`);
    }

    const limpar = texto => texto
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const itens = bloco[1]
      .split('class="ranking-item-wrapper"')
      .slice(1);

    const artilheiros = [];

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

      const blocoFoto = item.match(
  /class="jogador-foto"[\s\S]*?<img\b[^>]*>/i
)?.[0] || '';

const foto = Array.from(
  blocoFoto.matchAll(/\b(?:src|data-src|data-original|data-lazy-src)=["']([^"']*)["']/gi)
).map(match => match[1]).find(Boolean) || '';

      const posicao = item.match(
        /class="jogador-posicao">([\s\S]*?)<\/div>/
      )?.[1];

     const blocoEscudo = item.match(
  /class="jogador-escudo"[\s\S]*?<img\b[^>]*>/i
)?.[0] || '';

const escudo = Array.from(
  blocoEscudo.matchAll(/\b(?:src|data-src|data-original|data-lazy-src)=["']([^"']*)["']/gi)
).map(match => match[1]).find(Boolean) || '';

      if (nome && clube && gols) {
        artilheiros.push({
          nome: limpar(nome),
          clube: limpar(clube),
          gols: Number(gols),
          foto: foto || '',
          escudo: escudo || '',
          posicao: limpar(posicao || '')
        });
      }
    }

    return {
      chave,
      competicao: config.nome,
      fonte: 'GE Globo',
      total: artilheiros.length,
      artilheiros,
      atualizado_em: new Date().toISOString()
    };
  }
  const paginasConmebol = {
  'libertadores': {
    nome: 'CONMEBOL Libertadores',
    url: 'https://ge.globo.com/futebol/libertadores/'
  },
  'sul-americana': {
    nome: 'Copa Sul-Americana',
    url: 'https://ge.globo.com/futebol/copa-sul-americana/'
  }
};
  async function consultarCompeticao(chave, faseCopa = 8) {
    let fonte = '';
    let nome = '';
    let classificacao = [];
    let jogos = [];
    let grupos = {};
    let dadosOriginais = {};
   let rodadaFinal = Number(rodada) || null;
   

    if (chave === 'brasileirao-a') {
      const caminhoJogos = rodada
  ? `/api/ge-serie-a-jogos?rodada=${encodeURIComponent(rodada)}`
  : '/api/ge-serie-a-jogos';

const [tabela, retornoJogos] = await Promise.all([
  consultarAPI('/api/serie-a'),
  consultarAPI(caminhoJogos)
]);
      
 rodadaFinal = Number(retornoJogos.rodada || rodada) || null;
      
      fonte = 'GE Globo';
      nome = 'Brasileirão Série A';

      classificacao = tabela.tables || [];

      jogos = (retornoJogos.jogos || []).map(jogo => {
        const temPlacar =
          jogo.mandante?.gols != null &&
          jogo.visitante?.gols != null;

        return {
          id: jogo.id,
          date: jogo.data ? jogo.data.split('T')[0] : '',
          time: jogo.hora || '',
          status: jogo.encerrado
            ? 'finished'
            : temPlacar
              ? 'live'
              : 'scheduled',
          homeTeam: {
            name: jogo.mandante?.nome || '',
            badge: jogo.mandante?.escudo || ''
          },
          awayTeam: {
            name: jogo.visitante?.nome || '',
            badge: jogo.visitante?.escudo || ''
          },
          score: temPlacar
            ? {
                home: Number(jogo.mandante.gols),
                away: Number(jogo.visitante.gols)
              }
            : null,
          venue: jogo.estadio || ''
        };
      });

      dadosOriginais = {
        classificacao: tabela,
        jogos: retornoJogos
      };
    }

    else if (chave === 'brasileirao-c') {
      const dados = await consultarAPI(
        `/api/serie-c-jogos?rodada=${encodeURIComponent(rodada)}`
      );

      fonte = 'CBF';
      nome = 'Brasileirão Série C';
      grupos = dados.grupos || {};
      jogos = Object.values(grupos).flat();
      dadosOriginais = dados;
          }
    else if (chave === 'brasileirao-b') {
     const urlRodadaB = numero =>
  `https://api.globoesporte.globo.com/tabela/009b5a68-dd09-46b8-95b3-293a2d494366/fase/brasileiro-serie-b-2026-fase-unica/rodada/${String(numero).padStart(2, '0')}/jogos/`;

const consultarRodadaB = async numero => {
  const resposta = await fetch(urlRodadaB(numero));

  if (!resposta.ok) {
    throw new Error(`GE retornou erro ${resposta.status} na rodada ${numero}.`);
  }

  const jogos = await resposta.json();

  if (!Array.isArray(jogos) || !jogos.length) {
    throw new Error(`Jogos não encontrados na rodada ${numero}.`);
  }

  return jogos;
};

const rodadaLiberadaB = partidas => {
  const encerrados = partidas.filter(
    jogo => jogo.transmissao?.broadcast?.id === 'ENCERRADA'
  );

  const pendentes = partidas.filter(
    jogo => jogo.transmissao?.broadcast?.id !== 'ENCERRADA'
  );

  if (!pendentes.length) return true;
  if (encerrados.length < 2) return false;

  const datas = encerrados
    .map(jogo => Date.parse(jogo.data_realizacao))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (datas.length < 2) return false;

  const meio = Math.floor(datas.length / 2);

  const mediana = datas.length % 2
    ? datas[meio]
    : (datas[meio - 1] + datas[meio]) / 2;

  return pendentes.every(jogo => {
    const data = Date.parse(jogo.data_realizacao);

    return Number.isFinite(data) &&
      data > mediana + (14 * 24 * 60 * 60 * 1000);
  });
};

let numeroRodada;
let listaGE;

if (rodada !== '') {
  numeroRodada = Number(rodada);

  if (!Number.isInteger(numeroRodada) || numeroRodada < 1 || numeroRodada > 38) {
    throw new Error('Rodada inválida. Escolha de 1 a 38.');
  }

  listaGE = await consultarRodadaB(numeroRodada);

} else {
  const todasRodadasB = [];

for (let i = 1; i <= 38; i++) {
  if (i > 1) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  const partidas = await consultarRodadaB(i);
  todasRodadasB.push(partidas);

  // Para quando encontrar a primeira rodada ainda não liberada
  if (!rodadaLiberadaB(partidas)) {
    break;
  }
}

  const indiceAtual = todasRodadasB.findIndex(
    partidas => !rodadaLiberadaB(partidas)
  );

  numeroRodada = indiceAtual === -1 ? 38 : indiceAtual + 1;
  listaGE = todasRodadasB[numeroRodada - 1];
}

rodadaFinal = numeroRodada;
     let dadosTabela = { tables: [] };

try {
  const respostaPagina = await fetch(
    'https://ge.globo.com/futebol/brasileirao-serie-b/'
  );

  if (!respostaPagina.ok) {
    throw new Error(`GE retornou ${respostaPagina.status}`);
  }

  const htmlPagina = await respostaPagina.text();

  const blocoTabela = htmlPagina.match(
    /const classificacao = (\{[\s\S]*?\});/
  );

  if (!blocoTabela) {
    throw new Error('Classificação não encontrada no HTML do GE.');
  }

  const tabelaGE = JSON.parse(blocoTabela[1]);

  dadosTabela = {
    tables: [{
      name: 'CLASSIFICAÇÃO',
      entries: (tabelaGE.classificacao || []).map(item => ({
        position: item.ordem,
        team: {
          name: item.nome_popular || '',
          badge: item.escudo || ''
        },
        points: item.pontos,
        matches: item.jogos,
        wins: item.vitorias,
        draws: item.empates,
        losses: item.derrotas,
        goalsFor: item.gols_pro,
        goalsAgainst: item.gols_contra,
        goalDifference: item.saldo_gols,
        efficiency: item.aproveitamento
      }))
    }]
  };

} catch (erroTabela) {
  console.error('Erro classificação GE Série B:', erroTabela.message);
}

      fonte = 'GE Globo';
      nome = 'Brasileirão Série B';
      classificacao = dadosTabela.tables || [];

      jogos = listaGE.map(jogo => {
        const mandante = jogo.equipes?.mandante || {};
        const visitante = jogo.equipes?.visitante || {};

        const temPlacar =
          jogo.placar_oficial_mandante != null &&
          jogo.placar_oficial_visitante != null;

        return {
          id: jogo.id,
          date: jogo.data_realizacao
            ? jogo.data_realizacao.split('T')[0]
            : '',
          time: jogo.hora_realizacao || '',
         status: jogo.transmissao?.broadcast?.id === 'ENCERRADA'
  ? 'finished'
  : jogo.jogo_ja_comecou
    ? 'live'
    : 'scheduled',
          homeTeam: {
            name: mandante.nome_popular || '',
            badge: mandante.escudo || ''
          },
          awayTeam: {
            name: visitante.nome_popular || '',
            badge: visitante.escudo || ''
          },
          score: temPlacar
            ? {
                home: Number(jogo.placar_oficial_mandante),
                away: Number(jogo.placar_oficial_visitante)
              }
            : null,
          venue: jogo.sede?.nome_popular || ''
        };
      });

      dadosOriginais = {
        classificacao: dadosTabela,
        jogos: listaGE
      };
    }
   else if (chave === 'brasileirao-d') {
      const serie = chave.slice(-1);
      const retorno = await consultarAPI(
  serie === 'b'
    ? `/api/brasileirao?serie=${serie}&rodada=${encodeURIComponent(rodada)}`
    : `/api/brasileirao?serie=${serie}`
);
      const dados = retorno.dados || {};

      fonte = 'Campeonato Brasileiro API';
      nome = `Brasileirão Série ${serie.toUpperCase()}`;
      classificacao = dados.tables || [];
      jogos = dados.matches || [];
      grupos = dados.grupos || {};
      dadosOriginais = dados;
    }

    else if (chave === 'champions' || chave === 'europa') {
      const caminhoEuropa = rodada
  ? `/api/ge-europa?competicao=${chave}&rodada=${encodeURIComponent(rodada)}`
  : `/api/ge-europa?competicao=${chave}`;

const retorno = await consultarAPI(caminhoEuropa);

      const dados = retorno.competicoes?.[chave];

      if (!dados) {
        throw new Error(`Dados de ${chave} não encontrados.`);
      }

      fonte = 'GE Globo';
      nome = chave === 'champions'
        ? 'Champions League'
        : 'Europa League';

      classificacao = dados.classificacao || [];
      jogos = dados.jogos || [];
      rodadaFinal = Number(
  dados.rodada?.selecionada ||
  dados.rodada?.atual ||
  rodada
) || null;
      dadosOriginais = dados;
    }
    else if ([
  'premier-league',
  'la-liga',
  'serie-a-italia',
  'bundesliga',
  'ligue-1'
].includes(chave)) {

  const ligasGE = {
    'premier-league': {
      nome: 'Premier League',
      url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-ingles/'
    },
    'la-liga': {
      nome: 'La Liga',
      url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-espanhol/'
    },
    'serie-a-italia': {
      nome: 'Campeonato Italiano',
      url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-italiano/'
    },
    'bundesliga': {
      nome: 'Bundesliga',
      url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-alemao/'
    },
    'ligue-1': {
      nome: 'Campeonato Francês',
      url: 'https://ge.globo.com/futebol/futebol-internacional/futebol-frances/'
    }
  };

  const config = ligasGE[chave];

  const respostaGE = await fetch(config.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  if (!respostaGE.ok) {
    throw new Error(`GE respondeu HTTP ${respostaGE.status}.`);
  }

  const html = await respostaGE.text();

  const scriptReact = [
    ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)
  ].find(item => /\bid=["']scriptReact["']/.test(item[1]));

  if (!scriptReact) {
    throw new Error(`Dados do GE não encontrados: ${config.nome}.`);
  }

  const script = scriptReact[2];
      console.log('DEBUG LIGAS INTERNACIONAIS:', {
  variaveis: [
    ...script.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)
  ].map(item => item[1]),

  resourceId:
    script.match(/tUUID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1] || null
});

  const marcador = /\bconst\s+classificacao\s*=\s*/;
  const encontro = marcador.exec(script);

  if (!encontro) {
    throw new Error(`Classificação não encontrada: ${config.nome}.`);
  }

  const inicio = encontro.index + encontro[0].length;
  const abertura = script[inicio];
  const fechamento = abertura === '[' ? ']' : '}';

  let nivel = 0;
  let dentroString = false;
  let escape = false;
  let json = '';

  for (let i = inicio; i < script.length; i++) {
    const c = script[i];

    if (dentroString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') dentroString = false;
      continue;
    }

    if (c === '"') {
      dentroString = true;
      continue;
    }

    if (c === abertura || c === '{' || c === '[') nivel++;

    if (
      c === fechamento ||
      (abertura === '[' && c === '}') ||
      (abertura === '{' && c === ']')
    ) nivel--;

    if (nivel === 0) {
      json = script.slice(inicio, i + 1);
      break;
    }
  }

  if (!json) {
    throw new Error(`Não foi possível interpretar a tabela de ${config.nome}.`);
  }

  const tabelaGE = JSON.parse(json);


  const resourceId =
    script.match(/tUUID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1] ||
    html.match(/RESOURCE_ID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1];

  const slug = tabelaGE.fase?.slug;

  if (!slug) {
    throw new Error(`Fase não encontrada: ${config.nome}.`);
  }

  const ultimaRodada = Number(tabelaGE.rodada?.ultima || 0);
  const rodadaAtual = Number(tabelaGE.rodada?.atual || 1);

  let numeroRodada = rodada
    ? Number(rodada)
    : rodadaAtual;

  if (
    !Number.isInteger(numeroRodada) ||
    numeroRodada < 1 ||
    numeroRodada > ultimaRodada
  ) {
    throw new Error(`Rodada inválida: ${config.nome}.`);
  }

  let jogosGE = tabelaGE.lista_jogos || [];

  if (rodada) {
    if (!resourceId) {
      throw new Error(`Identificador GE não encontrado: ${config.nome}.`);
    }

    const urlJogos =
      `https://api.globoesporte.globo.com/tabela/${resourceId}/fase/${encodeURIComponent(slug)}/rodada/${String(numeroRodada).padStart(2, '0')}/jogos/`;

    const respostaJogos = await fetch(urlJogos, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!respostaJogos.ok) {
      throw new Error(`GE respondeu HTTP ${respostaJogos.status} nos jogos.`);
    }

    const retornoJogos = await respostaJogos.json();

    jogosGE = Array.isArray(retornoJogos)
      ? retornoJogos
      : retornoJogos.jogos || [];
  }

  fonte = 'GE Globo';
  nome = config.nome;

  classificacao = [{
    name: 'CLASSIFICAÇÃO',
    entries: (tabelaGE.classificacao || []).map(item => ({
      position: item.ordem,
      team: {
        name: item.nome_popular || '',
        badge: item.escudo || ''
      },
      points: item.pontos,
      matches: item.jogos,
      wins: item.vitorias,
      draws: item.empates,
      losses: item.derrotas,
      goalsFor: item.gols_pro,
      goalsAgainst: item.gols_contra,
      goalDifference: item.saldo_gols,
      efficiency: item.aproveitamento
    }))
  }];

  jogos = jogosGE.map(jogo => {
    const mandante = jogo.equipes?.mandante || {};
    const visitante = jogo.equipes?.visitante || {};

    const temPlacar =
      jogo.placar_oficial_mandante != null &&
      jogo.placar_oficial_visitante != null;

    return {
      id: jogo.id,
      data: jogo.data_realizacao || '',
      hora: jogo.hora_realizacao || '',
      estadio: jogo.sede?.nome_popular || '',
     status: (() => {
  const inicio = new Date(jogo.data_realizacao).getTime();
  const passouTempoDeJogo =
    Number.isFinite(inicio) &&
    Date.now() > inicio + (4 * 60 * 60 * 1000);

  if (jogo.transmissao?.broadcast?.id === 'ENCERRADA') {
    return 'ENCERRADA';
  }

  if (passouTempoDeJogo && temPlacar) {
    return 'ENCERRADA';
  }

  return jogo.jogo_ja_comecou
    ? 'EM_ANDAMENTO'
    : 'AGENDADA';
})(),
      mandante: {
        id: mandante.id || '',
        nome: mandante.nome_popular || '',
        sigla: mandante.sigla || '',
        escudo: mandante.escudo || ''
      },
      visitante: {
        id: visitante.id || '',
        nome: visitante.nome_popular || '',
        sigla: visitante.sigla || '',
        escudo: visitante.escudo || ''
      },
      placar: temPlacar
        ? {
            mandante: Number(jogo.placar_oficial_mandante),
            visitante: Number(jogo.placar_oficial_visitante)
          }
        : null
    };
  });

  rodadaFinal = numeroRodada;

  dadosOriginais = {
    ...tabelaGE,
    resource_id: resourceId || null,
    fase_selecionada: slug,
    rodada_selecionada: numeroRodada,
    rodadas_disponiveis: Array.from(
      { length: ultimaRodada },
      (_, i) => i + 1
    ),
    lista_jogos: jogosGE
  };
      
} // FECHA O BLOCO DAS CINCO LIGAS
      
      else if (chave === 'liga-das-nacoes') {
                const urlGE =
        'https://ge.globo.com/futebol/futebol-internacional/liga-das-nacoes/';

      const respostaGE = await fetch(urlGE, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });

      if (!respostaGE.ok) {
        throw new Error(`GE respondeu com HTTP ${respostaGE.status}.`);
      }

      const html = await respostaGE.text();

      const scriptReact = [
        ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)
      ].find(item => /\bid=["']scriptReact["']/.test(item[1]));

      if (!scriptReact) {
        throw new Error('Dados da Liga das Nações não encontrados no GE.');
      }

      const script = scriptReact[2];
          
          
      function extrairJSONGE(variavel) {
        const marcador = new RegExp(`\\bconst\\s+${variavel}\\s*=\\s*`);
        const encontro = marcador.exec(script);

        if (!encontro) {
          throw new Error(`Dados ${variavel} não encontrados no GE.`);
        }

        const inicio = encontro.index + encontro[0].length;
        const abertura = script[inicio];
        const fechamento = abertura === '[' ? ']' : '}';

        let nivel = 0;
        let dentroString = false;
        let escape = false;

        for (let i = inicio; i < script.length; i++) {
          const c = script[i];

          if (dentroString) {
            if (escape) escape = false;
            else if (c === '\\') escape = true;
            else if (c === '"') dentroString = false;
            continue;
          }

          if (c === '"') {
            dentroString = true;
            continue;
          }

          if (c === abertura || c === '{' || c === '[') nivel++;

          if (
            c === fechamento ||
            (abertura === '[' && c === '}') ||
            (abertura === '{' && c === ']')
          ) nivel--;

          if (nivel === 0) {
            return JSON.parse(script.slice(inicio, i + 1));
          }
        }

        throw new Error(`JSON incompleto em ${variavel}.`);
      }

      const dadosPagina = extrairJSONGE('classificacao');

const resourceId =
  script.match(/tUUID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1] ||
  html.match(/RESOURCE_ID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1];

if (!resourceId) {
  throw new Error('Identificador da tabela da Liga das Nações não encontrado no GE.');
}

const ligaNacoes = String(req.query.liga || 'A')
  .trim()
  .toUpperCase();

if (!['A', 'B', 'C', 'D'].includes(ligaNacoes)) {
  throw new Error('Liga inválida. Informe A, B, C ou D.');
}

const fasesNavegacao = dadosPagina.fases_navegacao || [];

const faseSelecionada = fasesNavegacao.find(item => {
  const slug = typeof item === 'string'
    ? item
    : item?.slug || '';

  return slug.toLowerCase().includes(
    `liga-${ligaNacoes.toLowerCase()}-liga-das-nacoes`
  );
});

const slugSolicitado = typeof faseSelecionada === 'string'
  ? faseSelecionada
  : faseSelecionada?.slug || '';

if (!slugSolicitado) {
  throw new Error(`Fase da Liga ${ligaNacoes} não encontrada no GE.`);
}

const urlAPI =
  `https://api.globoesporte.globo.com/tabela/${resourceId}/fase/${encodeURIComponent(slugSolicitado)}/classificacao/`;

const respostaAPI = await fetch(urlAPI, {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
  }
});

if (!respostaAPI.ok) {
  throw new Error(`GE respondeu HTTP ${respostaAPI.status} na Liga ${ligaNacoes}.`);
}

const dados = await respostaAPI.json();
                                const gruposGE = dados.grupos || [];

                     
     grupos = gruposGE.map(grupo => {
  const nomeGrupo = String(
    grupo.nome_grupo || grupo.nome || ''
  ).trim();

  const identificacao =
    nomeGrupo.match(/\b([A-D])\s*[- ]?\s*(\d+)\b/i) ||
    nomeGrupo.match(/\bLiga\s*([A-D])\b.*?\bGrupo\s*(\d+)\b/i);

  return {
    nome: nomeGrupo,
    liga: identificacao
      ? identificacao[1].toUpperCase()
      : '',
    numero_grupo: identificacao
      ? Number(identificacao[2])
      : null,
    classificacao: grupo.classificacao || [],
    jogos: grupo.lista_jogos || [],
    rodada: grupo.rodada || {}
  };
});
if (rodada) {
  const numeroRodada = String(rodada).padStart(2, '0');

  const urlJogosRodada =
    `https://api.globoesporte.globo.com/tabela/${resourceId}/fase/${encodeURIComponent(slugSolicitado)}/rodada/${numeroRodada}/jogos/`;

  const respostaJogosRodada = await fetch(urlJogosRodada, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });

  if (!respostaJogosRodada.ok) {
    throw new Error(
      `GE respondeu HTTP ${respostaJogosRodada.status} na rodada ${numeroRodada}.`
    );
  }

  const dadosJogosRodada = await respostaJogosRodada.json();

  const jogosRodada = Array.isArray(dadosJogosRodada)
    ? dadosJogosRodada
    : dadosJogosRodada.jogos || [];

  grupos.forEach(grupo => {
    const idsEquipes = new Set(
      grupo.classificacao.map(equipe =>
      String(equipe.equipe_id || equipe.equipe?.id || equipe.id || '')
      )
    );

    grupo.jogos = jogosRodada.filter(jogo => {
      const mandante = String(jogo.equipes?.mandante?.id || '');
      const visitante = String(jogo.equipes?.visitante?.id || '');

      return idsEquipes.has(mandante) &&
             idsEquipes.has(visitante);
    });
  });
}
      classificacao = grupos.flatMap(grupo =>
        grupo.classificacao.map(equipe => ({
          ...equipe,
          grupo: grupo.nome
        }))
      );

      jogos = grupos.flatMap(grupo =>
        grupo.jogos.map(jogo => ({
          id: jogo.id,
          data: jogo.data_realizacao || '',
          hora: jogo.hora_realizacao || '',
          estadio: jogo.sede?.nome_popular || '',
          status: jogo.placar_oficial_mandante != null &&
                  jogo.placar_oficial_visitante != null
            ? 'ENCERRADA'
            : jogo.jogo_ja_comecou
              ? 'EM_ANDAMENTO'
              : 'AGENDADA',
          mandante: jogo.equipes?.mandante || {},
          visitante: jogo.equipes?.visitante || {},
          placar: jogo.placar_oficial_mandante != null &&
                  jogo.placar_oficial_visitante != null
            ? {
                mandante: Number(jogo.placar_oficial_mandante),
                visitante: Number(jogo.placar_oficial_visitante)
              }
            : null
        }))
      );

      fonte = 'GE Globo';
      nome = 'Liga das Nações';

      rodadaFinal = Math.max(
        0,
        ...gruposGE.map(grupo =>
          Number(grupo.rodada?.atual || 0)
        )
      );

      dadosOriginais = dados;
    }
           

else if (chave === 'libertadores' || chave === 'sul-americana') {
  const config = paginasConmebol[chave];

  // Busca a página principal do GE para identificar a competição e suas fases
  const respostaPagina = await fetch(config.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  if (!respostaPagina.ok) {
    throw new Error(`GE respondeu com HTTP ${respostaPagina.status}.`);
  }

  const html = await respostaPagina.text();

  const scriptReact = [
    ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)
  ].find(item => /\bid=["']scriptReact["']/.test(item[1]));

  if (!scriptReact) {
    throw new Error(`Dados de ${config.nome} não encontrados no GE.`);
  }

  const script = scriptReact[2];
console.log(
  'VARIÁVEIS DISPONÍVEIS NO GE:',
  [...script.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)]
    .map(item => item[1])
);
  
  function extrairJSONConmebol(variavel) {
    const marcador = new RegExp(`\\bconst\\s+${variavel}\\s*=\\s*`);
    const encontro = marcador.exec(script);

    if (!encontro) return null;

    const inicio = encontro.index + encontro[0].length;
    const abertura = script[inicio];

    if (abertura !== '{' && abertura !== '[') return null;

    let nivel = 0;
    let dentroString = false;
    let escape = false;

    for (let i = inicio; i < script.length; i++) {
      const c = script[i];

      if (dentroString) {
        if (escape) escape = false;
        else if (c === '\\') escape = true;
        else if (c === '"') dentroString = false;
        continue;
      }

      if (c === '"') {
        dentroString = true;
        continue;
      }

      if (c === '{' || c === '[') nivel++;
      if (c === '}' || c === ']') nivel--;

      if (nivel === 0) {
        return JSON.parse(script.slice(inicio, i + 1));
      }
    }

    throw new Error(`JSON incompleto em ${variavel} no GE.`);
  }

  const dadosPagina = extrairJSONConmebol('classificacao') || {};
  const fasePagina = extrairJSONConmebol('fase') || {};

  const resourceId =
    script.match(/tUUID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1] ||
    html.match(/RESOURCE_ID\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1];

  if (!resourceId) {
    throw new Error(`Identificador da tabela de ${config.nome} não encontrado.`);
  }

  const fasesNavegacao = dadosPagina.fases_navegacao || [];
  const slugAtual = fasePagina.slug || '';
  const slugSolicitado = fase && fase !== 'final'
    ? fase
    : slugAtual;

  if (!slugSolicitado) {
    throw new Error(`Fase de ${config.nome} não identificada.`);
  }

  const urlAPI =
    `https://api.globoesporte.globo.com/tabela/${resourceId}/fase/${encodeURIComponent(slugSolicitado)}/classificacao/`;

  const respostaGE = await fetch(urlAPI, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });

  if (!respostaGE.ok) {
    throw new Error(`API GE respondeu HTTP ${respostaGE.status} na fase ${slugSolicitado}.`);
  }

  const dados = await respostaGE.json();

  const gruposGE = Array.isArray(dados.grupos)
    ? dados.grupos
    : Object.values(dados.grupos || {});

  grupos = gruposGE.map(grupo => ({
    nome: grupo.nome_grupo || '',
    classificacao: grupo.classificacao || [],
    jogos: grupo.lista_jogos || [],
    rodada: grupo.rodada || {}
  }));

  classificacao = grupos.flatMap(grupo =>
    grupo.classificacao.map(equipe => ({
      ...equipe,
      grupo: grupo.nome
    }))
  );

  const jogosEncontrados = [];

  gruposGE.forEach(grupo => {
    (grupo.lista_jogos || []).forEach(jogo => {
      jogosEncontrados.push(jogo);
    });
  });

  (dados.secao || []).forEach(secao => {
    (secao.chave || []).forEach(chaveGE => {
      (chaveGE.jogos || []).forEach(jogo => {
        jogosEncontrados.push(jogo);
      });
    });
  });

  (dados.lista_jogos || []).forEach(jogo => {
    jogosEncontrados.push(jogo);
  });

  const jogosUnicos = [
    ...new Map(
      jogosEncontrados.map((jogo, indice) => [
        jogo.id || `${jogo.data_realizacao || ''}-${indice}`,
        jogo
      ])
    ).values()
  ];

  jogos = jogosUnicos.map(jogo => {
    const mandante = jogo.equipes?.mandante || {};
    const visitante = jogo.equipes?.visitante || {};

    const temPlacar =
      jogo.placar_oficial_mandante != null &&
      jogo.placar_oficial_visitante != null;

    const temPenaltis =
      jogo.placar_penaltis_mandante != null &&
      jogo.placar_penaltis_visitante != null;

    return {
      id: jogo.id,
      data: jogo.data_realizacao || '',
      hora: jogo.hora_realizacao || '',
      estadio: jogo.sede?.nome_popular || '',

      status: jogo.transmissao?.broadcast?.id === 'ENCERRADA'
        ? 'ENCERRADA'
        : jogo.jogo_ja_comecou
          ? 'EM_ANDAMENTO'
          : 'AGENDADA',

      mandante: {
        id: mandante.id || '',
        nome: mandante.nome_popular || '',
        sigla: mandante.sigla || '',
        escudo: mandante.escudo || ''
      },

      visitante: {
        id: visitante.id || '',
        nome: visitante.nome_popular || '',
        sigla: visitante.sigla || '',
        escudo: visitante.escudo || ''
      },

      placar: temPlacar ? {
        mandante: Number(jogo.placar_oficial_mandante),
        visitante: Number(jogo.placar_oficial_visitante)
      } : null,

      penaltis: temPenaltis ? {
        mandante: Number(jogo.placar_penaltis_mandante),
        visitante: Number(jogo.placar_penaltis_visitante)
      } : null,

      grupo: jogo.grupo || jogo.nome_grupo || ''
    };
  });

  fonte = 'GE Globo';
  nome = config.nome;

  rodadaFinal = Math.max(
    0,
    ...gruposGE.map(grupo => Number(grupo.rodada?.atual || 0))
  );

  dadosOriginais = {
    ...dados,
    fase_selecionada: slugSolicitado,
    fase_atual: slugAtual,
    fases_navegacao: fasesNavegacao,
    resource_id: resourceId,
    url_api: urlAPI
  };
}

         else if (chave === 'copa-do-brasil') {
  const urlBase = 'https://ge.globo.com/futebol/copa-do-brasil/';

 if (
  !Number.isInteger(faseCopa) ||
  faseCopa < 0 ||
  faseCopa > 8
) {
  throw new Error('Fase inválida. Informe um número inteiro de 0 a 8.');
}

  const nomesFases = [
    'Primeira fase',
    'Segunda fase',
    'Terceira fase',
    'Quarta fase',
    'Quinta fase',
    'Oitavas de final',
    'Quartas de final',
    'Semifinal',
    'Final'
  ];

  // Consulta a página principal do GE
  const respostaGE = await fetch(urlBase);

  if (!respostaGE.ok) {
    throw new Error(`GE retornou ${respostaGE.status}`);
  }

  const htmlGE = await respostaGE.text();

  function extrairClassificacao(html) {
    const bloco = html.match(
      /const classificacao = (\{[\s\S]*?\});/
    );

    if (!bloco) {
      throw new Error('Estrutura da Copa não encontrada no GE.');
    }

    return JSON.parse(bloco[1]);
  }

  const dadosGE = extrairClassificacao(htmlGE);

  const edicao = dadosGE.edicao || {};
  const temporada = String(
    edicao.nome?.match(/\d{4}/)?.[0] ||
    new Date().getFullYear()
  );

  // Localiza automaticamente o endereço da fase escolhida
  const navegacao = dadosGE.fases_navegacao || [];
  const faseSelecionada = navegacao[faseCopa];

  const slug = typeof faseSelecionada === 'string'
    ? faseSelecionada
    : faseSelecionada?.slug || '';

  let htmlFase = htmlGE;

  if (slug) {
    const links = [
      ...htmlGE.matchAll(/href=["']([^"']+)["']/g)
    ];

    const linkFase = links
      .map(item => item[1].replace(/&amp;/g, '&'))
      .find(link => link.includes(slug));

    
if (linkFase) {
  const urlFase = new URL(linkFase, urlBase).href;
  const respostaFase = await fetch(urlFase);

  if (respostaFase.ok) {
    htmlFase = await respostaFase.text();
  }
}
}
        
  const dadosFase = extrairClassificacao(htmlFase);
  const secoes = dadosFase.secao || [];

  // Extrai os jogos das chaves da fase
  const jogosGE = [];

  secoes.forEach(secao => {
    (secao.chave || []).forEach(chaveGE => {
      (chaveGE.jogos || []).forEach(jogo => {
        const mandante = jogo.equipes?.mandante || {};
        const visitante = jogo.equipes?.visitante || {};

        jogosGE.push({
          id: jogo.id,
          grupo: chaveGE.id || chaveGE.nome || '',
          nome_grupo: chaveGE.nome || '',
          data: jogo.data_realizacao
            ? new Date(jogo.data_realizacao).toLocaleDateString('pt-BR', {
                timeZone: 'UTC'
              })
            : '',
          hora: jogo.hora_realizacao || '',
          estadio: jogo.sede?.nome_popular || '',
          mandante: {
            id: mandante.id || '',
            nome: mandante.nome_popular || '',
            escudo: mandante.escudo || ''
          },
          visitante: {
            id: visitante.id || '',
            nome: visitante.nome_popular || '',
            escudo: visitante.escudo || ''
          },
          placar:
            jogo.placar_oficial_mandante != null &&
            jogo.placar_oficial_visitante != null
              ? {
                  mandante: Number(jogo.placar_oficial_mandante),
                  visitante: Number(jogo.placar_oficial_visitante)
                }
              : null,
          penaltis:
            jogo.placar_penaltis_mandante != null &&
            jogo.placar_penaltis_visitante != null
              ? `${jogo.placar_penaltis_mandante} x ${jogo.placar_penaltis_visitante}`
              : null,
          status: jogo.transmissao?.broadcast?.id === 'ENCERRADA'
            ? 'FINALIZADO'
            : jogo.jogo_ja_comecou
              ? 'EM ANDAMENTO'
              : 'AGENDADO'
        });
      });
    });
  });

  fonte = 'GE Globo';
  nome = `Copa do Brasil ${temporada}`;
  classificacao = [];
  jogos = jogosGE;

  dadosOriginais = {
    temporada,
    fases: nomesFases,
    fase_atual: faseCopa,
    nome_fase: nomesFases[faseCopa],
    total_fases: nomesFases.length,
    edicao,
fases_navegacao: dadosGE.fases_navegacao,
fase_url_encontrada: slug,
    atualizado_em: new Date().toISOString()
  };
}
    return {
      chave,
      fonte,
      competicao: nome,
      rodada: rodadaFinal,
      classificacao,
      jogos,
      grupos,
      dados_originais: dadosOriginais,
      total_jogos: jogos.length,
      atualizado_em: new Date().toISOString()
    };
  }

  try {
    
    const tipo = String(req.query.tipo || 'jogos').toLowerCase();

    if (tipo === 'artilharia') {
     const permitidasArtilharia = [
  'serie-b',
  'serie-c',
  'serie-d',
  'copa-do-brasil',
  'libertadores',
  'sul-americana',
   'champions',
  'europa',
  'conference',
  'premier-league',
  'la-liga',
  'serie-a-italia',
  'bundesliga',
  'ligue-1'
];
      const selecionadasArtilharia = competicao === 'todas'
        ? permitidasArtilharia
        : [competicao];

      const resultadosArtilharia = await Promise.all(
        selecionadasArtilharia.map(async chave => {
          try {
            return {
              sucesso: true,
              ...await consultarArtilharia(chave)
            };
          } catch (erro) {
            return {
              sucesso: false,
              chave,
              erro: erro.message,
              artilheiros: []
            };
          }
        })
      );

      return res.status(200).json({
        sucesso: true,
        central: 'TVFP ESPORTES',
        tipo: 'artilharia',
        competicoes: resultadosArtilharia,
        total_competicoes: resultadosArtilharia.length,
        total_artilheiros: resultadosArtilharia.reduce(
          (total, item) => total + item.artilheiros.length,
          0
        ),
        falhas: resultadosArtilharia
          .filter(item => !item.sucesso)
          .map(item => ({
            competicao: item.chave,
            erro: item.erro
          })),
        atualizado_em: new Date().toISOString()
      });
    }

    if (competicao !== 'todas' && !permitidas.includes(competicao)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Competição não reconhecida.',
        competicoes_disponiveis: ['todas', ...permitidas]
      });
    }

    const selecionadas = competicao === 'todas'
      ? permitidas
      : [competicao];

    const resultados = await Promise.all(
      selecionadas.map(async chave => {
        try {
          return {
            sucesso: true,
          ...await consultarCompeticao(
  chave,
  chave === 'copa-do-brasil'
    ? Number(req.query.fase ?? 8)
    : 8
)
          };
        } catch (erro) {
          return {
            sucesso: false,
            chave,
            erro: erro.message,
            jogos: [],
            classificacao: []
          };
        }
      })
    );

    const jogos = resultados.flatMap(item =>
      item.sucesso ? item.jogos : []
    );

    return res.status(200).json({
    
      central: 'TVFP ESPORTES',
      competicoes: resultados,
      jogos,
      total_competicoes: resultados.length,
      total_jogos: jogos.length,
      falhas: resultados
        .filter(item => !item.sucesso)
        .map(item => ({
          competicao: item.chave,
          erro: item.erro
        })),
      atualizado_em: new Date().toISOString()
    });

  } catch (erro) {
    console.error('Erro na Central Geral:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message
    });
  }
};
