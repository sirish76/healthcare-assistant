import apiClient from './api';

// Coverage-transition API. All calls that carry user data are POST so nothing
// sensitive ends up in URLs or server access logs. No auth headers are sent:
// the flow works without an account and is never tied to a user.

export const lookupLocation = async (zip) => (await apiClient.post('/transition/location', { zip })).data;

export const searchDrugs = async (query) => (await apiClient.post('/transition/drugs/search', { query })).data;

export const searchProviders = async (query, zip) =>
  (await apiClient.post('/transition/providers/search', { query, zip })).data;

export const analyzeCoverage = async (payload) =>
  (await apiClient.post('/transition/analyze', payload, { timeout: 60000 })).data;
