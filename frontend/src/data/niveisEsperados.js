// Níveis esperados por nível de carreira para cada eixo
// Formato: [Desenvolvimento contínuo, Colaboração, Operação e processos, Influência]
export const niveisEsperadosPorCarreira = {
  'E': [1, 1, 1, 1],
  'J1': [1, 1, 1, 1],
  'J2': [2, 1, 2, 1],
  'J3': [2, 2, 2, 2],
  'P1': [3, 2, 3, 2],
  'P2': [3, 2, 3, 3],
  'P3': [4, 2, 4, 3],
  'S1': [4, 3, 4, 3],
  'S2': [4, 3, 4, 4],
  'S3': [5, 3, 5, 4],
  'ES1': [5, 4, 5, 4],
  'ES2': [5, 4, 5, 4]
}

// Função para obter o nível de carreira do colaborador (mockado por enquanto)
export const getNivelCarreira = () => {
  // Em produção, isso viria do backend
  return 'P2' // Exemplo
}

