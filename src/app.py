from dotenv import load_dotenv
load_dotenv() 
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import certifi
import pandas as pd
import traceback

# Import Services
from Final.analyze import analyze_contract
from service.Generate import generate_bp
from service.support import support_bp   # ✅ NEW IMPORT

# -----------------------------
# Configuration and Setup
# -----------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")

if not SECRET_KEY or not MONGO_URI or not MONGO_DB:
    raise RuntimeError("Please set SECRET_KEY, MONGO_URI, MONGO_DB in .env")

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = SECRET_KEY
jwt = JWTManager(app)

# MongoDB setup
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client[MONGO_DB]
users_collection = db["users"]

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# -----------------------------
# Authentication Routes
# -----------------------------
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json(force=True)
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        dob = data.get("dob")
        user_type = data.get("userType", "user")

        if not name or not email or not password:
            return jsonify({"message": "name, email and password required"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"message": "User already exists"}), 400

        hashed_pw = generate_password_hash(password, method="pbkdf2:sha256")
        users_collection.insert_one({
            "name": name,
            "email": email,
            "password": hashed_pw,
            "dob": dob,
            "userType": user_type
        })

        token = create_access_token(identity=email)
        return jsonify({"message": "Signup successful!", "token": token}), 201
    except Exception as e:
        print("Error in /signup:", e)
        print(traceback.format_exc())
        return jsonify({"message": "Internal server error"}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(force=True)
        email = data.get("email")
        password = data.get("password")

        user = users_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return jsonify({"message": "Invalid credentials"}), 401

        token = create_access_token(identity=email)
        return jsonify({"message": "Login successful!", "token": token}), 200
    except Exception as e:
        print("Error in /login:", e)
        print(traceback.format_exc())
        return jsonify({"message": "Internal server error"}), 500

@app.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    try:
        current_user = get_jwt_identity()
        user = users_collection.find_one({"email": current_user}, {"_id": 0, "password": 0})
        if not user:
            return jsonify({"message": "User not found"}), 404
        return jsonify(user), 200
    except Exception as e:
        print("Error in /profile:", e)
        print(traceback.format_exc())
        return jsonify({"message": "Internal server error"}), 500

@app.route("/update-profile", methods=["PUT"])
@jwt_required()
def update_profile():
    try:
        current_user = get_jwt_identity()
        data = request.get_json(force=True)
        update_data = {}

        if "email" in data and data.get("email"):
            update_data["email"] = data["email"]
        if "dob" in data:
            update_data["dob"] = data["dob"]
        if "password" in data and data.get("password"):
            update_data["password"] = generate_password_hash(data["password"], method="pbkdf2:sha256")

        if update_data:
            users_collection.update_one({"email": current_user}, {"$set": update_data})
            if "email" in update_data:
                new_token = create_access_token(identity=update_data["email"])
                return jsonify({"message": "Profile updated", "token": new_token}), 200
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        print("Error in /update-profile:", e)
        print(traceback.format_exc())
        return jsonify({"message": "Internal server error"}), 500

# -----------------------------
# Contract Analysis Routes
# -----------------------------
@app.route("/api/analyze-text", methods=["POST"])
@jwt_required()
def analyze_text():
    try:
        data = request.get_json(force=True)
        text = data.get("text")
        if not text:
            return jsonify({"error": "No text provided"}), 400

        df = analyze_contract(text=text, use_llm=True)
        results = df.to_dict(orient="records")
        return jsonify({"success": True, "results": results}), 200
    except Exception as e:
        print("Error in /api/analyze-text:", e)
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/analyze-pdf", methods=["POST"])
@jwt_required()
def analyze_pdf():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400

        filename = secure_filename(file.filename)
        if not filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400

        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        df = analyze_contract(pdf_path=file_path, use_llm=True)
        results = df.to_dict(orient="records")
        return jsonify({"success": True, "results": results}), 200
    except Exception as e:
        print("Error in /api/analyze-pdf:", e)
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/health", methods=["GET"])
def health():
    try:
        return jsonify({"status": "running"}), 200
    except Exception as e:
        print("Error in /api/health:", e)
        print(traceback.format_exc())
        return jsonify({"status": "error", "error": str(e)}), 500

# -----------------------------
# Register Blueprints
# -----------------------------
app.register_blueprint(generate_bp)  # Gemini-based contract generator
app.register_blueprint(support_bp)   # ✅ Community support feature

# Serve uploaded files
@app.route("/uploads/<path:filename>")
def serve_uploads(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# -----------------------------
# Run the App
# -----------------------------
if __name__ == "__main__":
    try:
        # Use stat reloader instead of watchdog to avoid PyTorch file watching issues
        app.run(debug=True, use_reloader=True, reloader_type='stat')
    except Exception as e:
        print("Server crashed with exception:", e)
        print(traceback.format_exc())
