from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from passlib.context import CryptContext
from typing import Optional, List
from datetime import datetime, date

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "pos.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class EmployeeModel(BaseModel):
    user_name: str
    full_name: str
    password: str
    role: str # 'Admin' or 'Cashier'

class ItemModel(BaseModel):
    name: str
    price: float
    quantity_in_stock: int
    item_type: str 

class CustomerModel(BaseModel):
    phone_number: str

class CartItem(BaseModel):
    item_id: int
    quantity: int
    price: float

class TransactionRequest(BaseModel):
    employee_id: int
    customer_id: Optional[int] = None
    items: List[CartItem]
    type: str # 'Sale', 'Rental', 'Return'
    due_date: Optional[str] = None 
    payment_method: str # 'Cash', 'Credit', 'Check'
    use_credit: bool = False # Does customer want to use store credit?

# --- DB Helper ---
def get_db():
    # check_same_thread=False is CRITICAL for SQLite with FastAPI
    conn = sqlite3.connect(DB_NAME, check_same_thread=False) 
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# --- Auth Endpoints ---
@app.post("/login")
def login(login_data: LoginRequest, db = Depends(get_db)):
    cursor = db.execute("SELECT * FROM Employees WHERE user_name = ?", (login_data.username,))
    user = cursor.fetchone()
    if not user or not pwd_context.verify(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "message": "Login successful",
        "user_id": user["employee_id"],
        "role": user["role"],
        "full_name": user["full_name"]
    }

# --- Employee Management (Admin) ---
@app.get("/employees/")
def get_employees(db = Depends(get_db)):
    cursor = db.execute("SELECT employee_id, user_name, full_name, role FROM Employees")
    return [dict(row) for row in cursor.fetchall()]

@app.post("/employees/")
def create_employee(emp: EmployeeModel, db = Depends(get_db)):
    cursor = db.execute("SELECT 1 FROM Employees WHERE user_name = ?", (emp.user_name,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pw = pwd_context.hash(emp.password)
    try:
        cursor = db.execute(
            "INSERT INTO Employees (user_name, full_name, password_hash, role) VALUES (?, ?, ?, ?)",
            (emp.user_name, emp.full_name, hashed_pw, emp.role)
        )
        db.commit()
        return {"message": "Employee created", "id": cursor.lastrowid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, db = Depends(get_db)):
    db.execute("DELETE FROM Employees WHERE employee_id = ?", (employee_id,))
    db.commit()
    return {"message": "Employee deleted"}

# --- Inventory Endpoints ---
@app.get("/items/")
def get_items(db = Depends(get_db)):
    cursor = db.execute("SELECT * FROM Items")
    return [dict(row) for row in cursor.fetchall()]

@app.post("/items/")
def create_item(item: ItemModel, db = Depends(get_db)):
    db.execute("INSERT INTO Items (name, price, quantity_in_stock, item_type) VALUES (?, ?, ?, ?)",
               (item.name, item.price, item.quantity_in_stock, item.item_type))
    db.commit()
    return {"message": "Item added"}

@app.delete("/items/{item_id}")
def delete_item(item_id: int, db = Depends(get_db)):
    db.execute("DELETE FROM Items WHERE item_id = ?", (item_id,))
    db.commit()
    return {"message": "Deleted"}

# --- Customer Endpoints ---
@app.get("/customers/search")
def search_customer(phone: str, db = Depends(get_db)):
    cursor = db.execute("SELECT * FROM Customers WHERE phone_number = ?", (phone,))
    customer = cursor.fetchone()
    if customer:
        return dict(customer)
    return None

@app.post("/customers/")
def create_customer(cust: CustomerModel, db = Depends(get_db)):
    try:
        cursor = db.execute("INSERT INTO Customers (phone_number, store_credit) VALUES (?, 0)", (cust.phone_number,))
        db.commit()
        return {"customer_id": cursor.lastrowid, "phone_number": cust.phone_number, "store_credit": 0}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Customer already exists")

# --- Report Endpoint ---
@app.get("/reports/sales")
def get_sales_report(db = Depends(get_db)):
    # Get total sales for the day
    cursor = db.execute("""
        SELECT 
            COUNT(*) as txn_count, 
            SUM(total_price) as total_revenue 
        FROM Transactions 
        WHERE transaction_type = 'Sale' 
        AND date(transaction_date) = date('now')
    """)
    sales = cursor.fetchone()
    
    # Get total rentals
    cursor = db.execute("""
        SELECT COUNT(*) as rental_count 
        FROM Transactions 
        WHERE transaction_type = 'Rental' 
        AND date(transaction_date) = date('now')
    """)
    rentals = cursor.fetchone()

    return {
        "date": date.today(),
        "sales_count": sales['txn_count'] or 0,
        "total_revenue": sales['total_revenue'] or 0,
        "rentals_count": rentals['rental_count'] or 0
    }


#Creditors
class AddCreditRequest(BaseModel):
    customer_id: int
    amount: float

@app.post("/customers/add_credit")
def add_customer_credit(req: AddCreditRequest, db = Depends(get_db)):
    try:
        cursor = db.execute("UPDATE Customers SET store_credit = store_credit + ? WHERE customer_id = ?", 
                           (req.amount, req.customer_id))
        db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Credit added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Transaction / Checkout Endpoint ---
@app.post("/checkout")
def process_checkout(txn: TransactionRequest, db = Depends(get_db)):
    TAX_RATE = 0.10 # 10% Tax

    # 1. Calculate Subtotal
    subtotal = sum(item.price * item.quantity for item in txn.items)
    
    # 2. Calculate Tax
    tax_amount = subtotal * TAX_RATE if txn.type != 'Return' else 0
    total_price = subtotal + tax_amount

    # 3. Handle Returns (Negative Calculation)
    if txn.type == 'Return':
        total_price = total_price * -1 
    
    # 4. Handle Store Credit
    credit_used = 0.0
    if txn.type in ['Sale', 'Rental'] and txn.use_credit and txn.customer_id:
        cursor = db.execute("SELECT store_credit FROM Customers WHERE customer_id = ?", (txn.customer_id,))
        row = cursor.fetchone()
        if row:
            current_credit = row['store_credit']
            if current_credit > 0:
                if current_credit >= total_price:
                    credit_used = total_price
                    total_price = 0 
                else:
                    credit_used = current_credit
                    total_price = total_price - current_credit

    try:
        cursor = db.cursor()
        
        # 5. Insert Transaction
        cursor.execute("""
            INSERT INTO Transactions (customer_id, employee_id, transaction_type, subtotal, tax_amount, total_price, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (txn.customer_id, txn.employee_id, txn.type, subtotal, tax_amount, total_price, txn.payment_method))
        txn_id = cursor.lastrowid
        
        # 6. Process Items & Inventory
        for item in txn.items:
            # Add to Transaction Items
            cursor.execute("""
                INSERT INTO Transaction_Items (transaction_id, item_id, quantity, price_at_time)
                VALUES (?, ?, ?, ?)
            """, (txn_id, item.item_id, item.quantity, item.price))
            t_item_id = cursor.lastrowid

            # Update Stock
            if txn.type == 'Return':
                cursor.execute("UPDATE Items SET quantity_in_stock = quantity_in_stock + ? WHERE item_id = ?", (item.quantity, item.item_id))
            else:
                cursor.execute("UPDATE Items SET quantity_in_stock = quantity_in_stock - ? WHERE item_id = ?", (item.quantity, item.item_id))

            # Handle Rental Due Date
            if txn.type == 'Rental':
                cursor.execute("INSERT INTO Rentals (transaction_item_id, due_date) VALUES (?, ?)", (t_item_id, txn.due_date))

        # 7. Update Customer Credit Balance
        if txn.customer_id:
            if credit_used > 0:
                cursor.execute("UPDATE Customers SET store_credit = store_credit - ? WHERE customer_id = ?", (credit_used, txn.customer_id))
            
            if txn.type == 'Return':
                # If refunding to Store Credit
                if txn.payment_method == 'Store Credit':
                    cursor.execute("UPDATE Customers SET store_credit = store_credit + ? WHERE customer_id = ?", (abs(total_price), txn.customer_id))

        db.commit()
        return {
            "message": "Transaction successful", 
            "transaction_id": txn_id, 
            "final_total": total_price, 
            "credit_used": credit_used
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))