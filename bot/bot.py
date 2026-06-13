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
    'food': '🍔 Alimentação', 'home': '🏠 Moradia',
    'transport': '🚗 Transporte', 'health': '❤️ Saúde',
    'leisure': '🎮 Lazer', 'personal': '👤 Pessoal',
    'travel': '✈️ Viagens', 'other': '📦 Outros'
}
CATS_INC = {
    'salary': '💼 Salário', 'bonus': '⭐ Bônus',
    'invest': '📈 Investimentos', 'freelance': '💻 Freelance',
    'other': '📦 Outros'
}

def get_user(telegram_id: int):
    res = supabase.rpc('get_user_by_telegram', {'tid': telegram_id}).execute()
    return res.data[0] if res.data else None

def fmt(value: float) -> str:
    return f"R$ {abs(value):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

def parse_with_ai(text: str) -> dict:
    prompt = f"""Você é um assistente financeiro. Analise a mensagem e extraia as informações de uma transação financeira.

Mensagem: "{text}"

Responda APENAS em JSON válido com esta estrutura:
{{
  "type": "expense" ou "income",
  "amount": número decimal,
  "description": "descrição curta",
  "category": uma dessas opções para despesa: food, home, transport, health, leisure, personal, travel, other. Para receita: salary, bonus, invest, freelance, other,
  "status": "realizado" ou "projetado",
  "date": "YYYY-MM-DD" (hoje se não especificado)
}}

Data de hoje: {datetime.now().strftime('%Y-%m-%d')}

Regras:
- Se mencionar "vou pagar", "próximo mês", "vai chegar" = projetado
- Se mencionar "paguei", "gastei", "recebi", "comprei" = realizado
- Se não especificar = realizado
- Retorne APENAS o JSON, sem explicações"""

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
            "👋 Olá! Bem-vindo ao *Kronava Bot*!\n\n"
            "Para usar o bot, você precisa vincular sua conta.\n"
            "Acesse o app e vincule seu Telegram nas configurações.\n\n"
            "🔗 kronava.com",
            parse_mode='Markdown'
        )
        return

    name = user.get('name', '').split()[0]
    await update.message.reply_text(
        f"👋 Olá, *{name}*! Estou pronto para ajudar.\n\n"
        f"Você pode:\n"
        f"• Enviar uma mensagem com seu gasto ou receita\n"
        f"• /hoje — ver transações de hoje\n"
        f"• /mes — resumo do mês\n"
        f"• /saldo — saldo atual\n"
        f"• /pendentes — lançamentos projetados\n\n"
        f"_Exemplo: \"Gastei 45 reais no almoço\"_",
        parse_mode='Markdown'
    )

async def cmd_saldo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text("❌ Conta não vinculada. Acesse o app Kronava.")
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
        f"💰 *Saldo atual*\n\n"
        f"{'✅' if total >= 0 else '❌'} *{fmt(total)}*\n\n"
        f"_Inclui saldo inicial de {fmt(initial)}_",
        parse_mode='Markdown'
    )

async def cmd_mes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text("❌ Conta não vinculada.")
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

    inc = sum(float(t['amount']) for t in res.data if t['type'] == 'income' and t['status'] == 'realizado')
    exp = sum(float(t['amount']) for t in res.data if t['type'] == 'expense' and t['status'] == 'realizado')
    proj = [t for t in res.data if t['status'] == 'projetado']

    await update.message.reply_text(
        f"📊 *Resumo de {now.strftime('%B/%Y')}*\n\n"
        f"✅ Receitas: *{fmt(inc)}*\n"
        f"❌ Despesas: *{fmt(exp)}*\n"
        f"💰 Saldo: *{fmt(inc - exp)}*\n\n"
        f"⏳ Projetados pendentes: *{len(proj)}*",
        parse_mode='Markdown'
    )

async def cmd_hoje(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text("❌ Conta não vinculada.")
        return

    user_id = user['id']
    today = datetime.now().strftime('%Y-%m-%d')

    res = supabase.table('transactions').select('*')\
        .eq('user_id', user_id)\
        .eq('date_projected', today)\
        .execute()

    if not res.data:
        await update.message.reply_text(f"📅 Nenhuma transação hoje ({today}).")
        return

    lines = [f"📅 *Transações de hoje*\n"]
    for t in res.data:
        cats = CATS_EXP if t['type'] == 'expense' else CATS_INC
        cat = cats.get(t['category'], '📦 Outros')
        signal = '+' if t['type'] == 'income' else '-'
        status = '⏳' if t['status'] == 'projetado' else '✅'
        lines.append(f"{status} {cat} — *{signal}{fmt(t['amount'])}*")
        if t['description']:
            lines.append(f"   _{t['description']}_")

    await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')

async def cmd_pendentes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)
    if not user:
        await update.message.reply_text("❌ Conta não vinculada.")
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
        await update.message.reply_text("✅ Nenhum lançamento projetado pendente este mês!")
        return

    lines = [f"⏳ *Lançamentos pendentes*\n"]
    for t in res.data:
        cats = CATS_EXP if t['type'] == 'expense' else CATS_INC
        cat = cats.get(t['category'], '📦 Outros')
        signal = '+' if t['type'] == 'income' else '-'
        lines.append(f"• {cat} — *{signal}{fmt(t['amount'])}*")
        if t['description']:
            lines.append(f"  _{t['description']}_")
        lines.append(f"  📅 {t['date_projected']}")

    await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.effective_user.id
    user = get_user(telegram_id)

    if not user:
        await update.message.reply_text(
            "❌ Sua conta não está vinculada ao Kronava.\n"
            "Acesse o app e vincule seu Telegram."
        )
        return

    text = update.message.text
    await update.message.reply_text("⏳ Processando...")

    try:
        tx = parse_with_ai(text)

        amount = float(tx['amount'])
        tx_type = tx['type']
        category = tx['category']
        description = tx.get('description', '')
        status = tx.get('status', 'realizado')
        date = tx.get('date', datetime.now().strftime('%Y-%m-%d'))

        supabase.table('transactions').insert({
            'user_id': user['id'],
            'type': tx_type,
            'amount': amount,
            'description': description,
            'category': category,
            'status': status,
            'date_projected': date,
            'date_realized': date if status == 'realizado' else None,
            'is_recurring': False
        }).execute()

        cats = CATS_EXP if tx_type == 'expense' else CATS_INC
        cat_label = cats.get(category, '📦 Outros')
        signal = '+' if tx_type == 'income' else '-'
        status_icon = '⏳ Projetado' if status == 'projetado' else '✅ Realizado'

        await update.message.reply_text(
            f"{'💸' if tx_type == 'expense' else '💰'} *Lançamento salvo!*\n\n"
            f"📝 {description}\n"
            f"🏷️ {cat_label}\n"
            f"💵 *{signal}{fmt(amount)}*\n"
            f"📅 {date}\n"
            f"📌 {status_icon}",
            parse_mode='Markdown'
        )

    except Exception as e:
        print(f"Erro: {e}")
        await update.message.reply_text(
            "❌ Não consegui entender o lançamento.\n\n"
            "Tente ser mais específico, por exemplo:\n"
            "_\"Gastei 50 reais no supermercado\"_\n"
            "_\"Recebi meu salário de 3000 reais\"_",
            parse_mode='Markdown'
        )

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('saldo', cmd_saldo))
    app.add_handler(CommandHandler('mes', cmd_mes))
    app.add_handler(CommandHandler('hoje', cmd_hoje))
    app.add_handler(CommandHandler('pendentes', cmd_pendentes))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print('🤖 Kronava Bot iniciado!')
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()