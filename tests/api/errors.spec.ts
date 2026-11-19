import { test, expect } from '@playwright/test';
import { ERROR_MESSAGES } from '../fixtures/test-data';

test.describe('Error Handling', () => {
  test('should return 404 for non-existent endpoint', async ({ request }) => {
    const response = await request.get('/nonexistent');

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.ENDPOINT_NOT_FOUND);
  });

  test('should return 404 for invalid POST endpoint', async ({ request }) => {
    const response = await request.post('/invalid-endpoint', {
      data: { test: 'data' },
    });

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.ENDPOINT_NOT_FOUND);
  });
});
