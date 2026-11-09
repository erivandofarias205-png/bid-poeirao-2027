
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
  const rodadaInformada = req.query.rodada
  ? Number(req.query.rodada)
  : null;

if (
  rodadaInformada !== null &&
  (!Number.isInteger(rodadaInformada) ||
   rodadaInformada < 1 ||
   rodadaInformada > 38)
) {
  return res.status(400).json({
    sucesso: false,
    erro: 'Rodada inválida. Escolha de 1 a 38.'
  });
}

   const url = `https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2026/rodada/${String(rodadaInformada || 1).padStart(2, '0')}/jogos/`;

if (rodada === null) {
  const agora = new Date();
  const dataBrasil = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(agora);

  rodada = 1;

  for (let numero = 1; numero <= 38; numero++) {
    const respostaRodada = await fetch(urlRodada(numero));

    if (!respostaRodada.ok) {
      throw new Error(`Erro ao consultar rodada ${numero} no GE.`);
    }

    const partidas = await respostaRodada.json();

    if (!Array.isArray(partidas) || partidas.length === 0) {
      break;
    }

    const todasEncerradas = partidas.every(jogo =>
      jogo.transmissao?.broadcast?.id === 'ENCERRADA'
    );

    const ultimaData = partidas.reduce((maior, jogo) => {
      const data = String(jogo.data_realizacao || '').slice(0, 10);
      return data > maior ? data : maior;
    }, '');

    rodada = numero;

    if (!todasEncerradas || ultimaData >= dataBrasil) {
      break;
    }
  }
}

const url = urlRodada(rodada);
    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!resposta.ok) {
      throw new Error(`GE respondeu com status ${resposta.status}`);
    }

    const jogosGE = await resposta.json();

    const jogos = jogosGE.map(jogo => ({
      id: jogo.id,
      data: jogo.data_realizacao,
      hora: jogo.hora_realizacao,
      mandante: {
        nome: jogo.equipes?.mandante?.nome_popular || '',
        sigla: jogo.equipes?.mandante?.sigla || '',
        escudo: jogo.equipes?.mandante?.escudo || '',
        gols: jogo.placar_oficial_mandante
      },
      visitante: {
        nome: jogo.equipes?.visitante?.nome_popular || '',
        sigla: jogo.equipes?.visitante?.sigla || '',
        escudo: jogo.equipes?.visitante?.escudo || '',
        gols: jogo.placar_oficial_visitante
      },
      estadio: jogo.sede?.nome_popular || '',
      link: jogo.transmissao?.url || '',
      encerrado: jogo.transmissao?.broadcast?.id === 'ENCERRADA'
    }));

    return res.status(200).json({
      sucesso: true,
      fonte: 'GE Globo',
      competicao: 'Brasileirão Série A 2026',
      rodada,
      total_jogos: jogos.length,
      jogos
    });

  } catch (erro) {
    console.error('Erro GE Série A:', erro);

    return res.status(502).json({
      sucesso: false,
      erro: erro.message
    });
  }
}

