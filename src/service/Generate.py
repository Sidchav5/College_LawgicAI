# service/Generate.py

from flask import Blueprint, request, jsonify
import os
import google.generativeai as genai

# Create a Flask Blueprint for modular integration
generate_bp = Blueprint("generate_bp", __name__)

# Configure Gemini API
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables.")
genai.configure(api_key=GEMINI_KEY)

MODEL_NAME = "gemini-2.5-flash"

@generate_bp.route("/api/generate-contract", methods=["POST"])
def generate_contract():
    try:
        data = request.get_json(force=True)
        contract_type = data.get("contractType")
        form_data = data.get("formData", {})

        if not contract_type:
            return jsonify({"error": "Missing contract type"}), 400

        # Convert form data into readable format for LLM prompt
        details_text = "\n".join([f"{key}: {value}" for key, value in form_data.items()])

        # LLM Prompt for contract draft generation
        prompt = f"""
        You are a senior legal expert. Draft a detailed {contract_type} using the details below.
        The contract must follow a proper legal format, tone, and standard clauses.
        Avoid placeholders like [Name]; use realistic content.

        Contract details:
        {details_text}

        Output only the final draft contract in text format.
        """

        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        contract_text = response.text if hasattr(response, "text") else str(response)

        return jsonify({"contract": contract_text})
    except Exception as e:
        print("Error in /api/generate-contract:", str(e))
        return jsonify({"error": str(e)}), 500
