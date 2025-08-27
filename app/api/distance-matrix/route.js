import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { origin, destinations } = await request.json();
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    console.log('Distance Matrix API Request:', { origin, destinations });

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Missing GOOGLE_MAPS_API_KEY');
      return NextResponse.json(
        { error: 'Google Maps API key is missing' },
        { status: 500 }
      );
    }

    if (!origin || !destinations || !Array.isArray(destinations) || destinations.length === 0) {
      console.warn('Invalid input:', { origin, destinations });
      return NextResponse.json(
        { error: 'Invalid origin or destinations' },
        { status: 400 }
      );
    }

    const encodedOrigin = encodeURIComponent(origin);
    const encodedDestinations = destinations.map(dest => encodeURIComponent(dest)).join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedOrigin}&destinations=${encodedDestinations}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
    console.log('Google Maps API URL:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Google Maps API HTTP error:', { status: res.status, errorText });
      throw new Error(`HTTP error! Status: ${res.status}, Details: ${errorText}`);
    }

    const data = await res.json();
    console.log('Google Maps API Response:', data);

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', { status: data.status, error_message: data.error_message });
      return NextResponse.json(
        { error: `Google Maps API error: ${data.status}`, details: data.error_message || 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in distance-matrix API:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch distance matrix', details: error.message },
      { status: 500 }
    );
  }
}