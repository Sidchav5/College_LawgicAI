# Final/analyze.py
import os
import re
import json
import sys
from typing import List, Tuple

import numpy as np
import pandas as pd
import nltk
from nltk.tokenize import sent_tokenize

import joblib
import torch
import requests

import pdfplumber
from PyPDF2 import PdfReader

# CRITICAL: Import all classes needed for unpickling
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
import lightgbm as lgb
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from transformers import AutoTokenizer, AutoModel

# ----------------------------- Groq API key -----------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not found in environment variables!")
    print("   Set it with: export GROQ_API_KEY='your-key-here'")
    print("   LLM descriptions will be disabled.")
else:
    print(f"✓ GROQ_API_KEY loaded (length: {len(GROQ_API_KEY)})")

# Test API key validity
def test_groq_api():
    if not GROQ_API_KEY:
        return False
    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        resp = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=5)
        resp.raise_for_status()
        models = resp.json().get('data', [])
        print(f"✓ Groq API connection successful! Available models: {len(models)}")
        return True
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"✗ Groq API authentication FAILED: Invalid API key")
        else:
            print(f"✗ Groq API error: HTTP {e.response.status_code}")
        return False
    except Exception as e:
        print(f"✗ Groq API connection failed: {e}")
        return False

# Run test at startup
GROQ_API_AVAILABLE = test_groq_api()

# ----------------------------- Paths -----------------------------
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
CLASSIFIER_PKL = os.path.join(MODEL_DIR, "legal_classifier.pkl")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# NLTK punkt
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt", quiet=True)

# ============================================================================
# CLASS DEFINITION - REQUIRED FOR UNPICKLING
# ============================================================================
class EnhancedLegalClauseClassifier:
    """
    Enhanced Legal Clause Risk Classifier
    This class definition MUST exist for unpickling the trained model
    """
    
    def __init__(self, model_name='nlpaueb/legal-bert-base-uncased', max_length=512):
        self.tokenizer = None
        self.model = None
        self.max_length = max_length
        self.device = DEVICE
        self.tfidf_vectorizer = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.base_models = []
        self.meta_model = None
        self.best_params = {}
        self.tfidf_fitted = False
    
    def summarize_clause(self, text, max_words=100):
        words = text.split()
        if len(words) <= max_words:
            return text
        first_part = int(max_words * 0.7)
        last_part = max_words - first_part
        return ' '.join(words[:first_part] + ['...'] + words[-last_part:])
    
    def get_bert_embeddings(self, texts, batch_size=16):
        embeddings = []
        attention_scores = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            batch_texts = [self.summarize_clause(text) for text in batch_texts]
            
            encoded = self.tokenizer(
                batch_texts, padding=True, truncation=True,
                max_length=self.max_length, return_tensors='pt'
            )
            
            input_ids = encoded['input_ids'].to(self.device)
            attention_mask = encoded['attention_mask'].to(self.device)
            
            with torch.no_grad():
                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                cls_embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()
                avg_attention = attention_mask.float().mean(dim=1).cpu().numpy()
                embeddings.append(cls_embeddings)
                attention_scores.append(avg_attention)
        
        embeddings = np.vstack(embeddings)
        attention_scores = np.concatenate(attention_scores).reshape(-1, 1)
        return np.hstack([embeddings, attention_scores])
    
    def get_tfidf_features(self, texts, fit=False):
        if fit:
              tfidf_features = self.tfidf_vectorizer.fit_transform(texts).toarray()
              self.tfidf_fitted = True
        else:
             if not self.tfidf_fitted and not hasattr(self.tfidf_vectorizer, 'vocabulary_'):
                raise ValueError("TF-IDF vectorizer not fitted!")
        
        # Ensure it's fitted by checking vocabulary
             if not hasattr(self.tfidf_vectorizer, 'idf_'):
            # Force refit if needed (shouldn't happen but safety check)
                print("WARNING: TF-IDF missing idf_, attempting to use as-is")
        
             tfidf_features = self.tfidf_vectorizer.transform(texts).toarray()
        return tfidf_features
    
    def predict(self, X_test):
        X_test_scaled = self.scaler.transform(X_test)
        n_classes = len(self.label_encoder.classes_)
        meta_features = np.zeros((X_test_scaled.shape[0], len(self.base_models) * n_classes))
        
        for model_idx, (name, model) in enumerate(self.base_models):
            start_idx = model_idx * n_classes
            end_idx = start_idx + n_classes
            meta_features[:, start_idx:end_idx] = model.predict_proba(X_test_scaled)
        
        predictions_encoded = self.meta_model.predict(meta_features)
        return self.label_encoder.inverse_transform(predictions_encoded)
    
    def predict_proba(self, X_test):
        X_test_scaled = self.scaler.transform(X_test)
        n_classes = len(self.label_encoder.classes_)
        meta_features = np.zeros((X_test_scaled.shape[0], len(self.base_models) * n_classes))
        
        for model_idx, (name, model) in enumerate(self.base_models):
            start_idx = model_idx * n_classes
            end_idx = start_idx + n_classes
            meta_features[:, start_idx:end_idx] = model.predict_proba(X_test_scaled)
        
        return self.meta_model.predict_proba(meta_features)
    
    def predict_new_clause(self, clause_text):
        bert_emb = self.get_bert_embeddings([clause_text])
        tfidf_feat = self.get_tfidf_features([clause_text], fit=False)
        X = np.hstack([bert_emb, tfidf_feat])
        
        prediction = self.predict(X)
        probabilities = self.predict_proba(X)
        
        return {
            'clause': clause_text[:100] + '...' if len(clause_text) > 100 else clause_text,
            'predicted_risk': prediction[0],
            'confidence': float(probabilities[0].max()),
            'probabilities': {
                label: float(prob)
                for label, prob in zip(self.label_encoder.classes_, probabilities[0])
            }
        }

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

def split_into_clauses_regex(text: str) -> List[str]:
    """Original rule-based fallback: split on blank lines, filter short blocks."""
    clauses = re.split(r'\n\s*\n+', text.strip())
    valid_clauses = []
    for clause in clauses:
        clause = normalize_spaces(clause)
        if len(clause) >= 40:
            valid_clauses.append(clause)
    seen = set()
    unique_clauses = []
    for clause in valid_clauses:
        if clause not in seen:
            seen.add(clause)
            unique_clauses.append(clause)
    return unique_clauses


def split_into_clauses_with_llm(text: str) -> List[str]:
    """
    Use Groq LLM to intelligently identify real contract clause boundaries.
    Strips preamble, party info, signatures, and headings-only lines.
    Falls back to regex splitting if API is unavailable or returns bad output.
    """
    if not GROQ_API_KEY or not GROQ_API_AVAILABLE:
        print("  [Clause Splitter] Groq unavailable — using regex fallback")
        return split_into_clauses_regex(text)

    # Truncate very long documents to stay within token limits (~12,000 chars)
    truncated = text[:12000]
    was_truncated = len(text) > 12000

    system_prompt = (
        "You are a legal document parser specialised in contract analysis. "
        "Your only job is to extract the substantive legal clauses from a contract. "
        "Rules: "
        "1. EXCLUDE: title page, party names/addresses, recitals, 'IN WITNESS WHEREOF', "
        "   signature blocks, witness sections, and any heading that appears alone with no body text. "
        "2. INCLUDE: every numbered or unnumbered clause that imposes an obligation, right, "
        "   restriction, or consequence on any party. "
        "3. Merge a clause heading with its paragraph body into ONE entry. "
        "4. Return ONLY a JSON array of strings — one string per clause — with no extra keys, "
        "   commentary, or markdown fences. Example: [\"Clause text 1...\", \"Clause text 2...\"]"
    )

    user_prompt = (
        f"Extract all substantive legal clauses from the contract below.\n"
        f"{'(Note: document was truncated to 12000 chars for processing)' if was_truncated else ''}\n\n"
        f"CONTRACT TEXT:\n{truncated}"
    )

    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}

        # Pick the best available model
        resp = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=10)
        resp.raise_for_status()
        available_ids = [m["id"] for m in resp.json().get("data", [])]
        preferred = [
            "meta-llama/llama-3.3-70b-versatile",
            "meta-llama/llama-3.1-70b-versatile",
            "mixtral-8x7b-32768",
            "llama-3.1-8b-instant",
        ]
        model_id = next((m for m in preferred if m in available_ids), available_ids[0] if available_ids else None)

        if not model_id:
            print("  [Clause Splitter] No Groq model found — using regex fallback")
            return split_into_clauses_regex(text)

        print(f"  [Clause Splitter] Using Groq model: {model_id}")

        payload = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.0,
            "max_tokens": 4096,
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if model wrapped output
        content = re.sub(r"^```[a-z]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
        content = content.strip()

        # Parse JSON array
        clauses_raw = json.loads(content)
        if not isinstance(clauses_raw, list):
            raise ValueError("LLM did not return a JSON array")

        # Clean and filter
        clauses = []
        seen = set()
        for c in clauses_raw:
            c = normalize_spaces(str(c))
            if len(c) >= 40 and c not in seen:
                seen.add(c)
                clauses.append(c)

        if not clauses:
            print("  [Clause Splitter] LLM returned empty list — using regex fallback")
            return split_into_clauses_regex(text)

        print(f"  [Clause Splitter] ✓ LLM identified {len(clauses)} clauses")
        return clauses

    except json.JSONDecodeError as e:
        print(f"  [Clause Splitter] JSON parse error: {e} — using regex fallback")
        return split_into_clauses_regex(text)
    except requests.exceptions.Timeout:
        print("  [Clause Splitter] Groq timeout — using regex fallback")
        return split_into_clauses_regex(text)
    except Exception as e:
        print(f"  [Clause Splitter] Error: {e} — using regex fallback")
        return split_into_clauses_regex(text)


def split_into_clauses(raw_text: str) -> List[str]:
    """
    Main entry point for clause splitting.
    Uses Groq LLM when available; falls back to regex splitting.
    Classification (model + keyword rules) is completely unchanged.
    """
    text = clean_text(raw_text)
    return split_into_clauses_with_llm(text)


# ----------------------------- Context-Aware Risk Adjustment -----------------------------
def adjust_risk_with_context(clause_text: str, predicted_risk: str, confidence: float) -> Tuple[str, float, str]:
    clause_lower = clause_text.lower()
    
    # Tenant-protective / common rental clause terms
    tenant_protective = [
        'written notice', 'one month', "one month's", '30 days', '30-day', 'security deposit',
        'refundable', 'refund within', 'major structural repairs', 'property taxes',
        'reasonable notice', 'quiet enjoyment', 'residential purposes', 'normal wear and tear',
        'maintenance', 'repair', 'repair costs', 'deduct from the security', 'vacate'
    ]
    
    # Landlord-favourable / aggressive terms
    landlord_favourable = [
        'forfeit', 'forfeited', 'immediately without', 'without notice', 'without refund',
        'no refund', 'no liability', 'terminate immediately', 'evict', 'eviction',
        'personal liability', 'absolute', 'irrevocable', 'waive all', 'penalty', 'late fee'
    ]
    
    # Topic-specific buckets for finer checks
    deposit_terms = ['security deposit', 'deposit', '₹', 'rupees', 'refund within', 'forfeit']
    notice_terms = ['written notice', 'one month', '30 days', '24 hours', 'prior notice', 'without notice']
    entry_terms = ['enter', 'inspection', '24 hours prior notice', 'emergency entry', 'safety hazards', 'water leak', 'gas leak']
    utilities_terms = ['electricity', 'water', 'gas', 'internet', 'utilities', 'maintenance charges']
    termination_terms = ['terminate', 'termination', 'vacate', 'vacates', 'default', 'rent default', 'two months']
    repair_terms = ['repair', 'repairs', 'maintenance', 'structural', 'wear and tear', 'damage beyond']
    sublet_terms = ['sublet', 'subletting', 'assign', 'consent', 'permission']
    jurisdiction_terms = ['arbitration', 'arbitration and conciliation act', 'governed by', 'jurisdiction', 'courts', 'mumbai']
    payment_terms = ['monthly rent', 'payable on or before', 'due date', 'bank transfer', 'designated account', 'late fee']
    
    # counts
    protective_count = sum(1 for term in tenant_protective if term in clause_lower)
    aggressive_count = sum(1 for term in landlord_favourable if term in clause_lower)
    deposit_count = sum(1 for term in deposit_terms if term in clause_lower)
    notice_count = sum(1 for term in notice_terms if term in clause_lower)
    entry_count = sum(1 for term in entry_terms if term in clause_lower)
    utilities_count = sum(1 for term in utilities_terms if term in clause_lower)
    termination_count = sum(1 for term in termination_terms if term in clause_lower)
    repair_count = sum(1 for term in repair_terms if term in clause_lower)
    sublet_count = sum(1 for term in sublet_terms if term in clause_lower)
    jurisdiction_count = sum(1 for term in jurisdiction_terms if term in clause_lower)
    payment_count = sum(1 for term in payment_terms if term in clause_lower)
    
    adjustment_note = ""
    adjusted_risk = predicted_risk
    adjusted_confidence = confidence
    
    # Example rules using these new buckets:
    # Deposit + refundable language => likely lower risk
    if deposit_count > 0 and 'refundable' in clause_lower and 'forfeit' not in clause_lower:
        if adjusted_risk in ['Medium', 'High']:
            adjusted_risk = 'Low'
            adjusted_confidence = max(adjusted_confidence, 0.80)
            adjustment_note = "Clause mentions refundable deposit — tenant protection"
    
    # Immediate eviction / forfeit language => raise risk
    if any(w in clause_lower for w in ['forfeit', 'forfeited', 'terminate immediately', 'without notice']):
        adjusted_risk = 'High'
        adjusted_confidence = min(0.99, max(adjusted_confidence, 0.90))
        adjustment_note = "Strong landlord-favourable language (forfeit/termination without notice)"
    
    # Emergency entry allowed but with notice elsewhere => medium risk
    if entry_count > 0 and 'emergency' in clause_lower and '24 hours' in clause_lower:
        if adjusted_risk == 'High':
            adjusted_risk = 'Medium'
            adjusted_confidence = 0.75
            adjustment_note = "Emergency entry allowed but 24-hour notice for inspections"
    
    # Standard utilities/repair mentions => lower risk
    if (utilities_count > 0 or repair_count > 0 or payment_count > 0) and aggressive_count == 0:
        if adjusted_risk in ['Medium', 'High']:
            adjusted_risk = 'Low'
            adjusted_confidence = 0.80
            adjustment_note = "Standard rent/utilities/repair language detected"
    
    # Arbitration / jurisdiction clauses reduce ambiguity but note applicability
    if jurisdiction_count > 0:
        adjustment_note = (adjustment_note + " " if adjustment_note else "") + "Contains arbitration/jurisdiction clause"
    
    # fallback: keep existing aggressive confirmation
    if aggressive_count >= 2:
        if adjusted_risk != 'High':
            adjusted_risk = 'High'
            adjusted_confidence = min(confidence * 1.1, 0.99)
            adjustment_note = f"Confirmed High risk ({aggressive_count} aggressive terms detected)"
    
    return adjusted_risk, adjusted_confidence, adjustment_note

# ----------------------------- Load Model -----------------------------
def load_classifier():
    """Load classifier from individual components"""
    print(f"Loading classifier components from: {MODEL_DIR}")
    
    import json
    from transformers import AutoTokenizer, AutoModel
    
    # Load config
    with open(os.path.join(MODEL_DIR, 'config.json'), 'r') as f:
        config = json.load(f)
    
    # Create classifier instance
    classifier = EnhancedLegalClauseClassifier(
        model_name=config['model_name'],
        max_length=config['max_length']
    )
    
    # Load tokenizer and model
    print("  Loading BERT tokenizer and model...")
    classifier.tokenizer = AutoTokenizer.from_pretrained(config['model_name'])
    classifier.model = AutoModel.from_pretrained(config['model_name']).to(DEVICE).eval()
    
    # Load components
    print("  Loading label encoder...")
    classifier.label_encoder = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
    
    print("  Loading scaler...")
    classifier.scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    
    print("  Loading TF-IDF...")
    classifier.tfidf_vectorizer = joblib.load(os.path.join(MODEL_DIR, 'tfidf_vectorizer.pkl'))
    # Mark as fitted by checking if it has the required attributes
    if hasattr(classifier.tfidf_vectorizer, 'vocabulary_'):
       classifier.tfidf_fitted = True
       print(f"    TF-IDF vocabulary size: {len(classifier.tfidf_vectorizer.vocabulary_)}")
    else:
        print("    WARNING: TF-IDF may not be properly fitted")
        classifier.tfidf_fitted = False
    
    print("  Loading base models...")
    classifier.base_models = []
    for idx, name in enumerate(config['base_model_names']):
        model = joblib.load(os.path.join(MODEL_DIR, f'base_model_{idx}_{name}.pkl'))
        classifier.base_models.append((name, model))
        print(f"    Loaded {name}")
    
    print("  Loading meta model...")
    classifier.meta_model = joblib.load(os.path.join(MODEL_DIR, 'meta_model.pkl'))
    
    print(f"✓ Classifier loaded successfully!")
    print(f"✓ Classes: {classifier.label_encoder.classes_}")
    
    return classifier

# ----------------------------- LLM descriptions via Groq -----------------------------
SYSTEM_PROMPT = (
    "You are a senior contracts attorney and an expert in Indian law. "
    "Given a single contract clause, explain in simple, everyday language what the clause means, (In 20 words) "
    "using analogies where helpful to make it easier to understand. "
    "Also, if applicable, mention relevant Indian laws, acts, or court judgments that relate to the clause. "
    "Finally, provide 2-3 actionable suggestions on how this clause can be improved to make it clearer, "
    "safer, and legally stronger."
)

def llm_describe_and_suggest(clause: str, adjusted_risk: str, model_risk: str, 
                             confidence: float, adjustment_note: str, max_suggestions: int = 3):
    """
    Get LLM-powered description and suggestions for a clause
    Returns: (description, suggestions_list)
    """
    if not GROQ_API_KEY:
        print("  [LLM] Skipped: No API key")
        return "", []

    if not GROQ_API_AVAILABLE:
        print("  [LLM] Skipped: API not available")
        return "", []

    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        
        # Get available models
        resp = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=10)
        resp.raise_for_status()
        models = resp.json().get("data", [])
        
        if not models:
            print("  [LLM] No models available")
            return "", []

        preferred_models = [
           "meta-llama/llama-3.3-70b-versatile",
           "meta-llama/llama-3.1-70b-versatile",
           "mixtral-8x7b-32768",
           "llama-3.1-8b-instant"
        ]

        model_id = None
        available_model_ids = [m["id"] for m in models]
        for pref in preferred_models:
            if pref in available_model_ids:
                model_id = pref
                break

        if not model_id and available_model_ids:
            model_id = available_model_ids[0]
            
        if not model_id:
            print("  [LLM] No suitable model found")
            return "", []

        print(f"  [LLM] Using model: {model_id}")

        context_info = ""
        if adjustment_note:
            context_info = f"\n\nNote: {adjustment_note}"
        
        user_prompt = (
            f"Clause:\n\"\"\"{clause}\"\"\"\n\n"
            f"Risk Assessment:\n"
            f"- Model prediction: {model_risk} (Confidence: {confidence:.1%})\n"
            f"- Adjusted risk: {adjusted_risk}{context_info}\n\n"
            "Explain what this clause means in simple terms using analogies if possible.(in 20 words) "
            "Also, mention any applicable Indian laws, regulations, or court judgments that relate to this clause. "
            "Then provide 2-3 practical suggestions on how to improve this clause."
        )

        payload = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 800
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            data=json.dumps(payload),
            timeout=60
        )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()

        # Parse response
        parts = re.split(r"\n\s*\n", content, maxsplit=1)
        description = parts[0].strip()
        suggestions = []
        if len(parts) > 1:
            suggestions = [
                re.sub(r"^[\-\*\d\.\)\s]+", "", s).strip()
                for s in parts[1].split("\n") if s.strip()
            ]
        
        print(f"  [LLM] ✓ Generated description ({len(description)} chars, {len(suggestions)} suggestions)")
        return description, suggestions[:max_suggestions]
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"  [LLM] ✗ Authentication failed: Invalid API key")
        elif e.response.status_code == 429:
            print(f"  [LLM] ✗ Rate limit exceeded")
        else:
            print(f"  [LLM] ✗ HTTP error: {e.response.status_code}")
        return "", []
    except requests.exceptions.Timeout:
        print(f"  [LLM] ✗ Request timeout")
        return "", []
    except Exception as e:
        print(f"  [LLM] ✗ Error: {e}")
        return "", []

# Global classifier instance
_GLOBAL_CLASSIFIER = None

# ----------------------------- Main Analysis -----------------------------
def analyze_contract(text=None, pdf_path=None, use_llm=True, max_clauses=None):
    """
    Analyze contract clauses for risk
    
    Args:
        text: Contract text (if not using PDF)
        pdf_path: Path to PDF file
        use_llm: Whether to use LLM for descriptions (requires valid GROQ_API_KEY)
        max_clauses: Limit number of clauses to analyze (for testing)
    """
    global _GLOBAL_CLASSIFIER
    
    if not text and not pdf_path:
        raise ValueError("Provide either text or pdf_path")

    # Check LLM availability
    if use_llm and not GROQ_API_AVAILABLE:
        print("\n⚠️  WARNING: LLM analysis requested but Groq API is not available")
        print("   Descriptions will show fallback message")
        print("   To enable LLM: Set valid GROQ_API_KEY environment variable\n")

    # Only load the classifier once into memory
    if _GLOBAL_CLASSIFIER is None:
        _GLOBAL_CLASSIFIER = load_classifier()
    classifier = _GLOBAL_CLASSIFIER
    
    raw_text = read_pdf_text(pdf_path) if pdf_path else text
    clauses = split_into_clauses(raw_text)
    
    if max_clauses:
        clauses = clauses[:max_clauses]
    
    if not clauses:
        return pd.DataFrame(columns=[
            "clause_no", "statement", "risk_model", "risk_bert", 
            "confidence", "adjustment_note", "description", "suggestions"
        ])

    print(f"\nAnalyzing {len(clauses)} clauses...")
    print(f"LLM Analysis: {'Enabled' if use_llm and GROQ_API_AVAILABLE else 'Disabled'}")
    print("=" * 70)
    
    rows = []
    for idx, clause in enumerate(clauses, start=1):
        try:
            result = classifier.predict_new_clause(clause)
            
            raw_risk = result['predicted_risk']
            raw_confidence = result['confidence']
            
            print(f"\nClause {idx}: {raw_risk} ({raw_confidence:.1%})")
            
            adjusted_risk, adjusted_confidence, adjustment_note = adjust_risk_with_context(
                clause, raw_risk, raw_confidence
            )
            
            if adjustment_note:
                print(f"  ADJUSTED: {adjusted_risk} ({adjusted_confidence:.1%})")
                print(f"  Reason: {adjustment_note[:60]}...")
            
            desc, suggestions = ("", [])
            if use_llm and GROQ_API_AVAILABLE:
                desc, suggestions = llm_describe_and_suggest(
                    clause, adjusted_risk, raw_risk, raw_confidence, adjustment_note
                )
            
            rows.append({
                "clause_no": idx,
                "statement": clause,
                "risk_model": adjusted_risk,
                "risk_bert": raw_risk,
                "confidence": float(adjusted_confidence),
                "adjustment_note": adjustment_note if adjustment_note else None,
                "description": desc if desc else "Enable LLM analysis for detailed explanation",
                "suggestions": suggestions if suggestions else []
            })

        except Exception as e:
            print(f"  ✗ Error processing clause {idx}: {e}")
            rows.append({
                "clause_no": idx,
                "statement": clause,
                "risk_model": "Error",
                "risk_bert": "Error",
                "confidence": 0.0,
                "adjustment_note": f"Error: {str(e)}",
                "description": "",
                "suggestions": []
            })
    
    print("=" * 70)
    print(f"\n✓ Analysis complete! Processed {len(rows)} clauses")
    
    df = pd.DataFrame(rows)
    if len(df) > 0:
        print(f"\nRisk Distribution:")
        print(f"  High:   {len(df[df['risk_model'] == 'High'])}")
        print(f"  Medium: {len(df[df['risk_model'] == 'Medium'])}")
        print(f"  Low:    {len(df[df['risk_model'] == 'Low'])}")
        
        # LLM usage stats
        if use_llm:
            with_desc = len(df[df['description'] != "Enable LLM analysis for detailed explanation"])
            print(f"\nLLM Descriptions: {with_desc}/{len(df)} clauses")
    
    return df