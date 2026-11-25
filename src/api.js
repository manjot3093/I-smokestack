// Empty locally so Vite's development proxy continues to handle API requests.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
