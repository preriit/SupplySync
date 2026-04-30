import { createWebApiClient } from '@supplysync/core';

const rawBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const api = createWebApiClient(rawBaseUrl);

export default api;
