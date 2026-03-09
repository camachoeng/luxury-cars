// ===== YMV Limo — Stripe helper =====
// Loads Stripe.js via the official @stripe/stripe-js package (PCI-compliant).
// No <script> tag in HTML — the npm package handles loading internally.

import { loadStripe } from '@stripe/stripe-js'

let stripeInstance = null

/**
 * Returns the Stripe instance (singleton). Call once on page init.
 */
export async function initStripe() {
  if (!stripeInstance) {
    stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripeInstance
}

/**
 * Mounts a Stripe CardElement into #card-element.
 * Styled to match the dark YMV Limo theme.
 * Returns { elements, cardElement } so the caller can use them in confirmCardSetup.
 */
export function mountCardElement(stripe) {
  const elements = stripe.elements()

  const cardElement = elements.create('card', {
    style: {
      base: {
        color:          '#f1f5f9',
        fontFamily:     '"Plus Jakarta Sans", sans-serif',
        fontSize:       '15px',
        fontSmoothing:  'antialiased',
        iconColor:      '#C5A059',
        '::placeholder': { color: '#475569' },
      },
      invalid: {
        color:     '#f87171',
        iconColor: '#f87171',
      },
    },
  })

  cardElement.mount('#card-element')
  return { elements, cardElement }
}
