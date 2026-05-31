# API Testing Guide

How to manually test every API endpoint in this project — using Swagger UI, cURL, or Thunder Client / Postman.

---

## Table of Contents

1. [Setup — What You Need](#1-setup--what-you-need)
2. [Understanding the Response Format](#2-understanding-the-response-format)
3. [Tool 1 — Swagger UI (Recommended for Learning)](#3-tool-1--swagger-ui-recommended-for-learning)
4. [Tool 2 — cURL (Terminal)](#4-tool-2--curl-terminal)
5. [Tool 3 — Thunder Client / Postman](#5-tool-3--thunder-client--postman)
6. [Module: Auth](#6-module-auth)
7. [Module: Users (Coming Soon)](#7-module-users-coming-soon)
8. [Template — How to Test Any New Module](#8-template--how-to-test-any-new-module)
9. [Common Error Scenarios](#9-common-error-scenarios)
10. [Environment Variables for Testing](#10-environment-variables-for-testing)

---

## 1. Setup — What You Need

Before testing any endpoint, the following must be running:

```bash
# Step 1 — Start PostgreSQL and Redis
docker-compose up -d

# Step 2 — Run database migrations (only needed once, or after schema changes)
pnpm prisma migrate dev

# Step 3 — Start the NestJS server
pnpm run start:dev
```

**Base URL:** `http://localhost:3000`  
**API Prefix:** All endpoints are under `/api/v1`  
**Swagger UI:** `http://localhost:3000/api/docs`

---

## 2. Understanding the Response Format

Every response from this API follows the same structure:

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... }
}
```

### Created Response (201)
```json
{
  "success": true,
  "statusCode": 201,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "What went wrong",
  "path": "/api/v1/auth/register",
  "timestamp": "2026-05-31T14:00:00.000Z"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "statusCode": 400,
  "message": ["email must be an email", "password must be at least 8 characters"],
  "path": "/api/v1/auth/register",
  "timestamp": "2026-05-31T14:00:00.000Z"
}
```

---

## 3. Tool 1 — Swagger UI (Recommended for Learning)

Swagger is the easiest way to test endpoints — no setup required.

**URL:** `http://localhost:3000/api/docs`

### How to Test a Protected Endpoint in Swagger

1. First call `POST /auth/register` or `POST /auth/login` to get an `accessToken`
2. Click the **Authorize** button (lock icon, top right of Swagger UI)
3. In the `Value` field enter: `Bearer <your_access_token_here>`
4. Click **Authorize** then **Close**
5. Now all protected endpoints will automatically send your token

> Swagger sends your token in the `Authorization: Bearer ...` header on every request after this.

---

## 4. Tool 2 — cURL (Terminal)

cURL is available in any terminal (PowerShell, Git Bash, CMD).

### Register a new user
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"Password123!\", \"firstName\": \"John\", \"lastName\": \"Doe\"}"
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"Password123!\"}"
```

### Get profile (protected — requires token)
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <paste_your_access_token_here>"
```

> **Windows PowerShell tip:** Use double quotes for the entire `-d` value and escape inner quotes with `\"`.

---

## 5. Tool 3 — Thunder Client / Postman

Thunder Client is a VS Code extension (lighter than Postman, built into the editor).

**Install:** VS Code Extensions → search "Thunder Client" → Install

### Setting up an Environment in Thunder Client

1. Go to **Env** tab → New Environment → name it `Local`
2. Add variable: `baseUrl` = `http://localhost:3000/api/v1`
3. Add variable: `accessToken` = *(leave blank, fill after login)*
4. Use `{{baseUrl}}` and `{{accessToken}}` in your requests

### Auto-save token after login (Thunder Client)

In your Login request → **Tests** tab → add:
```javascript
const res = tc.response.json;
tc.setVar("accessToken", res.data.accessToken, "env");
```

This automatically saves the token to your environment after every successful login.

---

## 6. Module: Auth

**Base path:** `/api/v1/auth`  
**Swagger tag:** `Auth`

---

### POST `/api/v1/auth/register`

Register a new user account.

**Auth required:** No (`@Public`)

**Request body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation rules:**
- `email` — must be a valid email address
- `password` — minimum 8 characters
- `firstName` — required string
- `lastName` — required string

**Success response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER"
    }
  }
}
```

**Error cases to test:**
| Scenario | Expected status |
|----------|----------------|
| Missing email | 400 — validation error |
| Invalid email format | 400 — must be an email |
| Password under 8 chars | 400 — too short |
| Email already registered | 409 — conflict |

---

### POST `/api/v1/auth/login`

Login with email and password.

**Auth required:** No (`@Public`)

**Request body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Success response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER"
    }
  }
}
```

**Error cases to test:**
| Scenario | Expected status |
|----------|----------------|
| Wrong password | 401 — Unauthorized |
| Email not registered | 401 — Unauthorized |
| Missing fields | 400 — validation error |

> **Save the `accessToken` and `refreshToken`** from this response — you need them for the next requests.

---

### POST `/api/v1/auth/refresh`

Get a new access token using a refresh token (when access token expires).

**Auth required:** No (`@Public`)

**Request body:**
```json
{
  "refreshToken": "<paste_your_refresh_token_here>"
}
```

**Success response (200):** Same shape as login — new `accessToken` + new `refreshToken`

**Error cases to test:**
| Scenario | Expected status |
|----------|----------------|
| Invalid/tampered token | 401 — Unauthorized |
| Expired refresh token | 403 — Forbidden |
| Already-used refresh token | 401 — Unauthorized |

> Each refresh rotates the token — old refresh token is revoked immediately after use.

---

### POST `/api/v1/auth/logout`

Revoke all refresh tokens for the current user.

**Auth required:** Yes (send `Authorization: Bearer <accessToken>`)

**Request body:** None

**Success response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": { "message": "Logged out successfully" }
}
```

**Error cases to test:**
| Scenario | Expected status |
|----------|----------------|
| No token sent | 401 — Unauthorized |
| Expired access token | 401 — Unauthorized |

---

### GET `/api/v1/auth/me`

Get the profile of the currently authenticated user.

**Auth required:** Yes (send `Authorization: Bearer <accessToken>`)

**Request body:** None

**Success response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "uuid-here",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "isActive": true,
    "createdAt": "2026-05-31T12:00:00.000Z"
  }
}
```

**Error cases to test:**
| Scenario | Expected status |
|----------|----------------|
| No token | 401 — Unauthorized |
| Malformed token | 401 — Unauthorized |

---

## 7. Module: Users (Coming Soon)

Will be documented here when the Users module gets its own admin endpoints.

---

## 8. Template — How to Test Any New Module

Copy this template when a new module is added.

```
### POST `/api/v1/{module}/{action}`

Brief description.

**Auth required:** Yes / No
**Roles allowed:** SUPER_ADMIN / OWNER / MANAGER / STAFF / CUSTOMER

**Request body:**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| field1 | string | Yes | min length 2 |
| field2 | number | No | must be positive |

**Success response ({status}):**
{
  ...
}

**Error cases to test:**
| Scenario | Expected status |
|----------|----------------|
| Missing required field | 400 |
| No auth token | 401 |
| Wrong role | 403 |
| Resource not found | 404 |
| Duplicate entry | 409 |
```

---

## 9. Common Error Scenarios

These apply to every protected endpoint — test them for every module you build:

| Test | How | Expected |
|------|-----|----------|
| No token at all | Don't send `Authorization` header | 401 Unauthorized |
| Malformed token | `Authorization: Bearer not_a_jwt` | 401 Unauthorized |
| Expired access token | Wait 15 minutes or use an old token | 401 Unauthorized |
| Wrong role | Login as CUSTOMER, hit an OWNER-only endpoint | 403 Forbidden |
| Invalid UUID in path param | `GET /api/v1/restaurants/not-a-uuid` | 400 or 404 |
| Empty body on POST | Send `{}` | 400 with validation messages |
| Extra unknown fields | Send `{"email": "a@b.com", "hack": true}` | 400 (whitelist validation strips unknown fields) |

---

## 10. Environment Variables for Testing

These values from `.env` affect API behavior during testing:

| Variable | Value | Effect |
|----------|-------|--------|
| `JWT_EXPIRES_IN` | `15m` | Access token valid for 15 minutes |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token valid for 7 days |
| `PORT` | `3000` | Server runs on port 3000 |
| `API_PREFIX` | `api/v1` | All endpoints prefixed with `/api/v1` |

> To test token expiry without waiting 15 minutes, temporarily change `JWT_EXPIRES_IN` to `10s` in `.env` and restart the server.

---

## Quick Reference — All Current Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1` | No | API info |
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/register` | No | Register new user |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Logout (revoke tokens) |
| GET | `/api/v1/auth/me` | Yes | Get current user profile |
