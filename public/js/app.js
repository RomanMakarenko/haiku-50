/* =============================================
   Haiku 50 — Client-side logic
   Architecture based on Haiku-50 design
   Express backend integration
   ============================================= */

(function () {
  'use strict'

const LANGS = [
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "en", label: "English", native: "English" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "fr", label: "French", native: "Français" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

const SPICE = [
  "Calm, traditional, contemplative haiku about nature and transience.",
  "A light, quiet sketch with a gentle mood.",
  "Slightly unexpected, with subtle irony.",
  "Playful, with humor and a surprising twist.",
  "Bold and sharp, with an absurd image.",
  "Very spicy, chaotic, grotesque and funny.",
  "Maximum heat: absurd, chaotic, surreal and dark-humored — yet still three lines of haiku.",
];

const STORAGE_KEY = "haikuHistory";
const MAX_HISTORY = 100;
const TIMEOUT_MS = 30000;

const state = {
  keywords: "",
  lang: "",
  spice: 0,
  langOpen: false,
  resultState: "empty", // "empty" | "loading" | "error" | "done"
  errorMsg: "",
  lines: [],
  doneLang: "",
  doneSpice: "",
  history: [],
};

const els = {};

function labelOf(code) {
  const lang = LANGS.find((item) => item.code === code);
  return lang ? lang.label : "";
}

function phrases() {
  return state.keywords
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── Render functions ──────────────────────────────────────

function renderEmpty() {
  els.resultStage.innerHTML = `
    <div class="empty-state">
      <div class="empty-ring"></div>
      <div class="empty-title">No haiku yet</div>
      <div class="empty-copy">Enter your words and press "Generate"</div>
    </div>
  `;
  els.doneMeta.classList.add("is-hidden");
}

function renderLoading() {
  els.resultStage.innerHTML = `
    <div class="loader">
      <div class="loader-ring"></div>
      <div class="loader-text">Composing the lines…</div>
    </div>
  `;
  els.doneMeta.classList.add("is-hidden");
}

function renderError() {
  els.resultStage.innerHTML = `
    <div class="error-state">
      <div class="error-icon">!</div>
      <div class="error-text"></div>
    </div>
  `;
  els.resultStage.querySelector(".error-text").textContent = state.errorMsg;
  els.doneMeta.classList.add("is-hidden");
}

function renderDone() {
  els.resultStage.innerHTML = '<div class="done-state"></div>';
  const wrap = els.resultStage.querySelector(".done-state");

  state.lines.forEach((line) => {
    const item = document.createElement("div");
    item.className = "haiku-line";
    item.textContent = line;
    wrap.append(item);
  });

  els.doneMeta.innerHTML = "";
  const lang = document.createElement("span");
  lang.textContent = state.doneLang;
  const spice = document.createElement("span");
  spice.textContent = state.doneSpice;
  els.doneMeta.append(lang, spice);
  els.doneMeta.classList.remove("is-hidden");
}

function renderResult() {
  if (state.resultState === "loading") renderLoading();
  else if (state.resultState === "error") renderError();
  else if (state.resultState === "done") renderDone();
  else renderEmpty();
}

function renderKeywords() {
  if (els.keywords.value !== state.keywords) {
    els.keywords.value = state.keywords;
  }

  const count = phrases().length;
  els.countLabel.textContent =
    count === 0
      ? "3–7 needed"
      : count + (count >= 3 && count <= 7 ? " of 3–7 ✓" : " of 3–7");

  els.clearKeywords.disabled = count === 0;
}

function renderLanguage() {
  els.languageLabel.textContent = state.lang
    ? labelOf(state.lang)
    : "Choose language";
  els.languageButton.classList.toggle("has-value", Boolean(state.lang));
  els.languageButton.setAttribute("aria-expanded", String(state.langOpen));
  els.languageMenu.classList.toggle("is-hidden", !state.langOpen);
  els.languageMenu.innerHTML = "";

  LANGS.forEach((lang) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "language-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(state.lang === lang.code));
    option.innerHTML = `<span></span><span class="language-native"></span>`;
    option.children[0].textContent = lang.label;
    option.children[1].textContent = lang.native;
    option.addEventListener("click", () => {
      state.lang = lang.code;
      state.langOpen = false;
      render();
    });
    els.languageMenu.append(option);
  });
}

function renderWasabi() {
  els.wasabiDots.innerHTML = "";

  for (let index = 0; index < 6; index += 1) {
    const dot = document.createElement("span");
    dot.className = "wasabi-dot";
    dot.classList.toggle("is-active", index < state.spice);
    els.wasabiDots.append(dot);
  }

  els.spiceLabel.textContent = "Heat level: " + state.spice;
  els.spiceLabel.classList.toggle("is-active", state.spice > 0);
  els.spiceMax.classList.toggle("is-hidden", state.spice !== 6);
}

function renderHistory() {
  els.historyCount.textContent =
    state.history.length > 0 ? state.history.length + " saved" : "";
  els.historyEmpty.classList.toggle("is-hidden", state.history.length > 0);
  els.historyList.classList.toggle("is-hidden", state.history.length === 0);
  els.historyList.innerHTML = "";

  state.history.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "history-item";

    const lines = document.createElement("div");
    lines.className = "history-lines";
    item.lines.forEach((line) => {
      const row = document.createElement("div");
      row.textContent = line;
      lines.append(row);
    });

    const tags = document.createElement("div");
    tags.className = "history-tags";
    const lang = document.createElement("span");
    lang.textContent = item.langLabel;
    const spice = document.createElement("span");
    spice.textContent = "wasabi " + item.spice;
    const time = document.createElement("span");
    time.textContent = item.timeLabel;
    tags.append(lang, spice, time);

    card.append(lines, tags);
    els.historyList.append(card);
  });
}

function renderGenerateButton() {
  const loading = state.resultState === "loading";
  els.generateButton.textContent = loading ? "Generating…" : "Generate haiku";
  els.generateButton.disabled = loading;
}

function render() {
  renderResult();
  renderKeywords();
  renderLanguage();
  renderWasabi();
  renderHistory();
  renderGenerateButton();
}

// ─── Profanity Modal ──────────────────────────────────────

function showProfanityModal(words) {
  els.modalWordList.innerHTML = words
    .map((word) => `<span class="word-tag">${escapeHtml(word)}</span>`)
    .join("");
  els.profanityModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function hideProfanityModal() {
  els.profanityModal.hidden = true;
  document.body.style.overflow = "";
}

// ─── API call ─────────────────────────────────────────────

async function generateHaiku(keywords, language, spiciness) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, language, spiciness }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(
        data.error || "Something went wrong. Try again."
      );
      if (data.profanityWords) {
        err.profanityWords = data.profanityWords;
      }
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }

    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error(
        "Server is temporarily unavailable. Please try later."
      );
    }

    throw err;
  }
}

// ─── Main generate handler ────────────────────────────────

async function generate() {
  if (state.resultState === "loading") return;

  const parts = phrases();

  // Validation
  if (parts.length < 3) {
    state.resultState = "error";
    state.errorMsg = "Enter 3 to 7 words or short phrases";
    render();
    return;
  }

  if (parts.length > 7) {
    state.resultState = "error";
    state.errorMsg = "Too many — keep it to 7 words or phrases at most";
    render();
    return;
  }

  if (!state.lang) {
    state.resultState = "error";
    state.errorMsg = "Choose a generation language";
    render();
    return;
  }

  const langName = labelOf(state.lang);
  const spice = state.spice;

  state.resultState = "loading";
  state.errorMsg = "";
  render();

  try {
    const result = await generateHaiku(
      state.keywords,
      state.lang,
      state.spice
    );

    let lines = (result.haiku || "")
      .trim()
      .split("\n")
      .filter(Boolean);

    if (lines.length === 0) {
      lines = ["Silence", "where words should be", "a blank page"];
    }

    lines = lines.slice(0, 3);

    if (!result.fallback) {
      const date = new Date();
      const timeLabel =
        String(date.getHours()).padStart(2, "0") +
        ":" +
        String(date.getMinutes()).padStart(2, "0");
      const item = {
        id: Date.now(),
        lines,
        haiku: result.haiku,
        langLabel: langName,
        spice,
        timeLabel,
      };
      state.history = [item, ...state.history].slice(0, MAX_HISTORY);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
      } catch (_) {
        /* localStorage full or unavailable */
      }
    }

    state.resultState = "done";
    state.lines = lines;
    state.doneLang = langName;
    state.doneSpice = "wasabi " + spice;
    render();
  } catch (err) {
    if (err.profanityWords) {
      showProfanityModal(err.profanityWords);
      state.resultState = "empty";
      render();
      return;
    }

    state.resultState = "error";
    state.errorMsg = err.message;
    render();
  }
}

// ─── History persistence ──────────────────────────────────

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Backward compatibility: migrate old format entries
        state.history = parsed
          .map((item) => {
            // Already new format
            if (Array.isArray(item.lines)) return item;
            // Old format: { haiku, language, spiciness, keywords, timestamp }
            if (item.haiku) {
              const langNames = {
                uk: "Ukrainian", en: "English", de: "German",
                ja: "Japanese", fr: "French", es: "Spanish",
                it: "Italian", pt: "Portuguese", pl: "Polish",
                zh: "Chinese", ko: "Korean", ar: "Arabic",
              };
              const date = new Date(item.timestamp || Date.now());
              const timeLabel =
                String(date.getHours()).padStart(2, "0") + ":" +
                String(date.getMinutes()).padStart(2, "0");
              return {
                id: item.timestamp || Date.now(),
                lines: item.haiku.split("\n").filter(Boolean),
                haiku: item.haiku,
                langLabel: langNames[item.language] || item.language,
                spice: item.spiciness ?? 0,
                timeLabel,
              };
            }
            return null; // unknown format, skip
          })
          .filter(Boolean);
      }
    }
  } catch (_) {
    /* corrupted data, start fresh */
    state.history = [];
  }
}

// ─── DOM binding ──────────────────────────────────────────

function bindElements() {
  els.resultStage = document.getElementById("result-stage");
  els.doneMeta = document.getElementById("done-meta");
  els.keywords = document.getElementById("keywords");
  els.countLabel = document.getElementById("count-label");
  els.clearKeywords = document.getElementById("clear-keywords");
  els.languageButton = document.getElementById("language-button");
  els.languageLabel = document.getElementById("language-label");
  els.languageMenu = document.getElementById("language-menu");
  els.languageCard = document.getElementById("language-card");
  els.wasabiButton = document.getElementById("wasabi-button");
  els.wasabiDots = document.getElementById("wasabi-dots");
  els.spiceLabel = document.getElementById("spice-label");
  els.spiceMax = document.getElementById("spice-max");
  els.historyCount = document.getElementById("history-count");
  els.historyEmpty = document.getElementById("history-empty");
  els.historyList = document.getElementById("history-list");
  els.generateButton = document.getElementById("generate-button");
  els.clearHistoryBtn = document.getElementById("clear-history-btn");
  els.profanityModal = document.getElementById("profanityModal");
  els.modalCloseBtn = document.getElementById("modalCloseBtn");
  els.modalActionBtn = document.getElementById("modalActionBtn");
  els.modalWordList = document.getElementById("modalWordList");
  els.h50Screen = document.getElementById("h50-screen");
}

// ─── Event binding ────────────────────────────────────────

function bindEvents() {
  // Keywords input
  els.keywords.addEventListener("input", (event) => {
    state.keywords = event.target.value;
    renderKeywords();
  });

  // Language dropdown toggle
  els.languageButton.addEventListener("click", () => {
    state.langOpen = !state.langOpen;
    renderLanguage();
  });

  // Close language dropdown on outside click
  document.addEventListener("click", (event) => {
    if (!els.languageCard.contains(event.target) && state.langOpen) {
      state.langOpen = false;
      renderLanguage();
    }
  });

  // Wasabi cycling
  els.wasabiButton.addEventListener("click", () => {
    state.spice = state.spice < 6 ? state.spice + 1 : 0;
    renderWasabi();
  });

  // Generate
  els.generateButton.addEventListener("click", generate);

  // Clear keywords
  els.clearKeywords.addEventListener("click", () => {
    state.keywords = "";
    els.keywords.value = "";
    els.keywords.focus();
    renderKeywords();
  });

  // Clear history
  els.clearHistoryBtn.addEventListener("click", () => {
    state.history = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    renderHistory();
  });

  // Modal close buttons
  els.modalCloseBtn.addEventListener("click", hideProfanityModal);
  els.modalActionBtn.addEventListener("click", hideProfanityModal);

  // Close modal on overlay click
  els.profanityModal.addEventListener("click", (event) => {
    if (event.target === els.profanityModal) {
      hideProfanityModal();
    }
  });

  // Close modal on Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.profanityModal.hidden) {
      hideProfanityModal();
    }
  });

  // Enter key to submit
  els.keywords.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !els.generateButton.disabled) {
      event.preventDefault();
      els.generateButton.click();
    }
  });
}

// ─── Utility ──────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ─── Init ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  loadHistory();
  bindEvents();
  render();
});
})();