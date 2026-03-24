// ===== YMV Limo — Reviews Page =====
//
// SUPABASE SETUP REQUIRED (run in SQL Editor):
//
//   CREATE TABLE reviews (
//     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//     rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
//     comment      TEXT NOT NULL,
//     booking_ref  TEXT,
//     status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
//     created_at   TIMESTAMPTZ DEFAULT now()
//   );
//
//   ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
//
//   -- Anyone can read approved reviews
//   CREATE POLICY "Public can read approved reviews"
//     ON reviews FOR SELECT TO anon, authenticated
//     USING (status = 'approved');
//
//   -- Authenticated users can insert their own reviews
//   CREATE POLICY "Users can submit reviews"
//     ON reviews FOR INSERT TO authenticated
//     WITH CHECK (auth.uid() = user_id);
//
//   -- Admins can read all reviews
//   CREATE POLICY "Admins can read all reviews"
//     ON reviews FOR SELECT TO authenticated
//     USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
//
//   -- Admins can update review status
//   CREATE POLICY "Admins can update reviews"
//     ON reviews FOR UPDATE TO authenticated
//     USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

import { supabase } from './supabase.js'
import { getUser } from './auth.js'
import { escapeHtml } from './utils.js'
import { t, applyTranslations } from './i18n.js'

export async function initReviews() {
  applyTranslations()
  await loadReviews()

  const user = await getUser()
  showForm(user)
}

// ===== LOAD + RENDER APPROVED REVIEWS =====

async function loadReviews() {
  const loadingEl = document.getElementById('reviews-loading')
  const emptyEl   = document.getElementById('reviews-empty')
  const gridEl    = document.getElementById('reviews-grid')
  if (!gridEl) return

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    loadingEl?.classList.add('hidden')

    if (!data || data.length === 0) {
      emptyEl?.classList.remove('hidden')
      applyTranslations()
      return
    }

    gridEl.innerHTML = data.map(r => reviewCard(r)).join('')
    gridEl.classList.remove('hidden')
  } catch (err) {
    loadingEl?.classList.add('hidden')
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="col-span-3 rounded-xl border border-red-900/40 bg-red-900/10 p-6 text-center">
          <span class="material-symbols-outlined text-3xl text-red-400">error</span>
          <p class="mt-2 text-sm text-red-400">${escapeHtml(err.message)}</p>
        </div>
      `
      gridEl.classList.remove('hidden')
    }
  }
}

function reviewCard(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
  const date = new Date(r.created_at).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })

  return `
    <div class="rounded-2xl border border-slate-800 bg-[#161C28] p-6 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-lg tracking-wide text-[#C5A059]">${escapeHtml(stars)}</span>
        <span class="text-xs text-slate-500">${escapeHtml(date)}</span>
      </div>
      <p class="text-sm leading-relaxed text-slate-300">"${escapeHtml(r.comment)}"</p>
    </div>
  `
}

// ===== FORM STATE =====

function showForm(user) {
  const loginPrompt = document.getElementById('review-login-prompt')
  const form        = document.getElementById('review-form')

  if (!user) {
    loginPrompt?.classList.remove('hidden')
    return
  }

  form?.classList.remove('hidden')
  initStarSelector()
  initFormSubmit(user)
}

// ===== STAR SELECTOR =====

function initStarSelector() {
  const selector  = document.getElementById('star-selector')
  const ratingInput = document.getElementById('review-rating')
  if (!selector || !ratingInput) return

  const stars = selector.querySelectorAll('.star-btn')

  function highlight(upTo) {
    stars.forEach(s => {
      s.style.color = Number(s.dataset.value) <= upTo ? '#C5A059' : ''
    })
  }

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => highlight(Number(star.dataset.value)))
    star.addEventListener('mouseleave', () => highlight(Number(ratingInput.value)))
    star.addEventListener('click', () => {
      ratingInput.value = star.dataset.value
      highlight(Number(star.dataset.value))
    })
  })
}

// ===== FORM SUBMIT =====

function initFormSubmit(user) {
  const form    = document.getElementById('review-form')
  const submitBtn = document.getElementById('review-submit')
  const errorEl = document.getElementById('review-error')
  if (!form) return

  form.addEventListener('submit', async e => {
    e.preventDefault()

    const rating  = Number(document.getElementById('review-rating')?.value)
    const comment = document.getElementById('review-comment')?.value.trim()
    const ref     = document.getElementById('review-ref')?.value.trim()

    // Validate
    if (!rating || rating < 1) {
      showError(errorEl, t('reviews.err_rating'))
      return
    }
    if (!comment) {
      showError(errorEl, t('reviews.err_comment'))
      return
    }

    errorEl?.classList.add('hidden')
    submitBtn.disabled = true
    const originalHTML = submitBtn.innerHTML
    submitBtn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-base">progress_activity</span>
      <span>${t('reviews.submitting')}</span>
    `

    try {
      const payload = {
        user_id: user.id,
        rating,
        comment,
        status: 'pending',
      }
      if (ref) payload.booking_ref = ref

      const { error } = await supabase.from('reviews').insert(payload)
      if (error) throw new Error(error.message)

      // Show success state
      form.classList.add('hidden')
      document.getElementById('review-success')?.classList.remove('hidden')
      applyTranslations()
    } catch (err) {
      showError(errorEl, err.message)
      submitBtn.disabled = false
      submitBtn.innerHTML = originalHTML
    }
  })
}

function showError(el, msg) {
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
}
