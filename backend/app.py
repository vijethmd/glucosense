"""
Diabetes Prediction API — Flask Backend
========================================
POST /predict   → Returns prediction, probability, and confidence
GET  /metrics   → Returns model accuracy metrics for UI display
GET  /health    → Health check
"""

import os
import json
import pickle
import numpy as np
from flask import Flask, request, jsonify

# ── Flask app ──────────────────────────────────────────────────────────────
app = Flask(__name__)

# ── CORS (manual, no flask-cors dependency) ────────────────────────────────
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def options_handler(path):
    return jsonify({}), 200


# ── Load artifacts ─────────────────────────────────────────────────────────
ARTIFACTS = os.path.join(os.path.dirname(__file__), "..", "model", "artifacts")

def load_artifact(name):
    with open(os.path.join(ARTIFACTS, name), "rb") as f:
        return pickle.load(f)

def load_metrics():
    with open(os.path.join(ARTIFACTS, "metrics.json")) as f:
        return json.load(f)

model         = load_artifact("model.pkl")
scaler        = load_artifact("scaler.pkl")
feature_names = load_artifact("feature_names.pkl")
metrics_data  = load_metrics()

print(f"[✓] Model loaded: {metrics_data.get('best_model','Random Forest')}")
print(f"[✓] Features: {feature_names}")


# ── Validation config ──────────────────────────────────────────────────────
FIELD_RULES = {
    "Pregnancies":              {"min": 0,    "max": 20,   "type": float},
    "Glucose":                  {"min": 50,   "max": 250,  "type": float},
    "BloodPressure":            {"min": 30,   "max": 150,  "type": float},
    "SkinThickness":            {"min": 0,    "max": 100,  "type": float},
    "Insulin":                  {"min": 0,    "max": 900,  "type": float},
    "BMI":                      {"min": 10,   "max": 70,   "type": float},
    "DiabetesPedigreeFunction": {"min": 0.05, "max": 2.5,  "type": float},
    "Age":                      {"min": 18,   "max": 100,  "type": int},
}


def validate_input(data: dict):
    """Returns (feature_vector, errors)."""
    errors = []
    vector = []

    for field in feature_names:
        rule  = FIELD_RULES[field]
        value = data.get(field)

        if value is None:
            errors.append(f"'{field}' is required.")
            continue
        try:
            value = rule["type"](value)
        except (ValueError, TypeError):
            errors.append(f"'{field}' must be a number.")
            continue
        if not (rule["min"] <= value <= rule["max"]):
            errors.append(
                f"'{field}' must be between {rule['min']} and {rule['max']}."
            )
            continue
        vector.append(value)

    return (np.array(vector, dtype=float) if not errors else None), errors


# ── Routes ─────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": metrics_data.get("best_model")}), 200


@app.route("/metrics", methods=["GET"])
def get_metrics():
    return jsonify(metrics_data), 200


@app.route("/predict", methods=["POST"])
def predict():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be JSON."}), 400

    feature_vector, errors = validate_input(body)
    if errors:
        return jsonify({"errors": errors}), 422

    # Scale and predict
    scaled = scaler.transform(feature_vector.reshape(1, -1))
    pred_class = int(model.predict(scaled)[0])
    proba      = float(model.predict_proba(scaled)[0][1])

    # Confidence bucket
    confidence_pct = proba if pred_class == 1 else (1 - proba)
    if confidence_pct >= 0.80:
        confidence_label = "High"
    elif confidence_pct >= 0.60:
        confidence_label = "Moderate"
    else:
        confidence_label = "Low"

    return jsonify({
        "prediction":        "Diabetic" if pred_class == 1 else "Not Diabetic",
        "diabetic":          bool(pred_class),
        "probability":       round(proba, 4),
        "confidence":        confidence_label,
        "confidence_score":  round(confidence_pct, 4),
        "model":             metrics_data.get("best_model", "Random Forest"),
        "input_features":    dict(zip(feature_names, feature_vector.tolist())),
    }), 200


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
