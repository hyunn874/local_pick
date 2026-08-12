import apiClient, { API_BASE_URL, ApiError } from './apiClient';

export { API_BASE_URL, ApiError, apiClient };
export const appClient = apiClient;
export default apiClient;
