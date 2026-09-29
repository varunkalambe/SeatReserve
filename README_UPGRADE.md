# SeatReserve UI + End-to-End Upgrade

This package is a rebuilt version of the uploaded SeatReserve codebase with the frontend redesigned around the supplied SeatReserve bus-booking UI and the backend extended to support the same application flow end to end.

## Frontend

Implemented screens and flows:

- Login and sign-up
- Dashboard/home with route search and popular routes
- Search results with bus operator, departure, arrival, duration, rating, amenities and fare
- Trip-specific seat map with available, held and booked states
- 10-minute seat hold and live countdown
- Payment screen with UPI, card, net banking and wallet methods
- My Bookings with upcoming, past and cancelled states
- Digital ticket view with booking reference and QR-style ticket code
- Wallet balance, top-up and transaction history
- Profile editing
- Support FAQ, support ticket creation and support history
- Notifications
- Responsive desktop sidebar and mobile bottom navigation
- Navy/blue SeatReserve theme, cards, status pills, glass panels, hero sections and responsive layouts matching the supplied reference direction

## Backend

Implemented API/domain support for:

- JWT registration and login
- User profile and wallet balance
- Bus trip catalogue and search
- Seeded routes for the next 31 days
- Trip-specific seat inventory
- Redisson distributed seat locks
- PostgreSQL optimistic locking on seats and trip seats
- 10-minute pending reservations
- Automatic expiry cleanup every 30 seconds
- Reservation confirmation and cancellation
- Payment records and transaction references
- Wallet debit for wallet payments
- Wallet refunds after cancellation
- Booking ticket retrieval
- Support tickets
- Notifications
- Redis-backed rate limiting for reservation POST requests

## Important integration note

Google OAuth, GitHub OAuth, password-reset email delivery, and real external UPI/card/net-banking gateway processing require provider credentials and external services. The local build does not fake those integrations. The payment methods in the UI are represented as application payment methods and are persisted by the backend; wallet payment is fully processed inside the local application.

## Run

### Terminal 1

```powershell
Set-Location "D:\Downloads\srv\srv"
docker compose build backend
docker compose up -d --force-recreate
Start-Sleep -Seconds 20
docker compose ps
docker logs seat-reservation-backend --tail 250
Invoke-RestMethod "http://localhost:8080/actuator/health"
Invoke-RestMethod "http://localhost:8080/api/buses/popular"
```

### Terminal 2

```powershell
Set-Location "D:\Downloads\srv\srv\frontend"
npm install
npm run lint
npm run build
npm run dev
```

Open `http://localhost:5173`.

## Database reset

Do not use `docker compose down -v` unless you intentionally want to delete the PostgreSQL and Redis volumes and reseed the demo database.
