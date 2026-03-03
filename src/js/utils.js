/**
 * Escape HTML to prevent XSS when inserting user-controlled content into innerHTML
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Debounce a function call
 */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Format a price number as USD currency string
 */
export function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Generate a random booking reference
 */
export function generateBookingRef() {
  const year = new Date().getFullYear()
  const num = Math.floor(1000 + Math.random() * 9000)
  return `LD-${year}-${num}`
}

/**
 * Get booking data stored in sessionStorage from fleet selection
 */
export function getBookingData() {
  try {
    return JSON.parse(sessionStorage.getItem('ld_booking') || '{}')
  } catch {
    return {}
  }
}

/**
 * Save booking data to sessionStorage
 */
export function setBookingData(data) {
  sessionStorage.setItem('ld_booking', JSON.stringify(data))
}

/**
 * Get search params from sessionStorage (set on home page search)
 */
export function getSearchParams() {
  try {
    return JSON.parse(sessionStorage.getItem('ld_search') || '{}')
  } catch {
    return {}
  }
}

/**
 * Save search params to sessionStorage
 */
export function setSearchParams(data) {
  sessionStorage.setItem('ld_search', JSON.stringify(data))
}

/**
 * Clear all booking-flow session state (call after confirmed booking)
 */
export function clearBookingSession() {
  sessionStorage.removeItem('ld_booking')
  sessionStorage.removeItem('ld_search')
}
