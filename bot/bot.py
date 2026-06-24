import os
import json
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from groq import Groq
from supabase import create_client

load_dotenv()

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
GROQ_API_KEY   = os.getenv('GROQ_API_KEY')
SUPABASE_URL   = os.getenv('SUPABASE_URL')
SUPABASE_KEY   = os.getenv('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
groq     = Groq(api_key=GROQ_API_KEY)

CATS_EXP = {
    'food':      'Alimentação',
    'home':      'Moradia',
    'transport': 'Transporte',
    'health':    'Saúde',
    'leisure':   'Lazer',
    'personal':  'Pessoal',
    'travel':    'Viagens',
    'other':     'Outros'
}
CATS_INC = {
    'salary':    'Salário',
    'bonus':     'Bônus',
    'invest':    'Investimentos',
    'freelance': 'Freelance',
    'other':     'Outros'
}

MESES = {
    'January': 'Janeiro', 'February': 'Fevereiro', 'March': 'Março',
    'April': 'Abril', 'May': 'Maio', 'June': 'Junho',
    'July': 'Julho', 'August': 'Agosto', 'September': 'Setembro',
    'October': 'Outubro', 'November': 'Novembro', 'December': 'Dezembro'
}

def mes_ptbr(dt: datetime) -> str:
    mes_en = dt.strftime('%B')
    return f"{MESES[mes_en]}/{dt.year}"

def get_user(telegram_id: int):
    res = supabase.rpc('get_user_by_telegram', {'tid': telegram_id}).execute()
    return res.data[0] if res.data else None

def fmt(value: float) -> str:
    return f"R$ {abs(value):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

def parse_with_ai(text: str) -> dict:
    prompt = f"""Você é um assistente financeiro brasileiro. Analise a mensagem e extraia as informações de uma transação financeira.

Mensagem: "{text}"

Responda APENAS em JSON válido com esta estrutura:
{{
  "type": "expense" ou "income",
  "amount": número decimal,
  "description": "descrição curta",
  "category": uma dessas opções exatas,
  "status": "realizado" ou "projetado",
  "date": "YYYY-MM-DD"
}}

Categorias para DESPESA (type=expense):
- food: alimentação, restaurante, lanche, mercado, supermercado, delivery, café, pizza, almoço, jantar, padaria
- home: aluguel, condomínio, água, luz, gás, internet, moradia, casa, apartamento, iptu
- transport: uber, 99, táxi, gasolina, combustível, ônibus, metrô, passagem, carro, estacionamento, pedágio
- health: médico, farmácia, remédio, dentista, academia, plano de saúde, hospital, exame
- leisure: cinema, netflix, spotify, jogo, viagem, bar, festa, show, streaming
- personal: roupa, cabelo, salão, beleza, presente, compra pessoal
- travel: hotel, passagem aérea, viagem, hospedagem
- other: qualquer outro gasto não listado acima

Categorias para RECEITA (type=income):
- salary: salário, pagamento mensal, holerite
- bonus: bônus, comissão, gratificação, 13º
- invest: investimento, rendimento, dividendo, juros
- freelance: freela, freelance, trabalho extra, projeto
- other: qualquer outra receita

Data de hoje: {datetime.now().strftime('%Y-%m-%d')}

Regras:
- "vou pagar", "próximo mês", "vai chegar", "vencerá" = projetado
- "paguei", "gastei", "recebi", "comprei", "fui" = realizado
- sem especificar = realizado
- Retorne APENAS o JSON, sem explicações, sem markdown"""

    response = groq.chat.completions.create(
        model='llama-3.1-8b-instant',
        messages=[{'role': 'user', 'content': prompt}],
        temperature=0.1,
        max_tokens=300
    )
    text_response = response.choices[0].message.content.strip()
    text_response = text_response.replace('```json', '').replace('```', '').strip()
    return json.loads(text_response)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)

    if not user:
        await update.message.reply_text(
            "Olá. Bem-vindo ao Kronava.\n\n"
            "Para que eu possa cuidar das suas finanças por aqui, precisamos conectar seu assistente ao seu perfil.\n\n"
            "É simples: acesse o aplicativo, vá em Configurações e vincule seu Telegram.\n"
            "🔗 kronava.com.br"
        )
        return

    name = user.get('name', '').split()[0]
    await update.message.reply_text(
        f"Olá, *{name}*. Estou aqui para cuidar do seu espaço financeiro.\n\n"
        f"Quando gastar ou receber algo, basta digitar naturalmente aqui — por exemplo: _'Almoço por 45 reais'_.\n\n"
        f"Se preferir, use os comandos de controle:\n"
        f"• /saldo — Seu saldo atual\n"
        f"• /mes — Resumo do mês\n"
        f"• /hoje — O que aconteceu hoje\n"
        f"• /pendentes — Próximos compromissos",
        parse_mode='Markdown'
    )

async def cmd_saldo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text(
            "Ainda não encontrei o seu perfil. Por favor, faça o login em kronava.com.br e ative a integração nas configurações para liberarmos seu assistente."
        )
        return

    user_id = user['id']
    res = supabase.table('transactions').select('type,amount').eq('user_id', user_id).eq('status', 'realizado').execute()

    balance = 0
    for t in res.data or []:
        if t['type'] == 'income':
            balance += float(t['amount'])
        else:
            balance -= float(t['amount'])

    initial = float(user.get('initial_balance') or 0)
    total = balance + initial

    await update.message.reply_text(
        f"Seu saldo disponível neste momento é de *{fmt(total)}*.\n"
        f"_(Já considerando o seu saldo inicial configurado de {fmt(initial)})._",
        parse_mode='Markdown'
    )

async def cmd_mes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text(
            "Ainda não encontrei o seu perfil. Por favor, faça o login em kronava.com.br e ative a integração nas configurações para liberarmos seu assistente."
        )
        return

    user_id = user['id']
    now = datetime.now()
    start = f"{now.year}-{now.month:02d}-01"
    end_month = now.month + 1 if now.month < 12 else 1
    end_year = now.year if now.month < 12 else now.year + 1
    end = f"{end_year}-{end_month:02d}-01"

    res = supabase.table('transactions').select('*')\
        .eq('user_id', user_id)\
        .gte('date_projected', start)\
        .lt('date_projected', end)\
        .execute()

    inc  = sum(float(t['amount']) for t in res.data if t['type'] == 'income'  and t['status'] == 'realizado')
    exp  = sum(float(t['amount']) for t in res.data if t['type'] == 'expense' and t['status'] == 'realizado')
    proj = [t for t in res.data if t['status'] == 'projetado']

    await update.message.reply_text(
        f"Aqui está a fotografia de {mes_ptbr(now)} até agora:\n\n"
        f"• Receitas: *{fmt(inc)}*\n"
        f"• Despesas: *{fmt(exp)}*\n\n"
        f"Seu saldo atual é de *{fmt(inc - exp)}*, com {len(proj)} fluxo{'s' if len(proj) != 1 else ''} projetado{'s' if len(proj) != 1 else ''} em monitoramento para as próximas semanas. Tudo sob controle.",
        parse_mode='Markdown'
    )

async def cmd_hoje(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text(
            "Ainda não encontrei o seu perfil. Por favor, faça o login em kronava.com.br e ative a integração nas configurações para liberarmos seu assistente."
        )
        return

    user_id = user['id']
    today = datetime.now().strftime('%Y-%m-%d')

    res = supabase.table('transactions').select('*')\
        .eq('user_id', user_id)\
        .eq('date_projected', today)\
        .execute()

    if not res.data:
        await update.message.reply_text(
            "Nenhuma movimentação registrada hoje. Um dia calmo para o seu orçamento."
        )
        return

    lines = ["Aqui está o que aconteceu hoje:\n"]
    for t in res.data:
        cats = CATS_EXP if t['type'] == 'expense' else CATS_INC
        cat  = cats.get(t['category'], 'Outros')
        signal = '+' if t['type'] == 'income' else '-'
        desc = f" _({t['description']})_" if t['description'] else ''
        lines.append(f"• {cat}: *{signal}{fmt(t['amount'])}*{desc}")

    await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')

async def cmd_pendentes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text(
            "Ainda não encontrei o seu perfil. Por favor, faça o login em kronava.com.br e ative a integração nas configurações para liberarmos seu assistente."
        )
        return

    user_id = user['id']
    now = datetime.now()
    start = f"{now.year}-{now.month:02d}-01"
    end_month = now.month + 1 if now.month < 12 else 1
    end_year = now.year if now.month < 12 else now.year + 1
    end = f"{end_year}-{end_month:02d}-01"

    res = supabase.table('transactions').select('*')\
        .eq('user_id', user_id)\
        .eq('status', 'projetado')\
        .gte('date_projected', start)\
        .lt('date_projected', end)\
        .execute()

    if not res.data:
        await update.message.reply_text(
            "Nenhum compromisso financeiro pendente para o restante deste mês. Tudo em dia."
        )
        return

    total = len(res.data)
    lines = [f"{total} fluxo{'s' if total != 1 else ''} sob monitoramento da IA:\n"]
    for t in res.data:
        cats = CATS_EXP if t['type'] == 'expense' else CATS_INC
        cat  = cats.get(t['category'], 'Outros')
        signal = '+' if t['type'] == 'income' else '-'
        desc = f" _({t['description']})_" if t['description'] else ''
        lines.append(f"• {cat}: *{signal}{fmt(t['amount'])}*{desc}")
        lines.append(f"  {t['date_projected']}")

    await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)

    if not user:
        await update.message.reply_text(
            "Ainda não encontrei o seu perfil. Por favor, faça o login em kronava.com.br e ative a integração nas configurações para liberarmos seu assistente."
        )
        return

    text = update.message.text

    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id,
        action='typing'
    )

    try:
        tx = parse_with_ai(text)

        amount      = float(tx['amount'])
        tx_type     = tx['type']
        category    = tx['category']
        description = tx.get('description', '')
        status      = tx.get('status', 'realizado')
        date        = tx.get('date', datetime.now().strftime('%Y-%m-%d'))

        supabase.table('transactions').insert({
            'user_id':       user['id'],
            'type':          tx_type,
            'amount':        amount,
            'description':   description,
            'category':      category,
            'status':        status,
            'date_projected': date,
            'date_realized': date if status == 'realizado' else None,
            'is_recurring':  False
        }).execute()

        cats      = CATS_EXP if tx_type == 'expense' else CATS_INC
        cat_label = cats.get(category, 'Outros')
        signal    = '+' if tx_type == 'income' else '-'

        if tx_type == 'expense':
            msg = (
                f"Anotado por aqui. Já deduzi *{signal}{fmt(amount)}* em _{cat_label}_"
                f"{f' ({description})' if description else ''}. Pode deixar o resto comigo."
            )
        else:
            msg = (
                f"Excelente. Adicionei *{signal}{fmt(amount)}* ao seu _{cat_label}_"
                f"{f' ({description})' if description else ''}. Seu saldo já foi atualizado no painel do Kronava."
            )

        await update.message.reply_text(msg, parse_mode='Markdown')

    except Exception as e:
        print(f"Erro: {e}")
        await update.message.reply_text(
            "Não consegui interpretar os valores dessa vez.\n\n"
            "Se puder, tente simplificar para mim, como:\n"
            "_'Gastei 50 reais no mercado'_ ou _'Recebi 3000 do salário'_.",
            parse_mode='Markdown'
        )

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler('start',     start))
    app.add_handler(CommandHandler('saldo',     cmd_saldo))
    app.add_handler(CommandHandler('mes',       cmd_mes))
    app.add_handler(CommandHandler('hoje',      cmd_hoje))
    app.add_handler(CommandHandler('pendentes', cmd_pendentes))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print('Kronava Bot iniciado.')
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()