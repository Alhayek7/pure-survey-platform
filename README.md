# PURE Survey Platform

A complete survey and forms platform built from the supplied specification.

## Stack

- Backend: Node.js, Express.js
- Database: PostgreSQL
- ORM: Sequelize
- Auth: JWT access token only, 24-hour validity
- Password hashing: bcrypt strength 10
- Frontend: HTML/CSS/JS + Tailwind CDN
- Export: ExcelJS `.xlsx`
- Security: Helmet, CORS, rate limiting, validation, role middleware
- Logging: Winston + `logs` table for server errors
- API docs: Swagger UI at `/api-docs`

## Roles

- `admin`: full access to surveys, users, responses, exports
- `researcher`: manage own surveys and responses
- `user`: answer published surveys and view own responses

## Project Structure

```text
pure-survey-platform/
  backend/
    src/
      config/ models/ middleware/ controllers/ services/ routes/ validators/ seeders/ utils/
    uploads/
    tests/
  frontend/
    *.html
    css/style.css
    js/*.js
```

## Quick Start

```powershell
cd backend
copy .env.example .env
npm install
npm run db:setup
npm start
```

Then serve the frontend from another terminal:

```powershell
cd frontend
npx serve . -l 8000
```

Open:

- Frontend: `http://localhost:8000`
- Backend health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/api-docs`

## Default Admin

After `npm run db:setup`:

- Email: `admin@example.com`
- Password: `admin123`

Change this password immediately before real use.

## Main API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/surveys`
- `GET /api/v1/surveys/public`
- `POST /api/v1/responses`
- `GET /api/v1/responses/survey/:id`
- `GET /api/v1/export/survey/:id`
- `GET /api/v1/users`

## Notes

This is a first complete implementation matching the Word specification. It uses `sequelize.sync({ alter: true })` for setup to keep Windows installation simple. For production, replace that with explicit migrations.
