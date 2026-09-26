# StockSense IMS

StockSense is a modular inventory operations starter with a React/Vite client, a Spring Boot REST API, and MySQL persistence. It includes product catalogue and reorder points, multi-warehouse balances, draft receipts/deliveries/transfers/adjustments, transactional validation, a stock movement ledger, dashboard KPIs, bearer-session authentication, and OTP password reset.

## Requirements

- Java 17 or newer
- Maven 3.9+
- Node.js 20+
- Docker Desktop with Docker Compose (or a locally running MySQL 8 instance)

## Run locally

1. Start MySQL from the project root:

   ```powershell
   docker compose up -d mysql
   ```

2. Start the API in a second terminal:

   ```powershell
   cd backend
   mvn spring-boot:run
   ```

   The API is available at `http://localhost:8080/api`. The first run creates the schema and seeds three warehouses, six products, sample stock, and a demo manager account.

3. Start the frontend in another terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The UI uses the API after a successful backend sign-in. If the API is unavailable, demo mode remains usable in browser storage; offline sign-up creates a browser-local demo account and does not write a user to MySQL.

## Demo access

- Email: `manager@stocksense.app`
- Password: `stock1234`
- When `EXPOSE_RESET_OTP` is enabled (the local default), the reset endpoint returns a `demoOtp` value so password recovery can be tested without an email provider. This must be disabled outside local development and replaced by an email/SMS delivery integration.

Demo inventory can also be explored without starting MySQL using the same demo login; browser changes are saved to local storage and are separate from database-backed data.

## API overview

- `POST /api/auth/signup`, `POST /api/auth/login`
- `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`
- `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`, `GET /api/products/{id}/stock`
- `GET/POST /api/warehouses`
- `GET /api/dashboard`
- `GET/POST /api/operations`, `POST /api/operations/{id}/validate`
- `GET /api/movements`

Inventory routes require the bearer token returned by signup or login. Operation validation updates balances and appends ledger movements in a single database transaction; insufficient stock is rejected. Database connection settings can be overridden with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.

## Development notes

The demo OTP is returned by the API only to keep the starter self-testable without mail configuration. Session tokens and reset codes are held in process memory, schema generation uses Hibernate `ddl-auto: update`, and the seeded credentials/MySQL passwords are local-development defaults. Before production, use a real OTP delivery provider, durable revocable sessions, managed secrets, database migrations, and appropriate account/rate-limit policies.