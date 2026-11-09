
export default async function handler(req, res) {
  res.setHeader(
  'Cache-Control',
  'no-store, no-cache, must-revalidate, proxy-revalidate'
);

  try {
    const urlRodada = numero =>
      `https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2026/rodada/${String(numero).padStart(2, '0')}/jogos/`;

    const consultarRodada = async numero => {
      const resposta = await fetch(urlRodada(numero), {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      if (!resposta.ok) {
        throw new Error(
          `GE respondeu com status ${resposta.status} na rodada ${numero}`
        );
      }

      const dados = await resposta.json();

      if (!Array.isArray(dados) || dados.length === 0) {
        throw new Error(
          `O GE não retornou jogos válidos para a rodada ${numero}.`
        );
      }

      return dados;
    };

    // Identifica jogos encerrados ou possíveis adiamentos
    const rodadaLiberada = partidas => {
      const encerrados = partidas.filter(
        jogo => jogo.transmissao?.broadcast?.id === 'ENCERRADA'
      );

      const pendentes = partidas.filter(
        jogo => jogo.transmissao?.broadcast?.id !== 'ENCERRADA'
      );

      // Todos encerrados: libera a próxima rodada
      if (pendentes.length === 0) {
        return true;
      }

      // Sem pelo menos dois jogos encerrados,
      // não há base segura para identificar adiamento.
      if (encerrados.length < 2) {
        return false;
      }

      const datasEncerrados = encerrados
        .map(jogo => Date.parse(jogo.data_realizacao))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

      if (datasEncerrados.length < 2) {
        return false;
      }

      const meio = Math.floor(datasEncerrados.length / 2);

      const mediana = datasEncerrados.length % 2
        ? datasEncerrados[meio]
        : (datasEncerrados[meio - 1] + datasEncerrados[meio]) / 2;

      // Um jogo muito distante das demais partidas
      // pode indicar adiamento ou remarcação.
      const pendentesRemarcados = pendentes.every(jogo => {
        const data = Date.parse(jogo.data_realizacao);

        return Number.isFinite(data) &&
          data > mediana + (14 * 24 * 60 * 60 * 1000);
      });

      return pendentesRemarcados;
    };

    let rodada;
    let jogosGE;

    // SELEÇÃO MANUAL: mantém o funcionamento de 1 a 38
    if (req.query.rodada !== undefined && req.query.rodada !== '') {
      rodada = Number(req.query.rodada);

      if (
        !Number.isInteger(rodada) ||
        rodada < 1 ||
        rodada > 38
      ) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Rodada inválida. Escolha de 1 a 38.'
        });
      }

      jogosGE = await consultarRodada(rodada);

        } else if (req.query.data) {
      // CONSULTA DOS JOGOS DE UMA DATA ESPECÍFICA
      const dataConsulta = String(req.query.data);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataConsulta)) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Data inválida. Use AAAA-MM-DD.'
        });
      }

      const todasRodadas = await Promise.all(
        Array.from({ length: 38 }, (_, i) =>
          consultarRodada(i + 1)
        )
      );

      jogosGE = todasRodadas
        .flat()
        .filter(jogo =>
          String(jogo.data_realizacao || '').slice(0, 10) === dataConsulta
        );

      rodada = 'consulta por data';

    } else {
      // SELEÇÃO AUTOMÁTICA DAS 38 RODADAS
      const todasRodadas = await Promise.all(
        Array.from({ length: 38 }, (_, i) =>
          consultarRodada(i + 1)
        )
      );

      const indiceAtual = todasRodadas.findIndex(
        partidas => !rodadaLiberada(partidas)
      );

      rodada = indiceAtual === -1 ? 38 : indiceAtual + 1;

      jogosGE = todasRodadas[rodada - 1];
    }
    
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
      encerrado:
        jogo.transmissao?.broadcast?.id === 'ENCERRADA'
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
