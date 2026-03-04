import { supabase } from './supabase.js'
import { getUser } from './auth.js'
import { generateBookingRef } from './utils.js'

/**
 * Find the first active vehicle not already booked for the given date + time slot.
 * Returns a vehicle object (snake_case from DB) or null if all are taken.
 */
export async function assignVehicle(tripDate, tripTime) {
  const { data: vehicles, error: vErr } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_active', true)

  if (vErr) throw new Error('Failed to load fleet: ' + vErr.message)
  if (!vehicles || vehicles.length === 0) return null

  const { data: booked, error: bErr } = await supabase
    .from('vehicle_availability')
    .select('vehicle_id')
    .eq('trip_date', tripDate)
    .eq('trip_time', tripTime)

  if (bErr) throw new Error('Failed to check availability: ' + bErr.message)

  const bookedIds = new Set((booked || []).map(r => r.vehicle_id))
  return vehicles.find(v => !bookedIds.has(v.id)) ?? null
}

/**
 * Calculate fare from a vehicle DB row and distance.
 * Mirrors the original fleet.js formula; vehicle uses snake_case columns.
 */
export function calculateFare(vehicle, distanceKm = 280) {
  const baseFare          = +(vehicle.price_per_mile * distanceKm * 0.621371).toFixed(2)
  const distanceSurcharge = +(baseFare * 0.142).toFixed(2)
  const amenities         = 45
  const gratuity          = +((baseFare + distanceSurcharge + amenities) * 0.15).toFixed(2)
  const taxes             = +((baseFare + distanceSurcharge + amenities + gratuity) * 0.06).toFixed(2)
  const total             = +(baseFare + distanceSurcharge + amenities + gratuity + taxes).toFixed(2)
  return { baseFare, distanceSurcharge, amenities, gratuity, taxes, total }
}

/**
 * Save a confirmed booking to Supabase.
 * Inserts into bookings, then claims the vehicle slot in vehicle_availability.
 * Returns the saved booking row.
 */
export async function saveBooking({
  vehicle, search, fare,
  passengerName, passengerEmail, passengerPhone, passengerCount,
  preferences, specialInstructions,
}) {
  const user = await getUser()
  if (!user) throw new Error('Not authenticated')

  const bookingRef = generateBookingRef()

  const { data: booking, error: insertErr } = await supabase
    .from('bookings')
    .insert({
      booking_ref:          bookingRef,
      user_id:              user.id,
      vehicle_id:           vehicle.id,
      pickup:               search.pickup,
      dropoff:              search.dropoff,
      trip_date:            search.date,
      trip_time:            search.time,
      passenger_name:       passengerName,
      passenger_email:      passengerEmail,
      passenger_phone:      passengerPhone,
      passenger_count:      passengerCount,
      pref_champagne:       preferences.champagne,
      pref_playlist:        preferences.customPlaylist,
      pref_daily_press:     preferences.dailyPress,
      pref_wifi:            preferences.premiumWiFi,
      special_instructions: specialInstructions,
      distance_km:          280,
      fare_base:            fare.baseFare,
      fare_distance:        fare.distanceSurcharge,
      fare_amenities:       fare.amenities,
      fare_gratuity:        fare.gratuity,
      fare_taxes:           fare.taxes,
      fare_total:           fare.total,
      status:               'confirmed',
    })
    .select()
    .single()

  if (insertErr) throw new Error('Failed to save booking: ' + insertErr.message)

  // Claim the vehicle slot — UNIQUE constraint prevents double-booking
  const { error: availErr } = await supabase
    .from('vehicle_availability')
    .insert({
      vehicle_id: vehicle.id,
      booking_id: booking.id,
      trip_date:  search.date,
      trip_time:  search.time,
    })

  if (availErr) {
    throw new Error('That time slot was just taken. Please choose a different time.')
  }

  return booking
}

/**
 * Fetch all bookings for the current user, joined with vehicle data for display.
 */
export async function getUserBookings() {
  const user = await getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('bookings')
    .select('*, vehicles (id, name, image, class, badge, badge_color)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to load bookings: ' + error.message)
  return data || []
}
