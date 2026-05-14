# backend/utils/auth.py
from datetime import datetime, timedelta
import bcrypt
import jwt
import os

# Secret key to sign the JWT token. 
# In a real app, this goes in your .env file!
SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_final_year_project_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

def verify_password(plain_password, hashed_password):
    """Checks if a plain text password matches the hashed one in the DB."""
    # bcrypt requires bytes, so we must encode the strings first
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password):
    """Converts a plain text password into a secure hash."""
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    # Decode back to a regular string so it saves easily in SQLite
    return hashed_bytes.decode('utf-8')

def create_access_token(data: dict):
    """Generates the JWT token that the React frontend will store."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt