

***

# SG Technologies POS System (Re-Engineered)

## 📋 Project Overview

This project is a complete re-engineering of a legacy Java Swing/File-based Point of Sale system. It transforms the original monolithic architecture into a modern, distributed **Web Application** using **FastAPI (Python)** for the backend and **React (TypeScript)** for the frontend.

The system addresses the limitations of the old system by introducing a relational database (SQLite), real-time inventory tracking, secure user management, and a streamlined UI/UX for high-throughput retail environments.

---

## 🏗 System Architecture

The application follows a **Client-Server Architecture** with a RESTful API.

### 1. Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript | Single Page Application (SPA) built with Vite. |
| **Styling** | CSS Variables | Custom design system mimicking modern SaaS UIs. |
| **Charting** | Recharts | Data visualization for admin analytics. |
| **Backend** | FastAPI (Python) | High-performance, async web framework. |
| **Database** | SQLite | Relational database file (`pos.db`). |
| **Auth** | Passlib (Bcrypt) | Secure password hashing. |
| **Validation** | Pydantic | Data validation and settings management. |

### 2. High-Level Design

[Browser / Client]  <-- JSON / HTTP -->  [FastAPI Backend]  <-- SQL -->  [SQLite Database]
(React + Vite)                           (Python 3.10+)                  (pos.db)


---

## 🗄️ Database Schema

The system uses a normalized relational schema.

### Tables

1.  **Employees**
    *   `employee_id` (PK): Unique identifier.
    *   `user_name`: Login username (Unique).
    *   `full_name`: Display name.
    *   `password_hash`: Bcrypt hashed password.
    *   `role`: 'Admin' or 'Cashier'.

2.  **Items**
    *   `item_id` (PK): Unique identifier.
    *   `name`: Product name.
    *   `price`: Unit price.
    *   `quantity_in_stock`: Current inventory level.
    *   `item_type`: 'Sale' or 'Rental'.

3.  **Customers**
    *   `customer_id` (PK): Unique identifier.
    *   `phone_number`: Unique contact number (used for lookup).
    *   `store_credit`: Wallet balance for store credit/refunds.

4.  **Transactions**
    *   `transaction_id` (PK): Unique receipt ID.
    *   `transaction_type`: 'Sale', 'Rental', or 'Return'.
    *   `total_price`: Final amount paid.
    *   `tax_amount`: Calculated tax (10%).
    *   `payment_method`: 'Cash', 'Credit', 'Check', 'Store Credit'.
    *   `transaction_date`: Timestamp.
    *   `customer_id` (FK): Linked customer.
    *   `employee_id` (FK): Cashier who processed it.

5.  **Transaction_Items** (Junction Table)
    *   Links Transactions to Items with specific `quantity` and `price_at_time`.

6.  **Rentals**
    *   Links to `Transaction_Items`. Stores `due_date` and return status.

---

## 🧩 Class & Component Structure

Since this is a functional web app, "Classes" are represented by **Pydantic Models** (Backend) and **React Components** (Frontend).

### 🐍 Backend Models (Pydantic)
Located in `backend/main.py`. These define the data structure for API communication.

*   **`LoginRequest`**: Validates login credentials.
*   **`EmployeeModel`**: Structure for creating/returning users.
*   **`ItemModel`**: Structure for inventory items.
*   **`CustomerModel`**: Structure for customer creation.
*   **`TransactionRequest`**: Complex nested object handling the entire checkout payload (items, payment method, customer, transaction type).
*   **`CartItem`**: Helper model for items inside a transaction.

### ⚛️ Frontend Components (React)
Located in `frontend/src/pages/`.

1.  **`LoginPage.tsx`**
    *   **Responsibility:** Authenticates users via API.
    *   **Features:** Split-screen design, loading states, error handling, session storage management.

2.  **`AdminDashboardPage.tsx`**
    *   **Responsibility:** Management console for Administrators.
    *   **Features:**
        *   **Overview Tab:** Real-time revenue charts (Bar/Pie) using Recharts.
        *   **Inventory Tab:** CRUD operations for items (Search, Add, Delete).
        *   **Users Tab:** User role management.
        *   **Modal System:** Custom overlays for forms.

3.  **`CashierDashboardPage.tsx`**
    *   **Responsibility:** Point of Sale Interface.
    *   **Features:**
        *   **Inventory Panel:** Searchable grid, low-stock visual indicators.
        *   **Cart System:** Dynamic quantity adjustment, validation logic.
        *   **Transaction Modes:** Sale, Rental (with Due Date), Return.
        *   **Customer Wallet:** Search customers, add funds, split payments (Cash + Credit).
        *   **Receipt System:** Digital receipt generation in a modal.

---

## ✅ Functional Requirements (Use Cases)

The system fully implements the following Use Cases:

1.  **Process Sales:** Add items, calculate tax, handle discounts, accept multiple payment methods.
2.  **Process Rentals:** Enforce "Rental" item type, require Customer linkage, record Due Date.
3.  **Handle Returns:** "Return Mode" calculates negative totals and refunds to Store Credit or Cash.
4.  **User Management:** Admins can create and delete Cashiers and other Admins.
5.  **Inventory Management:** Real-time stock updates. Prevents selling out-of-stock items.
6.  **Customer Credit:** "Wallet" system allows customers to deposit funds and use them for purchases.
7.  **System Startup/Shutdown:** Secure Login/Logout with session persistence.
8.  **Reporting:** End-of-day analytics showing Revenue, Sales Count, and Rental Count.

---

## 🚀 Setup & Installation

### Prerequisites
*   **Python 3.8+**
*   **Node.js (LTS)**

### 1. Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Create Virtual Environment
python -m venv venv

# 3. Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install Dependencies
pip install fastapi uvicorn pydantic passlib[bcrypt] python-multipart

# 5. Initialize Database and Seed Data
# (Ensure database.py and seed_data.py are present)
python seed_data.py

# 6. Run Server
uvicorn main:app --reload
```
*Backend runs on: `http://localhost:8000`*

### 2. Frontend Setup
```bash
# 1. Open a NEW terminal and navigate to frontend
cd frontend

# 2. Install Dependencies
npm install
npm install react-router-dom recharts react-hot-toast

# 3. Run Development Server
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## 📖 Usage Guide

### Default Credentials
After running `seed_data.py`, use these credentials:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Cashier** | `cashier` | `cashier123` |

### Admin Workflow
1.  Log in as Admin.
2.  Check the **Overview** tab for daily stats.
3.  Go to **Inventory** to add new products (Set type to 'Sale' or 'Rental').
4.  Go to **Users** to onboard new employees.

### Cashier Workflow
1.  Log in as Cashier.
2.  **Sale:** Click items to add to cart -> Pay.
3.  **Rental:** Switch mode to 'Rental' -> Search Customer -> Select Due Date -> Pay.
4.  **Customer Credit:** Search Customer -> Click "+ Add Funds" -> Enter Amount.
5.  **Split Payment:** Link Customer -> Check "Apply Wallet Balance" -> Pay remaining via Cash/Card.

---

## 📜 License
This project was developed for the Software Engineering Re-engineering assignment.
Copyright © 2025 Abdullah Roshaan.
