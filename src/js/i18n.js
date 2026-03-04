// ===== YMV Limo — Vanilla i18n module =====
// No external library. All translations live here.
// Usage:
//   import { t, applyTranslations, getLang, setLang } from './i18n.js'
//   t('home.hero_title')           → string
//   applyTranslations()            → walks DOM, applies all [data-i18n] attrs
//   setLang('es')                  → stores in localStorage, re-applies

const translations = {
  en: {
    common: {
      book_now:        'Book Now',
      sign_in:         'Sign In',
      sign_out:        'Sign Out',
      my_bookings:     'My Bookings',
      loading:         'Loading...',
      error_generic:   'Something went wrong. Please try again.',
    },

    nav: {
      services:   'Services',
      fleet:      'Fleet',
      experience: 'Experience',
      about:      'About Us',
      book_now:   'Book Now',
    },

    home: {
      hero_eyebrow:       "Houston's Premier Chauffeur Service",
      hero_title_1:       'Arrive in',
      hero_title_italic:  'Absolute',
      hero_title_2:       'Elegance',
      hero_subtitle:      'Premium chauffeur rides from Houston to anywhere in Texas. Professional, punctual, and luxurious — every trip.',
      explore_fleet:      'View Our Fleet',
      how_it_works:       'How It Works',

      tab_intercity:  'Intercity',
      tab_hourly:     'Hourly',
      tab_airport:    'Airport',

      pickup_label:       'Pick-up Location',
      pickup_placeholder: 'Houston, TX',
      dropoff_label:      'Drop-off Location',
      dropoff_placeholder:'Dallas, TX',
      date_label:         'Date',
      time_label:         'Time',
      search_btn:         'Search Fleet',

      fleet_title:  'The Fleet Excellence',
      fleet_sub:    'Our Houston-based fleet — hand-selected and maintained to impeccable standards.',
      view_fleet:   'View Full Fleet',

      steps_title:  'Your Journey in 3 Steps',
      steps_sub:    'From booking to arrival, we handle every detail',

      step1_title:  '1. Select Your Route',
      step1_body:   'Enter your pickup and drop-off locations, choose your date and time, then browse our premium fleet.',
      step2_title:  'We Assign Your Vehicle',
      step2_body:   'Based on availability, our team assigns the perfect luxury vehicle for your journey. No selection needed — we handle it.',
      step3_title:  '3. Confirm & Relax',
      step3_body:   'Complete your booking securely. Your vetted chauffeur will arrive on time, every time.',

      why_title:              'Why Choose YMV Limo',
      why_chauffeurs_title:   'Vetted Professional Chauffeurs',
      why_chauffeurs_body:    'Our drivers undergo rigorous background checks and training to ensure your safety and absolute privacy during every journey.',
      why_pricing_title:      'Fixed Transparent Pricing',
      why_pricing_body:       'No hidden fees, no surge pricing. The quote you receive during booking is exactly what you pay, inclusive of tolls and tips.',
      why_support_title:      '24/7 Concierge Support',
      why_support_body:       'Our dedicated support team is available around the clock to assist with itinerary changes or special requests.',

      cta_title:  'Ready to Travel in Style?',
      cta_sub:    'Book your luxury transfer from Houston today. We\'ll handle the rest.',
      cta_btn:    'Book Now',

      err_pickup_dropoff: 'Please enter pickup and drop-off locations.',
      err_date_time:      'Please select a date and time for your journey.',
      fleet_unavailable:  'Fleet preview unavailable.',
    },

    fleet: {
      title:       'Elite Fleet Selection',
      subtitle:    'Discover unmatched luxury for your cross-country journey.',

      filter_heading: 'Filters',
      filter_sub:     'Refine your luxury selection',

      cat_all:     'All Vehicles',
      cat_sedans:  'Sedans',
      cat_suvs:    'Luxury SUVs',
      cat_special: 'Special Occasions',

      price_range: 'Price Range',
      brands:      'Brands',

      view_grid:         'Grid View',
      view_list:         'List View',
      search_placeholder:'Search fleet... (e.g. Rolls Royce, Mercedes)',

      empty_title:   'No vehicles match your filters',
      empty_sub:     'Try adjusting your filters or search terms',
      reset_filters: 'Reset Filters',

      concierge_title: 'Need a custom arrangement?',
      concierge_sub:   'Our concierge team is available 24/7 for tailored long-distance itineraries and special events.',
      chat_concierge:  'Chat with Concierge',
      schedule_call:   'Schedule Call',

      select_btn:      'Book a Journey',
      wishlist_add:    'Add to Wishlist',
      wishlist_remove: 'Remove from Wishlist',

      terms:        'Terms of Service',
      privacy:      'Privacy Policy',
      fleet_safety: 'Fleet Safety',
    },

    checkout: {
      breadcrumb_booking:  'Booking',
      breadcrumb_vehicle:  'Vehicle Selection',
      breadcrumb_checkout: 'Checkout',

      title:    'Booking Summary',
      subtitle: 'Review your luxury journey and finalize your intercity transfer.',

      pickup_label:  'Pick-up',
      dropoff_label: 'Drop-off',
      time_label:    'Est. Time',

      passenger_section: 'Passenger Information',
      name_label:        'Full Name',
      name_placeholder:  'Your full name',
      phone_label:       'Phone Number',
      phone_placeholder: '+1 555 000 0000',
      email_label:       'Email Address',
      email_placeholder: 'your@email.com',
      pax_label:         'Passengers',
      pax_1:             '1 passenger',
      pax_2:             '2 passengers',
      pax_3:             '3 passengers',
      pax_4:             '4 passengers',

      prefs_section:        'Bespoke Preferences',
      pref_champagne:       'Complimentary Champagne',
      pref_champagne_sub:   'Vintage Dom Pérignon',
      pref_playlist:        'Custom Playlist',
      pref_playlist_sub:    'Classical & Jazz Mix',
      pref_press:           'Daily Press',
      pref_press_sub:       'FT, WSJ or your choice',
      pref_wifi:            'Premium Wi-Fi',
      pref_wifi_sub:        'Dedicated hotspot',
      instructions_label:   'Special Instructions',
      instructions_placeholder: 'Any additional requirements for your journey...',

      payment_section:  'Payment Method',
      base_fare:        'Base Fare (Intercity)',
      distance_surcharge:'Distance Surcharge',
      amenities:        'Premium Amenities',
      gratuity:         'Driver Gratuity (15%)',
      taxes:            'Taxes & VAT',
      total:            'Total Amount',

      secure_msg:   'Secure encrypted transaction',
      complete_btn: 'Complete Reservation',

      policy_title: 'Cancellation Policy',
      policy_body:  'Free cancellation up to 24 hours before pick-up. Cancellations within 12–24 hours incur a 20% fee. No-shows are charged at 100%.',

      modal_title:     'Booking Confirmed!',
      modal_sub:       'Your luxury journey has been reserved.',
      modal_email_msg: 'A confirmation email has been sent to your address.',
      modal_ref_label: 'Booking Reference',
      modal_home_btn:  'Return to Home',

      err_fields: 'Please fill in all required passenger fields.',
      err_email:  'Please enter a valid email address.',

      spinner_msg:     'Finding your perfect vehicle...',
      no_vehicle_title:'No vehicles available',
      no_vehicle_body: 'All vehicles are booked for that slot. Please choose a different date or time.',
      no_vehicle_btn:  'Change Journey Details',
      error_title:     'Something went wrong',
      error_btn:       'Try Again',
      saving:          'Saving...',
      complete_btn_label: 'Complete Reservation',

      vehicle_tbd_title: 'Vehicle to be Confirmed',
      vehicle_tbd_sub:   'Our team will assign the best available vehicle for your journey and contact you to confirm details.',
      pricing_tbd:       'Pricing will be confirmed after vehicle assignment.',
    },

    login: {
      title:        'Welcome Back',
      subtitle:     'Sign in to manage your bookings.',
      email_label:  'Email',
      password_label:'Password',
      submit_btn:   'Sign In',
      no_account:   'No account yet?',
      create_link:  'Create one free',
      signing_in:   'Signing in...',
      err_fields:   'Please enter your email and password.',
      err_invalid:  'Sign-in failed. Please check your credentials.',
    },

    register: {
      title:    'Create Account',
      subtitle: 'Join YMV Limo for exclusive intercity travel.',

      name_label:    'Full Name',
      name_placeholder: 'James Sterling',
      email_label:   'Email',
      password_label:'Password',
      confirm_label: 'Confirm Password',

      hint_min_chars: 'Minimum 8 characters',
      hint_confirm:   'Repeat your password',

      rule_length:  'At least 8 characters',
      rule_upper:   'One uppercase letter',
      rule_number:  'One number',
      rule_special: 'One special character (!@#$%^&*)',

      submit_btn: 'Create Account',
      creating:   'Creating account...',

      success_title: 'Check your inbox',
      success_sub:   'We sent a confirmation link to your email. Click it to activate your account, then sign in.',
      goto_signin:   'Go to Sign In',

      have_account: 'Already have an account?',
      signin_link:  'Sign in',

      err_fields: 'Please fill in all fields.',
      err_match:  'Passwords do not match.',
      err_weak:   'Password must include:',
    },

    bookings: {
      title:    'My Bookings',
      subtitle: 'Your journey history with YMV Limo.',

      empty_title:  'No bookings yet',
      empty_sub:    'Your confirmed journeys will appear here.',
      book_journey: 'Book a Journey',

      col_ref:     'Reference',
      col_route:   'Route',
      col_vehicle: 'Vehicle',
      col_date:    'Date',
      col_status:  'Status',
      col_amount:  'Amount',

      status_confirmed: 'confirmed',
      status_pending:   'pending',
      status_cancelled: 'cancelled',
    },

    footer: {
      tagline: 'Premium chauffeur services across Texas, based in Houston.',

      services_heading: 'Services',
      intercity:        'Intercity Travel',
      airport:          'Airport Transfers',
      event:            'Event Chauffeur',
      corporate:        'Corporate Accounts',

      fleet_heading: 'Fleet',
      first_class:   'First Class',
      business:      'Business Class',
      electric:      'Electric Elite',
      van:           'Van Luxury',

      connect_heading: 'Connect',

      copyright: '© 2025 YMV Limo. All rights reserved.',
      privacy:   'Privacy Policy',
      terms:     'Terms of Service',
      cookies:   'Cookie Policy',
    },
  },

  // ===== SPANISH =====
  es: {
    common: {
      book_now:      'Reservar Ahora',
      sign_in:       'Iniciar Sesión',
      sign_out:      'Cerrar Sesión',
      my_bookings:   'Mis Reservas',
      loading:       'Cargando...',
      error_generic: 'Algo salió mal. Por favor, inténtelo de nuevo.',
    },

    nav: {
      services:   'Servicios',
      fleet:      'Flota',
      experience: 'Experiencia',
      about:      'Nosotros',
      book_now:   'Reservar',
    },

    home: {
      hero_eyebrow:       'El Servicio de Chófer Premier de Houston',
      hero_title_1:       'Llegue con',
      hero_title_italic:  'Absoluta',
      hero_title_2:       'Elegancia',
      hero_subtitle:      'Viajes de chófer de lujo desde Houston a cualquier parte de Texas. Profesional, puntual y lujoso — en cada viaje.',
      explore_fleet:      'Ver Nuestra Flota',
      how_it_works:       'Cómo Funciona',

      tab_intercity:  'Interurbano',
      tab_hourly:     'Por Hora',
      tab_airport:    'Aeropuerto',

      pickup_label:       'Lugar de Recogida',
      pickup_placeholder: 'Houston, TX',
      dropoff_label:      'Lugar de Destino',
      dropoff_placeholder:'Dallas, TX',
      date_label:         'Fecha',
      time_label:         'Hora',
      search_btn:         'Buscar Flota',

      fleet_title:  'Excelencia de la Flota',
      fleet_sub:    'Nuestra flota con base en Houston — seleccionada a mano y mantenida con estándares impecables.',
      view_fleet:   'Ver Flota Completa',

      steps_title:  'Su Viaje en 3 Pasos',
      steps_sub:    'Desde la reserva hasta la llegada, nos ocupamos de cada detalle',

      step1_title:  '1. Seleccione su Ruta',
      step1_body:   'Ingrese sus lugares de recogida y destino, elija su fecha y hora, luego explore nuestra flota premium.',
      step2_title:  'Asignamos Su Vehículo',
      step2_body:   'Según disponibilidad, nuestro equipo asigna el vehículo de lujo perfecto para su viaje. Sin selección necesaria — nosotros lo manejamos.',
      step3_title:  '3. Confirme y Relájese',
      step3_body:   'Complete su reserva de forma segura. Su chófer certificado llegará puntual, siempre.',

      why_title:              'Por qué Elegir YMV Limo',
      why_chauffeurs_title:   'Chóferes Profesionales Certificados',
      why_chauffeurs_body:    'Nuestros conductores pasan rigurosas verificaciones de antecedentes y capacitación para garantizar su seguridad y privacidad absoluta en cada trayecto.',
      why_pricing_title:      'Precios Fijos y Transparentes',
      why_pricing_body:       'Sin cargos ocultos, sin precios variables. El presupuesto que recibe al reservar es exactamente lo que paga, incluidos peajes y propinas.',
      why_support_title:      'Soporte de Concierge 24/7',
      why_support_body:       'Nuestro equipo de soporte dedicado está disponible las 24 horas para ayudar con cambios de itinerario o solicitudes especiales.',

      cta_title:  '¿Listo para Viajar con Estilo?',
      cta_sub:    'Reserve su traslado de lujo desde Houston hoy. Nosotros nos encargamos del resto.',
      cta_btn:    'Reservar Ahora',

      err_pickup_dropoff: 'Por favor, ingrese los lugares de recogida y destino.',
      err_date_time:      'Por favor, seleccione una fecha y hora para su viaje.',
      fleet_unavailable:  'Vista previa de la flota no disponible.',
    },

    fleet: {
      title:       'Selección de Flota Elite',
      subtitle:    'Descubra un lujo incomparable para su viaje de larga distancia.',

      filter_heading: 'Filtros',
      filter_sub:     'Refine su selección de lujo',

      cat_all:     'Todos los Vehículos',
      cat_sedans:  'Sedanes',
      cat_suvs:    'SUVs de Lujo',
      cat_special: 'Ocasiones Especiales',

      price_range: 'Rango de Precio',
      brands:      'Marcas',

      view_grid:          'Vista en Cuadrícula',
      view_list:          'Vista en Lista',
      search_placeholder: 'Buscar flota... (ej. Rolls Royce, Mercedes)',

      empty_title:   'Ningún vehículo coincide con sus filtros',
      empty_sub:     'Intente ajustar sus filtros o términos de búsqueda',
      reset_filters: 'Restablecer Filtros',

      concierge_title: '¿Necesita un arreglo personalizado?',
      concierge_sub:   'Nuestro equipo de concierge está disponible 24/7 para itinerarios de larga distancia y eventos especiales.',
      chat_concierge:  'Chatear con Concierge',
      schedule_call:   'Programar Llamada',

      select_btn:      'Reservar un Viaje',
      wishlist_add:    'Agregar a Favoritos',
      wishlist_remove: 'Quitar de Favoritos',

      terms:        'Términos de Servicio',
      privacy:      'Política de Privacidad',
      fleet_safety: 'Seguridad de la Flota',
    },

    checkout: {
      breadcrumb_booking:  'Reserva',
      breadcrumb_vehicle:  'Selección de Vehículo',
      breadcrumb_checkout: 'Pago',

      title:    'Resumen de Reserva',
      subtitle: 'Revise su viaje de lujo y finalice su traslado interurbano.',

      pickup_label:  'Recogida',
      dropoff_label: 'Destino',
      time_label:    'Tiempo Est.',

      passenger_section: 'Información del Pasajero',
      name_label:        'Nombre Completo',
      name_placeholder:  'Su nombre completo',
      phone_label:       'Número de Teléfono',
      phone_placeholder: '+1 555 000 0000',
      email_label:       'Correo Electrónico',
      email_placeholder: 'su@correo.com',
      pax_label:         'Pasajeros',
      pax_1:             '1 pasajero',
      pax_2:             '2 pasajeros',
      pax_3:             '3 pasajeros',
      pax_4:             '4 pasajeros',

      prefs_section:        'Preferencias a Medida',
      pref_champagne:       'Champán Gratuito',
      pref_champagne_sub:   'Dom Pérignon Vintage',
      pref_playlist:        'Playlist Personalizada',
      pref_playlist_sub:    'Clásica y Jazz',
      pref_press:           'Prensa Diaria',
      pref_press_sub:       'FT, WSJ o su elección',
      pref_wifi:            'Wi-Fi Premium',
      pref_wifi_sub:        'Punto de acceso dedicado',
      instructions_label:   'Instrucciones Especiales',
      instructions_placeholder: 'Cualquier requisito adicional para su viaje...',

      payment_section:  'Método de Pago',
      base_fare:        'Tarifa Base (Interurbano)',
      distance_surcharge:'Recargo por Distancia',
      amenities:        'Amenidades Premium',
      gratuity:         'Propina del Conductor (15%)',
      taxes:            'Impuestos y IVA',
      total:            'Monto Total',

      secure_msg:   'Transacción cifrada y segura',
      complete_btn: 'Completar Reserva',

      policy_title: 'Política de Cancelación',
      policy_body:  'Cancelación gratuita hasta 24 horas antes de la recogida. Las cancelaciones entre 12 y 24 horas conllevan un cargo del 20%. Los no-shows se cobran al 100%.',

      modal_title:     '¡Reserva Confirmada!',
      modal_sub:       'Su viaje de lujo ha sido reservado.',
      modal_email_msg: 'Se ha enviado un correo de confirmación a su dirección.',
      modal_ref_label: 'Referencia de Reserva',
      modal_home_btn:  'Volver al Inicio',

      err_fields: 'Por favor, complete todos los campos obligatorios del pasajero.',
      err_email:  'Por favor, ingrese una dirección de correo electrónico válida.',

      spinner_msg:     'Encontrando su vehículo perfecto...',
      no_vehicle_title:'No hay vehículos disponibles',
      no_vehicle_body: 'Todos los vehículos están reservados para ese horario. Por favor, elija una fecha u hora diferente.',
      no_vehicle_btn:  'Cambiar Detalles del Viaje',
      error_title:     'Algo salió mal',
      error_btn:       'Intentar de Nuevo',
      saving:          'Guardando...',
      complete_btn_label: 'Completar Reserva',

      vehicle_tbd_title: 'Vehículo por Confirmar',
      vehicle_tbd_sub:   'Nuestro equipo asignará el mejor vehículo disponible para su viaje y se comunicará con usted para confirmar los detalles.',
      pricing_tbd:       'El precio se confirmará después de la asignación del vehículo.',
    },

    login: {
      title:         'Bienvenido de Nuevo',
      subtitle:      'Inicie sesión para gestionar sus reservas.',
      email_label:   'Correo Electrónico',
      password_label:'Contraseña',
      submit_btn:    'Iniciar Sesión',
      no_account:    '¿No tiene cuenta?',
      create_link:   'Crear una gratis',
      signing_in:    'Iniciando sesión...',
      err_fields:    'Por favor, ingrese su correo y contraseña.',
      err_invalid:   'Inicio de sesión fallido. Verifique sus credenciales.',
    },

    register: {
      title:    'Crear Cuenta',
      subtitle: 'Únase a YMV Limo para viajes interurbanos exclusivos.',

      name_label:       'Nombre Completo',
      name_placeholder: 'James Sterling',
      email_label:      'Correo Electrónico',
      password_label:   'Contraseña',
      confirm_label:    'Confirmar Contraseña',

      hint_min_chars: 'Mínimo 8 caracteres',
      hint_confirm:   'Repita su contraseña',

      rule_length:  'Al menos 8 caracteres',
      rule_upper:   'Una letra mayúscula',
      rule_number:  'Un número',
      rule_special: 'Un carácter especial (!@#$%^&*)',

      submit_btn: 'Crear Cuenta',
      creating:   'Creando cuenta...',

      success_title: 'Revise su bandeja de entrada',
      success_sub:   'Le enviamos un enlace de confirmación. Haga clic para activar su cuenta y luego inicie sesión.',
      goto_signin:   'Ir a Iniciar Sesión',

      have_account: '¿Ya tiene una cuenta?',
      signin_link:  'Iniciar sesión',

      err_fields: 'Por favor, complete todos los campos.',
      err_match:  'Las contraseñas no coinciden.',
      err_weak:   'La contraseña debe incluir:',
    },

    bookings: {
      title:    'Mis Reservas',
      subtitle: 'Su historial de viajes con YMV Limo.',

      empty_title:  'Aún no hay reservas',
      empty_sub:    'Sus viajes confirmados aparecerán aquí.',
      book_journey: 'Reservar un Viaje',

      col_ref:     'Referencia',
      col_route:   'Ruta',
      col_vehicle: 'Vehículo',
      col_date:    'Fecha',
      col_status:  'Estado',
      col_amount:  'Monto',

      status_confirmed: 'confirmado',
      status_pending:   'pendiente',
      status_cancelled: 'cancelado',
    },

    footer: {
      tagline: 'Servicios de chófer de lujo en todo Texas, con sede en Houston.',

      services_heading: 'Servicios',
      intercity:        'Viajes Interurbanos',
      airport:          'Traslados al Aeropuerto',
      event:            'Chófer para Eventos',
      corporate:        'Cuentas Corporativas',

      fleet_heading: 'Flota',
      first_class:   'Primera Clase',
      business:      'Clase Ejecutiva',
      electric:      'Élite Eléctrico',
      van:           'Van de Lujo',

      connect_heading: 'Contacto',

      copyright: '© 2025 YMV Limo. Todos los derechos reservados.',
      privacy:   'Política de Privacidad',
      terms:     'Términos de Servicio',
      cookies:   'Política de Cookies',
    },
  },
}

// ===== PUBLIC API =====

export function getLang() {
  return localStorage.getItem('ld_lang') || 'en'
}

export function setLang(lang) {
  localStorage.setItem('ld_lang', lang)
  applyTranslations()
  updateLangToggle()
  // Update html[lang] attribute
  document.documentElement.lang = lang
}

/**
 * Resolve a dot-notation key against the active language.
 * Falls back to English, then returns the key itself if missing.
 */
export function t(key) {
  const lang = getLang()
  const keys = key.split('.')
  let val = translations[lang]
  for (const k of keys) {
    val = val?.[k]
  }
  if (val !== undefined) return val

  // Fallback to English
  let fallback = translations['en']
  for (const k of keys) {
    fallback = fallback?.[k]
  }
  return fallback ?? key
}

/**
 * Walk the DOM and apply translations to:
 *   [data-i18n]             → el.textContent
 *   [data-i18n-placeholder] → el.placeholder
 *   [data-i18n-html]        → el.innerHTML  (ONLY for static/safe strings)
 */
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const translated = t(el.dataset.i18n)
    if (translated) el.textContent = translated
  })

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const translated = t(el.dataset.i18nPlaceholder)
    if (translated) el.placeholder = translated
  })

  // data-i18n-html: ONLY use for safe static translation strings, never user input
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const translated = t(el.dataset.i18nHtml)
    if (translated) el.innerHTML = translated
  })

  updateLangToggle()
}

function updateLangToggle() {
  const btn = document.getElementById('lang-toggle')
  if (btn) btn.textContent = getLang() === 'en' ? 'ES' : 'EN'
}
