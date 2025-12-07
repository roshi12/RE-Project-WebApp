import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_NAME = "pos.db"

def seed_data():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # 1. Create Cashier User
    # Credentials: cashier / cashier123
    hashed_pw = pwd_context.hash("cashier123")
    try:
        cursor.execute("""
            INSERT INTO Employees (user_name, full_name, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, ("cashier", "Jane Doe", hashed_pw, "Cashier"))
        print("Cashier user created (User: cashier, Pass: cashier123)")
    except sqlite3.IntegrityError:
        print("Cashier user already exists.")

    # 2. Create Sample Items
    items = [
        ("Laptop", 999.99, 10, "Sale"),
        ("Mouse", 25.50, 50, "Sale"),
        ("Projector", 150.00, 5, "Rental"),
        ("HDMI Cable", 10.00, 100, "Sale")
    ]

    for item in items:
        # Check if item exists to avoid duplicates during re-seeding
        cursor.execute("SELECT name FROM Items WHERE name = ?", (item[0],))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO Items (name, price, quantity_in_stock, item_type)
                VALUES (?, ?, ?, ?)
            """, item)
            print(f"Added item: {item[0]}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed_data()