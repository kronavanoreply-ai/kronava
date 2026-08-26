// src/data/categories.js
// Árvore de categoria -> subcategorias, por tipo de transação (expense/income)

export const CATEGORIES = {
  income: {
    Receitas: [
      'Salário',
      'Aluguel',
      'Pensão',
      'Horas extras',
      '13º salário',
      'Férias',
      'Outros',
    ],
  },
  expense: {
    Habitação: [
      'Aluguel',
      'Condomínio',
      'Prestação da casa',
      'Seguro da casa',
      'Diarista',
      'Mensalista',
      'Luz',
      'Água',
      'Telefone',
      'Telefone Celular',
      'Gás',
      'Mensalidade TV',
      'Internet',
    ],
    Transporte: [
      'Prestação do carro',
      'Seguro do carro',
      'Estacionamento',
      'Metrô',
      'Ônibus',
      'Combustível',
    ],
    Alimentação: [
      'Supermercado',
      'Feira',
      'Padaria',
    ],
    Saúde: [
      'Seguro saúde',
      'Plano de saúde',
      'Medicamentos',
      'Médico',
      'Dentista',
      'Hospital',
    ],
    Educação: [
      'Colégio',
      'Faculdade',
      'Curso',
      'Material escolar',
      'Uniforme',
    ],
    'Cuidados pessoais': [
      'Cabeleireiro',
      'Manicure',
      'Esteticista',
      'Academia',
      'Clube',
    ],
    'Manutenção/prevenção': [
      'Carro',
      'Casa',
    ],
    Impostos: [
      'IPTU',
      'IPVA',
    ],
    Lazer: [
      'Viagens',
      'Cinema/teatro',
      'Restaurantes/bares',
      'Locadora DVD',
    ],
    Vestuário: [
      'Roupas',
      'Calçados',
      'Acessórios',
    ],
    Investimentos: [
      'Ações',
      'Tesouro Direto',
      'Renda fixa',
      'Previdência privada',
      'Outros',
    ],
    Outros: [
      'Seguro de vida',
      'Presentes',
    ],
  },
}

// Retorna lista de categorias (nível 1) para um tipo
export function getCategories(type) {
  return Object.keys(CATEGORIES[type] || {})
}

// Retorna lista de subcategorias (nível 2) para tipo + categoria
export function getSubcategories(type, category) {
  return (CATEGORIES[type] && CATEGORIES[type][category]) || []
}
