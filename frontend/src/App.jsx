import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:5000";

const FIELDS = [
  { key: "Pregnancies",              label: "Pregnancies",               unit: "count", min: 0,    max: 20,   step: 1,     placeholder: "0–17",        tip: "Number of times pregnant" },
  { key: "Glucose",                  label: "Glucose",                   unit: "mg/dL", min: 50,   max: 250,  step: 1,     placeholder: "70–200",       tip: "Plasma glucose concentration (2hr oral glucose tolerance)" },
  { key: "BloodPressure",            label: "Blood Pressure",            unit: "mmHg",  min: 30,   max: 150,  step: 1,     placeholder: "60–120",       tip: "Diastolic blood pressure" },
  { key: "SkinThickness",            label: "Skin Thickness",            unit: "mm",    min: 0,    max: 100,  step: 1,     placeholder: "10–50",        tip: "Triceps skinfold thickness" },
  { key: "Insulin",                  label: "Insulin",                   unit: "μU/mL", min: 0,    max: 900,  step: 1,     placeholder: "0–300",        tip: "2-Hour serum insulin" },
  { key: "BMI",                      label: "BMI",                       unit: "kg/m²", min: 10,   max: 70,   step: 0.1,   placeholder: "18.5–45",      tip: "Body mass index" },
  { key: "DiabetesPedigreeFunction", label: "Diabetes Pedigree Function",unit: "",      min: 0.05, max: 2.5,  step: 0.001, placeholder: "0.07–2.42",    tip: "Genetic risk based on family history" },
  { key: "Age",                      label: "Age",                       unit: "yrs",   min: 18,   max: 100,  step: 1,     placeholder: "21–81",        tip: "Age in years" },
];

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

function RingGauge({ value, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value);
  const color = value > 0.65 ? "#ef4444" : value > 0.4 ? "#f59e0b" : "#22c55e";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ring-bg)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
    </svg>
  );
}

function ConfusionMatrix({ matrix }) {
  if (!matrix) return null;
  const [[tn, fp], [fn, tp]] = matrix;
  const total = tn + fp + fn + tp;
  const cells = [
    { label: "TN", value: tn, desc: "True Negative",  color: "#22c55e" },
    { label: "FP", value: fp, desc: "False Positive",  color: "#f59e0b" },
    { label: "FN", value: fn, desc: "False Negative",  color: "#f59e0b" },
    { label: "TP", value: tp, desc: "True Positive",   color: "#3b82f6" },
  ];
  return (
    <div className="cm-grid">
      {cells.map(c => (
        <div key={c.label} className="cm-cell" style={{ "--accent": c.color }}>
          <span className="cm-label">{c.label}</span>
          <span className="cm-value">{c.value}</span>
          <span className="cm-pct">{((c.value/total)*100).toFixed(1)}%</span>
          <span className="cm-desc">{c.desc}</span>
        </div>
      ))}
    </div>
  );
}

function MetricBar({ label, value }) {
  return (
    <div className="metric-bar">
      <div className="metric-label">
        <span>{label}</span>
        <span className="metric-val">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useTheme();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const resultRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/metrics`)
      .then(r => r.json())
      .then(setApiMetrics)
      .catch(() => {});
  }, []);

  const validate = () => {
    const errs = {};
    FIELDS.forEach(({ key, min, max, label }) => {
      const v = parseFloat(form[key]);
      if (form[key] === undefined || form[key] === "") {
        errs[key] = `${label} is required`;
      } else if (isNaN(v) || v < min || v > max) {
        errs[key] = `Must be ${min}–${max}`;
      }
    });
    return errs;
  };

  const handleChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n={...e}; delete n[key]; return n; });
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError("");
    setResult(null);

    const body = {};
    FIELDS.forEach(({ key }) => body[key] = parseFloat(form[key]));

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError((data.errors || [data.error]).join("; "));
      } else {
        setResult(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch {
      setApiError("Could not reach the API. Make sure the backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setForm({
      Pregnancies: "6", Glucose: "148", BloodPressure: "72",
      SkinThickness: "35", Insulin: "0", BMI: "33.6",
      DiabetesPedigreeFunction: "0.627", Age: "50"
    });
    setErrors({});
  };

  const rfMetrics = apiMetrics?.all_metrics?.["Random Forest"];
  const lrMetrics = apiMetrics?.all_metrics?.["Logistic Regression"];

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="var(--accent)" strokeWidth="2" />
              <path d="M10 16 C10 10 22 10 22 16 C22 22 10 22 10 16Z" fill="var(--accent)" opacity="0.2"/>
              <path d="M16 8 L16 24 M8 16 L24 16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="logo-text">GlucoSense<sup>AI</sup></span>
          </div>
          <nav className="nav-chips">
            <span className="chip">Diabetes Predictor</span>
            <span className="chip chip-outline">v2.0 · Random Forest</span>
          </nav>
          <button className="theme-btn" onClick={() => setDark(d => !d)} title="Toggle theme">
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="main">
        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-badge">🧬 AI-Powered Clinical Screening</div>
          <h1 className="hero-title">
            Diabetes Risk<br />
            <span className="gradient-text">Assessment</span>
          </h1>
          <p className="hero-sub">
            Enter patient vitals below. Our Random Forest model — trained on the PIMA Indians
            Diabetes Dataset — returns a clinical risk score in milliseconds.
          </p>
        </section>

        {/* ── Model Stats ── */}
        {apiMetrics && (
          <section className="stats-section">
            <div className="section-title">Model Performance</div>
            <div className="stats-grid">
              {[
                { label: "Model",     value: "Random Forest", sub: "Best Performer" },
                { label: "Accuracy",  value: `${((rfMetrics?.accuracy||0)*100).toFixed(1)}%`, sub: "Test Set" },
                { label: "F1 Score",  value: `${((rfMetrics?.f1||0)*100).toFixed(1)}%`, sub: "Harmonic Mean" },
                { label: "Precision", value: `${((rfMetrics?.precision||0)*100).toFixed(1)}%`, sub: "Positive Pred." },
                { label: "Recall",    value: `${((rfMetrics?.recall||0)*100).toFixed(1)}%`, sub: "Sensitivity" },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-val">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Form ── */}
        <section className="form-section">
          <div className="section-header">
            <div className="section-title">Patient Vitals</div>
            <button className="example-btn" onClick={loadExample}>Load Example</button>
          </div>

          <div className="form-grid">
            {FIELDS.map(({ key, label, unit, min, max, step, placeholder, tip }) => (
              <div key={key} className={`field-card ${errors[key] ? "field-error" : ""}`}>
                <label className="field-label">
                  {label}
                  {unit && <span className="field-unit">{unit}</span>}
                  <span className="field-tip" title={tip}>ⓘ</span>
                </label>
                <input
                  type="number"
                  className="field-input"
                  min={min} max={max} step={step}
                  placeholder={placeholder}
                  value={form[key] ?? ""}
                  onChange={e => handleChange(key, e.target.value)}
                />
                {errors[key] && <div className="error-msg">{errors[key]}</div>}
                <div className="field-range">{min} – {max}</div>
              </div>
            ))}
          </div>

          {apiError && (
            <div className="api-error">
              ⚠️ {apiError}
            </div>
          )}

          <button
            className={`predict-btn ${loading ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> Analyzing...</>
            ) : (
              <><span>⚡</span> Run Prediction</>
            )}
          </button>
        </section>

        {/* ── Result ── */}
        {result && (
          <section className="result-section" ref={resultRef}>
            <div className={`result-card ${result.diabetic ? "result-positive" : "result-negative"}`}>
              <div className="result-header">
                <div>
                  <div className="result-badge">
                    {result.diabetic ? "⚠️ Risk Detected" : "✅ Low Risk"}
                  </div>
                  <div className="result-diagnosis">{result.prediction}</div>
                  <div className="result-confidence">
                    Confidence: <strong>{result.confidence}</strong> ({(result.confidence_score * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="ring-wrapper">
                  <RingGauge value={result.probability} size={130} stroke={12} />
                  <div className="ring-label">
                    <div className="ring-pct">{(result.probability * 100).toFixed(0)}%</div>
                    <div className="ring-sub">Diabetes Risk</div>
                  </div>
                </div>
              </div>

              <div className="prob-bar-wrap">
                <div className="prob-bar-labels">
                  <span>Not Diabetic</span>
                  <span>Diabetic</span>
                </div>
                <div className="prob-track">
                  <div
                    className="prob-fill"
                    style={{ width: `${result.probability * 100}%` }}
                  />
                  <div className="prob-marker" style={{ left: `${result.probability * 100}%` }} />
                </div>
                <div className="prob-pcts">
                  <span>{((1 - result.probability) * 100).toFixed(1)}%</span>
                  <span>{(result.probability * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="result-meta">
                <div className="meta-item">
                  <span className="meta-key">Model</span>
                  <span className="meta-val">{result.model}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-key">Raw Score</span>
                  <span className="meta-val">{result.probability.toFixed(4)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-key">Decision</span>
                  <span className="meta-val">{result.probability >= 0.5 ? "Positive" : "Negative"}</span>
                </div>
              </div>

              <p className="result-disclaimer">
                ⚕️ This tool is for screening purposes only. Consult a licensed physician for medical advice.
              </p>
            </div>
          </section>
        )}

        {/* ── Model Comparison ── */}
        {apiMetrics && (
          <section className="compare-section">
            <div className="section-title">Model Comparison</div>
            <div className="compare-grid">
              {[
                { name: "Random Forest", m: rfMetrics, best: true },
                { name: "Logistic Regression", m: lrMetrics, best: false },
              ].map(({ name, m, best }) => (
                <div key={name} className={`compare-card ${best ? "compare-best" : ""}`}>
                  <div className="compare-header">
                    <span className="compare-name">{name}</span>
                    {best && <span className="best-badge">★ Best</span>}
                  </div>
                  {m && (
                    <>
                      <MetricBar label="Accuracy"  value={m.accuracy} />
                      <MetricBar label="Precision" value={m.precision} />
                      <MetricBar label="Recall"    value={m.recall} />
                      <MetricBar label="F1 Score"  value={m.f1} />
                    </>
                  )}
                  {best && m?.confusion_matrix && (
                    <>
                      <div className="cm-title">Confusion Matrix</div>
                      <ConfusionMatrix matrix={m.confusion_matrix} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Why RF ── */}
        <section className="why-section">
          <div className="section-title">Why Random Forest?</div>
          <div className="why-grid">
            {[
              { icon: "🌲", title: "Ensemble Strength", body: "Combines 200 decision trees, averaging predictions to reduce variance and prevent overfitting that plagues single-tree models." },
              { icon: "📊", title: "Feature Importance", body: "Natively ranks feature contributions — Glucose and BMI emerge as top predictors, aligning with clinical literature." },
              { icon: "⚖️", title: "Class Imbalance", body: "class_weight='balanced' compensates for the ~35% diabetic prevalence in the PIMA dataset automatically." },
              { icon: "🔁", title: "Non-Linear Patterns", body: "Captures complex interactions between Insulin, Glucose, and Age that logistic regression misses with linear boundaries." },
            ].map(w => (
              <div key={w.title} className="why-card">
                <div className="why-icon">{w.icon}</div>
                <div className="why-title">{w.title}</div>
                <div className="why-body">{w.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── API Docs ── */}
        <section className="api-section">
          <div className="section-title">Sample API Request</div>
          <pre className="code-block">{`# POST /predict
curl -X POST http://localhost:5000/predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "Pregnancies": 6,
    "Glucose": 148,
    "BloodPressure": 72,
    "SkinThickness": 35,
    "Insulin": 0,
    "BMI": 33.6,
    "DiabetesPedigreeFunction": 0.627,
    "Age": 50
  }'

# Response
{
  "prediction": "Diabetic",
  "diabetic": true,
  "probability": 0.7850,
  "confidence": "High",
  "confidence_score": 0.7850,
  "model": "Random Forest"
}`}</pre>
        </section>
      </main>

      <footer className="footer">
        <span>GlucoSense AI · Built with Random Forest + Flask + React</span>
        <span>PIMA Indians Diabetes Dataset · For Educational Use</span>
      </footer>

      <style>{`
        /* ── CSS Variables ── */
        :root { color-scheme: dark; }
        [data-theme="dark"] {
          --bg: #0a0c10;
          --surface: #111318;
          --surface2: #1a1d24;
          --border: rgba(255,255,255,0.08);
          --text: #e8eaf0;
          --text-muted: #6b7280;
          --accent: #38bdf8;
          --accent2: #818cf8;
          --ring-bg: rgba(255,255,255,0.07);
          --code-bg: #0d1117;
        }
        [data-theme="light"] {
          --bg: #f0f4f8;
          --surface: #ffffff;
          --surface2: #f8fafc;
          --border: rgba(0,0,0,0.08);
          --text: #1a1d24;
          --text-muted: #64748b;
          --accent: #0284c7;
          --accent2: #6366f1;
          --ring-bg: rgba(0,0,0,0.07);
          --code-bg: #1e293b;
        }

        /* ── Reset & Base ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height: 1.6;
          min-height: 100vh;
        }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

        /* ── Header ── */
        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10,12,16,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        [data-theme="light"] .header { background: rgba(240,244,248,0.9); }
        .header-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 14px 24px;
          display: flex; align-items: center; gap: 16px;
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.15rem; font-weight: 700;
          color: var(--text);
        }
        .logo-text sup { color: var(--accent); font-size: 0.55rem; }
        .nav-chips { display: flex; gap: 8px; margin-left: auto; }
        .chip {
          padding: 4px 12px; border-radius: 20px;
          background: var(--accent); color: #fff;
          font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;
        }
        .chip-outline {
          background: transparent; color: var(--text-muted);
          border: 1px solid var(--border);
        }
        .theme-btn {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 6px 10px;
          cursor: pointer; font-size: 1rem;
          transition: background 0.2s;
        }
        .theme-btn:hover { background: var(--border); }

        /* ── Main ── */
        .main { max-width: 1200px; margin: 0 auto; padding: 40px 24px 80px; }

        /* ── Hero ── */
        .hero { text-align: center; padding: 60px 0 40px; }
        .hero-badge {
          display: inline-block;
          background: rgba(56,189,248,0.1); color: var(--accent);
          border: 1px solid rgba(56,189,248,0.25);
          border-radius: 20px; padding: 6px 16px;
          font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em;
          margin-bottom: 20px;
        }
        .hero-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 700; line-height: 1.1; margin-bottom: 18px;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          max-width: 560px; margin: 0 auto;
          color: var(--text-muted); font-size: 1.05rem;
        }

        /* ── Section ── */
        .section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.25rem; font-weight: 700;
          margin-bottom: 20px; color: var(--text);
        }
        .section-header {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 20px;
        }
        .section-header .section-title { margin-bottom: 0; }

        /* ── Stats ── */
        .stats-section { margin-bottom: 48px; }
        .stats-grid { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-card {
          flex: 1; min-width: 120px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 20px;
          text-align: center; transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-val {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.6rem; font-weight: 700; color: var(--accent);
          line-height: 1;
        }
        .stat-label { font-size: 0.8rem; font-weight: 600; margin: 6px 0 2px; }
        .stat-sub { font-size: 0.72rem; color: var(--text-muted); }

        /* ── Form ── */
        .form-section { margin-bottom: 48px; }
        .example-btn {
          background: transparent; border: 1px solid var(--accent);
          color: var(--accent); border-radius: 8px; padding: 6px 14px;
          font-size: 0.82rem; cursor: pointer; transition: background 0.2s;
        }
        .example-btn:hover { background: rgba(56,189,248,0.1); }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px; margin-bottom: 24px;
        }
        .field-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 16px;
          transition: border-color 0.2s;
        }
        .field-card:focus-within { border-color: var(--accent); }
        .field-card.field-error { border-color: #ef4444; }
        .field-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem; font-weight: 600; color: var(--text-muted);
          margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .field-unit {
          font-size: 0.68rem; background: var(--surface2);
          padding: 1px 6px; border-radius: 4px; color: var(--accent);
        }
        .field-tip { cursor: help; color: var(--text-muted); font-size: 0.75rem; margin-left: auto; }
        .field-input {
          width: 100%; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 12px;
          color: var(--text); font-size: 1rem; font-weight: 500;
          outline: none; transition: border-color 0.2s;
          -moz-appearance: textfield;
        }
        .field-input::-webkit-outer-spin-button,
        .field-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .field-input:focus { border-color: var(--accent); }
        .field-range { font-size: 0.68rem; color: var(--text-muted); margin-top: 6px; }
        .error-msg { font-size: 0.72rem; color: #ef4444; margin-top: 4px; }

        .api-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px; padding: 12px 16px;
          color: #ef4444; font-size: 0.88rem; margin-bottom: 16px;
        }

        .predict-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff; border: none; border-radius: 14px;
          font-size: 1.05rem; font-weight: 700; cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          letter-spacing: 0.02em;
        }
        .predict-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .predict-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.8s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Result ── */
        .result-section { margin-bottom: 48px; }
        .result-card {
          border-radius: 20px; padding: 32px;
          border: 1px solid var(--border);
          animation: slideUp 0.5s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .result-positive { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.25); }
        .result-negative { background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.25); }
        .result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
        .result-badge {
          font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em;
          margin-bottom: 8px; color: var(--text-muted);
        }
        .result-diagnosis {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 2rem; font-weight: 700; margin-bottom: 8px;
        }
        .result-positive .result-diagnosis { color: #ef4444; }
        .result-negative .result-diagnosis { color: #22c55e; }
        .result-confidence { font-size: 0.9rem; color: var(--text-muted); }

        .ring-wrapper { position: relative; width: 130px; height: 130px; }
        .ring-wrapper svg { position: absolute; top: 0; left: 0; }
        .ring-label {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .ring-pct { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700; }
        .ring-sub { font-size: 0.6rem; color: var(--text-muted); text-align: center; }

        /* Probability bar */
        .prob-bar-wrap { margin-bottom: 24px; }
        .prob-bar-labels { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; }
        .prob-track {
          height: 10px; background: var(--surface2); border-radius: 10px;
          position: relative; overflow: visible;
        }
        .prob-fill {
          height: 100%; border-radius: 10px;
          background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
          transition: width 1.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .prob-marker {
          position: absolute; top: 50%; transform: translate(-50%, -50%);
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--bg); border: 3px solid var(--text);
          transition: left 1.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .prob-pcts { display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 8px; }

        .result-meta {
          display: flex; gap: 24px; flex-wrap: wrap;
          padding: 16px; background: var(--surface2);
          border-radius: 12px; margin-bottom: 16px;
        }
        .meta-item { display: flex; flex-direction: column; gap: 2px; }
        .meta-key { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-val { font-size: 0.95rem; font-weight: 600; }
        .result-disclaimer { font-size: 0.78rem; color: var(--text-muted); }

        /* ── Compare ── */
        .compare-section { margin-bottom: 48px; }
        .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 640px) { .compare-grid { grid-template-columns: 1fr; } }
        .compare-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 24px;
        }
        .compare-best { border-color: var(--accent); }
        .compare-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .compare-name { font-family: 'Space Grotesk', sans-serif; font-weight: 600; }
        .best-badge {
          background: var(--accent); color: #fff;
          font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
        }

        .metric-bar { margin-bottom: 12px; }
        .metric-label { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 5px; }
        .metric-val { font-weight: 700; color: var(--accent); }
        .bar-track { height: 6px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 4px; transition: width 1s ease; }

        /* Confusion Matrix */
        .cm-title { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
        .cm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .cm-cell {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px; text-align: center;
          border-left: 3px solid var(--accent, #38bdf8);
        }
        .cm-label { display: block; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; }
        .cm-value { display: block; font-size: 1.4rem; font-weight: 700; }
        .cm-pct { display: block; font-size: 0.72rem; color: var(--text-muted); }
        .cm-desc { display: block; font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }

        /* ── Why ── */
        .why-section { margin-bottom: 48px; }
        .why-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .why-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 20px;
          transition: transform 0.2s;
        }
        .why-card:hover { transform: translateY(-3px); }
        .why-icon { font-size: 1.8rem; margin-bottom: 10px; }
        .why-title { font-weight: 700; margin-bottom: 6px; }
        .why-body { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }

        /* ── API ── */
        .api-section { margin-bottom: 48px; }
        .code-block {
          background: var(--code-bg); color: #e2e8f0;
          border-radius: 14px; padding: 24px;
          font-size: 0.82rem; line-height: 1.7;
          overflow-x: auto; font-family: 'JetBrains Mono', 'Fira Code', monospace;
          border: 1px solid var(--border);
        }

        /* ── Footer ── */
        .footer {
          text-align: center; padding: 24px;
          border-top: 1px solid var(--border);
          color: var(--text-muted); font-size: 0.8rem;
          display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;
        }
      `}</style>
    </>
  );
}
