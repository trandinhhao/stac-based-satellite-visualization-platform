import axios from 'axios';

// Khởi tạo đối tượng Axios gọi tới FastAPI Backend cục bộ (Celery tasks, database...)
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Khởi tạo đối tượng Axios gọi tới dịch vụ định vị ngoài Nominatim (OpenStreetMap Geocoding)
export const geocodingApi = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  timeout: 10000,
});
