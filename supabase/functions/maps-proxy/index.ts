// Supabase Edge Function: maps-proxy
// Server-side proxy for Google Maps APIs so the API key never reaches the browser.
//
// Deploy:
//   supabase functions deploy maps-proxy --no-verify-jwt
//
// Required secrets:
//   GOOGLE_MAPS_API_KEY = AIza...
//
// Required Google APIs (enable in Cloud Console):
//   Places API (New), Routes API, Maps Static API, Geocoding API
//
// Supported actions (all POST):
//   { "action": "autocomplete", "input": "...", "locationBias": {...} }
//   { "action": "place",        "placeId": "ChIJ..." }
//   { "action": "distance",     "origin": { "latitude", "longitude" }, "destination": { ... } }
//     → returns { distanceMeters, duration, encodedPolyline }
//   { "action": "staticmap",    "origin": { "latitude", "longitude" }, "destination": { ... }, "encodedPolyline": "..." }
//     → returns image/png binary
//   { "action": "geocode",      "latitude": ..., "longitude": ... }
//     → returns { formattedAddress, location: { latitude, longitude } }

const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...params } = await req.json()

    // ── Autocomplete ───────────────────────────────────────────────────────────
    if (action === 'autocomplete') {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY },
        body: JSON.stringify({
          input: params.input,
          ...(params.locationRestriction && { locationRestriction: params.locationRestriction }),
          ...(params.locationBias        && { locationBias:        params.locationBias }),
          ...(!params.locationRestriction && !params.locationBias && { includedRegionCodes: ['us'] }),
        }),
      })
      const result = await res.json()
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Place detail ───────────────────────────────────────────────────────────
    if (action === 'place') {
      const res = await fetch(`https://places.googleapis.com/v1/places/${params.placeId}`, {
        headers: { 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': 'location,displayName' },
      })
      const result = await res.json()
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Distance + polyline (computeRoutes) ────────────────────────────────────
    if (action === 'distance') {
      const { origin, destination } = params
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin:      { location: { latLng: { latitude: origin.latitude,      longitude: origin.longitude } } },
          destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
          travelMode:  'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
      })
      const data = await res.json()
      const route = data.routes?.[0]
      const result = route
        ? { distanceMeters: route.distanceMeters, duration: route.duration, encodedPolyline: route.polyline?.encodedPolyline ?? null }
        : { error: 'No route found' }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Static map image ───────────────────────────────────────────────────────
    if (action === 'staticmap') {
      const { origin, destination, encodedPolyline } = params
      const p = new URLSearchParams({
        size:    '640x260',
        maptype: 'roadmap',
        key:     GOOGLE_KEY,
      })
      p.append('markers', `color:0xC5A059|label:A|${origin.latitude},${origin.longitude}`)
      p.append('markers', `color:0x1152d4|label:B|${destination.latitude},${destination.longitude}`)
      if (encodedPolyline) {
        p.append('path', `color:0x1152d4ff|weight:5|enc:${encodedPolyline}`)
      } else {
        p.append('path', `color:0x1152d4ff|weight:3|${origin.latitude},${origin.longitude}|${destination.latitude},${destination.longitude}`)
      }
      // Dark map style
      const styles = [
        'feature:all|element:geometry|color:0x212121',
        'feature:all|element:labels.text.stroke|color:0x212121',
        'feature:all|element:labels.text.fill|color:0x757575',
        'feature:road|element:geometry|color:0x484848',
        'feature:road.arterial|element:geometry|color:0x373737',
        'feature:road.highway|element:geometry|color:0x3c3c3c',
        'feature:water|element:geometry|color:0x000000',
        'feature:poi|element:geometry|color:0x181818',
      ]
      styles.forEach(s => p.append('style', s))

      const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${p.toString()}`)
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Static map failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const img = await res.arrayBuffer()
      return new Response(img, { headers: { ...corsHeaders, 'Content-Type': 'image/png' } })
    }

    // ── Reverse geocode ────────────────────────────────────────────────────────
    if (action === 'geocode') {
      const { latitude, longitude } = params
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}`,
      )
      const data = await res.json()
      const top = data.results?.[0]
      const result = top
        ? { formattedAddress: top.formatted_address, location: { latitude: top.geometry.location.lat, longitude: top.geometry.location.lng } }
        : { error: 'No address found' }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
