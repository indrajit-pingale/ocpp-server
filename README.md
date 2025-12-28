# OCPP Server (NestJS + React + MySQL + Docker)

Monorepo scaffold with a NestJS backend (OCPP endpoints), a React + MUI frontend, MySQL database, and Docker Compose.

Quick start (requires Docker):

```bash
docker-compose up --build
```

Backend: http://localhost:3000
Frontend: http://localhost:5173

Device authentication

- By default registration accepts any device. To require a pre-shared token set `DEVICE_TOKEN` in `backend/.env`.

  - Example `backend/.env`: `DEVICE_TOKEN=supersecret`
  - Devices must include the token in their register message `{ type: 'register', identity: 'CP_001', token: 'supersecret' }`.
  - You can provision devices from the admin UI in the frontend or via `POST /api/devices`.
  - Device tokens are hashed in the database using bcrypt for secure storage.

  Admin API

  - Create an admin (one-time) via:

  ```bash
  curl -X POST http://localhost:3000/api/admin/register \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"secret"}'
  ```

  - Login to get a JWT:

  ```bash
  curl -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"secret"}'
  ```

  Use the returned token as `Authorization: Bearer <token>` when provisioning devices.

OCPP support

- Basic array-style OCPP CALL messages are supported (BootNotification, Heartbeat, StartTransaction, StopTransaction, StatusNotification).

Database

- MySQL is configured in `docker-compose.yml`. Transactions are persisted to the `transaction` table.

Key rotation & password reset

- This repo includes a DB-backed key rotation mechanism. Admin keys are stored in the `adminkey` table and can be rotated via `POST /api/admin/keys/rotate`.
- Tokens signed with DB keys include a `kid` header and verification will check DB keys.
- Password-reset: endpoints `POST /api/admin/request-password-reset` and `POST /api/admin/reset-password` are available. For development the reset token is returned in the response; in production you should email the token instead.
