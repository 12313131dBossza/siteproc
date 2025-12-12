/**
 * Test Weather API endpoint
 * GET /api/test-weather?city=Bangkok&country=TH
 */

import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, getWeatherForecast } from '@/lib/delay-shield';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'Bangkok';
    const state = searchParams.get('state') || '';
    const country = searchParams.get('country') || 'TH';
    
    console.log(`[Test Weather] Testing for: ${city}, ${state}, ${country}`);
    
    // Step 1: Geocode the location
    const coords = await geocodeAddress('', city, state, country);
    
    if (!coords) {
      return NextResponse.json({
        success: false,
        error: 'Could not geocode location',
        input: { city, state, country }
      }, { status: 400 });
    }
    
    console.log(`[Test Weather] Geocoded to: ${coords.lat}, ${coords.lon}`);
    
    // Step 2: Get weather forecast
    const weather = await getWeatherForecast(coords.lat, coords.lon);
    
    console.log(`[Test Weather] Weather result:`, weather);
    
    return NextResponse.json({
      success: true,
      input: { city, state, country },
      coordinates: coords,
      weather: {
        summary: weather.summary,
        forecast_days: weather.forecast_days,
        rain_days: weather.rain_days,
        avg_temp: weather.avg_temp,
        extreme_conditions: weather.extreme_conditions,
        total_precipitation_mm: weather.total_precipitation_mm,
        daily: weather.daily
      }
    });
    
  } catch (error: any) {
    console.error('[Test Weather] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
