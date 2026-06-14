# Windows Installation Guide

## 1. Install Requirements

Install these first:

- Node.js 18 or newer
- PostgreSQL 14 or newer
- A terminal such as PowerShell

## 2. Create the Database

Open `psql` or pgAdmin and create a database:

```sql
CREATE DATABASE pure_survey;
```

## 3. Configure Backend

```powershell
cd backend
copy .env.example .env
notepad .env
```

Edit these values if needed:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pure_survey
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=change-this-secret-before-production
```

## 4. Install Backend Dependencies

```powershell
npm install
```

## 5. Create Tables and Seed Admin

```powershell
npm run db:setup
```

This creates the 8 required tables and the default admin user.

## 6. Start Backend

```powershell
npm start
```

Expected output:

```text
PURE Survey API running on http://localhost:3000
```

## 7. Start Frontend

Open another PowerShell terminal:

```powershell
cd frontend
npx serve . -l 8000
```

Open `http://localhost:8000`.

## 8. Login

Use:

- Email: `admin@example.com`
- Password: `admin123`

## Troubleshooting

- If database connection fails, confirm PostgreSQL is running and `.env` credentials are correct.
- If frontend cannot call backend, confirm backend is running on port `3000` and `CORS_ORIGIN` includes `http://localhost:8000`.
- If file uploads fail, confirm `backend/uploads` exists and the file is PDF/JPEG/PNG/WebP under 5MB.
