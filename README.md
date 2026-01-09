# Cost Manager Backend – Node.js Microservices

A Node.js backend project built using a **microservices architecture**, demonstrating service separation, API gateway design, and backend engineering best practices.

Designed as an academic project.

---

## What This Project Demonstrates

- Microservices architecture in Node.js
- API Gateway pattern
- RESTful API design
- Inter-service communication
- Centralized logging
- MongoDB data modeling
- Automated testing per service
- Environment-based configuration

---

## Architecture Overview

The system is composed of independent services:

- **Gateway** – Single entry point, routes requests
- **Users Service** – User management
- **Costs Service** – Cost creation and retrieval
- **Logs Service** – Centralized request logging
- **Admin Service** – Aggregation and admin operations

Each service runs independently and communicates over HTTP.

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
├── gateway/
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

```bash
npm install
npm start
```

Run each service in its own directory.
The **gateway** is the only service exposed to clients.

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
