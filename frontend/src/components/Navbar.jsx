import { useNavigate } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <nav style={s.nav}>
      <span style={s.brand} onClick={() => navigate("/")}>CollabReview</span>
      <div style={s.links}>
        <span style={s.link} onClick={() => navigate("/rooms")}>Rooms</span>
        <span style={s.link} onClick={() => navigate("/editor")}>Try Editor</span>
      </div>
      <div style={s.right}>
        {user?.name && <span style={s.greet}>Hi, {user.name}</span>}
        <span style={s.logout} onClick={onLogout}>Sign out</span>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 2.5rem",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  brand: {
    color: "#CBC09F ",
    fontWeight: 700,
    fontSize: "1rem",
    letterSpacing: "0.05em",
    cursor: "pointer",
    userSelect: "none",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "2rem",
  },
  link: {
    color: "#E64D91",
    fontSize: "0.85rem",
    cursor: "pointer",
    letterSpacing: "0.03em",
    transition: "color 0.15s",
    userSelect: "none",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
  },
  greet: {
    color: "#D96544",
    fontSize: "0.85rem",
    letterSpacing: "0.03em",
  },
  logout: {
    color: "#f85149",
    border: "1px solid rgba(248,81,73,0.3)",
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    background: "rgba(248,81,73,0.08)",
    fontSize: "0.85rem",
    cursor: "pointer",
    userSelect: "none",
  },
};