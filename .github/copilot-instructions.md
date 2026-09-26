# StockSense Workspace Notes

- Frontend: React, TypeScript, Vite under `frontend/`.
- Backend: Java 17+, Spring Boot, Maven under `backend/`.
- Database: MySQL 8 via the root Docker Compose file.
- Inventory changes must be made through `InventoryService` so stock balances and the movement ledger stay in one transaction.
- Demo OTP delivery is enabled by default for local development only. Set `EXPOSE_RESET_OTP=false` when connecting a real mail delivery service.