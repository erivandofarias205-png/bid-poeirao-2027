
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
  const rodada = String(req.query.rodada || '1');

  const permitidas = [
    'brasileirao-a',
    'brasileirao-b',
    'brasileirao-c',
    'brasileirao-d',
    'champions',
    'europa'
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
  async function consultarCompeticao(chave) {
    let fonte = '';
    let nome = '';
    let classificacao = [];
    let jogos = [];
    let grupos = {};
    let dadosOriginais = {};
   
    if (chave === 'brasileirao-a') {
      const [tabela, retornoJogos] = await Promise.all([
        consultarAPI('/api/serie-a'),
        consultarAPI(
          `/api/ge-serie-a-jogos?rodada=${encodeURIComponent(rodada)}`
        )
      ]);

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

      dadosOriginais = { classificacao: tabela, jogos: retornoJogos };
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

    else if (chave === 'brasileirao-b' || chave === 'brasileirao-d') {
      const serie = chave.slice(-1);
      const retorno = await consultarAPI(`/api/brasileirao?serie=${serie}`);
      const dados = retorno.dados || {};

      fonte = 'Campeonato Brasileiro API';
      nome = `Brasileirão Série ${serie.toUpperCase()}`;
      classificacao = dados.tables || [];
      jogos = dados.matches || [];
      grupos = dados.grupos || {};
      dadosOriginais = dados;
    }

    else if (chave === 'champions' || chave === 'europa') {
      const retorno = await consultarAPI(
        `/api/ge-europa?competicao=${chave}&rodada=${encodeURIComponent(rodada)}`
      );

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
      dadosOriginais = dados;
    }

    return {
      chave,
      fonte,
      competicao: nome,
      rodada: Number(rodada),
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
        'europa'
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
            ...await consultarCompeticao(chave)
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
      sucesso: true,
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
