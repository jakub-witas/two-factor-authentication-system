# Mobile 2FA Authentication Demo

> A mobile Expo application demonstrating registration, login, and multi-factor authentication management.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.79-61DAFB?logo=react&logoColor=111111)](https://reactnative.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-8%20Alpine-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)


This project is a demo mobile application prepared for a master's thesis. The frontend runs on Expo/React Native, and the backend consists of two Express services: a main server responsible for user accounts and a dedicated server handling 2FA data and operations.

## Table of Contents

- [Key Features](#key-features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Tests](#tests)
- [Further Development](#further-development)

## Key Features

- user registration with email and password validation,
- login with a JWT token valid for 15 minutes,
- optional multi-factor authentication via email code, Google Authenticator (TOTP), or device biometrics,
- temporary login sessions and OTP codes stored in Redis,
- secure storage of the session token in `expo-secure-store`,
- logout with revocation of the active token,
- password and email address changes,
- enabling, confirming, and disabling 2FA,
- account deletion along with the associated 2FA configuration,
- HTTP security measures: Helmet, XSS filtering, input validation, and rate limiting.

## Technologies

| Area | Technologies |
| --- | --- |
| Mobile app | Expo SDK 54, React 19, React Native 0.79 |
| API | Node.js 18, Express 4 |
| User data | PostgreSQL, Sequelize 6 |
| Temporary data and sessions | Redis |
| Authentication | JWT, bcryptjs, otplib, `expo-local-authentication` |
| On-device storage | `expo-secure-store` |
| Email 2FA | Nodemailer, SMTP |
| Testing | Vitest, Supertest, Testing Library for React Native, happy-dom |
| Service orchestration | Docker, Docker Compose |

## Architecture

```text
Project/
├── front/                 # Expo/React Native application
│   ├── api/               # API calls and user session
│   ├── controllers/       # Login and settings form logic
│   ├── screens/           # App screens and modals
│   ├── styles/            # React Native styles
│   └── __tests__/         # Client tests
├── server/                # Main user API
│   ├── config/            # Database, Redis, JWT, and rate limits
│   ├── models/            # User model and init SQL
│   ├── routes/            # Registration, login, account, and 2FA
│   └── __tests__/         # API and model tests
├── auth/                  # Dedicated 2FA API
│   ├── config/            # Redis, SMTP, secret encryption
│   ├── models/            # 2FA configuration model and init SQL
│   ├── routes/            # Code and 2FA method operations
│   └── __tests__/         # API, cryptography, and helper tests
└── README.md
```

### Login Flow with 2FA

1. The app sends login credentials to `server`.
2. The main server verifies the account and asks `auth-server` whether the user has active 2FA.
3. For email or Google Authenticator, the client displays a code entry form; for biometrics, it uses the device's system mechanism.
4. Upon successful verification, the main server issues a JWT, which the client stores in `expo-secure-store`.

The servers communicate with each other via `AUTH_API_URL` and the `X-Server-Secret` header.

## Getting Started

### Requirements

- Docker Desktop with Docker Compose,
- Node.js 18 or newer,
- npm,
- a device or emulator supporting Expo.

### Backend

If a Compose configuration is present in the repository, run the following in the root directory:

```bash
docker compose up -d --build
```

A typical configuration starts the main API server, the 2FA server, two PostgreSQL databases, and two Redis instances.

### Mobile App

```bash
cd front
npm install
npm start
```

Then select a device or emulator in the Expo interface. Before running on a physical device, check the `API_BASE_URL` address in `front/api/auth.js` and match it to an address for your computer that is reachable from the device.

## Configuration

`.env` files are used by the backends. Their contents should not be published, and secrets should not be entered directly into the repository.

### `server/.env`

| Variable | Meaning |
| --- | --- |
| `DB_USER` | Main PostgreSQL database user |
| `DB_PASSWORD` | Main PostgreSQL database password |
| `DB_DATABASE` | Main database name |
| `DB_PORT` | Database port |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `SERVER_SECRET` | Secret for communication with the 2FA server |
| `API_PORT` | Main API port |
| `AUTH_API_URL` | Base address of the 2FA server |
| `NODE_ENV` | Runtime mode, affects CORS rules among other things |

### `auth/.env`

| Variable | Meaning |
| --- | --- |
| `DB_USER` | 2FA PostgreSQL database user |
| `DB_PASSWORD` | 2FA PostgreSQL database password |
| `DB_DATABASE` | 2FA database name |
| `DB_PORT` | 2FA database port |
| `API_PORT` | 2FA API port |
| `API_BASE_URL` | Base address used by the service configuration |
| `SMTP_USER` | SMTP server user |
| `SMTP_PASS` | SMTP server password |
| `SECRET_KEY` | Encryption key for 2FA secrets |
| `SERVER_SECRET` | Secret verified in inter-service communication |

In environments other than local, secret values, database credentials, and SMTP credentials should be provided securely, outside the repository.

## Usage

After launching the mobile app:

1. Select **Create Account** and register a name, email, and password.
2. Log in using the credentials you created.
3. Open **Settings** to enable email, Google Authenticator, or biometrics.
4. When setting up email, enter the code sent via SMTP; for Google Authenticator, open or copy the generated link/secret and then confirm with a code.
5. From Settings, you can also change your password, change your email, or delete your account.

Sample API calls:

```bash
# Registration
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jan Kowalski","email":"jan@example.com","password":"<your-password>"}'

# Login without active 2FA
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@example.com","password":"<your-password>"}'

# Health check for the main API
curl http://localhost:3000/api/health
```

The login response contains a JWT token if the account does not require an additional 2FA step. When 2FA is active, the response contains information about the method and the temporary session needed to confirm the code.

## Tests

Each module has its own `package.json` and Vitest configuration. Dependencies must be installed in the module's directory before running tests.

```bash
# User backend
cd server
npm install
npm test
npm run test:coverage

# 2FA server
cd ../auth
npm install
npm test
npm run test:coverage

# Frontend
cd ../front
npm install
npm run test:run
npm run test:coverage
```

The `auth` and `server` services also provide scripts related to a test PostgreSQL database, if present in their current `package.json` files.

## Further Development

Based on the current structure, natural next steps include:

- moving the mobile client's API address to Expo configuration instead of a hardcoded value in the code,
- adding automated CI for testing all three modules,
- adding integration tests for the full flow between `server` and `auth`,
- separating development and production configuration and managing secrets securely,
- adding screens or tools for monitoring service status in the deployment environment.
