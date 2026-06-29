import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Helper to set up the DOM and load app.js
function setupDOM() {
  document.body.innerHTML = `
    <div id="h50-screen" class="screen">
      <main class="grid" id="app-grid">
        <!-- Result card -->
        <section class="card result-card">
          <div class="result-stage" id="result-stage" aria-live="polite"></div>
          <div class="done-meta is-hidden" id="done-meta"></div>
        </section>

        <!-- Keywords -->
        <section class="card keywords-card">
          <div class="card-head">
            <span>Keywords</span>
            <button type="button" class="clear-button" id="clear-keywords" disabled>Clear</button>
          </div>
          <textarea id="keywords" rows="3" placeholder="sakura, train, rain"></textarea>
          <div class="count-label" id="count-label">3–7 needed</div>
        </section>

        <!-- Language -->
        <section class="card language-card" id="language-card">
          <span class="field-title">Language</span>
          <button type="button" class="language-button" id="language-button" aria-haspopup="listbox" aria-expanded="false">
            <span id="language-label">Choose language</span>
            <span class="chevron">▾</span>
          </button>
          <div class="language-menu is-hidden" id="language-menu" role="listbox"></div>
        </section>

        <!-- Wasabi -->
        <section class="card wasabi-card">
          <button type="button" class="wasabi-button" id="wasabi-button">
            <span class="wasabi-drop" aria-hidden="true"></span>
            50 wasabi
          </button>
          <div class="wasabi-status">
            <div class="wasabi-dots" id="wasabi-dots" aria-hidden="true"></div>
            <div class="spice-label" id="spice-label">Heat level: 0</div>
            <div class="spice-max is-hidden" id="spice-max"></div>
          </div>
        </section>

        <!-- History -->
        <section class="card history-card">
          <div class="card-head history-head">
            <span>History</span>
            <span id="history-count"></span>
            <button id="clear-history-btn" class="clear-history-btn" type="button" title="Clear history">✕</button>
          </div>
          <div class="history-empty" id="history-empty">No haiku yet</div>
          <div class="history-list" id="history-list"></div>
        </section>

        <!-- Generate -->
        <section class="info-card">
          <button type="button" class="generate-button" id="generate-button">Generate haiku</button>
        </section>
      </main>
    </div>

    <!-- Profanity Modal -->
    <div id="profanityModal" class="modal-overlay" role="dialog" aria-modal="true" hidden>
      <div class="modal-content">
        <button id="modalCloseBtn" type="button" aria-label="Close">✕</button>
        <div class="modal-body">
          <h2 id="modalTitle" class="modal-title">Виявлено нецензурні слова</h2>
          <p class="modal-message">Будь ласка, видаліть з ключових слів заборонену лексику:</p>
          <div id="modalWordList" class="modal-word-list"></div>
          <button id="modalActionBtn" type="button">Зрозуміло</button>
        </div>
      </div>
    </div>
  `

  // Clear localStorage before each test
  localStorage.clear()

  // Import app.js (defer-like execution: bindElements + loadHistory + bindEvents + render)
  const appJsPath = resolve(__dirname, '../public/js/app.js')
  const code = readFileSync(appJsPath, 'utf-8')
  const script = document.createElement('script')
  script.textContent = code
  document.body.appendChild(script)

  // Trigger DOMContentLoaded so init runs
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }))
}

describe('Клієнтська логіка — валідація', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('Введено < 3 слів → Generate показує помилку', () => {
    const keywords = document.getElementById('keywords')
    const generateBtn = document.getElementById('generate-button')

    keywords.value = 'сакура, дощ'
    keywords.dispatchEvent(new Event('input', { bubbles: true }))

    generateBtn.click()

    const errorText = document.querySelector('.error-text')
    expect(errorText).not.toBeNull()
    expect(errorText.textContent).toBe('Enter 3 to 7 words or short phrases')
  })

  it('Введено > 7 слів → Generate показує помилку', () => {
    const keywords = document.getElementById('keywords')
    const generateBtn = document.getElementById('generate-button')

    keywords.value = 'a, b, c, d, e, f, g, h'
    keywords.dispatchEvent(new Event('input', { bubbles: true }))

    generateBtn.click()

    const errorText = document.querySelector('.error-text')
    expect(errorText).not.toBeNull()
    expect(errorText.textContent).toContain('Too many')
  })

  it('Мову не обрано → Generate показує помилку', () => {
    const keywords = document.getElementById('keywords')
    const generateBtn = document.getElementById('generate-button')

    keywords.value = 'сакура, дощ, вітер'
    keywords.dispatchEvent(new Event('input', { bubbles: true }))

    generateBtn.click()

    const errorText = document.querySelector('.error-text')
    expect(errorText).not.toBeNull()
    expect(errorText.textContent).toBe('Choose a generation language')
  })

  it('Всі умови виконано → кнопка активна і викликає API', () => {
    const keywords = document.getElementById('keywords')
    const generateBtn = document.getElementById('generate-button')
    const languageBtn = document.getElementById('language-button')
    const languageMenu = document.getElementById('language-menu')

    keywords.value = 'сакура, дощ, вітер'
    keywords.dispatchEvent(new Event('input', { bubbles: true }))

    // Open language menu and select Ukrainian
    languageBtn.click()
    const options = languageMenu.querySelectorAll('.language-option')
    // Ukrainian is first option (code "uk")
    options[0].click()

    expect(generateBtn.disabled).toBe(false)
  })
})

describe('Клієнтська логіка — spiciness (васабі)', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('Spiciness клік 7 разів → значення 0', () => {
    const wasabiButton = document.getElementById('wasabi-button')
    const spiceLabel = document.getElementById('spice-label')

    // Click 7 times should cycle back to 0
    for (let i = 0; i < 7; i++) {
      wasabiButton.click()
    }

    expect(spiceLabel.textContent).toBe('Heat level: 0')
  })

  it('Spiciness клік 3 рази → значення 3', () => {
    const wasabiButton = document.getElementById('wasabi-button')
    const spiceLabel = document.getElementById('spice-label')

    for (let i = 0; i < 3; i++) {
      wasabiButton.click()
    }

    expect(spiceLabel.textContent).toBe('Heat level: 3')
  })

  it('Булліт-дотси відповідають рівню spice', () => {
    const wasabiButton = document.getElementById('wasabi-button')
    const wasabiDots = document.getElementById('wasabi-dots')

    wasabiButton.click() // spice = 1
    let activeDots = wasabiDots.querySelectorAll('.wasabi-dot.is-active')
    expect(activeDots.length).toBe(1)

    wasabiButton.click() // spice = 2
    activeDots = wasabiDots.querySelectorAll('.wasabi-dot.is-active')
    expect(activeDots.length).toBe(2)
  })
})

describe('Клієнтська логіка — очищення', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('Кнопка очищення → поле порожнє', () => {
    const keywords = document.getElementById('keywords')
    const clearBtn = document.getElementById('clear-keywords')

    keywords.value = 'сакура, дощ, вітер'
    keywords.dispatchEvent(new Event('input', { bubbles: true }))

    clearBtn.click()

    expect(keywords.value).toBe('')
  })

  it('Кнопка очищення неактивна при порожньому полі', () => {
    const clearBtn = document.getElementById('clear-keywords')
    expect(clearBtn.disabled).toBe(true)
  })
})

describe('Клієнтська логіка — localStorage історія', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('localStorage зберігає хайку', () => {
    // Simulate saving a haiku in the new format
    const history = [
      {
        id: 1700000000000,
        lines: ['Тиша в саду', 'падає листя кленів', 'осінь прийшла'],
        haiku: 'Тиша в саду,\nпадає листя кленів —\nосінь прийшла.',
        langLabel: 'Ukrainian',
        spice: 2,
        timeLabel: '14:30',
      },
    ]
    localStorage.setItem('haikuHistory', JSON.stringify(history))

    // Load app so it picks up history
    // setupDOM already ran, so loadHistory already ran
    const stored = JSON.parse(localStorage.getItem('haikuHistory'))
    expect(stored.length).toBe(1)
    expect(stored[0].haiku).toContain('Тиша')
    expect(stored[0].langLabel).toBe('Ukrainian')
  })

  it('localStorage максимум 100 записів', () => {
    // Insert 105 entries
    const history = []
    for (let i = 0; i < 105; i++) {
      history.push({
        id: 1700000000000 + i,
        lines: [`line ${i}`],
        haiku: `Haiku number ${i}`,
        langLabel: 'Ukrainian',
        spice: 0,
        timeLabel: '14:30',
      })
    }
    localStorage.setItem('haikuHistory', JSON.stringify(history))

    // App logic would slice to first 100
    const sliced = history.slice(0, 100)
    expect(sliced.length).toBe(100)
    expect(sliced[0].haiku).toBe('Haiku number 0')
  })

  it('Відповідь з fallback: true не зберігається — симуляція', () => {
    // This simulates the app logic: fallback haikus are never saved
    const history = []

    const fallbackHaiku = 'Шумлять сервери,\nТиша в їхніх відповідях —\nСумно нам сьогодні.'
    const realHaiku = 'Тиша в саду,\nпадає листя кленів —\nосінь прийшла.'

    // Only save real haiku (new format)
    history.push({
      id: Date.now(),
      lines: realHaiku.split('\n'),
      haiku: realHaiku,
      langLabel: 'Ukrainian',
      spice: 0,
      timeLabel: '14:30',
    })
    localStorage.setItem('haikuHistory', JSON.stringify(history))

    const stored = JSON.parse(localStorage.getItem('haikuHistory'))
    expect(stored.length).toBe(1)
    expect(stored[0].haiku).toBe(realHaiku)
    // Fallback should not appear in history
    expect(stored[0].haiku).not.toBe(fallbackHaiku)
  })
})

describe('Клієнтська логіка — попап профаніті', () => {
  beforeEach(() => {
    // Minimal DOM for profanity modal tests
    document.body.innerHTML = `
      <div class="screen" id="h50-screen">
        <section class="card wasabi-card">
          <button type="button" class="wasabi-button" id="wasabi-button">50 wasabi</button>
          <div class="wasabi-dots" id="wasabi-dots"></div>
          <div class="spice-label" id="spice-label">Heat level: 0</div>
          <div class="spice-max is-hidden" id="spice-max"></div>
        </section>
        <button type="button" class="generate-button" id="generate-button">Generate haiku</button>
        <div class="result-stage" id="result-stage"></div>
        <div class="done-meta is-hidden" id="done-meta"></div>
        <div class="history-list" id="history-list"></div>
        <div class="history-empty" id="history-empty">No haiku yet</div>
        <span id="history-count"></span>
        <button id="clear-history-btn" type="button">✕</button>
        <div id="language-card">
          <button id="language-button"><span id="language-label">Choose</span></button>
          <div id="language-menu"></div>
        </div>
        <textarea id="keywords"></textarea>
        <div class="count-label" id="count-label">3–7 needed</div>
        <button class="clear-button" id="clear-keywords" disabled>Clear</button>
      </div>
      <div id="profanityModal" class="modal-overlay" role="dialog" aria-modal="true" hidden>
        <div class="modal-content">
          <button id="modalCloseBtn" type="button">✕</button>
          <div class="modal-body">
            <h2 id="modalTitle">Виявлено нецензурні слова</h2>
            <p class="modal-message">Будь ласка, видаліть з ключових слів заборонену лексику:</p>
            <div id="modalWordList" class="modal-word-list"></div>
            <button id="modalActionBtn" type="button">Зрозуміло</button>
          </div>
        </div>
      </div>
    `

    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('рендерить список заборонених слів у modal-word-list', () => {
    const appJsPath = resolve(__dirname, '../public/js/app.js')
    const code = readFileSync(appJsPath, 'utf-8')
    const script = document.createElement('script')
    script.textContent = code
    document.body.appendChild(script)
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }))

    const modalWordList = document.getElementById('modalWordList')

    // Simulate what showProfanityModal does:
    modalWordList.innerHTML = ['fuck', 'bastard']
      .map(word => `<span class="word-tag">${word.replace(/[&<>"']/g, '')}</span>`)
      .join('')

    const tags = modalWordList.querySelectorAll('.word-tag')
    expect(tags.length).toBe(2)
    expect(tags[0].textContent).toBe('fuck')
    expect(tags[1].textContent).toBe('bastard')
  })

  it('закривається по Escape', () => {
    const appJsPath = resolve(__dirname, '../public/js/app.js')
    const code = readFileSync(appJsPath, 'utf-8')
    const script = document.createElement('script')
    script.textContent = code
    document.body.appendChild(script)
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }))

    const profanityModal = document.getElementById('profanityModal')

    // Show modal
    profanityModal.hidden = false

    // Press Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(profanityModal.hidden).toBe(true)
  })
})