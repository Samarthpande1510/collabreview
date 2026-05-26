import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function Home({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.overlay} />
      <Navbar user={user} onLogout={onLogout} />

      <main style={s.hero}>
        <p style={s.tagline}>Review · Collaborate · Build</p>
        <h1 style={s.heading}>CollabReview</h1>

        <div style={s.noteCard}>
          <p style={s.noteText}>
            Hi everyone, this is <b>CollabReview</b>, the much needed online code reviewing platform. I made this app with the sheer 
            goal of eliminating the need for scramblin through 10 different websites, just to be able to review/edit code together.
            It's a problem I have been facing for ages and I have been trying to turn it into a reality for the past few months. This project is really close
            to my heart and I am grateful to see it in its glory, hopefully making an impact on your life as well. 
          </p>
        </div>

        <div style={s.ctaRow}>
          <button style={s.ctaPrimary} onClick={() => navigate("/rooms")}>
            Start reviewing
          </button>
          <button style={s.ctaPrimary} onClick={() => navigate("/editor")}>
            Try the editor
          </button>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/website_bg.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%)",
    zIndex: 1,
    pointerEvents: "none",
  },
  hero: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "8rem 2.5rem 4rem",
    maxWidth: "680px",
  },
  tagline: {
    color: "#8b949e",
    fontSize: "0.78rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    margin: 0,
    marginBottom: "1.25rem",
  },
  heading: {
    color: "#e6edf3",
    fontSize: "clamp(3.5rem, 10vw, 7rem)",
    fontWeight: 900,
    margin: 0,
    marginBottom: "2rem",
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontFamily: "'Georgia', 'Times New Roman', serif",
    textShadow: "0 4px 40px rgba(220,80,180,0.25)",
  },
  noteCard: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "1.25rem 1.5rem",
    marginBottom: "2.5rem",
    maxWidth: "520px",
  },
  noteText: {
    color: "#8b949e",
    fontSize: "0.875rem",
    lineHeight: 1.8,
    margin: 0,
  },
  ctaRow: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  ctaPrimary: {
    padding: "0.8rem 2rem",
    background: "linear-gradient(135deg, rgba(12, 8, 12, 1) 0%, rgba(165, 30, 95, 0.35) 35%, rgba(195, 105, 70, 0.4) 65%, rgba(135, 25, 75, 0.3) 85%, rgba(6, 4, 6, 1) 100%)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.04em",
    boxShadow: "0 0 32px rgba(80,40,255,0.6), 0 0 8px rgba(220,0,255,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.3)",
    textShadow: "0 1px 4px rgba(0,0,0,0.4)",
    
  },
  ctaSecondary: {
    padding: "0.8rem 2rem",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#e6edf3",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.04em",
  },
};