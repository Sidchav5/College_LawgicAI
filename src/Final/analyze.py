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

# --- COMPREHENSIVE MONKEY PATCH FOR XGBOOST COMPATIBILITY ---
# Old pickled XGBoost models reference attributes (use_label_encoder, gpu_id, etc.)
# that were removed in newer XGBoost versions. XGBoost's custom __getattr__
# raises AttributeError for these. We intercept __getattr__ on XGBModel (the
# base class) so ANY deprecated attribute returns a safe default.
_DEPRECATED_XGB_ATTRS = {
    'use_label_encoder': False,
    'gpu_id': -1,
    'n_gpus': 0,
    'predictor': 'auto',
    'single_precision_histogram': False,
    'grow_policy': 'depthwise',
    'process_type': 'default',
}

_original_xgb_getattr = getattr(xgb.XGBModel, '__getattr__', None)

def _patched_xgb_getattr(self, name):
    if name in _DEPRECATED_XGB_ATTRS:
        return _DEPRECATED_XGB_ATTRS[name]
    if _original_xgb_getattr is not None:
        return _original_xgb_getattr(self, name)
    raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

xgb.XGBModel.__getattr__ = _patched_xgb_getattr

def _patch_xgb_instance(model):
    """Also inject deprecated attrs directly into instance __dict__ as a belt-and-suspenders fix."""
    if isinstance(model, xgb.XGBModel):
        for attr, default in _DEPRECATED_XGB_ATTRS.items():
            if attr not in model.__dict__:
                model.__dict__[attr] = default
    return model

# ----------------------------- Gemini API key -----------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️  WARNING: GEMINI_API_KEY not found in environment variables!")
    print("   LLM descriptions will be disabled.")
else:
    print(f"✓ GEMINI_API_KEY loaded (length: {len(GEMINI_API_KEY)})")

# Test API key validity
def test_gemini_api():
    if not GEMINI_API_KEY:
        return False
    try:
        headers = {
            "Authorization": f"Bearer {GEMINI_API_KEY}",
            "Content-Type": "application/json"
        }
        # Connection test using minimal payload
        payload = {
            "model": "gemini-1.5-flash",
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 5
        }
        resp = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            headers=headers,
            json=payload,
            timeout=5
        )
        resp.raise_for_status()
        print("✓ Gemini API connection successful!")
        return True
    except Exception as e:
        print(f"✗ Gemini API connection failed: {e}")
        return False

# Run test at startup
GEMINI_API_AVAILABLE = test_gemini_api()

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
    Use Gemini LLM to intelligently identify real contract clause boundaries.
    Strips preamble, party info, signatures, and headings-only lines.
    Falls back to regex splitting if API is unavailable or returns bad output.
    """
    if not GEMINI_API_KEY or not GEMINI_API_AVAILABLE:
        print("  [Clause Splitter] Gemini unavailable — using regex fallback")
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
        headers = {
            "Authorization": f"Bearer {GEMINI_API_KEY}",
            "Content-Type": "application/json"
        }
        model_id = "gemini-1.5-flash"
        print(f"  [Clause Splitter] Using Gemini model: {model_id}")
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
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
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
def adjust_risk_heuristics(clause_text, predicted_risk, confidence):
    """
    Adjust risk based on generalized contract heuristics, removing rent-specific bias
    so the analyzer works well across NDAs, Employment, and other contracts.
    """
    clause_lower = clause_text.lower()
    
    # Generalized aggressive terms that denote high risk in almost ANY contract
    aggressive_terms = [
        'forfeit', 'terminate immediately', 'without notice', 'no liability', 
        'irrevocable', 'waive all', 'penalty', 'indemnify', 'liquidated damages', 'exclusive right'
    ]
    aggressive_count = sum(1 for term in aggressive_terms if term in clause_lower)
    
    adjustment_note = ""
    adjusted_risk = predicted_risk
    adjusted_confidence = confidence
    
    # If the model missed obvious aggressive language, bump it up
    if aggressive_count >= 2:
        if adjusted_risk != 'High':
            adjusted_risk = 'High'
            adjusted_confidence = min(confidence * 1.1, 0.99)
            adjustment_note = f"Confirmed High risk ({aggressive_count} aggressive terms detected)"
            
    # Dispute resolution clauses are important to highlight regardless of risk
    jurisdiction_terms = ['arbitration', 'governed by', 'jurisdiction', 'courts', 'dispute resolution']
    if any(term in clause_lower for term in jurisdiction_terms):
        adjustment_note = (adjustment_note + " " if adjustment_note else "") + "Contains dispute resolution/jurisdiction clause"
        
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
        # Patch XGBClassifier instances so use_label_encoder is in __dict__
        _patch_xgb_instance(model)
        classifier.base_models.append((name, model))
        print(f"    Loaded {name}")
    
    print("  Loading meta model...")
    classifier.meta_model = joblib.load(os.path.join(MODEL_DIR, 'meta_model.pkl'))
    
    print(f"✓ Classifier loaded successfully!")
    print(f"✓ Classes: {classifier.label_encoder.classes_}")
    
    return classifier

# ----------------------------- LLM descriptions + Risk Assessment via Gemini 1.5 Flash -----------------------------
SYSTEM_PROMPT = (
    "You are a senior contracts attorney and an expert in Indian and international contract law.\n"
    "Your response MUST follow this EXACT format with no deviations:\n\n"
    "Risk: <High or Medium or Low>\n"
    "Reason: <one sentence explaining your risk assessment>\n\n"
    "Description: <one sentence, max 25 words, plain language explanation of what this clause means>\n\n"
    "Suggestions:\n"
    "- <first actionable suggestion to improve or protect yourself>\n"
    "- <second actionable suggestion>\n"
    "- <third actionable suggestion>\n\n"
    "RULES: Do NOT use markdown bold (**). Do NOT add extra sections. Start directly with 'Risk:'"
)

def llm_describe_and_suggest(clause: str, ml_risk: str, ml_confidence: float,
                             max_suggestions: int = 3):
    """
    Ask Gemini 1.5 Flash to independently assess risk AND provide description + suggestions.
    This is the LLM side of the ML+LLM Ensemble Fusion.
    Returns: (description, suggestions_list, llm_risk, llm_reason)
    """
    if not GEMINI_API_KEY:
        print("  [LLM] Skipped: No API key")
        return "", [], None, ""

    if not GEMINI_API_AVAILABLE:
        print("  [LLM] Skipped: API not available")
        return "", [], None, ""

    try:
        model_id = "gemini-1.5-flash"
        print(f"  [LLM] Calling {model_id} for independent risk + description...")

        # Pass ML prediction as context but ask LLM to make its OWN judgment
        user_prompt = (
            f"Clause to analyze:\n\"\"\"{clause}\"\"\"\n\n"
            f"ML Model context (for reference only, make your OWN independent judgment):\n"
            f"  ML prediction: {ml_risk} (Confidence: {ml_confidence:.1%})\n\n"
            "Now analyze this clause independently and provide your response in the exact format specified."
        )

        headers = {
            "Authorization": f"Bearer {GEMINI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 900
        }

        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            headers=headers,
            data=json.dumps(payload),
            timeout=60
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()

        # Strip thinking/reasoning tags
        content = re.sub(r"(?s)<(think|thought)>.*?</\1>", "", content).strip()
        content = re.sub(r"(?m)^\*{0,2}(Role|Task|Analyze User Input|User Input)[:\*]*.*$", "", content)
        content = content.strip()

        print(f"  [LLM] Raw preview: {repr(content[:250])}")

        # ── Parse LLM Risk ──
        llm_risk = None
        llm_reason = ""
        risk_match = re.search(r"(?i)^risk:\s*(high|medium|low)", content, re.MULTILINE)
        reason_match = re.search(r"(?i)^reason:\s*(.+)$", content, re.MULTILINE)
        if risk_match:
            llm_risk = risk_match.group(1).capitalize()  # High / Medium / Low
        if reason_match:
            llm_reason = reason_match.group(1).strip()

        # ── Parse Description ──
        description = ""
        desc_match = re.search(
            r"(?i)description:\s*(.*?)(?=\n\s*\*{0,2}suggestions?\*{0,2}:|$)",
            content, re.DOTALL
        )
        if desc_match:
            description = desc_match.group(1).strip()

        # ── Parse Suggestions ──
        suggestions = []
        sug_match = re.search(r"(?i)\*{0,2}suggestions?\*{0,2}:\s*(.*)", content, re.DOTALL)
        if sug_match:
            for line in sug_match.group(1).split("\n"):
                line = line.strip()
                if line:
                    clean = re.sub(r"^[\-\*\d\.\)\s\*]+", "", line).strip().strip("*").strip()
                    if clean and not clean.lower().startswith("description") and not clean.lower().startswith("risk"):
                        suggestions.append(clean)

        # Fallback: paragraph splitting if description missing
        if not description:
            paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
            description = paragraphs[0] if paragraphs else ""

        print(f"  [LLM] LLM Risk: {llm_risk} | Desc: {len(description)} chars | Suggestions: {len(suggestions)}")
        return description, suggestions[:max_suggestions], llm_risk, llm_reason

    except requests.exceptions.HTTPError as e:
        code = e.response.status_code if e.response else "?"
        print(f"  [LLM] HTTP {code} error")
        return "", [], None, ""
    except requests.exceptions.Timeout:
        print("  [LLM] Request timeout")
        return "", [], None, ""
    except Exception as e:
        print(f"  [LLM] Error: {e}")
        return "", [], None, ""


# ─────────────────────────── ML + LLM FUSION ─────────────────────────────────
RISK_ORDER = {"Low": 0, "Medium": 1, "High": 2}

def fuse_ml_llm_risk(ml_risk: str, ml_confidence: float,
                     llm_risk: str, llm_reason: str) -> Tuple[str, float, str]:
    """
    Weighted ensemble fusion of ML model + Gemini LLM risk predictions.

    Strategy:
      • Both agree → boost confidence by 10% (consensus)
      • ML confidence ≥ 0.87 → trust ML  (it's very certain)
      • ML confidence < 0.70 → trust LLM  (ML is guessing; LLM likely better on unseen contract types)
      • 0.70-0.87 disagreement → take the HIGHER risk  (conservative / legally safer)

    Returns: (final_risk, final_confidence, fusion_note)
    """
    if llm_risk is None:
        # LLM call failed — fall back to ML only
        return ml_risk, ml_confidence, "LLM unavailable — using ML prediction"

    if ml_risk == llm_risk:
        boosted = min(ml_confidence * 1.10, 0.99)
        note = f"ML and LLM agree: {ml_risk} (consensus, confidence boosted to {boosted:.0%})"
        return ml_risk, boosted, note

    # They disagree — apply confidence-based arbitration
    ml_level = RISK_ORDER.get(ml_risk, 1)
    llm_level = RISK_ORDER.get(llm_risk, 1)

    if ml_confidence >= 0.87:
        note = (f"Fusion: ML={ml_risk} ({ml_confidence:.0%}), LLM={llm_risk} — "
                f"Trusted ML (high confidence). LLM reason: {llm_reason[:80]}")
        return ml_risk, ml_confidence, note

    if ml_confidence < 0.70:
        note = (f"Fusion: ML={ml_risk} ({ml_confidence:.0%}), LLM={llm_risk} — "
                f"Trusted LLM (ML uncertain). Reason: {llm_reason[:80]}")
        return llm_risk, 0.75, note

    # 0.70-0.87: take the higher (more conservative) risk
    if llm_level > ml_level:
        final = llm_risk
        note = (f"Fusion: ML={ml_risk} ({ml_confidence:.0%}), LLM={llm_risk} — "
                f"Escalated to LLM's higher risk (conservative). Reason: {llm_reason[:80]}")
    else:
        final = ml_risk
        note = (f"Fusion: ML={ml_risk} ({ml_confidence:.0%}), LLM={llm_risk} — "
                f"Kept ML's higher risk (conservative).")
    return final, ml_confidence, note


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
    if use_llm and not GEMINI_API_AVAILABLE:
        print("\n⚠️  WARNING: LLM analysis requested but Gemini API is not available")
        print("   Descriptions will show fallback message")
        print("   To enable LLM: Set valid GEMINI_API_KEY environment variable\n")

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
    print(f"LLM Analysis: {'Enabled' if use_llm and GEMINI_API_AVAILABLE else 'Disabled'}")
    print("=" * 70)
    
    rows = []
    for idx, clause in enumerate(clauses, start=1):
        try:
            # ── Step 1: ML Model Prediction ──
            result = classifier.predict_new_clause(clause)
            ml_risk = result['predicted_risk']
            ml_confidence = result['confidence']
            print(f"\nClause {idx}: ML={ml_risk} ({ml_confidence:.1%})")

            # ── Step 2: Heuristic Safety Net ──
            heuristic_risk, heuristic_conf, heuristic_note = adjust_risk_heuristics(
                clause, ml_risk, ml_confidence
            )
            if heuristic_note:
                print(f"  Heuristic override: {heuristic_risk} | {heuristic_note[:60]}")

            # ── Step 3: LLM Independent Assessment + Description ──
            desc, suggestions, llm_risk, llm_reason = ("", [], None, "")
            if use_llm and GEMINI_API_AVAILABLE:
                desc, suggestions, llm_risk, llm_reason = llm_describe_and_suggest(
                    clause, heuristic_risk, heuristic_conf
                )

            # ── Step 4: ML + LLM Fusion ──
            final_risk, final_confidence, fusion_note = fuse_ml_llm_risk(
                heuristic_risk, heuristic_conf, llm_risk, llm_reason
            )
            print(f"  FINAL: {final_risk} ({final_confidence:.1%}) | {fusion_note[:80]}")

            rows.append({
                "clause_no": idx,
                "statement": clause,
                "risk_model": final_risk,          # Fused final risk
                "risk_bert": ml_risk,              # Raw ML prediction
                "risk_llm": llm_risk or "N/A",     # Gemini's independent judgment
                "confidence": float(final_confidence),
                "fusion_note": fusion_note,
                "adjustment_note": heuristic_note if heuristic_note else None,
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
                "risk_llm": "Error",
                "confidence": 0.0,
                "fusion_note": f"Error: {str(e)}",
                "adjustment_note": None,
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