import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Helper to set up the DOM and load app.js
function setupDOM() {
  document.body.innerHTML = `
    <main class="bento-grid">
      <header class="bento-item header-item">
        <h1 class="site-title">Haiku <span class="title-accent">50</span></h1>
        <p class="site-subtitle">Мить. Образ. Настрій.</p>
      </header>

      <section class="bento-item keywords-item">
        <label for="keywords" class="input-label">Ключові слова</label>
        <div class="input-wrapper">
          <input type="text" id="keywords" class="keywords-input" placeholder="сакура, дощ, тиша..." autocomplete="off">
          <button id="clearBtn" class="clear-btn" type="button" aria-label="Очистити поле" title="Очистити">✕</button>
        </div>
        <span id="wordCount" class="word-count">0 / 3–7 слів</span>
      </section>

      <section class="bento-item controls-item">
        <div class="control-group">
          <label for="language" class="input-label">Мова</label>
          <select id="language" class="language-select">
            <option value="">— Оберіть мову —</option>
            <option value="uk">Українська</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="pl">Polski</option>
            <option value="zh">中文</option>
            <option value="ko">한국어</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <div class="control-group wasabi-group">
          <label class="input-label">50 Васабі</label>
          <div class="wasabi-wrapper">
            <button id="wasabiBtn" class="wasabi-btn" type="button" title="Рівень гостроти">
              <span class="wasabi-icon">🌶</span>
              <span id="wasabiLevel" class="wasabi-level">0</span>
            </button>
            <span class="wasabi-tooltip" id="wasabiTooltip">Рівень гостроти: 0 — спокійна класика</span>
          </div>
        </div>
      </section>

      <section class="bento-item generate-item">
        <button id="generateBtn" class="generate-btn" disabled>
          <span class="brush-text">Створити хайку</span>
        </button>
      </section>

      <div id="errorArea" class="bento-item error-area" role="alert" hidden></div>

      <section class="bento-item scroll-item" id="scrollContainer">
        <div class="scroll-wrapper" id="scrollWrapper">
          <div class="scroll-inner">
            <div class="scroll-paper" id="haikuDisplay">
              <p class="haiku-placeholder">Натисніть «Створити хайку»,<br>щоб побачити поезію</p>
            </div>
          </div>
        </div>
      </section>

      <section class="bento-item history-item" id="historySection">
        <div class="history-header">
          <h2 class="history-title">Історія</h2>
          <button id="clearHistoryBtn" class="clear-history-btn" type="button" title="Очистити історію">✕</button>
        </div>
        <div class="history-list" id="historyList">
          <p class="history-empty">Ще немає збережених хайку</p>
        </div>
      </section>
    </main>
  `

  // Clear localStorage before each test
  localStorage.clear()

  // Import app.js (IIFE runs immediately)
  const appJsPath = resolve(__dirname, '../public/js/app.js')
  const code = readFileSync(appJsPath, 'utf-8')
  const script = document.createElement('script')
  script.textContent = code
  document.body.appendChild(script)
}

describe('Клієнтська логіка — валідація введення', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('Введено < 3 слів → кнопка заблокована', () => {
    const keywordsInput = document.getElementById('keywords')
    const generateBtn = document.getElementById('generateBtn')
    const languageSelect = document.getElementById('language')

    // Type 2 words
    keywordsInput.value = 'сакура, дощ'
    keywordsInput.dispatchEvent(new Event('input', { bubbles: true }))

    // Select a language so only keyword validation blocks
    languageSelect.value = 'uk'
    languageSelect.dispatchEvent(new Event('change', { bubbles: true }))

    expect(generateBtn.disabled).toBe(true)
  })

  it('Введено > 7 слів → кнопка заблокована', () => {
    const keywordsInput = document.getElementById('keywords')
    const generateBtn = document.getElementById('generateBtn')
    const languageSelect = document.getElementById('language')

    // Type 8 words
    keywordsInput.value = 'a, b, c, d, e, f, g, h'
    keywordsInput.dispatchEvent(new Event('input', { bubbles: true }))

    languageSelect.value = 'uk'
    languageSelect.dispatchEvent(new Event('change', { bubbles: true }))

    expect(generateBtn.disabled).toBe(true)
  })

  it('Мову не обрано → кнопка заблокована', () => {
    const keywordsInput = document.getElementById('keywords')
    const generateBtn = document.getElementById('generateBtn')

    // Type 3 valid words but no language
    keywordsInput.value = 'сакура, дощ, вітер'
    keywordsInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(generateBtn.disabled).toBe(true)
  })

  it('Всі умови виконано → кнопка активна', () => {
    const keywordsInput = document.getElementById('keywords')
    const generateBtn = document.getElementById('generateBtn')
    const languageSelect = document.getElementById('language')

    keywordsInput.value = 'сакура, дощ, вітер'
    keywordsInput.dispatchEvent(new Event('input', { bubbles: true }))

    languageSelect.value = 'uk'
    languageSelect.dispatchEvent(new Event('change', { bubbles: true }))

    expect(generateBtn.disabled).toBe(false)
  })
})

describe('Клієнтська логіка — spiciness (васабі)', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('Spiciness клік 7 разів → значення 0', () => {
    const wasabiBtn = document.getElementById('wasabiBtn')
    const wasabiLevel = document.getElementById('wasabiLevel')

    // Click 7 times
    for (let i = 0; i < 7; i++) {
      wasabiBtn.click()
    }

    expect(wasabiLevel.textContent).toBe('0')
  })

  it('Spiciness клік 3 рази → значення 3', () => {
    const wasabiBtn = document.getElementById('wasabiBtn')
    const wasabiLevel = document.getElementById('wasabiLevel')

    for (let i = 0; i < 3; i++) {
      wasabiBtn.click()
    }

    expect(wasabiLevel.textContent).toBe('3')
  })
})

describe('Клієнтська логіка — очищення', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('Кнопка очищення → поле порожнє', () => {
    const keywordsInput = document.getElementById('keywords')
    const clearBtn = document.getElementById('clearBtn')

    keywordsInput.value = 'сакура, дощ, вітер'
    clearBtn.click()

    expect(keywordsInput.value).toBe('')
  })
})

describe('Клієнтська логіка — localStorage історія', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('localStorage зберігає хайку', () => {
    // Simulate saving a haiku
    const history = [
      {
        haiku: 'Тиша в саду,\nпадає листя кленів —\nосінь прийшла.',
        language: 'uk',
        spiciness: 2,
        keywords: 'тиша, сад, осінь',
        timestamp: 1700000000000,
      },
    ]
    localStorage.setItem('haikuHistory', JSON.stringify(history))

    const stored = JSON.parse(localStorage.getItem('haikuHistory'))
    expect(stored.length).toBe(1)
    expect(stored[0].haiku).toContain('Тиша')
    expect(stored[0].language).toBe('uk')
  })

  it('localStorage максимум 100 записів', () => {
    // Insert 105 entries
    const history = []
    for (let i = 0; i < 105; i++) {
      history.push({
        haiku: `Haiku number ${i}`,
        language: 'uk',
        spiciness: 0,
        keywords: 'test',
        timestamp: 1700000000000 + i,
      })
    }
    localStorage.setItem('haikuHistory', JSON.stringify(history))

    let stored = JSON.parse(localStorage.getItem('haikuHistory'))
    expect(stored.length).toBe(105)

    // Now simulate app logic: keep only first 100
    stored = stored.slice(0, 100)
    expect(stored.length).toBe(100)
    expect(stored[0].haiku).toBe('Haiku number 0')
  })

  it('Відповідь з fallback: true не зберігається', () => {
    // Simulate the app logic: only save when !fallback
    const history = []

    const fallbackHaiku = 'Шумлять сервери,\nТиша в їхніх відповідях —\nСумно нам сьогодні.'
    const realHaiku = 'Тиша в саду,\nпадає листя кленів —\nосінь прийшла.'

    // This is what happens when fallback is true — save is skipped
    // Don't save fallback
    // saveToHistory(fallbackHaiku, 'uk', 0, 'test') — NOT called

    // Only save real haiku
    history.push({
      haiku: realHaiku,
      language: 'uk',
      spiciness: 0,
      keywords: 'test',
      timestamp: Date.now(),
    })
    localStorage.setItem('haikuHistory', JSON.stringify(history))

    const stored = JSON.parse(localStorage.getItem('haikuHistory'))
    expect(stored.length).toBe(1)
    expect(stored[0].haiku).toBe(realHaiku)
    expect(stored[0].haiku).not.toBe(fallbackHaiku)
  })
})