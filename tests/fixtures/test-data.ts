export const TEST_USERS = {
  ACTIVE: {
    email: 'test@test.com',
    password: 'password123',
    expectedStatus: 'active',
  },
  BLOCKED: {
    email: 'blocked@test.com',
    password: 'password123',
    expectedStatus: 'blocked',
  },
  ADMIN: {
    email: 'admin@test.com',
    password: 'adminpass',
    expectedStatus: 'active',
  },
  NON_EXISTENT: {
    email: 'nonexistent@test.com',
    password: 'password123',
  },
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  MISSING_CREDENTIALS: 'Email and password are required',
  USER_BLOCKED: 'User account is blocked',
  ENDPOINT_NOT_FOUND: 'Endpoint not found',
};
