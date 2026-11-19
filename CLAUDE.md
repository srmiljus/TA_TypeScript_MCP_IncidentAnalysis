# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- Shell is Git Bash; use forward slashes `/` for paths.
- You write all code (zero manual coding required).
- Tests use Playwright Test (TypeScript) with only API tests via `request` fixture in the `tests/` folder.
- `baseURL` comes from `BASE_URL` environment variable; default is `http://localhost:3000`.
- Application runs in Docker container named `auth-service`. Do not modify `src/`, `Dockerfile`, or `docker-compose.yml` unless explicitly requested.
- Never run `git commit`; the user handles commits.

## Build & Development

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Start dev server with ts-node (auto-reload)
npm run start        # Run compiled server (node dist/server.js)
npm run init-db      # Initialize SQLite database with test data
npm run break-user   # Block a user (default: test@test.com)
npm run restore-user # Restore a blocked user (default: test@test.com)
```

## Testing

Playwright Test with TypeScript, API tests only via `request` fixture. Tests go in `tests/` folder.

```bash
# Run all tests
npm run test

# Run single test file
npm run test tests/login.spec.ts

# Run with specific baseURL
BASE_URL=http://localhost:3001 npm run test
```

Test structure:
```typescript
import { test, expect } from '@playwright/test';

test('login success', async ({ request }) => {
  const response = await request.post('/login', {
    data: {
      email: 'test@test.com',
      password: 'password123'
    }
  });
  expect(response.status()).toBe(200);
});
```

## Docker

Application runs in `auth-service` container. Use docker-compose for development:

```bash
docker-compose up --build     # Build and start
docker-compose up             # Start without rebuild
docker-compose down           # Stop services
docker-compose logs -f        # View logs
docker-compose exec auth-service npm run restore-user  # Run command in container
```

## Architecture

### Request/Response Flow (POST /login)

1. **Validate Input** — email and password present?
2. **Query Database** — find user by email
3. **Verify Password** — SHA256 hash comparison (no salt, educational only)
4. **Check Status** — is user 'active' or 'blocked'?
5. **Respond** — return appropriate status code and message

### Response Format

**Success (2xx):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "test@test.com",
    "status": "active"
  }
}
```

**Error (4xx, 5xx):**
```json
{
  "error": "Machine-readable error message"
}
```

### Database Schema (users table)

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT |
| email | TEXT | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL (SHA256) |
| status | TEXT | DEFAULT: 'active' |
| created_at | DATETIME | DEFAULT: NOW |
| updated_at | DATETIME | DEFAULT: NOW |

### Logging (Pino)

Logs written to `logs/app.log` in JSON format (one entry per line):

```json
{
  "level": 30,
  "time": 1642262445123,
  "event": "login_success",
  "email": "test@test.com",
  "user_id": 1
}
```

Events: `server_started`, `login_attempt`, `login_success`, `login_error`, `404_not_found`, `request`

### Test Data

| Email | Password | Status | Notes |
|-------|----------|--------|-------|
| test@test.com | password123 | active | Primary test account |
| blocked@test.com | password123 | blocked | For testing blocked user scenario |
| admin@test.com | adminpass | active | Additional test account |

## Project Structure

```
auth-service/
├── src/
│   ├── server.ts          # Express app, endpoints, middleware
│   ├── database.ts        # SQLite helpers (dbGet, dbRun)
│   ├── logger.ts          # Pino JSON logger configuration
│   ├── init_db.ts         # Database schema and seed data
│   ├── break_user.ts      # Script to block a user
│   └── restore_user.ts    # Script to restore a user
├── tests/                 # Playwright Test files (API tests only)
├── dist/                  # Compiled JavaScript (generated)
├── logs/                  # JSON log files (generated at runtime)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── CLAUDE.md              # This file
```

## Endpoints

- `GET /health` — Server health check → 200 OK
- `POST /login` — Authenticate user → 200, 400, 401, 403

## API Response Status Codes

| Scenario | Code |
|----------|------|
| Successful login | 200 |
| Missing email or password | 400 |
| Invalid email or password | 401 |
| User blocked | 403 |
| Non-existent endpoint | 404 |
| Server error | 500 |

Note: User not found returns 401 (no user enumeration).

## File Locations & Responsibilities

| File | Purpose |
|------|---------|
| `src/server.ts` | Express app, route handlers, request validation |
| `src/database.ts` | Database connection, query execution (dbGet, dbRun) |
| `src/logger.ts` | Pino logger setup with JSON formatting |
| `tests/` | Playwright Test API test specs |

## Notes

- Application intentionally uses weak password hashing (SHA256, no salt) for educational purposes.
- SQLite database is file-based (`database.sqlite`).
- Logs directory (`logs/`) and database are shared volumes in Docker Compose.
- TypeScript strict mode enabled (`tsconfig.json`).
- No pre-existing test framework; set up Playwright Test as needed.
- Application writes JSON logs to `/app/logs/app.log` inside the container (mapped to `./logs/app.log` locally). `docker logs` shows only startup messages; read actual logs from `./logs/app.log` or `docker-compose exec auth-service tail -f /app/logs/app.log`.
