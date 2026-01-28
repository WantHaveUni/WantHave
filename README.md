# WantHave

A peer-to-peer marketplace where users can buy and sell items locally with real-time chat and integrated payments.

## Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Frontend  | Angular 20, Angular Material, Leaflet (maps)     |
| Backend   | Django 5, Django REST Framework, Django Channels |
| Database  | SQLite                                           |
| Real-time | WebSockets via Redis                             |
| Payments  | Stripe                                           |
| AI        | Google Gemini                                    |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Angular   │────▶│    Nginx    │────▶│   Django    │
│  Frontend   │     │   (Proxy)   │     │   Backend   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────┐     ┌─────┴─────┐
                    │    Redis    │◀────│  SQLite   │
                    │ (WebSocket) │     │    DB     │
                    └─────────────┘     └───────────┘
```

**How it connects:**

- **Frontend → Nginx**: Serves the Angular app and proxies API requests
- **Nginx → Backend**: Routes `/api/*` and `/ws/*` to Django
- **Backend → Redis**: Handles real-time WebSocket connections for chat
- **Backend → SQLite**: Stores users, products, messages, orders

## How to Use

### As a Seller

1. **Register** an account with your location
2. **Create a listing** - upload a product image
3. **AI auto-fill** (optional) - AI analyzes the image and suggests title, description, category, and price
4. **Publish** - your product appears on the marketplace and map
5. **Receive offers** - buyers can message you and make price offers
6. **Accept/Decline** - negotiate until you agree on a price
7. **Get paid** - buyer pays via Stripe, you receive the amount minus 10% platform fee

### As a Buyer

1. **Browse** products by category or view them on the interactive map
2. **Watchlist** - save interesting items for later
3. **Chat** with the seller to ask questions
4. **Make an offer** - propose a price directly in the chat
5. **Pay** - once the seller accepts, complete payment via Stripe
6. **Track** your purchases in your transaction history

### As Admin

- User with ID 1 has admin rights
- Can view and delete any user account
- Access the admin dashboard to manage the platform

## Features

| Feature           | Description                                              |
| ----------------- | -------------------------------------------------------- |
| Product Listings  | Create listings with images, categories, and location    |
| AI Auto-Fill      | Google Gemini analyzes product images to suggest details |
| Interactive Map   | View products on a Leaflet map with marker clustering    |
| Real-time Chat    | WebSocket-based messaging between buyers and sellers     |
| Price Negotiation | Make and respond to price offers in chat                 |
| Stripe Payments   | Secure checkout with 10% platform fee                    |
| Watchlist         | Save products to view later                              |
| User Profiles     | Track listings, sales, and purchases                     |

## Kubernetes Development FH VPN

you can find the Kubernetes deployment here:
https://dev-wanthave.kub2.fh-joanneum.at/products

**Admin Account:**

- **Username:** Admin
- **Password:** Test123

**User Account:**

- **Username:** Dummyuser
- **Password:** Dummyuser1

## Quick Start (Docker)

```bash
docker-compose up --build
```

Open http://localhost

## Local Development

### Requirements

- Python 3.12
- Node.js 22
- Docker (for Redis)

### 1. Start Redis

```bash
docker run -d -p 6379:6379 redis:7.2-alpine
```

### 2. Backend

```bash
cd wantHave_backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontend

```bash
cd wantHave_frontend
npm install
npm start
```

Open http://localhost:4200

## Admin Account

Create the admin account after first setup:

```bash
cd wantHave_backend
python manage.py createsuperuser
```

Use these credentials:

- **Username:** admin
- **Password:** Admin123

User 1 is the admin and has full rights to manage all other users.
