import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const LANGUAGES = [
  // Web
  "javascript", "typescript", "html", "css", "scss",
  // Backend
  "python", "java", "csharp", "go", "rust", "ruby",
  "php", "swift", "kotlin", "scala", "elixir", "haskell",
  // Systems
  "c", "cpp",
  // Data / ML
  "r", "julia", "sql",
  // Shell / DevOps
  "bash", "shell", "powershell", "dockerfile",
  // Config / Markup
  "json", "yaml", "toml", "xml", "markdown",
  // Mobile
  "dart", "objectivec",
  // Other
  "perl", "lua", "groovy", "matlab", "cobol",
  "fortran", "assembly", "solidity", "graphql"
];

export default function Rooms({ user, onLogout }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [language, setLanguage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [joining, setJoining] = useState(false);
  const btnRef = useRef(null);
  const popoverRef = useRef(null);
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };
  // ── Fetch rooms ────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/rooms/`, { withCredentials: true });
      setRooms(res.data);
    } catch (e) {
      console.error("Failed to fetch rooms", e);
    }
    setLoading(false);
  }, [user.token]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ── Close popover on Escape or outside click ───────────────────────────────
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setShowPopover(false); };
    const handleClick = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setShowPopover(false);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
    };
  }, []);

  // ── Language autocomplete ──────────────────────────────────────────────────
  const handleLanguageInput = (val) => {
    setLanguage(val);
    setSuggestions(val.length === 0 ? [] : LANGUAGES.filter(l => l.startsWith(val.toLowerCase())));
  };

  // ── Create room ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!roomName || !language) { setError("Please fill in all fields"); return; }
    setCreating(true);
    setError("");
    try {
      await axios.post(`${API_URL}/rooms/create`,
          { name: roomName, language: language.toLowerCase() },
          { withCredentials: true }
        );
      setShowPopover(false);
      setRoomName("");
      setLanguage("");
      await fetchRooms();
      setShowPopover(false);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to create room");
    }
    setCreating(false);
  };

  // ── Join by token ──────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!shareToken) return;
    setJoining(true);
    try {
      const res = await axios.get(`${API_URL}/rooms/join/${shareToken}`);
      navigate(`/rooms/${res.data.room_id}`);
    } catch (e) {
      showToast("Invalid or expired share token");
    }
    setJoining(false);
  };
  const handleResetToken = async (roomId) => {
  if (!window.confirm("Reset share link? Old link will stop working.")) return;
  try {
    await axios.post(`${API_URL}/rooms/${roomId}/reset-token`, {}, {
      withCredentials: true
    });
    fetchRooms(); // ← refreshes cards with new token
  } catch (e) {
    showToast("Failed to reset token");
  }
};
  const handleDelete = async (roomId) => {
  if (!window.confirm("Delete this room?")) return;
  try {
    await axios.delete(`${API_URL}/rooms/${roomId}`, {
      withCredentials: true
    });
    fetchRooms();
  } catch (e) {
    showToast("Failed to delete room");
  }
};
  const copyLink = (token) => {
  navigator.clipboard.writeText(token);
  showToast("Share token copied!");
};

  return (
    <div style={s.page}>
      <div style={s.overlay} />
      {/* Toast */}
    {toast && (
      <div style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        background: "rgba(57,211,83,0.15)",
        border: "1px solid rgba(57,211,83,0.3)",
        color: "#39d353",
        padding: "0.6rem 1.2rem",
        borderRadius: "8px",
        fontSize: "0.82rem",
        fontFamily: "inherit",
        backdropFilter: "blur(12px)",
        zIndex: 100,
      }}>
        {toast}
      </div>
    )}

      <Navbar user={user} onLogout={onLogout} />

      <main style={s.main}>
        {/* Header row */}
        <div style={s.headerRow}>
          <div>
            <h1 style={s.title}>Your Rooms</h1>
            <p style={s.subtitle}>{rooms.length} room{rooms.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Popover anchor */}
          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              style={s.createBtn}
              onClick={() => { setShowPopover(v => !v); setError(""); }}
            >
              {showPopover ? "✕ Close" : "+ New Room"}
            </button>

            {/* Popover */}
            {showPopover && (
              <div ref={popoverRef} style={s.popover}>
                {/* Notch */}
                <div style={s.notch} />

                <p style={s.popoverTitle}>Create a room</p>

                {error && <div style={s.popoverError}>{error}</div>}

                <div style={s.fieldWrap}>
                  <label style={s.label}>Room name</label>
                  <input
                    style={s.input}
                    placeholder="e.g. Backend review"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ ...s.fieldWrap, position: "relative" }}>
                  <label style={s.label}>Language</label>
                  <input
                    style={s.input}
                    placeholder="Type to search..."
                    value={language}
                    onChange={e => handleLanguageInput(e.target.value)}
                    autoComplete="off"
                  />
                  {suggestions.length > 0 && (
                    <div style={s.suggestions}>
                      {suggestions.map(lang => (
                        <div
                          key={lang}
                          style={s.suggestion}
                          onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.08)"}
                          onMouseLeave={e => e.target.style.background = "transparent"}
                          onClick={() => { setLanguage(lang); setSuggestions([]); }}
                        >
                          {lang}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={s.popoverActions}>
                  <button style={s.cancelBtn} onClick={() => setShowPopover(false)}>
                    Cancel
                  </button>
                  <button
                    style={{ ...s.submitBtn, opacity: creating ? 0.7 : 1 }}
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Join by token */}
        <div style={s.joinRow}>
          <input
            style={s.joinInput}
            placeholder="Paste a share token to join a room..."
            value={shareToken}
            onChange={e => setShareToken(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
          />
          <button style={s.joinBtn} onClick={handleJoin} disabled={joining}>
            {joining ? "Joining..." : "Join"}
          </button>
        </div>

        {/* Rooms grid */}
        {loading ? (
          <p style={s.empty}>Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <div style={s.emptyState}>
            <p style={s.emptyTitle}>No rooms yet</p>
            <p style={s.emptyText}>Create your first room to start reviewing code</p>
          </div>
        ) : (
          <div style={s.grid}>
            {rooms.map(room => (
              <div key={room.id} style={s.card}>
                <div style={s.cardTop}>
                  <span style={s.cardName}>{room.name}</span>
                  <span style={s.langBadge}>{room.language}</span>
                </div>
                <p style={s.cardDate}>
                  Created {new Date(room.created_at).toLocaleDateString()}
                </p>
                <div style={s.cardActions}>
                  <button style={s.openBtn} onClick={() => navigate(`/rooms/${room.id}`)}>
                    Open
                  </button>
                  <button style={s.copyBtn} onClick={() => copyLink(room.share_token)}>
                    Copy Token
                  </button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(room.id)} >
                        Delete
                    </button>
                    <button style={s.resetBtn} onClick={() => handleResetToken(room.id)}>
                        Reset Token
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/room_bg.png')", 
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    position: "relative",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.8) 100%)",
    zIndex: 1,
    pointerEvents: "none",
  },
  main: {
    position: "relative",
    zIndex: 2,
    maxWidth: "900px",
    margin: "0 auto",
    padding: "7rem 2rem 4rem",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
  },
  title: {
    color: "#E64D91",
    fontSize: "2rem",
    fontWeight: 900,
    margin: 0,
    fontFamily: "'Georgia', serif",
    letterSpacing: "-0.03em",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: "0.8rem",
    margin: "0.3rem 0 0",
  },
  createBtn: {
    padding: "0.8rem 2rem",
    background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(80,40,255,0.7) 25%, rgba(60,20,220,0.8) 50%, rgba(180,0,255,0.5) 75%, rgba(255,255,255,0.1) 100%)",
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

  // ── Popover ──
  popover: {
    position: "absolute",
    top: "calc(100% + 12px)",
    right: 0,
    width: "320px",
    background: "rgba(13,17,23,0.95)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "1.25rem",
    zIndex: 50,
    boxShadow: "0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
    animation: "fadeSlideDown 0.18s ease",
  },
  notch: {
    position: "absolute",
    top: "-6px",
    right: "20px",
    width: "12px",
    height: "12px",
    background: "rgba(13,17,23,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderBottom: "none",
    borderRight: "none",
    transform: "rotate(45deg)",
  },
  popoverTitle: {
    color: "#e6edf3",
    fontSize: "0.95rem",
    fontWeight: 700,
    margin: 0,
    marginBottom: "1rem",
  },
  popoverError: {
    background: "#1a0f0f",
    border: "1px solid #f85149",
    color: "#f85149",
    padding: "0.6rem 0.75rem",
    borderRadius: "6px",
    fontSize: "0.78rem",
    marginBottom: "0.75rem",
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    marginBottom: "0.85rem",
  },
  label: {
    color: "#8b949e",
    fontSize: "0.7rem",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "7px",
    padding: "0.6rem 0.85rem",
    color: "#e6edf3",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  suggestions: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "rgba(13,17,23,0.98)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "7px",
    zIndex: 60,
    overflow: "hidden",
    marginTop: "2px",
  },
  suggestion: {
    padding: "0.5rem 0.85rem",
    color: "#8b949e",
    fontSize: "0.82rem",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  popoverActions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "1rem",
  },
  cancelBtn: {
    flex: 1,
    padding: "0.6rem",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "7px",
    color: "#8b949e",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  submitBtn: {
    flex: 1,
    padding: "0.8rem 2rem",
    background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(80,40,255,0.7) 25%, rgba(60,20,220,0.8) 50%, rgba(180,0,255,0.5) 75%, rgba(255,255,255,0.1) 100%)",
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

  // Join row
  joinRow: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "2.5rem",
  },
  joinInput: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "0.7rem 1rem",
    color: "#e6edf3",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    outline: "none",
  },
  joinBtn: {
    padding: "0.7rem 1.5rem",
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    color: "#e6edf3",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // Grid
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1.25rem",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: "#e6edf3",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  langBadge: {
    background: "rgba(110,64,201,0.25)",
    border: "1px solid rgba(110,64,201,0.4)",
    color: "#b392f0",
    fontSize: "0.7rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
    fontWeight: 600,
  },
  cardDate: {
    color: "#484f58",
    fontSize: "0.75rem",
    margin: 0,
  },
  cardActions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.25rem",
  },
  openBtn: {
    flex: 1,
    padding: "0.5rem",
    background: "rgba(30,80,255,0.2)",
    border: "1px solid rgba(30,80,255,0.3)",
    borderRadius: "6px",
    color: "#79c0ff",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  deleteBtn: {
  flex: 1,
  padding: "0.5rem",
  background: "rgba(248,81,73,0.1)",
  border: "1px solid rgba(248,81,73,0.25)",
  borderRadius: "6px",
  color: "#f85149",
  fontSize: "0.8rem",
  cursor: "pointer",
  fontFamily: "inherit",
},
    resetBtn: {
  flex: 1,
  padding: "0.5rem",
  background: "rgba(210,153,34,0.1)",
  border: "1px solid rgba(210,153,34,0.25)",
  borderRadius: "6px",
  color: "#e3b341",
  fontSize: "0.8rem",
  cursor: "pointer",
  fontFamily: "inherit",
},
  copyBtn: {
    flex: 1,
    padding: "0.5rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#8b949e",
    fontSize: "0.8rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  emptyState: {
    textAlign: "center",
    padding: "5rem 0",
  },
  emptyTitle: {
    color: "#e6edf3",
    fontSize: "1.2rem",
    fontWeight: 700,
    margin: 0,
    marginBottom: "0.5rem",
  },
  emptyText: {
    color: "#8b949e",
    fontSize: "0.85rem",
    margin: 0,
  },
  empty: { color: "#8b949e", textAlign: "center", padding: "4rem 0" },
};