import express from 'express'
import OpenAI from 'openai'

const app = express()
app.use(express.json())
app.use(express.static('public'))

const VALID_LANGUAGES = ['uk', 'en', 'de', 'ja', 'fr', 'es', 'it', 'pt', 'pl', 'zh', 'ko', 'ar']

const PROFANITY_LIST = [
  // Ukrainian
  'хуй', 'пизда', 'блядь', 'нахуй', 'пізда', 'хер', 'залупа', 'мудак',
  'гандон', 'шлюха', 'сука', 'тварь', 'ублюдок', 'дебіл', 'довбойоб',
  'єбать', 'єбаний', 'підар', 'підорас', 'срака', 'гівно', 'кацап',
  'москаль', 'чмо', 'лох', 'бздун', 'перд', 'сцикло',
  // Russian (also filtered for safety)
  'хуй', 'пизда', 'блядь', 'нахуй', 'пізда', 'хер', 'залупа', 'мудак',
  'гандон', 'шлюха', 'сука', 'тварь', 'ублюдок', 'дебіл', 'довбойоб',
  'ебать', 'ебанный', 'пидор', 'пидорас', 'говно', 'срака',
  // English
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cock',
  'cunt', 'whore', 'slut', 'motherfucker', 'piss', 'damn',
  // Aggressive phrases
  'убий', 'вбий', 'зґвалтуй', 'вдар', 'удар', 'кров', 'смерть',
  'kill', 'murder', 'rape', 'die',
]

const FALLBACK_HAIKUS = {
  uk: 'Шумлять сервери,\nТиша в їхніх відповідях —\nСумно нам сьогодні.',
  en: 'Servers hum in vain,\nSilence where the words should be —\nSadly we apologize.',
  de: 'Server rauschen leer,\nStille statt der Poesie —\nBitte hab Geduld.',
  ja: 'サーバーが沈み、\n言葉の代わりに静けさ —\n申し訳ありません。',
  fr: 'Les serveurs sont las,\nLe silence fait son œuvre —\nNous sommes désolés.',
  es: 'Los servidores\nen silencio responden —\nLo sentimos.',
  it: 'I server tacciono,\nnessuna poesia arriva —\nCi dispiace molto.',
  pt: 'Servidores mudos,\nO silêncio é a resposta —\nNos desculpemos.',
  pl: 'Serwery śpią,\nCisza zamiast wiersza —\nPrzepraszamy.',
  zh: '服务器沉默，\n寂静代替了诗句 —\n我们很抱歉。',
  ko: '서버가 조용합니다,\n시 대신 침묵이 —\n죄송합니다.',
  ar: 'الخوادم صامتة،\nالصمت بدل الشعر —\nنحن آسفون.',
}

function buildPrompt(keywords, language, spiciness) {
  return [
    `Ти — японський поет. Напиши хайку мовою ${language} на основі слів: ${keywords}.`,
    `Рівень гостроти (spiciness): ${spiciness}.`,
    '0 = класичний спокійний вірш, 6 = максимально гострий — грайливий, абсурдний, непередбачуваний текст.',
    'Хайку має бути з трьох рядків. Суворий 5-7-5 не потрібен.',
    'Не використовуй мат, агресію, образи або заборонений контент.',
    'Якщо ключові слова провокаційні — створи безпечний, поетичний текст на основі їхнього образу.',
    'Поверни ТІЛЬКИ три рядки хайку, без додаткового тексту.',
  ].join('\n')
}

function containsProfanity(text) {
  const lower = text.toLowerCase()
  return PROFANITY_LIST.some(word => lower.includes(word))
}

function validate({ keywords, language, spiciness }) {
  if (!keywords || typeof keywords !== 'string') {
    return { valid: false, error: 'Введіть щонайменше 3 ключові слова або фрази' }
  }

  const wordCount = keywords.split(',').map(w => w.trim()).filter(Boolean).length

  if (wordCount < 3) {
    return { valid: false, error: 'Введіть щонайменше 3 ключові слова або фрази' }
  }

  if (wordCount > 7) {
    return { valid: false, error: 'Не більше 7 ключових слів або фраз' }
  }

  if (!language || typeof language !== 'string') {
    return { valid: false, error: 'Оберіть мову генерації' }
  }

  if (!VALID_LANGUAGES.includes(language)) {
    return { valid: false, error: 'Мова не підтримується. Виберіть одну з: ' + VALID_LANGUAGES.join(', ') }
  }

  if (spiciness === undefined || spiciness === null || typeof spiciness !== 'number') {
    return { valid: false, error: 'Рівень гостроти має бути числом від 0 до 6' }
  }

  if (!Number.isInteger(spiciness) || spiciness < 0 || spiciness > 6) {
    return { valid: false, error: 'Рівень гостроти має бути числом від 0 до 6' }
  }

  if (containsProfanity(keywords)) {
    return { valid: false, error: 'Видаліть нецензурні або агресивні слова' }
  }

  return { valid: true }
}

async function callOpenAI(keywords, language, spiciness) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const openai = new OpenAI({ apiKey })

  const prompt = buildPrompt(keywords, language, spiciness)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await openai.chat.completions.create(
      {
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          { role: 'system', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.8,
      },
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const haiku = response.choices?.[0]?.message?.content?.trim()

    if (!haiku) {
      throw new Error('Empty response from OpenAI')
    }

    if (containsProfanity(haiku)) {
      throw new Error('Generated content contains profanity')
    }

    return haiku
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

app.post('/api/generate', async (req, res) => {
  try {
    const validation = validate(req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    const { keywords, language, spiciness } = req.body

    let haiku
    try {
      haiku = await callOpenAI(keywords, language, spiciness)
    } catch (err) {
      const fallback = FALLBACK_HAIKUS[language] || FALLBACK_HAIKUS.uk
      return res.status(200).json({ haiku: fallback, fallback: true })
    }

    return res.status(200).json({ haiku, fallback: false })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: 'Щось пішло не за планом. Спробуйте пізніше.' })
  }
})

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`)
  })
}

export default app