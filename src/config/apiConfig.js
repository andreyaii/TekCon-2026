export const API_BASE_URL = import.meta.env?.VITE_API_URL
  || 'https://script.google.com/macros/s/AKfycbwf0SaLnQN7skN0sjwbEFPNNl6nX6Wb6ondSaL35ojVxYWPT-uVs6d4DlSCEAc7Pm74/exec';

let authToken = null;
let sessionExpiredHandler = null;
let sessionExpiryNotified = false;
const pendingGetRequests = new Map();
export const getAuthToken = () => authToken;
export const setAuthToken = (token) => {
  authToken = token || null;
  if (authToken) sessionExpiryNotified = false;
};

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = typeof handler === 'function' ? handler : null;
}

function isSessionExpiredMessage(message) {
  return /session.*(?:expired|invalid|required)|(?:expired|invalid).*session/i.test(message);
}

function notifySessionExpired(expectedToken = authToken) {
  if (expectedToken && authToken !== expectedToken) return;
  authToken = null;
  if (sessionExpiryNotified) return;
  sessionExpiryNotified = true;
  sessionExpiredHandler?.();
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(action, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let url = API_BASE_URL;
  const query = new URLSearchParams({ action });
  const token = options.authenticated ? getAuthToken() : null;

  if (options.authenticated && !token) {
    notifySessionExpired();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  const fetchOptions = {
    method,
    headers: { ...options.headers }
  };

  if (method === 'GET') {
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.set(key, String(value));
    });
    if (token) query.set('sessionToken', token);
    url += `?${query.toString()}`;
  } else {
    // For POST/PUT, pass text/plain to avoid CORS preflight issues with Google Apps Script
    fetchOptions.headers['Content-Type'] = 'text/plain;charset=utf-8';
    fetchOptions.body = JSON.stringify({
      action,
      ...(options.body || {}),
      ...(token ? { sessionToken: token } : {})
    });
  }

  const execute = async () => {
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const message = (await res.text()) || 'Request failed';
      if (options.authenticated && (res.status === 401 || isSessionExpiredMessage(message))) {
        notifySessionExpired(token);
      }
      throw new ApiError(message, res.status);
    }

    const json = await res.json();
    if (json.success === false) {
      const message = json.message || 'API operation failed';
      const sessionExpired = options.authenticated && isSessionExpiredMessage(message);
      if (sessionExpired) notifySessionExpired(token);
      throw new ApiError(message, sessionExpired ? 401 : 400);
    }

    return json;
  };

  if (method !== 'GET' || options.deduplicate === false) return execute();
  if (pendingGetRequests.has(url)) return pendingGetRequests.get(url);

  const pendingRequest = execute();
  pendingGetRequests.set(url, pendingRequest);
  try {
    return await pendingRequest;
  } finally {
    if (pendingGetRequests.get(url) === pendingRequest) pendingGetRequests.delete(url);
  }
}