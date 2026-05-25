import { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await axios.post(`${API_URL}/auth/signup`, { email, password, name });
        setMode("login");
        setError("Account created. Sign in to continue.");
      } else {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        const token = res.data.token;
        const userId = String(res.data.user_id);
        localStorage.setItem("cr_token", token);
        localStorage.setItem("cr_user_id", userId);
        onLogin(token, userId);
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      {/* Left Panel */}
      <div style={s.left}>
        <div style={s.imageBg} />
        <div style={s.grainLayer} />
        <div style={s.vignette} />
        <div style={s.leftText}>
          <p style={s.leftTagline}>Real Time Code Review</p>
          <p style={s.leftSub}>Share, annotate and enjoy this journey with us!</p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={s.right}>
        <div style={s.formWrap}>
          <div style={s.formHeader}>
            <h1 style={s.formTitle}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={s.formSubtitle}>
              {mode === "login"
                ? "Sign in to your workspace"
                : "Start reviewing code with your team"}
            </p>
          </div>

          {error && (
            <div style={{
              ...s.errorBox,
              background: error.includes("created") ? "#0f2a1a" : "#1a0f0f",
              borderColor: error.includes("created") ? "#2ea043" : "#f85149",
              color: error.includes("created") ? "#2ea043" : "#f85149",
            }}>
              {error}
            </div>
          )}

          <div style={s.fields}>
            {mode === "signup" && (
              <div style={s.fieldWrap}>
                <label style={s.label}>Display name</label>
                <input
                  style={{
                    ...s.input,
                    borderColor: focusedField === "name" ? "#6e40c9" : "#30363d",
                    boxShadow: focusedField === "name" ? "0 0 0 3px rgba(110,64,201,0.15)" : "none",
                  }}
                  placeholder="How should we call you?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            )}
            <div style={s.fieldWrap}>
              <label style={s.label}>Email address</label>
              <input
                style={{
                  ...s.input,
                  borderColor: focusedField === "email" ? "#ff0000" : "#30363d",
                  boxShadow: focusedField === "email" ? "0 0 0 3px rgba(110,64,201,0.15)" : "none",
                }}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div style={s.fieldWrap}>
              <label style={s.label}>Password</label>
              <input
                style={{
                  ...s.input,
                  borderColor: focusedField === "password" ? "#ff0000" : "#30363d",
                  boxShadow: focusedField === "password" ? "0 0 0 3px rgba(110,64,201,0.15)" : "none",
                }}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          <button
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
            onMouseEnter={e => !loading && (e.target.style.boxShadow = "0 0 48px rgba(30,80,255,0.85), 0 0 20px rgba(200,80,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)")}
            onMouseLeave={e => !loading && (e.target.style.boxShadow = "0 0 28px rgba(30,80,255,0.55), 0 0 10px rgba(200,80,0,0.3), inset 0 1px 0 rgba(255,255,255,0.45)")}         
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine} />
          </div>

          <p style={s.toggle}>
            {mode === "login" ? "Don't have an account? " : "Already have one? "}
            <span
              style={s.link}
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
 page: {
  display: "flex",
  minHeight: "100vh",
  background: "rgba(13, 17, 23, 0.75)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  overflow: "hidden",
},
  
  left: {
    flex: "0 0 55%",
    position: "relative",
    overflow: "hidden",
  },
  imageBg: {
    position: "absolute",
    inset: 0,
    backgroundImage: `url('/space-bg.jpg')`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    filter: "brightness(0.7) contrast(1.15) saturate(1.2)",
  },
  grainLayer: {
    position: "absolute",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E")`,
    backgroundRepeat: "repeat",
    backgroundSize: "200px 200px",
    mixBlendMode: "overlay",
    pointerEvents: "none",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to right, rgba(0,0,0,0.2) 40%, #0d1117 100%)",
    pointerEvents: "none",
  },
  leftText: {
    position: "absolute",
    bottom: "2.5rem",
    left: "2.5rem",
    right: "2rem",
    zIndex: 2,
  },
  leftTagline: {
    color: "#e6edf3",
    fontSize: "1.3rem",
    fontWeight: 700,
    margin: 0,
    marginBottom: "0.5rem",
    letterSpacing: "-0.02em",
    textShadow: "0 2px 16px rgba(0,0,0,0.9)",
  },
  leftSub: {
    color: "#8b949e",
    fontSize: "0.8rem",
    margin: 0,
    lineHeight: 1.7,
    textShadow: "0 1px 8px rgba(0,0,0,0.9)",
  },
  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  formWrap: { width: "100%", maxWidth: "380px" },
  formHeader: { marginBottom: "2rem" },
  formTitle: {
    color: "#e6edf3",
    fontSize: "2.5rem",
    display: "flex",
    justifyContent: "center",
    fontWeight: 700,
    margin: 0,
    marginBottom: "0.4rem",
    letterSpacing: "-0.03em",
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  formSubtitle: {
    color: "#8b949e",
    fontSize: "1.0 rem",
    display: "flex",
    justifyContent: "center",
    margin: 0,
    lineHeight: 1.6,
  },
  errorBox: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "0.8rem",
    marginBottom: "1.25rem",
    lineHeight: 1.5,
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  fieldWrap: { display: "flex", flexDirection: "column", gap: "6px" },
  label: {
    color: "#8b949e",
    fontSize: "0.72rem",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    background: "#161b22",
    border: "1px solid",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#e6edf3",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  btn: {
  width: "100%",
  padding: "0.85rem",
  background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(80,40,255,0.7) 25%, rgba(60,20,220,0.8) 50%, rgba(180,0,255,0.5) 75%, rgba(255,255,255,0.1) 100%)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "10px",
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "0.04em",
  marginBottom: "1.25rem",
  boxShadow: "0 0 32px rgba(80,40,255,0.6), 0 0 8px rgba(220,0,255,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.3)",
  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
  transition: "all 0.2s ease",
},
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.25rem",
  },
  dividerLine: { flex: 1, height: "1px", background: "#21262d" },
  dividerText: { color: "#484f58", fontSize: "0.75rem" },
  toggle: { textAlign: "center", color: "#8b949e", fontSize: "0.85rem", margin: 0 },
  link: { color: "#6e40c9", cursor: "pointer", fontWeight: 600 },
};