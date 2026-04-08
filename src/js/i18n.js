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
      experience: 'Why Us',
      about:      'About Us',
      contact:    'Contact',
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
      search_btn:         'Reserve Now',
      hourly_hours_label:    'Hours',
      hourly_hrs:            'hrs',
      hourly_book_btn:       'Book Hourly Service',
      hourly_duration_label: 'Duration',
      hourly_rate_label:     'Rate',
      hourly_fare_disclaimer:'* Estimate based on hourly rate. Final fare confirmed after service.',

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

      err_pickup_dropoff:  'Please enter pickup and drop-off locations.',
      err_pickup_houston:          'Pickup must be within the Greater Houston area.',
      err_dropoff_zone:            'Drop-off must be in Houston, Dallas, Austin, or Louisiana.',
      err_date_time:               'Please select a date and time for your journey.',
      err_date_past:               'Please select today or a future date.',
      err_time_too_soon:           'Booking must be at least 2 hours from now.',
      booking_notice:              'Bookings require at least 2 hours advance notice.',
      err_geolocation_unavailable: 'Geolocation is not supported by your browser.',
      err_geolocation_failed:      'Could not retrieve your current location.',
      map_picker_title:            'Choose Location',
      map_picker_confirm:          'Confirm',
      map_picker_cancel:           'Cancel',
      map_picker_tap:              'Tap the map to place a pin',
      map_picker_geocoding:        'Getting address…',
      map_picker_geocode_err:      'Could not find address for this location.',
      fleet_unavailable:  'Fleet preview unavailable.',

      fare_estimate_label: 'Estimated Fare',
      fare_distance_label: 'Distance',
      fare_duration_label: 'Drive Time',
      fare_disclaimer:     '* Estimate based on mileage. Final fare confirmed after vehicle assignment.',
    },

    fleet: {
      title:       'Our Fleet',
      subtitle:    'Premium SUVs maintained to the highest standards for your Texas journey.',

      filter_heading: 'Filters',
      filter_sub:     'Browse our luxury vehicles',

      cat_all:     'All Vehicles',
      cat_sedans:  'Sedans',
      cat_suvs:    'Luxury SUVs',
      cat_special: 'Special Occasions',

      brands:      'Brands',

      view_grid:         'Grid View',
      view_list:         'List View',
      search_placeholder:'Search fleet... (e.g. Cadillac, Lincoln)',

      empty_title:   'No vehicles match your filters',
      empty_sub:     'Try adjusting your filters or search terms',
      reset_filters: 'Reset Filters',

      concierge_title: 'Need a custom arrangement?',
      concierge_sub:   'Our concierge team is available 24/7 for tailored long-distance itineraries and special events.',
      chat_concierge:  'Chat with Concierge',
      schedule_call:   'Schedule Call',

      cta_label: 'Ready to ride in style?',
      cta_sub:   'Our team will assign the best available vehicle for your trip.',
      cta_btn:   'Book a Ride',

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

      pref_refreshments:    'Refreshments',
      pref_water:           'Water',
      pref_soda:            'Soda',
      pref_chips:           'Chips',
      pref_gum:             'Gum',

      pref_music_label:     'Music',
      pref_music_silence:   'Silence',
      pref_music_jazz:      'Jazz',
      pref_music_pop:       'Pop',
      pref_music_latin:     'Latin',
      pref_music_hiphop:    'Hip-Hop',
      pref_music_classical:       'Classical',
      pref_music_other:           'Other',
      pref_music_other_placeholder:'e.g. R&B, Country, Reggaeton...',

      pref_temp_label:      'Temperature',
      pref_temp_range:      '60°F – 85°F',

      pref_driver_label:         'Driver Interaction',
      pref_driver_quiet:         'Prefer Silence',
      pref_driver_conversational:'Conversational',

      instructions_label:   'Special Instructions',
      instructions_placeholder: 'Any additional requirements for your journey...',

      expect_title:   'The YMV Limo Experience',
      expect_door:    'Your driver will open and close the door for you — please wait for them before getting in or out.',
      expect_luggage: 'Your driver will handle and store all luggage. Just let them take care of it.',
      expect_napkins: 'Napkins are always available in the vehicle.',
      expect_driver:  'Our drivers are impeccably dressed and present themselves to the highest standard.',
      expect_car:     'Every vehicle is spotless and polished before each journey.',

      payment_section:  'Payment Method',
      base_fare:        'Base Fare (Intercity)',
      distance_surcharge:'Distance Surcharge',
      amenities:        'Premium Amenities',
      gratuity:         'Gratuity',
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
      hourly_service:    'Hourly Charter',

      disclaimer_title: 'Important Notice',
      disclaimer_body:  'Any services arranged directly between the client and the chauffeur outside of this platform are not the responsibility of YMV Limo. The company assumes no liability for agreements, payments, or incidents arising from such arrangements.',

      payment_save_notice: 'Your card is saved securely. You will be charged the estimated fare shown above after your trip is completed.',
      payment_securing:    'Securing your card...',
      err_stripe_load:     'Payment system could not load. Please refresh and try again.',
      err_setup_intent:    'Could not initialize payment. Please try again.',
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
      status_no_show:   'no-show',
    },

    about: {
      title:    'About Us',
      subtitle: "The story behind Houston's trusted intercity chauffeur service.",

      our_story_label: 'Our Story',
      our_story_title: 'Built in Houston. Driven by Excellence.',
      story_p1: 'YMV Limo was established in Houston, Texas in 2022 with a simple mission: provide reliable, comfortable, and professional transportation for clients who expect more than a standard ride.',
      story_p2: 'In 2026 we are officially launching our full service offering — bringing the same dedication and white-glove attention to every booking, from a quick hourly engagement to a multi-city intercity journey.',
      story_p3: 'Our chauffeurs bring over 10 years of professional driving experience. They know the roads, they know the standards, and they know how to make every mile comfortable.',

      stat_founded:     'Year Established',
      stat_experience:  'Years of Driver Experience',
      stat_cities:      'Intercity Routes',
      stat_availability:'Availability',

      services_label: 'What We Offer',
      services_title: 'Three Ways to Ride',

      service_hourly_title:      'Hourly Charter',
      service_hourly_body:       'Need a driver on standby for a few hours? Reserve by the hour and go wherever the day takes you. Ideal for events, business errands, or a night out.',
      service_hourly_price:      '~$100–$120 / hr',
      service_intercity_title:   'Intercity Transfer',
      service_intercity_body:    'Door-to-door service departing from Houston. We pick you up at your Houston address and drop you off in Dallas, Austin, Louisiana — or anywhere else in the Houston area.',
      service_intercity_price:   'Quoted per route',
      service_roundtrip_title:   'Drop-off & Return',
      service_roundtrip_body:    'We drop you off at your destination and come back to pick you up at the exact time you choose. Perfect for dinners, medical appointments, or any event with a set end time.',
      service_roundtrip_price:   'Quoted per trip',

      area_label:   'Service Area',
      area_title:   'Where We Operate',
      area_desc:    'We are based in Houston and serve the greater Houston area. We also offer intercity trips departing from Houston to the following destinations.',
      area_base:    'Home Base · Local Rides',
      area_route:   'From Houston',

      cta_title:    'Ready to Experience the Difference?',
      cta_sub:      'Book your ride today or chat with us on WhatsApp to plan your trip.',
      cta_book:     'Book a Ride',
      cta_whatsapp: 'Chat on WhatsApp',
    },

    contact: {
      title:    'Contact Us',
      subtitle: "We're available 24/7. Message us on WhatsApp or schedule a call at your convenience.",

      methods_label: 'Get in Touch',
      methods_title: 'Choose How to Reach Us',

      whatsapp_title: 'WhatsApp',
      whatsapp_body:  'The fastest way to get a quote or ask a question. We typically respond in minutes.',
      whatsapp_cta:   'Open WhatsApp',

      calendly_title: 'Schedule a Call',
      calendly_body:  'Prefer to talk it through? Book a free 30-minute call at a time that works for you.',
      calendly_cta:   'Book a Call',

      location_label: 'Our Base',
      location_title: 'Houston, Texas',
      location_body:  'We pick up anywhere in the greater Houston area and operate intercity trips to Dallas, Austin, and Louisiana.',

      hours_label: 'Availability',
      hours_value: '24 / 7',
      hours_desc:  'Always on call',
    },

    reviews: {
      title:    'Client Reviews',
      subtitle: 'What our clients say about their YMV Limo experience.',

      write_title:   'Share Your Experience',
      write_sub:     "Had a ride with YMV Limo? We'd love to hear from you.",
      rating_label:  'Your Rating',
      comment_label: 'Your Review',
      comment_placeholder: 'Tell us about your experience...',
      ref_label:     'Booking Reference (optional)',
      ref_placeholder: 'e.g. YMV-2025-1234',
      submit_btn:    'Submit Review',
      submitting:    'Submitting...',

      success_title: 'Thank you!',
      success_sub:   'Your review has been submitted and is pending approval.',

      login_prompt:  'Sign in to leave a review',
      login_btn:     'Sign In',

      empty_title:   'No reviews yet',
      empty_sub:     'Be the first to share your experience.',

      err_rating:  'Please select a rating.',
      err_comment: 'Please write a comment.',
    },

    not_found: {
      title:    'Page Not Found',
      subtitle: "The page you're looking for doesn't exist or may have been moved.",
      go_home:  'Go Home',
      book_ride:'Book a Ride',
    },

    footer: {
      tagline: 'Premium chauffeur services across Texas, based in Houston.',

      services_heading: 'Services',
      intercity:        'Intercity Travel',
      hourly:           'Hourly Charter',
      fleet_link:       'Our Fleet',
      service_areas:    'Service Areas',

      company_heading: 'Company',
      reviews:         'Client Reviews',

      connect_heading: 'Connect',

      copyright: '© 2026 YMV Limo. All rights reserved.',
      privacy:   'Privacy Policy',
      terms:     'Terms of Service',
      cookies:   'Cookie Policy',
    },

    legal: {
      tab_terms:   'Terms of Service',
      tab_privacy: 'Privacy Policy',
      tab_cookies: 'Cookie Policy',
      updated:     'Last updated: April 2026',

      t1_title: '1. Agreement',
      t1_body:  'By booking a service through YMV Limo ("we", "us", or "our"), you agree to these Terms of Service. If you do not agree, do not use our platform.',
      t2_title: '2. Services',
      t2_body:  'YMV Limo provides premium intercity and hourly chauffeur services in the greater Houston area and across Texas. All bookings are subject to vehicle and driver availability. We reserve the right to assign any suitable vehicle from our fleet.',
      t3_title: '3. Booking & Payment',
      t3_body:  'A valid credit or debit card is required to complete a booking. Your card is saved securely via Stripe and will be charged after your trip is completed or per the cancellation policy below. The fare shown at booking is an estimate — the final amount is confirmed by the admin after vehicle assignment.',
      t4_title: '4. Cancellation Policy',
      t4_rule1_label: 'More than 6 hours before pickup:',
      t4_rule1_value: '$20 flat admin fee.',
      t4_rule2_label: 'Within 6 hours of pickup:',
      t4_rule2_value: '50% of the estimated fare.',
      t4_rule3_label: 'No-show:',
      t4_rule3_value: 'Full fare charged. Our driver will wait up to 30 minutes past the scheduled pickup time before the booking is marked as a no-show.',
      t4_note:  'Cancellations must be made through the My Bookings page. Cancellations requested via WhatsApp or phone are not accepted and will not be processed.',
      t5_title: '5. Client Responsibilities',
      t5_body:  'You agree to be at the designated pickup location on time and to treat our vehicles and drivers with respect. Any damage caused to a vehicle by a passenger will be the passenger\'s financial responsibility. YMV Limo is not responsible for items left in vehicles.',
      t6_title: '6. Liability',
      t6_body:  'Any services, agreements, or payments arranged directly between the client and the chauffeur outside of this platform are not the responsibility of YMV Limo. Our liability is limited to the amount paid for the affected booking.',
      t7_title: '7. Changes to Terms',
      t7_body:  'We may update these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.',
      t8_title: '8. Contact',

      p1_title: '1. Information We Collect',
      p1_intro: 'We collect the following information when you create an account or make a booking:',
      p1_item1: 'Name, email address, and phone number',
      p1_item2: 'Pickup and dropoff locations',
      p1_item3: 'Trip date, time, and preferences',
      p1_item4: 'Payment method (stored securely by Stripe — we never store raw card data)',
      p2_title: '2. How We Use Your Information',
      p2_intro: 'Your information is used exclusively to:',
      p2_item1: 'Process and manage your bookings',
      p2_item2: 'Send booking confirmation and driver assignment emails',
      p2_item3: 'Process payments and apply cancellation fees',
      p2_item4: 'Improve our service',
      p2_note:  'We do not sell, rent, or share your personal data with third parties for marketing purposes.',
      p3_title:    '3. Third-Party Services',
      p3_intro:    'We use the following third-party services to operate our platform:',
      p3_supabase: 'database and authentication',
      p3_stripe:   'secure payment processing',
      p3_brevo:    'transactional email delivery',
      p3_maps:     'route distance calculation (proxied server-side)',
      p4_title: '4. Data Retention',
      p4_body:  'We retain your booking history and account information for as long as your account is active or as required for legal and financial recordkeeping. You may request deletion of your account by contacting us directly.',
      p5_title: '5. Contact',

      c1_title:        'What We Use',
      c1_body:         'YMV Limo uses minimal browser storage to operate. We do not use advertising or tracking cookies.',
      c_col_storage:   'Storage',
      c_col_purpose:   'Purpose',
      c_col_expires:   'Expires',
      c_row1_purpose:  'Keeps you logged in across sessions',
      c_row1_expires:  'Until sign out',
      c_row2_purpose:  'Remembers your language preference (EN/ES)',
      c_row2_expires:  'Indefinite',
      c_row3_purpose:  'Stores booking details during checkout flow',
      c_row3_expires:  'Tab close',
      c2_title: 'Third-Party Cookies',
      c2_body:  'Stripe may set cookies for fraud prevention purposes when processing payments. These are strictly necessary and cannot be disabled without affecting payment functionality. Refer to',
      c2_for:   'for details.',

      contact_pre:         'For questions about these terms, contact us via',
      contact_privacy_pre: 'For privacy-related requests, contact us via',
      contact_or:          'or call',
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
      experience: 'Por qué nosotros',
      about:      'Nosotros',
      contact:    'Contacto',
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
      search_btn:         'Reservar Ahora',
      hourly_hours_label:    'Horas',
      hourly_hrs:            'hrs',
      hourly_book_btn:       'Reservar Servicio por Hora',
      hourly_duration_label: 'Duración',
      hourly_rate_label:     'Tarifa',
      hourly_fare_disclaimer:'* Estimado basado en tarifa por hora. Precio final confirmado tras el servicio.',

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

      err_pickup_dropoff:  'Por favor, ingrese los lugares de recogida y destino.',
      err_pickup_houston:          'La recogida debe ser dentro del área metropolitana de Houston.',
      err_dropoff_zone:            'El destino debe ser en Houston, Dallas, Austin o Luisiana.',
      err_date_time:               'Por favor, seleccione una fecha y hora para su viaje.',
      err_date_past:               'Por favor, seleccione hoy o una fecha futura.',
      err_time_too_soon:           'La reserva debe ser con al menos 2 horas de anticipación.',
      booking_notice:              'Las reservas requieren al menos 2 horas de anticipación.',
      err_geolocation_unavailable: 'Tu navegador no soporta geolocalización.',
      err_geolocation_failed:      'No se pudo obtener tu ubicación actual.',
      map_picker_title:            'Elegir Ubicación',
      map_picker_confirm:          'Confirmar',
      map_picker_cancel:           'Cancelar',
      map_picker_tap:              'Toca el mapa para colocar un pin',
      map_picker_geocoding:        'Obteniendo dirección…',
      map_picker_geocode_err:      'No se encontró dirección para esta ubicación.',
      fleet_unavailable:  'Vista previa de la flota no disponible.',

      fare_estimate_label: 'Tarifa Estimada',
      fare_distance_label: 'Distancia',
      fare_duration_label: 'Tiempo de Viaje',
      fare_disclaimer:     '* Estimado basado en millaje. Tarifa final confirmada tras la asignación del vehículo.',
    },

    fleet: {
      title:       'Nuestra Flota',
      subtitle:    'SUVs premium mantenidas con los más altos estándares para su viaje por Texas.',

      filter_heading: 'Filtros',
      filter_sub:     'Explore nuestros vehículos de lujo',

      cat_all:     'Todos los Vehículos',
      cat_sedans:  'Sedanes',
      cat_suvs:    'SUVs de Lujo',
      cat_special: 'Ocasiones Especiales',

      brands:      'Marcas',

      view_grid:          'Vista en Cuadrícula',
      view_list:          'Vista en Lista',
      search_placeholder: 'Buscar flota... (ej. Cadillac, Lincoln)',

      empty_title:   'Ningún vehículo coincide con sus filtros',
      empty_sub:     'Intente ajustar sus filtros o términos de búsqueda',
      reset_filters: 'Restablecer Filtros',

      concierge_title: '¿Necesita un arreglo personalizado?',
      concierge_sub:   'Nuestro equipo de concierge está disponible 24/7 para itinerarios de larga distancia y eventos especiales.',
      chat_concierge:  'Chatear con Concierge',
      schedule_call:   'Programar Llamada',

      cta_label: '¿Listo para viajar con estilo?',
      cta_sub:   'Nuestro equipo asignará el mejor vehículo disponible para su viaje.',
      cta_btn:   'Reservar un Viaje',

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

      pref_refreshments:    'Refrigerios',
      pref_water:           'Agua',
      pref_soda:            'Refresco',
      pref_chips:           'Papitas',
      pref_gum:             'Chicle',

      pref_music_label:     'Música',
      pref_music_silence:   'Silencio',
      pref_music_jazz:      'Jazz',
      pref_music_pop:       'Pop',
      pref_music_latin:     'Latino',
      pref_music_hiphop:    'Hip-Hop',
      pref_music_classical:        'Clásica',
      pref_music_other:            'Otro',
      pref_music_other_placeholder:'ej. R&B, Norteño, Reggaeton...',

      pref_temp_label:      'Temperatura',
      pref_temp_range:      '60°F – 85°F',

      pref_driver_label:         'Interacción con el Conductor',
      pref_driver_quiet:         'Prefiero Silencio',
      pref_driver_conversational:'Conversacional',

      instructions_label:   'Instrucciones Especiales',
      instructions_placeholder: 'Cualquier requisito adicional para su viaje...',

      expect_title:   'La Experiencia YMV Limo',
      expect_door:    'Su conductor abrirá y cerrará la puerta — espere a que lo haga antes de entrar o salir.',
      expect_luggage: 'Su conductor se encargará de todo el equipaje. Solo déjelo hacer su trabajo.',
      expect_napkins: 'El vehículo siempre cuenta con servilletas disponibles.',
      expect_driver:  'Nuestros conductores visten de forma impecable y se presentan con el más alto estándar.',
      expect_car:     'Cada vehículo está limpio y reluciente antes de cada viaje.',

      payment_section:  'Método de Pago',
      base_fare:        'Tarifa Base (Interurbano)',
      distance_surcharge:'Recargo por Distancia',
      amenities:        'Amenidades Premium',
      gratuity:         'Propina',
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
      hourly_service:    'Renta por Hora',

      disclaimer_title: 'Aviso Importante',
      disclaimer_body:  'Cualquier servicio acordado directamente entre el cliente y el conductor fuera de esta plataforma no es responsabilidad de YMV Limo. La empresa no asume ninguna responsabilidad por acuerdos, pagos o incidentes derivados de dichos arreglos.',

      payment_save_notice: 'Su tarjeta se guarda de forma segura. Se le cobrará la tarifa estimada mostrada arriba una vez completado su viaje.',
      payment_securing:    'Guardando su tarjeta...',
      err_stripe_load:     'El sistema de pago no pudo cargar. Por favor, recargue la página e intente nuevamente.',
      err_setup_intent:    'No se pudo inicializar el pago. Por favor, inténtelo de nuevo.',
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
      status_no_show:   'no se presentó',
    },

    about: {
      title:    'Nosotros',
      subtitle: 'La historia detrás del servicio de chofer intercity de confianza en Houston.',

      our_story_label: 'Nuestra Historia',
      our_story_title: 'Nacidos en Houston. Guiados por la Excelencia.',
      story_p1: 'YMV Limo fue establecida en Houston, Texas en 2022 con una misión simple: brindar transporte confiable, cómodo y profesional para clientes que esperan más que un viaje ordinario.',
      story_p2: 'En 2026 lanzamos oficialmente nuestra oferta completa de servicios, manteniendo la misma dedicación y atención personalizada en cada reserva.',
      story_p3: 'Nuestros choferes cuentan con más de 10 años de experiencia profesional al volante. Conocen las rutas, los estándares y cómo hacer cada milla más cómoda.',

      stat_founded:     'Año de Fundación',
      stat_experience:  'Años de Experiencia',
      stat_cities:      'Rutas Intercity',
      stat_availability:'Disponibilidad',

      services_label: 'Lo Que Ofrecemos',
      services_title: 'Tres Formas de Viajar',

      service_hourly_title:      'Renta por Hora',
      service_hourly_body:       '¿Necesitas un chofer disponible por unas horas? Reserva por hora y ve a donde quieras. Ideal para eventos, diligencias o salidas nocturnas.',
      service_hourly_price:      '~$100–$120 / hr',
      service_intercity_title:   'Traslado Intercity',
      service_intercity_body:    'Servicio puerta a puerta saliendo desde Houston. Te recogemos en tu dirección en Houston y te llevamos a Dallas, Austin, Louisiana o a cualquier destino dentro del área de Houston.',
      service_intercity_price:   'Cotizado por ruta',
      service_roundtrip_title:   'Entrega y Regreso',
      service_roundtrip_body:    'Te llevamos a tu destino y regresamos a recogerte a la hora exacta que elijas. Perfecto para cenas, citas médicas o eventos con hora de cierre.',
      service_roundtrip_price:   'Cotizado por viaje',

      area_label:    'Área de Servicio',
      area_title:    'Dónde Operamos',
      area_desc:    'Estamos basados en Houston y servimos el área metropolitana. También ofrecemos viajes intercity saliendo desde Houston hacia los siguientes destinos.',
      area_base:     'Base Principal · Viajes Locales',
      area_route:    'Desde Houston',

      cta_title:    '¿Listo para Vivir la Diferencia?',
      cta_sub:      'Reserva tu viaje hoy o chatéanos por WhatsApp para planificar tu ruta.',
      cta_book:     'Reservar un Viaje',
      cta_whatsapp: 'Chatear por WhatsApp',
    },

    contact: {
      title:    'Contáctanos',
      subtitle: 'Estamos disponibles 24/7. Escríbenos por WhatsApp o agenda una llamada cuando te sea conveniente.',

      methods_label: 'Comunícate',
      methods_title: 'Elige Cómo Contactarnos',

      whatsapp_title: 'WhatsApp',
      whatsapp_body:  'La forma más rápida de obtener una cotización o hacer preguntas. Respondemos en minutos.',
      whatsapp_cta:   'Abrir WhatsApp',

      calendly_title: 'Agenda una Llamada',
      calendly_body:  '¿Prefieres hablar? Reserva una llamada gratuita de 30 minutos en el horario que más te convenga.',
      calendly_cta:   'Agendar Llamada',

      location_label: 'Nuestra Base',
      location_title: 'Houston, Texas',
      location_body:  'Recogemos en todo el área metropolitana de Houston y operamos viajes intercity a Dallas, Austin y Louisiana.',

      hours_label: 'Disponibilidad',
      hours_value: '24 / 7',
      hours_desc:  'Siempre disponibles',
    },

    reviews: {
      title:    'Reseñas de Clientes',
      subtitle: 'Lo que dicen nuestros clientes sobre su experiencia con YMV Limo.',

      write_title:   'Comparte Tu Experiencia',
      write_sub:     '¿Viajaste con YMV Limo? Nos encantaría escucharte.',
      rating_label:  'Tu Calificación',
      comment_label: 'Tu Reseña',
      comment_placeholder: 'Cuéntanos sobre tu experiencia...',
      ref_label:     'Referencia de Reserva (opcional)',
      ref_placeholder: 'ej. YMV-2025-1234',
      submit_btn:    'Enviar Reseña',
      submitting:    'Enviando...',

      success_title: '¡Gracias!',
      success_sub:   'Tu reseña fue enviada y está pendiente de aprobación.',

      login_prompt:  'Inicia sesión para dejar una reseña',
      login_btn:     'Iniciar Sesión',

      empty_title:   'Aún no hay reseñas',
      empty_sub:     'Sé el primero en compartir tu experiencia.',

      err_rating:  'Por favor selecciona una calificación.',
      err_comment: 'Por favor escribe un comentario.',
    },

    not_found: {
      title:    'Página No Encontrada',
      subtitle: 'La página que buscas no existe o puede haber sido movida.',
      go_home:  'Ir al Inicio',
      book_ride:'Reservar un Viaje',
    },

    footer: {
      tagline: 'Servicios de chófer de lujo en todo Texas, con sede en Houston.',

      services_heading: 'Servicios',
      intercity:        'Viajes Interurbanos',
      hourly:           'Renta por Hora',
      fleet_link:       'Nuestra Flota',
      service_areas:    'Áreas de Servicio',

      company_heading: 'Empresa',
      reviews:         'Reseñas de Clientes',

      connect_heading: 'Contacto',

      copyright: '© 2026 YMV Limo. Todos los derechos reservados.',
      privacy:   'Política de Privacidad',
      terms:     'Términos de Servicio',
      cookies:   'Política de Cookies',
    },

    legal: {
      tab_terms:   'Términos de Servicio',
      tab_privacy: 'Política de Privacidad',
      tab_cookies: 'Política de Cookies',
      updated:     'Última actualización: abril 2026',

      t1_title: '1. Acuerdo',
      t1_body:  'Al reservar un servicio a través de YMV Limo ("nosotros" o "nuestro"), usted acepta estos Términos de Servicio. Si no está de acuerdo, no utilice nuestra plataforma.',
      t2_title: '2. Servicios',
      t2_body:  'YMV Limo ofrece servicios premium de chófer interurbano y por hora en el área metropolitana de Houston y en todo Texas. Todas las reservas están sujetas a la disponibilidad de vehículos y conductores. Nos reservamos el derecho de asignar cualquier vehículo adecuado de nuestra flota.',
      t3_title: '3. Reserva y Pago',
      t3_body:  'Se requiere una tarjeta de crédito o débito válida para completar una reserva. Su tarjeta se guarda de forma segura a través de Stripe y se cargará después de que su viaje se complete o según la política de cancelación. La tarifa mostrada al momento de la reserva es un estimado — el monto final es confirmado por el administrador tras la asignación del vehículo.',
      t4_title: '4. Política de Cancelación',
      t4_rule1_label: 'Más de 6 horas antes de la recogida:',
      t4_rule1_value: 'Cargo administrativo fijo de $20.',
      t4_rule2_label: 'Dentro de las 6 horas antes de la recogida:',
      t4_rule2_value: '50% de la tarifa estimada.',
      t4_rule3_label: 'No-show:',
      t4_rule3_value: 'Se cobra la tarifa completa. Nuestro conductor esperará hasta 30 minutos después de la hora programada antes de marcar la reserva como no-show.',
      t4_note:  'Las cancelaciones deben realizarse a través de la página Mis Reservas. Las cancelaciones solicitadas por WhatsApp o teléfono no serán aceptadas ni procesadas.',
      t5_title: '5. Responsabilidades del Cliente',
      t5_body:  'Usted acepta estar en el lugar de recogida designado a tiempo y tratar nuestros vehículos y conductores con respeto. Cualquier daño causado a un vehículo por un pasajero será responsabilidad financiera del pasajero. YMV Limo no se responsabiliza por objetos olvidados en los vehículos.',
      t6_title: '6. Responsabilidad',
      t6_body:  'Cualquier servicio, acuerdo o pago acordado directamente entre el cliente y el chófer fuera de esta plataforma no es responsabilidad de YMV Limo. Nuestra responsabilidad se limita al monto pagado por la reserva afectada.',
      t7_title: '7. Cambios en los Términos',
      t7_body:  'Podemos actualizar estos términos en cualquier momento. El uso continuado de nuestros servicios después de los cambios constituye la aceptación de los nuevos términos.',
      t8_title: '8. Contacto',

      p1_title: '1. Información que Recopilamos',
      p1_intro: 'Recopilamos la siguiente información cuando crea una cuenta o realiza una reserva:',
      p1_item1: 'Nombre, correo electrónico y número de teléfono',
      p1_item2: 'Lugares de recogida y destino',
      p1_item3: 'Fecha, hora y preferencias del viaje',
      p1_item4: 'Método de pago (almacenado de forma segura por Stripe — nunca almacenamos datos de tarjeta en crudo)',
      p2_title: '2. Cómo Usamos Su Información',
      p2_intro: 'Su información se usa exclusivamente para:',
      p2_item1: 'Procesar y gestionar sus reservas',
      p2_item2: 'Enviar correos de confirmación de reserva y asignación de conductor',
      p2_item3: 'Procesar pagos y aplicar cargos por cancelación',
      p2_item4: 'Mejorar nuestro servicio',
      p2_note:  'No vendemos, alquilamos ni compartimos sus datos personales con terceros con fines de marketing.',
      p3_title:    '3. Servicios de Terceros',
      p3_intro:    'Utilizamos los siguientes servicios de terceros para operar nuestra plataforma:',
      p3_supabase: 'base de datos y autenticación',
      p3_stripe:   'procesamiento seguro de pagos',
      p3_brevo:    'envío de correos transaccionales',
      p3_maps:     'cálculo de distancia de rutas (procesado en el servidor)',
      p4_title: '4. Retención de Datos',
      p4_body:  'Conservamos su historial de reservas e información de cuenta mientras su cuenta esté activa o según lo requerido por la normativa legal y financiera. Puede solicitar la eliminación de su cuenta contactándonos directamente.',
      p5_title: '5. Contacto',

      c1_title:        'Qué Usamos',
      c1_body:         'YMV Limo utiliza almacenamiento mínimo del navegador para operar. No utilizamos cookies publicitarias ni de rastreo.',
      c_col_storage:   'Almacenamiento',
      c_col_purpose:   'Propósito',
      c_col_expires:   'Vencimiento',
      c_row1_purpose:  'Mantiene su sesión iniciada entre visitas',
      c_row1_expires:  'Al cerrar sesión',
      c_row2_purpose:  'Recuerda su preferencia de idioma (EN/ES)',
      c_row2_expires:  'Indefinido',
      c_row3_purpose:  'Almacena los detalles de la reserva durante el proceso de pago',
      c_row3_expires:  'Al cerrar la pestaña',
      c2_title: 'Cookies de Terceros',
      c2_body:  'Stripe puede establecer cookies con fines de prevención de fraude al procesar pagos. Estas son estrictamente necesarias y no pueden desactivarse sin afectar la funcionalidad de pago. Consulte la',
      c2_for:   'para más detalles.',

      contact_pre:         'Para preguntas sobre estos términos, contáctenos por',
      contact_privacy_pre: 'Para solicitudes relacionadas con privacidad, contáctenos por',
      contact_or:          'o llame al',
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
