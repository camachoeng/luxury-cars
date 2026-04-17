// ===== YMV Limo — i18n loader =====
// Translations live in src/i18n/{lang}/{page}.json
// Each page file wraps keys under the namespace (e.g. { "home": { "hero_title": "..." } })
// common.json is loaded on every page (contains: common, nav, footer)
//
// Usage:
//   import { initI18n, t, applyTranslations, getLang, setLang, localized } from './i18n.js'
//   await initI18n()        → loads common + page translations
//   t('home.hero_title')    → string
//   localized(row, 'description') → row.description_es (if ES) or row.description

const STORAGE_KEY    = 'ld_lang'
const DEFAULT_LANG   = 'en'
const SUPPORTED_LANGS = ['en', 'es']

let currentLang      = DEFAULT_LANG
let translations     = {}   // current language merged (common + page)
let enTranslations   = {}   // English fallback (always kept in memory)

// ── Page map ─────────────────────────────────────────────────────────────────
const pageMap = {
  '':                       'home',
  'index.html':             'home',
  'pages/fleet.html':       'fleet',
  'pages/checkout.html':    'checkout',
  'pages/login.html':       'login',
  'pages/register.html':    'register',
  'pages/my-bookings.html': 'bookings',
  'pages/about.html':       'about',
  'pages/contact.html':     'contact',
  'pages/reviews.html':     'reviews',
  'pages/404.html':         '404',
  'pages/legal.html':       'legal',
  'pages/driver.html':      'driver',
  'pages/admin.html':       'admin',
}

function getPageName() {
  const base       = import.meta.env.BASE_URL
  const normalized = window.location.pathname.replace(base, '').replace(/^\/+/, '')
  return pageMap[normalized] || 'home'
}

// ── Bundle loader ─────────────────────────────────────────────────────────────
async function loadBundle(lang, pageName) {
  const [common, page] = await Promise.all([
    import(`../i18n/${lang}/common.json`).then(m => m.default ?? m).catch(() => ({})),
    import(`../i18n/${lang}/${pageName}.json`).then(m => m.default ?? m).catch(() => ({})),
  ])
  return { ...common, ...page }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialize i18n — load common + page translations.
 * Must be called once from main.js before page init.
 */
export async function initI18n() {
  currentLang = getLang()
  document.documentElement.lang = currentLang

  const pageName = getPageName()

  if (currentLang === 'en') {
    enTranslations = await loadBundle('en', pageName)
    translations   = enTranslations
  } else {
    const [cur, en] = await Promise.all([
      loadBundle(currentLang, pageName),
      loadBundle('en', pageName),
    ])
    enTranslations = en
    translations   = cur
  }

  applyTranslations()
}

/**
 * Resolve a dot-notation key against the active language.
 * Falls back to English, then returns the key itself if missing.
 */
export function t(key) {
  const val = getNestedValue(translations, key)
  if (val !== undefined) return val
  const fallback = getNestedValue(enTranslations, key)
  return fallback ?? key
}

/**
 * Walk the DOM and apply translations to elements with data-i18n* attributes.
 */
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n)
    if (v !== el.dataset.i18n) el.textContent = v
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const v = t(el.dataset.i18nPlaceholder)
    if (v !== el.dataset.i18nPlaceholder) el.placeholder = v
  })
  // data-i18n-html: ONLY use for safe static translation strings, never user input
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = t(el.dataset.i18nHtml)
    if (v !== el.dataset.i18nHtml) el.innerHTML = v
  })
  updateLangToggle()
}

/**
 * Get current language code ('en' | 'es').
 */
export function getLang() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
}

/**
 * Switch language: reload translations, re-apply DOM, dispatch 'languageChanged'.
 * Also exported as setLang() for backward compatibility.
 */
export async function switchLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return

  localStorage.setItem(STORAGE_KEY, lang)
  currentLang = lang
  document.documentElement.lang = lang

  const pageName = getPageName()

  if (lang === 'en') {
    enTranslations = await loadBundle('en', pageName)
    translations   = enTranslations
  } else {
    const [cur, en] = await Promise.all([
      loadBundle(lang, pageName),
      loadBundle('en', pageName),
    ])
    enTranslations = en
    translations   = cur
  }

  applyTranslations()
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }))
}

/** Backward-compatible alias for switchLanguage (header.js calls setLang). */
export async function setLang(lang) {
  await switchLanguage(lang)
}

/**
 * Get a localized DB field (dual-column approach).
 * Tries item.field_es when lang=es, else returns item.field.
 * Example: localized(vehicle, 'description') → vehicle.description_es || vehicle.description
 */
export function localized(item, field) {
  if (currentLang === 'es') {
    const esVal = item[`${field}_es`]
    if (esVal) return esVal
  }
  return item[field] || ''
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getNestedValue(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
}

function updateLangToggle() {
  const btn = document.getElementById('lang-toggle')
  if (btn) btn.textContent = currentLang === 'en' ? 'ES' : 'EN'
}
