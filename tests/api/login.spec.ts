import { test, expect } from '@playwright/test';
import { TEST_USERS, ERROR_MESSAGES } from '../fixtures/test-data';

test.describe('Login Endpoint - Authentication', () => {
  test('should login successfully with valid credentials', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        email: TEST_USERS.ACTIVE.email,
        password: TEST_USERS.ACTIVE.password,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Login successful');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(TEST_USERS.ACTIVE.email);
    expect(body.user.status).toBe(TEST_USERS.ACTIVE.expectedStatus);
    expect(body.user.id).toBeDefined();
  });

  test('should return 401 for wrong password', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        email: TEST_USERS.ACTIVE.email,
        password: 'wrongpassword123',
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  test('should return 401 for non-existent user', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        email: TEST_USERS.NON_EXISTENT.email,
        password: TEST_USERS.NON_EXISTENT.password,
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  test('should return 403 for blocked user', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        email: TEST_USERS.BLOCKED.email,
        password: TEST_USERS.BLOCKED.password,
      },
    });

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toBe(ERROR_MESSAGES.USER_BLOCKED);
  });
});
