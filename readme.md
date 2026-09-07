# Mobile 2FA Authentication Demo

> Aplikacja mobilna Expo prezentująca rejestrację, logowanie i zarządzanie uwierzytelnianiem wieloskładnikowym.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.79-61DAFB?logo=react&logoColor=111111)](https://reactnative.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-8%20Alpine-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)


Projekt jest demonstracyjną aplikacją mobilną przygotowaną na potrzeby pracy magisterskiej. Frontend działa w Expo/React Native, a backend składa się z dwóch usług Express: serwera głównego odpowiedzialnego za konta użytkowników oraz wydzielonego serwera obsługującego dane i operacje 2FA.

## Spis treści

- [Najważniejsze funkcje](#najważniejsze-funkcje)
- [Technologie](#technologie)
- [Architektura](#architektura)
- [Uruchomienie](#uruchomienie)
- [Konfiguracja](#konfiguracja)
- [Użycie](#użycie)
- [Testy](#testy)
- [Dalszy rozwój](#dalszy-rozwój)

## Najważniejsze funkcje

- rejestracja użytkownika z walidacją adresu e-mail i hasła,
- logowanie z tokenem JWT ważnym 15 minut,
- opcjonalne uwierzytelnianie dwuskładnikowe przez kod e-mail, Google Authenticator (TOTP) lub biometrię urządzenia,
- tymczasowe sesje logowania i kody OTP przechowywane w Redisie,
- bezpieczne przechowywanie tokenu sesji w `expo-secure-store`,
- wylogowanie z unieważnieniem aktywnego tokenu,
- zmiana hasła i adresu e-mail,
- włączenie, potwierdzenie i wyłączenie 2FA,
- usunięcie konta wraz z powiązaną konfiguracją 2FA,
- zabezpieczenia HTTP: Helmet, filtrowanie XSS, walidacja wejścia i rate limiting.

## Technologie

| Obszar | Technologie |
| --- | --- |
| Aplikacja mobilna | Expo SDK 54, React 19, React Native 0.79 |
| API | Node.js 18, Express 4 |
| Dane użytkowników | PostgreSQL, Sequelize 6 |
| Dane tymczasowe i sesje | Redis |
| Uwierzytelnianie | JWT, bcryptjs, otplib, `expo-local-authentication` |
| Magazyn na urządzeniu | `expo-secure-store` |
| E-mail 2FA | Nodemailer, SMTP |
| Testy | Vitest, Supertest, Testing Library dla React Native, happy-dom |
| Uruchamianie usług | Docker, Docker Compose |

## Architektura

```text
Projekt/
├── front/                 # Aplikacja Expo/React Native
│   ├── api/               # Wywołania API i sesja użytkownika
│   ├── controllers/       # Logika formularzy logowania i ustawień
│   ├── screens/           # Ekrany aplikacji i modale
│   ├── styles/            # Style React Native
│   └── __tests__/         # Testy klienta
├── server/                # Główny API użytkowników
│   ├── config/            # Baza danych, Redis, JWT i limity
│   ├── models/            # Model użytkownika i SQL inicjalizacyjny
│   ├── routes/            # Rejestracja, logowanie, konto i 2FA
│   └── __tests__/         # Testy API i modeli
├── auth/                  # Wydzielony API 2FA
│   ├── config/            # Redis, SMTP, szyfrowanie sekretów
│   ├── models/            # Model konfiguracji 2FA i SQL inicjalizacyjny
│   ├── routes/            # Operacje na kodach i metodach 2FA
│   └── __tests__/         # Testy API, kryptografii i helperów
└── README.md
```

### Przepływ logowania z 2FA

1. Aplikacja wysyła dane logowania do `server`.
2. Serwer główny sprawdza konto i pyta `auth-server`, czy użytkownik ma aktywne 2FA.
3. Dla e-maila lub Google Authenticator klient wyświetla formularz kodu; dla biometrii korzysta z mechanizmu systemowego urządzenia.
4. Po pomyślnej weryfikacji serwer główny wystawia JWT, który klient zapisuje w `expo-secure-store`.

Serwery komunikują się między sobą przez `AUTH_API_URL` i nagłówek `X-Server-Secret`.

## Uruchomienie

### Wymagania

- Docker Desktop z Docker Compose,
- Node.js 18 lub nowszy,
- npm,
- urządzenie lub emulator obsługujący Expo.

### Backend

Jeśli w repozytorium znajduje się konfiguracja Compose, uruchom w katalogu głównym:

```bash
docker compose up -d --build
```

Typowa konfiguracja uruchamia główny serwer API, serwer 2FA, dwie bazy PostgreSQL oraz dwie instancje Redis.

### Aplikacja mobilna

```bash
cd front
npm install
npm start
```

Następnie wybierz urządzenie lub emulator w interfejsie Expo. Przed uruchomieniem na fizycznym urządzeniu sprawdź adres `API_BASE_URL` w `front/api/auth.js` i dopasuj go do adresu komputera dostępnego z urządzenia.

## Konfiguracja

Pliki `.env` są używane przez backendy. Nie należy publikować ich zawartości ani wpisywać sekretów bezpośrednio do repozytorium.

### `server/.env`

| Zmienna | Znaczenie |
| --- | --- |
| `DB_USER` | Użytkownik głównej bazy PostgreSQL |
| `DB_PASSWORD` | Hasło głównej bazy PostgreSQL |
| `DB_DATABASE` | Nazwa głównej bazy danych |
| `DB_PORT` | Port bazy danych |
| `JWT_SECRET` | Sekret do podpisywania tokenów JWT |
| `SERVER_SECRET` | Sekret komunikacji z serwerem 2FA |
| `API_PORT` | Port głównego API |
| `AUTH_API_URL` | Bazowy adres serwera 2FA |
| `NODE_ENV` | Tryb pracy, wpływa między innymi na reguły CORS |

### `auth/.env`

| Zmienna | Znaczenie |
| --- | --- |
| `DB_USER` | Użytkownik bazy PostgreSQL 2FA |
| `DB_PASSWORD` | Hasło bazy PostgreSQL 2FA |
| `DB_DATABASE` | Nazwa bazy danych 2FA |
| `DB_PORT` | Port bazy danych 2FA |
| `API_PORT` | Port API 2FA |
| `API_BASE_URL` | Bazowy adres używany przez konfigurację usługi |
| `SMTP_USER` | Użytkownik serwera SMTP |
| `SMTP_PASS` | Hasło serwera SMTP |
| `SECRET_KEY` | Klucz szyfrowania sekretów 2FA |
| `SERVER_SECRET` | Sekret weryfikowany w komunikacji między usługami |

W środowisku innym niż lokalne wartości sekretów, poświadczeń baz i SMTP należy dostarczyć bezpiecznie, poza repozytorium.

## Użycie

Po uruchomieniu aplikacji mobilnej:

1. Wybierz **Utwórz konto** i zarejestruj nazwę, e-mail oraz hasło.
2. Zaloguj się przy użyciu utworzonych danych.
3. Otwórz **Ustawienia**, aby włączyć e-mail, Google Authenticator lub biometrię.
4. Przy konfiguracji e-maila wpisz kod dostarczony przez SMTP; przy Google Authenticator otwórz lub skopiuj wygenerowany link/sekret, a następnie potwierdź kodem.
5. Z poziomu ustawień możesz także zmienić hasło, zmienić e-mail albo usunąć konto.

Przykładowe wywołania API:

```bash
# Rejestracja
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jan Kowalski","email":"jan@example.com","password":"<your-password>"}'

# Logowanie bez aktywnego 2FA
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan@example.com","password":"<your-password>"}'

# Health check głównego API
curl http://localhost:3000/api/health
```

Odpowiedź logowania zawiera token JWT, jeśli konto nie wymaga dodatkowego kroku 2FA. Gdy 2FA jest aktywne, odpowiedź zawiera informację o metodzie i tymczasowej sesji potrzebnej do potwierdzenia kodu.

## Testy

Każdy moduł ma własny `package.json` i konfigurację Vitest. Zależności należy zainstalować w katalogu modułu przed uruchomieniem testów.

```bash
# Backend użytkowników
cd server
npm install
npm test
npm run test:coverage

# Serwer 2FA
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

Serwery `auth` i `server` udostępniają również skrypty związane z testową bazą PostgreSQL, jeśli są obecne w ich aktualnych plikach `package.json`.

## Dalszy rozwój

Na podstawie obecnej struktury naturalnymi kolejnymi krokami są:

- przeniesienie adresu API klienta mobilnego do konfiguracji Expo zamiast stałej w kodzie,
- dodanie automatycznego CI dla testów trzech modułów,
- uzupełnienie testów integracyjnych dla pełnego przepływu między `server` i `auth`,
- rozdzielenie konfiguracji deweloperskiej i produkcyjnej oraz bezpieczne zarządzanie sekretami,
- dodanie ekranów lub narzędzi do obserwowania stanu usług w środowisku wdrożeniowym.