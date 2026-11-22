import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getAuthToken,
  request,
  setAuthToken,
  setSessionExpiredHandler,
} from '../src/config/apiConfig.js';

test('expired authenticated API responses notify the auth provider and clear the token', async () => {
  const originalFetch = globalThis.fetch;
  let expirationCount = 0;
  setAuthToken('expired-token');
  setSessionExpiredHandler(() => { expirationCount += 1; });
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    message: 'Your student session has expired. Please sign in again.',
  }));

  try {
    await assert.rejects(
      request('getStudentEvaluationData', { authenticated: true }),
      (error) => error.status === 401 && /session has expired/i.test(error.message),
    );
    assert.equal(expirationCount, 1);
    assert.equal(getAuthToken(), null);
  } finally {
    setSessionExpiredHandler(null);
    setAuthToken(null);
    globalThis.fetch = originalFetch;
  }
});

test('authenticated requests without a token notify the auth provider', async () => {
  let expirationCount = 0;
  setAuthToken('previous-token');
  setAuthToken(null);
  setSessionExpiredHandler(() => { expirationCount += 1; });

  try {
    await assert.rejects(
      request('getEvaluationStatus', { authenticated: true }),
      (error) => error.status === 401,
    );
    assert.equal(expirationCount, 1);
  } finally {
    setSessionExpiredHandler(null);
    setAuthToken(null);
  }
});

test('an expired response from an old token does not log out a newer session', async () => {
  const originalFetch = globalThis.fetch;
  let resolveFetch;
  let expirationCount = 0;
  setAuthToken('old-token');
  setSessionExpiredHandler(() => { expirationCount += 1; });
  globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });

  try {
    const pending = request('getEvaluationStatus', { authenticated: true });
    setAuthToken('new-token');
    resolveFetch(new Response(JSON.stringify({
      success: false,
      message: 'Your session has expired. Please sign in again.',
    })));

    await assert.rejects(pending, (error) => error.status === 401);
    assert.equal(getAuthToken(), 'new-token');
    assert.equal(expirationCount, 0);
  } finally {
    setSessionExpiredHandler(null);
    setAuthToken(null);
    globalThis.fetch = originalFetch;
  }
});
