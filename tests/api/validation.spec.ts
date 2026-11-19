import { test, expect } from '@playwright/test';
import { TEST_USERS, ERROR_MESSAGES } from '../fixtures/test-data';

test.describe('Login Endpoint - Input Validation', () => {
  test('should return 400 when email is missing', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        password: TEST_USERS.ACTIVE.password,
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.MISSING_CREDENTIALS);
  });

  test('should return 400 when password is missing', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        email: TEST_USERS.ACTIVE.email,
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.MISSING_CREDENTIALS);
  });

  test('should return 400 when both email and password are missing', async ({ request }) => {
    const response = await request.post('/login', {
      data: {},
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.MISSING_CREDENTIALS);
  });
});
