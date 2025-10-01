# Final/analyze.py
import os
import re
import json
from typing import List

import numpy as np
import pandas as pd
import nltk
from nltk.tokenize import sent_tokenize

import joblib
from sklearn.preprocessing import StandardScaler
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoModel
import torch
import torch.nn.functional as F
import requests

import pdfplumber
from PyPDF2 import PdfReader

# ----------------------------- Groq API key -----------------------------
# Option 1: Paste API key here for testing
GROQ_API_KEY = "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"  # <-- paste your key here

# Option 2: fallback to environment variable if not pasted
if not GROQ_API_KEY:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

print("GROQ_API_KEY loaded:", bool(GROQ_API_KEY))

# ----------------------------- Paths and constants -----------------------------
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
STACK_PKL = os.path.join(MODEL_DIR, "stacking_model.pkl")
LE_PKL    = os.path.join(MODEL_DIR, "label_encoder.pkl")
SCALER_PKL= os.path.join(MODEL_DIR, "feature_scaler.pkl")
PCA_PKL   = os.path.join(MODEL_DIR, "pca_model.pkl")
TOPF_JSON = os.path.join(MODEL_DIR, "top_features.json")

BACKBONE = "roberta-large-mnli"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# NLTK punkt
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

# ----------------------------- PDF/Text extraction -----------------------------
def read_pdf_text(pdf_path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except Exception:
        reader = PdfReader(pdf_path)
        for p in reader.pages:
            text += p.extract_text() or ""
    return text

# ----------------------------- Clause extraction -----------------------------
def clean_text(block: str) -> str:
    block = block.replace("\xa0", " ")
    block = re.sub(r"[ \t]+", " ", block)
    block = re.sub(r"\s{3,}", "\n\n", block)
    return block.strip()

def normalize_spaces(s: str) -> str:
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\s+\n", "\n", s)
    return s.strip()

def split_into_clauses(raw_text: str) -> List[str]:
    """
    SIMPLIFIED CLAUSE SPLITTING:
    - Only splits on double newlines (paragraph breaks)
    - Does NOT split on periods, semicolons, or other punctuation
    - Keeps each clause intact as a single unit
    """
    text = clean_text(raw_text)
    
    # Split only on double newlines (two or more consecutive newlines)
    clauses = re.split(r'\n\s*\n+', text.strip())
    
    # Filter out empty clauses and very short ones (less than 40 characters)
    valid_clauses = []
    for clause in clauses:
        clause = normalize_spaces(clause)
        if len(clause) >= 40:
            valid_clauses.append(clause)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_clauses = []
    for clause in valid_clauses:
        if clause not in seen:
            seen.add(clause)
            unique_clauses.append(clause)
    
    return unique_clauses

# ----------------------------- Load models -----------------------------
def load_artifacts():
    stack_model = joblib.load(STACK_PKL)
    label_encoder = joblib.load(LE_PKL)
    scaler: StandardScaler = joblib.load(SCALER_PKL)
    pca = joblib.load(PCA_PKL)
    with open(TOPF_JSON, "r") as f:
        top_features = json.load(f)
    tokenizer = AutoTokenizer.from_pretrained(BACKBONE)
    clf_model = AutoModelForSequenceClassification.from_pretrained(BACKBONE).to(DEVICE).eval()
    emb_model = AutoModel.from_pretrained(BACKBONE).to(DEVICE).eval()
    return stack_model, label_encoder, scaler, pca, top_features, tokenizer, clf_model, emb_model

# ----------------------------- Feature engineering -----------------------------
def mnli_scores(texts, tokenizer, clf_model, batch_size=16):
    all_probs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        inputs = tokenizer(batch, truncation=True, padding=True, max_length=512, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            logits = clf_model(**inputs).logits
            probs = F.softmax(logits, dim=1).detach().cpu().numpy()
        all_probs.append(probs)
    return np.vstack(all_probs)

def cls_embeddings(texts, tokenizer, emb_model, batch_size=16):
    all_vecs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        inputs = tokenizer(batch, truncation=True, padding=True, max_length=512, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = emb_model(**inputs, output_hidden_states=True)
            cls_vec = outputs.hidden_states[-1][:,0,:]
            all_vecs.append(cls_vec.detach().cpu().numpy())
    return np.vstack(all_vecs)

def bert_risk_from_scores(ent, neu, contra):
    arr = np.array([ent, neu, contra])
    idx = int(np.argmax(arr))
    return ["Low", "Medium", "High"][idx]

def build_features(clauses, tokenizer, clf_model, emb_model, pca, top_features, scaler):
    probs = mnli_scores(clauses, tokenizer, clf_model)
    ent, neu, contra = probs[:,0], probs[:,1], probs[:,2]
    embs = cls_embeddings(clauses, tokenizer, emb_model)
    pca_vecs = pca.transform(embs)
    if pca_vecs.shape[1] < 4:
        pad = np.zeros((pca_vecs.shape[0], 4 - pca_vecs.shape[1]))
        pca_vecs = np.hstack([pca_vecs, pad])
    feats_df = pd.DataFrame({
        "entailment_score": ent,
        "neutral_score": neu,
        "contradiction_score": contra,
        "pca_0": pca_vecs[:,0],
        "pca_1": pca_vecs[:,1],
        "pca_2": pca_vecs[:,2],
        "pca_3": pca_vecs[:,3]
    })
    X_std = scaler.transform(feats_df.values)
    return X_std, feats_df

# ----------------------------- LLM descriptions via Groq REST API -----------------------------
SYSTEM_PROMPT = (
    "You are a senior contracts attorney and an expert in Indian law. "
    "Given a single contract clause, explain in simple, everyday language what the clause means, using analogies where helpful to make it easier to understand. "
    "Also, if applicable, mention relevant Indian laws, acts, or court judgments that relate to the clause. "
    "Finally, provide 2-3 actionable suggestions on how this clause can be improved to make it clearer, safer, and legally stronger."
)


def llm_describe_and_suggest(clause: str, bert_risk: str, model_risk: str, max_suggestions: int = 3):
    if not GROQ_API_KEY:
        print("❌ No Groq API key provided")
        return "", []

    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        
        # Get available models
        resp = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=10)
        resp.raise_for_status()
        models = resp.json().get("data", [])
        
        if not models:
            print("❌ No models available from Groq.")
            return "", []

        # List of preferred models you know are available and suitable
        preferred_models = [
            "groq/compound", 
            "groq/compound-mini", 
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "meta-llama/llama-3.3-70b-versatile"
        ]

        # Find the first available preferred model
        model_id = None
        available_model_ids = [m["id"] for m in models]
        for pref in preferred_models:
            if pref in available_model_ids:
                model_id = pref
                break

        if not model_id:
            print("❌ No preferred models are currently available.")
            return "", []

        user_prompt = (
            f"Clause:\n\"\"\"{clause}\"\"\"\n"
            f"The clause is assessed with model risk level: {model_risk}, and BERT model confidence: {bert_risk}.\n"
            "Explain what this clause means in layman's terms using analogies if possible. "
            "Also, mention any applicable Indian laws, regulations, or court judgments that relate to this clause. "
            "Then provide 2-3 practical suggestions on how to improve this clause to make it more precise, enforceable, and safer for the parties involved."
        )


        payload = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 300
        }

        response = requests.post("https://api.groq.com/openai/v1/chat/completions",
                                 headers=headers, data=json.dumps(payload), timeout=60)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()

        parts = re.split(r"\n\s*\n", content, maxsplit=1)
        description = parts[0].strip()
        suggestions = []
        if len(parts) > 1:
            suggestions = [re.sub(r"^[\-\*\d\.\)\s]+","",s).strip()
                           for s in parts[1].split("\n") if s.strip()]
        return description, suggestions[:max_suggestions]
    except Exception as e:
        print("❌ Groq API call failed:", e)
        return "", []

# ----------------------------- Main Analysis -----------------------------
def analyze_contract(text=None, pdf_path=None, use_llm=True, max_clauses=None):
    if not text and not pdf_path:
        raise ValueError("Provide text or PDF")

    stack_model, label_encoder, scaler, pca, top_features, tokenizer, clf_model, emb_model = load_artifacts()
    
    # Correct mapping because label encoder was trained incorrectly
    LABEL_MAPPING = {
        "Low": "Low",
        "High": "High", 
        "Medium": "Medium"
    }

    raw_text = read_pdf_text(pdf_path) if pdf_path else text
    clauses = split_into_clauses(raw_text)
    if max_clauses:
        clauses = clauses[:max_clauses]
    if not clauses:
        return pd.DataFrame(columns=["clause_no","statement","risk_bert","risk_model","confidence","description","suggestions"])

    X_std, feats_df = build_features(clauses, tokenizer, clf_model, emb_model, pca, top_features, scaler)
    try:
        probs = stack_model.predict_proba(X_std)
        preds = np.argmax(probs, axis=1)
        conf = probs[np.arange(len(preds)), preds]
    except Exception:
        preds = stack_model.predict(X_std)
        conf = [None]*len(preds)

    labels = label_encoder.inverse_transform(preds)
    bert_risks = [bert_risk_from_scores(feats_df.loc[i,"entailment_score"],
                                       feats_df.loc[i,"neutral_score"],
                                       feats_df.loc[i,"contradiction_score"]) for i in range(len(clauses))]
    
    # ADD THESE PRINT STATEMENTS FOR DEBUGGING
    print("\n" + "="*50)
    print("MODEL PREDICTION DEBUG INFO:")
    print("="*50)
    
    rows = []
    for idx, clause in enumerate(clauses, start=1):
        # Print model predictions before mapping
        print(f"\nClause {idx}:")
        print(f"Raw Model Prediction: {labels[idx-1]}")
        print(f"BERT Risk: {bert_risks[idx-1]}")
        
        # ADD THESE LINES TO SHOW MODEL CONFIDENCE
        if conf[idx-1] is not None:
            print(f"Model Confidence: {float(conf[idx-1]):.4f} ({float(conf[idx-1])*100:.2f}%)")
            # Show all class probabilities for debugging
            if hasattr(stack_model, 'predict_proba'):
                all_probs = probs[idx-1]
                print(f"  - Probability for each class:")
                for label_idx, prob in enumerate(all_probs):
                    class_name = label_encoder.inverse_transform([label_idx])[0]
                    print(f"    {class_name}: {prob:.4f} ({prob*100:.2f}%)")
        else:
            print(f"Model Confidence: N/A")
        
        desc, suggestions = ("",[])
        if use_llm:
            desc, suggestions = llm_describe_and_suggest(clause, bert_risks[idx-1], labels[idx-1])
        
        # Apply the mapping
        mapped_risk = LABEL_MAPPING.get(labels[idx-1], labels[idx-1])
        print(f"After Mapping: {mapped_risk}")
        print(f"Clause Preview: {clause[:100]}...")
        
        rows.append({
            "clause_no": idx,
            "statement": clause,
            "risk_bert": bert_risks[idx-1],
            "risk_model": labels[idx-1],
            "confidence": float(conf[idx-1]) if conf[idx-1] is not None else None,
            "description": desc,
            "suggestions": suggestions
        })
    
    print("="*50)
    return pd.DataFrame(rows)