/* =============================================
   Haiku 50 — Client-side logic
   ============================================= */

(function () {
  'use strict'

  // --- DOM refs ---
  const keywordsInput = document.getElementById('keywords')
  const clearBtn = document.getElementById('clearBtn')
  const wordCount = document.getElementById('wordCount')
  const languageSelect = document.getElementById('language')
  const wasabiBtn = document.getElementById('wasabiBtn')
  const wasabiLevel = document.getElementById('wasabiLevel')
  const wasabiTooltip = document.getElementById('wasabiTooltip')
  const generateBtn = document.getElementById('generateBtn')
  const errorArea = document.getElementById('errorArea')
  const haikuDisplay = document.getElementById('haikuDisplay')
  const historyList = document.getElementById('historyList')
  const clearHistoryBtn = document.getElementById('clearHistoryBtn')

  // --- State ---
  let spiciness = 0
  const STORAGE_KEY = 'haikuHistory'
  const MAX_HISTORY = 100
  const TIMEOUT_MS = 30000
  const TOOLTIPS = [
    'Рівень гостроти: 0 — спокійна класика',
    'Рівень гостроти: 1 — ледь відчутна нотка',
    'Рівень гостроти: 2 — легке пожвавлення',
    'Рівень гостроти: 3 — середня гострота',
    'Рівень гостроти: 4 — гаряче, майже пекучо',
    'Рівень гостроти: 5 — дуже гостро!',
    'Рівень гостроти: 6 — максимальний васабі!',
  ]

  // --- Word count & validation ---
  function getWordCount() {
    const text = keywordsInput.value.trim()
    if (!text) return 0
    return text.split(',').map(w => w.trim()).filter(Boolean).length
  }

  function hasMinWords() {
    return getWordCount() >= 3
  }

  function hasMaxWords() {
    return getWordCount() > 7
  }

  function hasLanguage() {
    return languageSelect.value !== ''
  }

  function updateWordCount() {
    const count = getWordCount()
    wordCount.textContent = `${count} / 3–7 слів`
  }

  function updateGenerateButton() {
    const errors = []

    if (!hasMinWords()) {
      errors.push('Введіть щонайменше 3 ключові слова або фрази')
    }
    if (hasMaxWords()) {
      errors.push('Не більше 7 ключових слів або фраз')
    }
    if (!hasLanguage()) {
      errors.push('Оберіть мову генерації')
    }

    if (errors.length === 0) {
      generateBtn.disabled = false
      hideError()
    } else {
      generateBtn.disabled = true
      // Show the first relevant error
      if (hasMaxWords()) {
        showError('Не більше 7 ключових слів або фраз')
      } else if (!hasMinWords()) {
        showError('Введіть щонайменше 3 ключові слова або фрази')
      } else if (!hasLanguage()) {
        showError('Оберіть мову генерації')
      }
    }
  }

  // --- Error display ---
  function showError(message) {
    errorArea.textContent = message
    errorArea.hidden = false
  }

  function hideError() {
    errorArea.textContent = ''
    errorArea.hidden = true
  }

  // --- Wasabi (spiciness) ---
  function updateWasabi() {
    wasabiLevel.textContent = spiciness
    wasabiBtn.dataset.level = spiciness
    wasabiTooltip.textContent = TOOLTIPS[spiciness]

    // Update wasabi icon intensity
    const icon = wasabiBtn.querySelector('.wasabi-icon')
    if (spiciness <= 2) {
      icon.textContent = '🌶'
    } else if (spiciness <= 4) {
      icon.textContent = '🌶🌶'
    } else {
      icon.textContent = '🌶🌶🌶'
    }
  }

  function cycleWasabi() {
    spiciness = (spiciness + 1) % 7
    updateWasabi()
  }

  // --- History ---
  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  function saveToHistory(haiku, language, spiciness, keywords) {
    let history = getHistory()

    const entry = {
      haiku,
      language,
      spiciness,
      keywords,
      timestamp: Date.now(),
    }

    history.unshift(entry)

    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY)
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      // localStorage might be full
    }

    renderHistory()
  }

  function renderHistory() {
    const history = getHistory()

    if (history.length === 0) {
      historyList.innerHTML = '<p class="history-empty">Ще немає збережених хайку</p>'
      return
    }

    historyList.innerHTML = history.map((entry, index) => {
      const firstLine = entry.haiku.split('\n')[0]
      const langNames = {
        uk: 'Укр', en: 'Eng', de: 'Deu', ja: '日', fr: 'Fra',
        es: 'Esp', it: 'Ita', pt: 'Por', pl: 'Pol', zh: '中', ko: '한', ar: 'ع',
      }
      const langLabel = langNames[entry.language] || entry.language
      return `
        <div class="history-entry" data-index="${index}">
          <div class="history-entry-text">${escapeHtml(firstLine)}</div>
          <div class="history-entry-meta">
            <span>🌶 ${entry.spiciness}</span>
            <span>${langLabel}</span>
          </div>
        </div>
      `
    }).join('')

    // Click to show full haiku in scroll
    historyList.querySelectorAll('.history-entry').forEach((el) => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index, 10)
        const history = getHistory()
        if (history[index]) {
          displayHaiku(history[index].haiku, false)
        }
      })
    })
  }

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    renderHistory()
  }

  // --- Display haiku in scroll ---
  function displayHaiku(haiku, isFallback) {
    let html = ''
    if (isFallback) {
      html += '<span class="fallback-badge">⚡ fallback</span><br>'
    }
    html += `<span class="haiku-text">${escapeHtml(haiku)}</span>`
    haikuDisplay.innerHTML = html

    // Add unrolled class for animation
    const scrollWrapper = document.getElementById('scrollWrapper')
    scrollWrapper.classList.add('unrolled')
  }

  function displayPlaceholder() {
    haikuDisplay.innerHTML = '<p class="haiku-placeholder">Натисніть «Створити хайку»,<br>щоб побачити поезію</p>'
  }

  // --- API call ---
  async function generateHaiku(keywords, language, spiciness) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, language, spiciness }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Щось пішло не за планом. Спробуйте пізніше.')
      }

      return data
    } catch (err) {
      clearTimeout(timeout)

      if (err.name === 'AbortError') {
        throw new Error('Запит зайняв занадто багато часу. Спробуйте ще раз.')
      }

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error('Сервер тимчасово недоступний. Спробуйте пізніше.')
      }

      throw err
    }
  }

  // --- Generate button handler ---
  async function handleGenerate() {
    hideError()

    const keywords = keywordsInput.value.trim()
    const language = languageSelect.value
    const count = getWordCount()

    // Client-side validation (should already be prevented by disabled button)
    if (count < 3 || count > 7 || !language) {
      return
    }

    // Loading state
    generateBtn.classList.add('loading')
    generateBtn.disabled = true

    try {
      const result = await generateHaiku(keywords, language, spiciness)

      displayHaiku(result.haiku, result.fallback)

      if (!result.fallback) {
        saveToHistory(result.haiku, language, spiciness, keywords)
      }
    } catch (err) {
      showError(err.message)
      displayPlaceholder()
    } finally {
      generateBtn.classList.remove('loading')
      // Re-enable if validation passes
      updateGenerateButton()
    }
  }

  // --- Utility ---
  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // --- Event listeners ---
  keywordsInput.addEventListener('input', () => {
    updateWordCount()
    updateGenerateButton()
  })

  clearBtn.addEventListener('click', () => {
    keywordsInput.value = ''
    keywordsInput.focus()
    updateWordCount()
    updateGenerateButton()
    hideError()
  })

  languageSelect.addEventListener('change', () => {
    updateGenerateButton()
    hideError()
  })

  wasabiBtn.addEventListener('click', cycleWasabi)

  generateBtn.addEventListener('click', handleGenerate)

  clearHistoryBtn.addEventListener('click', () => {
    clearHistory()
  })

  // Allow Enter key to submit
  keywordsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !generateBtn.disabled) {
      e.preventDefault()
      generateBtn.click()
    }
  })

  // --- Initialization ---
  function init() {
    updateWasabi()
    updateWordCount()
    updateGenerateButton()
    renderHistory()
    displayPlaceholder()
  }

  init()
})()