import axios from 'axios';

// Axios instance for custom backend (Celery tasks, database operations)
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios instance for STAC API (PgSTAC search metadata)
export const stacApi = axios.create({
  baseURL: '/stac',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios instance for external Geocoding (Nominatim)
export const geocodingApi = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  timeout: 10000,
  headers: {
    'User-Agent': 'stac-satellite-platform/1.0',
  },
});
