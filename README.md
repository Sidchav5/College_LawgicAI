⚖️ Legal Contract Clause Analysis & Community Platform

An advanced AI-powered legal contract analysis system with integrated community support, AI-based contract generation, and user management — built using Flask (Python), React, MongoDB, and Gemini LLM.

🚀 Features
🧠 Clause Risk Analysis

Upload or paste full contract text or PDF.

Uses LegalBERT, MNLI, and stacking models (XGBoost, SVM, Logistic Regression, RandomForest) to predict:

Clause-level risk classification → Low, Medium, or High.

Generates insights, confidence scores, and recommendations using Groq/Gemini API.

📜 AI Contract Generator

Create complete draft contracts using Gemini LLM.

Choose from contract types (e.g., Employment, NDA, Service, Partnership, etc.).

Fill in details through a dynamic form → instantly get an AI-generated, legally structured contract.

🧩 Community Support

Users can post questions and upload supporting contracts.

Others can comment, like, and discuss directly.

File attachments (PDF/DOC/TXT) stored securely and viewable in-browser.

Real-time interaction with JWT-based authentication.

👤 User Authentication & Profile

Secure signup/login using JWT tokens.

Update profile, password, or email.

Protected API endpoints ensure data safety.

🧾 Tech Highlights

🔹 Flask REST API backend with modular blueprints

🔹 MongoDB for flexible data storage

🔹 React frontend with responsive UI

🔹 Integrated Groq/Gemini LLM for reasoning and text generation

🔹 File upload management and secure media serving

🔹 Role-based expansion possible (admin/moderator)

🏗️ Project Architecture
project-root/
│
├── app.py                          # Flask entry point
├── Final/
│   └── analyze.py                  # Contract clause risk analysis logic
│
├── service/
│   ├── Generate.py                 # AI contract generator service (Gemini)
│   └── support.py                  # Community post & discussion service
│
├── uploads/
│   └── community/                  # Stored uploaded files (contracts, attachments)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyseContract.js
│   │   │   ├── Generate.js
│   │   │   └── Community.js
│   │   └── styles/
│   │       └── Community.css
│   └── package.json
│
├── model/
│   ├── stacking_model.pkl
│   ├── label_encoder.pkl
│   ├── feature_scaler.pkl
│   ├── pca_model.pkl
│   └── top_features.json
│
├── .env                            # Environment variables
├── requirements.txt
└── README.md

⚙️ Setup Instructions
1. Clone Repository
git clone https://github.com/yourusername/legal-contract-ai.git
cd legal-contract-ai

2. Backend Setup

Create a Python virtual environment and install dependencies:

python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt

3. Environment Variables (.env)
SECRET_KEY=your_secret_key
MONGO_URI=your_mongodb_connection_uri
MONGO_DB=your_database_name
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

4. Run Flask Server
python app.py


The server runs at http://127.0.0.1:5000

5. Frontend Setup
cd frontend
npm install
npm start


Runs at http://localhost:3000

🧩 API Endpoints Overview
🔐 Authentication
Method	Endpoint	Description
POST	/signup	Register new user
POST	/login	Login and get JWT token
GET	/profile	Fetch user profile (JWT required)
PUT	/update-profile	Update user details
📊 Contract Analysis
Method	Endpoint	Description
POST	/api/analyze-text	Analyze contract text
POST	/api/analyze-pdf	Analyze uploaded PDF
🪄 Contract Generator
Method	Endpoint	Description
POST	/api/generate-contract	Generate contract using Gemini API
💬 Community Support
Method	Endpoint	Description
POST	/api/community/post	Create new post
GET	/api/community/posts	Fetch all posts
POST	/api/community/comment/<post_id>	Add comment
POST	/api/community/like/<post_id>	Like/unlike post
GET	/api/community/uploads/<filename>	View attachment
DELETE	/api/community/post/<post_id>	Delete post
🧠 Machine Learning Model Stack
Component	Model Used	Purpose
Embeddings	LegalBERT / RoBERTa-MNLI	Contextual clause understanding
Base Models	SVM, RandomForest, Logistic Regression	Base classification
Meta Model	Stacking Ensemble (XGBoost)	Final risk classification
Post-Processing	PCA + Feature Scaling	Dimensionality reduction
LLM Layer	Groq/Gemini	Explainability & recommendations
🧰 Dependencies

Main Python Libraries:

Flask
Flask-Cors
Flask-JWT-Extended
pymongo
certifi
werkzeug
transformers
torch
scikit-learn
joblib
pandas
numpy
google-generativeai (for Gemini)


Frontend:

React
react-router-dom
FontAwesome
axios or fetch API

📦 Future Improvements

✅ Admin dashboard for moderation

✅ Threaded discussions

🔜 Contract clause visual comparison

🔜 Email/notification system

🔜 AI-suggested community responses

🧑‍💻 Author

Siddhesh Chavan
📧 csiddhesh768@gmail.com

🔗 Developer | AI + LegalTech | IoT + ML Integrations
