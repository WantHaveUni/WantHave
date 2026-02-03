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

1. **Register** an account
2. **Create a listing** - upload a product image
3. **AI auto-fill** (optional) - AI analyzes the image and suggests title, description, category, and price (a Gemini API key is needed)
4. **Publish** - your product appears on the marketplace and map (if the location setting is allowed)
5. **Receive offers** - buyers can message you and make price offers
6. **Accept/Decline** - negotiate until you agree on a price
7. **Get paid** - buyer pays via Stripe and you will get a confirmation (order confirmation polling automation is setup to work only inside the FH K8s Cluster, for local testing use the command below)

### As a Buyer

1. **Browse** products by category or view them on the interactive map
2. **Watchlist** - save interesting items for later
3. **Chat** with the seller to ask questions
4. **Make an offer** - propose a price directly in the chat
5. **Pay** - once the seller accepts, complete payment via Stripe
6. **Track** your purchases in your transaction history (for local testing use the stripe polling command listed below)

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
| Stripe Payments   | Secure checkout via Stripe                               |
| Watchlist         | Save products to view later                              |
| User Profiles     | Track listings, sales, and purchases                     |

## Kubernetes Development FH VPN

you can find the Kubernetes deployment here:
https://dev-wanthave.kub2.fh-joanneum.at/products

**User Account:**

- **Username:** Dummyuser
- **Password:** Dummyuser1

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

# Set API keys (optional - needed for payments (Stripe) and AI features)
export STRIPE_SECRET_KEY=your api key
export STRIPE_PUBLISHABLE_KEY=your api key
    # https://dashboard.stripe.com/ you can find it under Developers - test/apikeys
export GEMINI_API_KEY=your api key
    # https://aistudio.google.com/api-keys

python manage.py runserver
```

### 3. Frontend

```bash
cd wantHave_frontend
npm install
npm start
```

Open http://localhost:4200

You can use these credentials to register a account:

- **Username:** admin
- **Password:** Admin123

User 1 is the admin and has full rights to manage all other users.


## Payment/Usage Flow

 - Register 2 Users (Admin + another User)
 - Create a product listing with one of the users (accept location to see the product on the map)
   - you either have the choice to create the listing on your own, or get the listing details by using the auto-ai feature
 - Negotiate with the second User within the chat (click on the product --> message seller)
 - Send a offer
 - Accept the offer
   
 - Pay the amount via Stripe with the following testing credentials:
   - credit card number: 4242 4242 4242 4242
   - future date: 01/34
   - CVC: 123
   - any email + name


 - If you pay for a product and the payment was successfull, use this command to start a polling job.
 - It will check all pending payments and sets the status according to the return data of the Stripe API.
   
  ```bash
  cd wantHave_backend
  python3 manage.py poll_stripe_payments
  ```
 - the paid product will be delisted from the product page and you will see the transaction on your profile and in your order chat.

## Implemented User Stories

### Epic 1: Listing Creation (AI-Powered)

| Status | User Story |
|--------|------------|
| Done | As a user, I want to be able to list new items, delete items and edit items |
| Done | As a user, I want to be able to upload pictures of my items |
| Done | As a user, I want to see a preview of my listing before publishing |
| Done | As a user, I want the AI to suggest a fair price range *(Nice to have)* |
| Done | As a user, I want to edit the AI's suggestions before publishing *(Nice to have)* |
| Done | As a user, I want to upload a photo so that the AI can recognize it automatically *(Nice to have)* |
| Done | As a user, I want the AI to suggest a title, description, and category *(Nice to have)* |

### Epic 2: Item Browsing and Search

| Status | User Story |
|--------|------------|
| Done | As a guest, I want to browse available items without logging in |
| Done | As a user, I want to search for items by keyword |
| Done | As a user, I want to filter items |
| Done | As a user, I want to view items on a map |
| Done | As a user, I want to see detailed item pages with photos and seller contact |

### Epic 3: Chat System

| Status | User Story |
|--------|------------|
| Done | As a user, I want to send messages to sellers |
| Done | As a user, I want to receive messages from buyers |
| Done | As a user, I want to see all my chats in one place |
| Done | As an admin, I want to access chat data |

### Epic 4: User Profiles

| Status | User Story |
|--------|------------|
| Done | As a user, I want to create a personal profile |
| Done | As a user, I want to upload a profile picture |
| Done | As a user, I want to view and edit my listings |
| Done | As a user, I want to see my purchase and sale history |
| Done | As a user, I want to delete my account and data |

### Epic 5: Payment System

| Status | User Story |
|--------|------------|
| Done | As a user, I want to see the total price before confirming payment |
| Done | As a user, I want to use a secure payment method (Stripe) *(Nice to have)* |
| Done | As a user, I want to receive confirmation when payment is successful *(Nice to have)* |

### Epic 6: Sustainability and Accessibility

| Status | User Story |
|--------|------------|
| Done | As a user, I want the website to be accessible on mobile and desktop |
| Done | As a user, I want the interface to be simple and intuitive |

### Additional Features (Beyond Proposal)

| Feature | Description |
|---------|-------------|
| Watchlist | Save products for later viewing |
| Price Negotiation | Make and respond to price offers directly in chat |
| Real-time Notifications | WebSocket-based updates for messages and offers |

### Changes from Original Proposal

- **AI Integration**: Used Google Gemini for image analysis and auto-fill suggestions
- **Payment Flow**: Added offer negotiation before payment (buyer makes offer, seller accepts, buyer pays)
- **Chat Enhancement**: Integrated price offer system within chat conversations
