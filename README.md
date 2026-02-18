# 🩺 GlucoSense AI — Diabetes Prediction Web App

> A production-ready, full-stack machine learning application for diabetes risk screening.  
> **Stack**: Python · Flask · Random Forest · React · Vite

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?style=flat-square&logo=flask)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?style=flat-square&logo=scikit-learn)

---

## 📁 Folder Structure

```
diabetes-predictor/
│
├── backend/
│   └── app.py                  # Flask REST API
│
├── frontend/
│   ├── index.html              # Vite entry point
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx             # Full React UI
│
├── model/
│   ├── train.py                # Training pipeline
│   └── artifacts/              # Auto-generated after training
│       ├── model.pkl           # Best model (Random Forest)
│       ├── scaler.pkl          # StandardScaler
│       ├── feature_names.pkl   # Ordered feature list
│       └── metrics.json        # Accuracy, F1, confusion matrix
│
├── requirements.txt
└── README.md
```

---

## ⚡ Quick Start

### 1 — Clone and Set Up

```bash
git clone https://github.com/yourname/diabetes-predictor.git
cd diabetes-predictor

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2 — Train the Model

```bash
cd model
python train.py
```

This will:
- Download the PIMA Indians Diabetes Dataset automatically
- Preprocess (handle missing values, standardize)
- Train Logistic Regression + Random Forest
- Print a side-by-side comparison
- Save artifacts to `model/artifacts/`

### 3 — Run the Backend

```bash
cd backend
python app.py
# → API running at http://localhost:5000
```

Or in production with Gunicorn:
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 4 — Run the Frontend

```bash
cd frontend
npm install
npm run dev
# → UI running at http://localhost:3000
```

---

## 🔌 API Reference

### `GET /health`
```json
{ "status": "ok", "model": "Random Forest" }
```

### `GET /metrics`
Returns full model comparison metrics including confusion matrices.

### `POST /predict`

**Request body:**
```json
{
  "Pregnancies": 6,
  "Glucose": 148,
  "BloodPressure": 72,
  "SkinThickness": 35,
  "Insulin": 0,
  "BMI": 33.6,
  "DiabetesPedigreeFunction": 0.627,
  "Age": 50
}
```

**Response:**
```json
{
  "prediction": "Diabetic",
  "diabetic": true,
  "probability": 0.7850,
  "confidence": "High",
  "confidence_score": 0.7850,
  "model": "Random Forest",
  "input_features": { ... }
}
```

**cURL example:**
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"Pregnancies":6,"Glucose":148,"BloodPressure":72,"SkinThickness":35,"Insulin":0,"BMI":33.6,"DiabetesPedigreeFunction":0.627,"Age":50}'
```

---

## 🧠 Why Random Forest?

| Criterion | Logistic Regression | Random Forest ✓ |
|-----------|-------------------|-----------------|
| Non-linear patterns | ✗ Limited | ✓ Captures complex interactions |
| Feature importance | ✗ Coefficients only | ✓ Built-in Gini importance |
| Class imbalance | Manual handling | ✓ `class_weight='balanced'` |
| Overfitting | Low variance | ✓ Ensemble averaging reduces it |
| Performance | ~75% accuracy | ✓ ~77%+ accuracy |

Random Forest builds **200 independent decision trees**, each trained on a random subset of features and data (bagging). Final prediction = majority vote. This ensemble approach:
1. Reduces variance vs. a single tree
2. Handles the ~35% diabetic class imbalance via `class_weight='balanced'`
3. Naturally captures non-linear interactions (e.g., high Glucose **and** high BMI together → strong risk signal)
4. Provides calibrated probability scores via `predict_proba()`

---

## 🌟 Key Features

- **Full ML Pipeline**: Missing value imputation → StandardScaler → Train/test split → Model comparison
- **REST API**: Clean Flask backend with input validation and structured JSON responses
- **Professional UI**: Dark/light mode, animated probability gauge, confusion matrix display
- **Model Metrics Panel**: Live accuracy, precision, recall, and F1 from the backend
- **Input Validation**: Client-side + server-side range checking for all 8 features
- **Production Ready**: Gunicorn-compatible, CORS-enabled, modular code

---

## 🚀 Deployment

### Backend — Render / Railway / Fly.io

```bash
# Procfile (for Render/Heroku)
web: gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app
```

### Frontend — Vercel / Netlify

```bash
cd frontend
npm run build
# Upload dist/ folder to Vercel/Netlify
# Set VITE_API_URL environment variable to your backend URL
```

Update `App.jsx`:
```js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
```

---

## 📊 Dataset

**PIMA Indians Diabetes Dataset** — National Institute of Diabetes and Digestive and Kidney Diseases  
768 female patients of Pima Indian heritage, age ≥ 21  
Binary classification: Diabetic (268) vs Not Diabetic (500)

| Feature | Description |
|---------|-------------|
| Pregnancies | Number of pregnancies |
| Glucose | Plasma glucose (mg/dL) |
| BloodPressure | Diastolic blood pressure (mmHg) |
| SkinThickness | Triceps skinfold (mm) |
| Insulin | 2-hr serum insulin (μU/mL) |
| BMI | Body Mass Index |
| DiabetesPedigreeFunction | Genetic risk score |
| Age | Age in years |

---

## ⚕️ Disclaimer

This application is built for **educational and screening purposes only**. It is not a medical device and should not replace professional medical diagnosis. Always consult a licensed physician.

---

## 📄 License

MIT License — Free to use for academic and personal projects.
