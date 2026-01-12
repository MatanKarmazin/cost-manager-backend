# Cost Manager Backend – Node.js Microservices

A Node.js backend project built using a **microservices architecture**, demonstrating service separation and backend engineering best practices.

---

## What This Project Demonstrates

- Microservices architecture in Node.js  
- RESTful API design  
- Inter-service communication  
- Centralized logging  
- MongoDB data modeling  
- Automated testing per service  
- Environment-based configuration

---

## Architecture Overview

The system is composed of independent services:

- **Users Service** – User management
- **Costs Service** – Cost creation and retrieval
- **Logs Service** – Centralized request logging
- **Admin Service** – Aggregation and admin operations

Each service runs independently and communicates with other services directly over HTTP.

---

## Tech Stack

- Node.js
- Express
- MongoDB & Mongoose
- Jest
- dotenv

---

## Project Structure

```text
project-backend/
├── users-service/
├── costs-service/
├── logs-service/
├── admin-service/
````

Each service includes:

* `server.js` / `app.js`
* Business logic (`src/`)
* Automated tests

---

## Running the Project (Local)

Each service runs independently.
From inside each service directory:

```bash
npm install
npm start
```

Default ports:
- Users Service → 3001
- Costs Service → 3002
- Logs Service → 3003
- Admin Service → 3004

Clients and services communicate directly with the relevant service endpoints.

---

## Testing

Tests are written with **Jest** and run per service:

```bash
npm test
```

---

## Authors

- **Matan Karmazin**
- **Eric Rosenberg**
