
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );

  if (req.method !== 'GET') {
    return res.status(405).json({
      sucesso: false,
      erro: 'Método não permitido.'
    });
  }

  return res.status(200).json({
    sucesso: true,
    competicao: 'Champions League',
    temporada: '2026/2027',
    fonte: 'GE Globo',
    mensagem: 'API de artilharia criada e funcionando.',
    total: 0,
    artilheiros: [],
    atualizado_em: new Date().toISOString()
  });
}

