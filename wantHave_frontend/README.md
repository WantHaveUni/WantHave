# WantHave frontend

Minimal Angular UI wired to the Django REST API.

## Endpoints
- Products: `GET /api/market/products/` (public)
- Auth: `POST /api/token/` for JWT login, `POST /api/token/refresh/` for refresh tokens

## Run it
1. Start the backend on `http://127.0.0.1:8000` (the proxy forwards `/api` and `/media` there).
2. From this folder:
   ```bash
   npm install   # first run
   npm start     # ng serve with proxy config
   ```
3. Open `http://localhost:4200/` to browse products and use the login form.

## Build
```bash
npm run build
```

Output goes to `dist/frontend/` by default.
