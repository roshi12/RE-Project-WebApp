import sqlite3

DB_NAME = "pos.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # SQL Schema from your specification
    sql_script = """
    CREATE TABLE IF NOT EXISTS Employees (
        employee_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name     TEXT NOT NULL UNIQUE,
        full_name     TEXT,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('Admin', 'Cashier'))
    );

    CREATE TABLE IF NOT EXISTS Customers (
        customer_id  INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL UNIQUE,
        store_credit REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS Items (
        item_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name              TEXT NOT NULL,
        price             REAL NOT NULL,
        quantity_in_stock INTEGER NOT NULL,
        item_type         TEXT NOT NULL CHECK(item_type IN ('Sale', 'Rental'))
    );

    CREATE TABLE IF NOT EXISTS Transactions (
        transaction_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id      INTEGER,
        employee_id      INTEGER NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('Sale', 'Rental', 'Return')),
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        subtotal         REAL,
        tax_amount       REAL,
        total_price      REAL,
        payment_method   TEXT, -- 'Cash', 'Credit', 'Check'
        FOREIGN KEY (customer_id) REFERENCES Customers (customer_id),
        FOREIGN KEY (employee_id) REFERENCES Employees (employee_id)
    );

    CREATE TABLE IF NOT EXISTS Transaction_Items (
        transaction_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id      INTEGER NOT NULL,
        item_id             INTEGER NOT NULL,
        quantity            INTEGER NOT NULL,
        price_at_time       REAL NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES Transactions (transaction_id),
        FOREIGN KEY (item_id) REFERENCES Items (item_id)
    );

    CREATE TABLE IF NOT EXISTS Rentals (
        rental_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_item_id INTEGER NOT NULL,
        due_date            DATE NOT NULL,
        is_returned         BOOLEAN DEFAULT 0,
        return_date         DATE,
        FOREIGN KEY (transaction_item_id) REFERENCES Transaction_Items (transaction_item_id)
    );

    CREATE TABLE IF NOT EXISTS Coupons (
        coupon_code TEXT PRIMARY KEY,
        is_used BOOLEAN DEFAULT 0
    );
    """
    cursor.executescript(sql_script)
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()