// src/data/categories.js
// Lista fixa de categorias e subcategorias do Kronava
// Estrutura: INCOME (Receitas) e EXPENSE (Despesas Fixas + Variáveis + Investimentos + Dívidas)

export const CATEGORIES = {
  income: {
    'Salário': ['Salário líquido', '13º salário', 'Férias', 'Participação nos lucros (PLR)', 'Bônus'],
    'Renda Extra': ['Freelance', 'Consultoria', 'Bicos', 'Comissões'],
    'Renda de Aluguel': ['Aluguel de imóvel', 'Aluguel de veículo/equipamento'],
    'Rendimentos de Investimentos': ['Juros', 'Dividendos', 'Rendimento de poupança/CDB/fundos'],
    'Benefícios': ['Vale-alimentação', 'Vale-refeição', 'Auxílio-creche', 'Seguro desemprego'],
    'Pensão/Aposentadoria': ['INSS', 'Previdência privada', 'Pensão alimentícia recebida'],
    'Reembolsos': ['Reembolso médico', 'Reembolso de despesas de trabalho'],
    'Vendas': ['Venda de bens usados', 'Brechó', 'Marketplace'],
    'Outras Receitas': ['Presentes recebidos', 'Prêmios', 'Restituição de IR'],
  },

  expense: {
    // Despesas Fixas
    'Moradia': ['Aluguel/parcela financiamento', 'Condomínio', 'IPTU', 'Seguro residencial'],
    'Contas de Casa': ['Energia elétrica', 'Água/esgoto', 'Gás', 'Internet', 'Telefone fixo'],
    'Educação': ['Mensalidade escolar/faculdade', 'Material didático fixo', 'Curso de idiomas'],
    'Saúde Fixa': ['Plano de saúde', 'Plano dental', 'Seguro de vida'],
    'Transporte Fixo': ['Financiamento de veículo', 'Seguro auto', 'Estacionamento mensal'],
    'Assinaturas': ['Streaming (Netflix, Spotify)', 'SaaS', 'Revistas/jornais', 'Academia'],
    'Cuidados com Dependentes': ['Mensalidade de creche', 'Babá fixa', 'Pensão alimentícia paga'],

    // Despesas Variáveis
    'Alimentação': ['Supermercado', 'Hortifruti', 'Açougue', 'Feira'],
    'Alimentação Fora': ['Restaurante', 'Delivery', 'Lanchonete', 'Café'],
    'Transporte Variável': ['Combustível', 'App de corrida (Uber/99)', 'Pedágio', 'Transporte público', 'Manutenção veicular'],
    'Saúde Variável': ['Farmácia', 'Consultas particulares', 'Exames', 'Terapia', 'Dentista avulso'],
    'Lazer': ['Cinema', 'Shows', 'Viagens', 'Hobbies', 'Parques', 'Bares'],
    'Vestuário e Beleza': ['Roupas', 'Calçados', 'Cosméticos', 'Salão', 'Barbearia'],
    'Casa e Manutenção': ['Reparos', 'Móveis', 'Utensílios domésticos', 'Produtos de limpeza'],
    'Educação Variável': ['Cursos avulsos', 'Livros', 'Workshops'],
    'Pets': ['Ração', 'Veterinário', 'Banho e tosa', 'Acessórios'],
    'Presentes e Doações': ['Presentes de aniversário/datas', 'Doações', 'Caridade'],
    'Imprevistos': ['Multas', 'Consertos emergenciais', 'Despesas inesperadas'],

    // Investimentos e Reservas
    'Reserva de Emergência': ['Aporte mensal para reserva'],
    'Investimentos de Longo Prazo': ['Renda fixa', 'Previdência privada', 'Aportes recorrentes'],
    'Objetivos Específicos': ['Reserva para viagem', 'Entrada de imóvel', 'Troca de carro'],
    'Educação Financeira': ['Cursos de investimento', 'Assinaturas de research'],

    // Dívidas e Financeiro
    'Cartão de Crédito': ['Fatura do cartão (parcelado e à vista)'],
    'Empréstimos': ['Empréstimo pessoal', 'Financiamento estudantil', 'Consignado'],
    'Juros e Multas': ['Juros de atraso', 'Multa contratual', 'IOF'],
    'Taxas Bancárias': ['Tarifa de conta', 'Anuidade de cartão', 'Manutenção de conta'],
  },
}

// Retorna lista de categorias fixas de um tipo (income/expense)
export function getFixedCategories(type) {
  return Object.keys(CATEGORIES[type] || {})
}

// Retorna lista de subcategorias fixas de uma categoria
export function getFixedSubcategories(type, category) {
  return CATEGORIES[type]?.[category] || []
}

// ===== Versões "combinadas" (fixas + personalizadas do usuário) =====
// customCategories: array vindo do Supabase, formato [{ type, category, subcategory }]

export function getCategories(type, customCategories = []) {
  const fixed = getFixedCategories(type)
  const custom = customCategories
    .filter(c => c.type === type && c.category)
    .map(c => c.category)
  return Array.from(new Set([...fixed, ...custom]))
}

export function getSubcategories(type, category, customCategories = []) {
  const fixed = getFixedSubcategories(type, category)
  const custom = customCategories
    .filter(c => c.type === type && c.category === category && c.subcategory)
    .map(c => c.subcategory)
  return Array.from(new Set([...fixed, ...custom]))
}
