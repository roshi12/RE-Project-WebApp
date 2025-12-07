import sqlite3
from passlib.context import CryptContext
import os

# Define the database file
DB_NAME = "pos.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def fix_admin():
    # Check if DB exists
    if not os.path.exists(DB_NAME):
        print(f"ERROR: {DB_NAME} not found! Make sure you are in the 'backend' folder.")
        return

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    print(f"--- Fixing Admin User in {DB_NAME} ---")

    # 1. Delete existing admin to clear bad data
    cursor.execute("DELETE FROM Employees WHERE user_name = 'admin'")
    conn.commit()
    print("1. Deleted old admin user (if existed).")

    # 2. Create new hash for 'admin123'
    password_plain = "admin123"
    hashed_pw = pwd_context.hash(password_plain)
    print(f"2. Generated new password hash.")

    # 3. Insert new admin user
    try:
        cursor.execute("""
            INSERT INTO Employees (user_name, full_name, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, ("admin", "System Administrator", hashed_pw, "Admin"))
        conn.commit()
        print("3. Inserted new 'admin' user into database.")
    except Exception as e:
        print(f"ERROR inserting user: {e}")
        conn.close()
        return

    # 4. Verify immediately to prove it works
    print("4. Verifying login logic now...")
    cursor.execute("SELECT password_hash FROM Employees WHERE user_name = 'admin'")
    stored_hash = cursor.fetchone()[0]
    
    if pwd_context.verify(password_plain, stored_hash):
        print("\n✅ SUCCESS: Password verification PASSED.")
        print("------------------------------------------------")
        print("You can now log in with:")
        print("   Username: admin")
        print("   Password: admin123")
        print("------------------------------------------------")
    else:
        print("\n❌ FAILURE: Password verification FAILED internal checks.")
        print("This means there is still a library issue with 'bcrypt'.")
        print("Run: pip install bcrypt==4.0.1")

    conn.close()

if __name__ == "__main__":
    fix_admin()