import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate} from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";



const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Room({ user, onLogout }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
const showToast = (msg) => {
  setToast(msg);
  setTimeout(() => setToast(""), 2000);
};

  const [showShare, setShowShare] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const shareBtnRef = useRef(null);
  const sharePopoverRef = useRef(null);
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [online, setOnline] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentLine, setCommentLine] = useState("");
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const wsRef = useRef(null);
  const saveTimer = useRef(null);

  // ── fetchComments FIRST before any useEffect that uses it ─────────────────
  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/comments/room/${roomId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setComments(res.data);
    } catch (e) {
      console.error("Failed to fetch comments", e);
    }
  }, [roomId, user.token]);

  // ── Fetch room ─────────────────────────────────────────────────────────────
 useEffect(() => {
  const fetchRoom = async () => {
    try {
      const res = await axios.get(`${API_URL}/rooms/info/${roomId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setRoom(res.data);
      setCode(res.data.code_content || "# Start coding here...");
      setCanEdit(
        res.data.owner_id === parseInt(user.userId) ||
        res.data.share_mode === "editor"
      );
    } catch (e) {
      navigate("/rooms");
    }
    setLoading(false);
  };
  fetchRoom();
}, [roomId, user, navigate]);

  // ── Fetch comments on mount ────────────────────────────────────────────────
  useEffect(() => { fetchComments(); }, [fetchComments]);

 useEffect(() => {
  const handleClick = (e) => {
    if (
      sharePopoverRef.current && !sharePopoverRef.current.contains(e.target) &&
      shareBtnRef.current && !shareBtnRef.current.contains(e.target)
    ) setShowShare(false);
  };
  window.addEventListener("mousedown", handleClick);
  return () => window.removeEventListener("mousedown", handleClick);
}, []);
  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let ws;
    const timer = setTimeout(() => {
      ws = new WebSocket(
        `ws://${window.location.hostname}:8000/ws/${roomId}?token=${user.token}`
      );
      wsRef.current = ws;

      ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  if (msg.type === "presence_list") {
    // Full list of who's already online — set directly
    setOnline(msg.users.map(name => ({ name })));
  }

  if (msg.type === "presence") {
    setOnline(prev => {
      if (msg.event === "joined") {
        if (prev.find(u => u.name === msg.name)) return prev;
        return [...prev, { name: msg.name }];
      } else {
        return prev.filter(u => u.name !== msg.name);
      }
    });
  }

  if (msg.type === "comment") {
    fetchComments();
  }
};

      ws.onclose = () => console.log("WebSocket closed");
    }, 100);

    return () => {
      clearTimeout(timer);
      ws?.close();
    };
  }, [roomId, user.token, fetchComments]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const handleCodeChange = (value) => {
    setCode(value);
    if (!canEdit) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await axios.patch(`${API_URL}/rooms/${roomId}/code`,
          { code_content: value },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (e) {
        console.error("Auto-save failed", e);
      }
      setSaving(false);
    }, 1000);
  };
    const handleResetToken = async (mode) => {
  setShareLoading(true);
  try {
    const res = await axios.post(
      `${API_URL}/rooms/${roomId}/reset-token`,
      { share_mode: mode },
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    setRoom(prev => ({ ...prev, share_token: res.data.share_token, share_mode: res.data.share_mode }));
    showToast(`New ${mode} link generated!`);
  } catch (e) {
    showToast("Failed to reset token");
  }
  setShareLoading(false);
};
  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const extensions = {
      python: "py", javascript: "js", typescript: "ts",
      java: "java", c: "c", cpp: "cpp", csharp: "cs",
      go: "go", rust: "rs", ruby: "rb", php: "php",
      swift: "swift", kotlin: "kt", sql: "sql", bash: "sh",
      html: "html", css: "css", markdown: "md"
    };
    const ext = extensions[room?.language] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${room?.name || "code"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Add comment ────────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!commentLine || !commentText) return;
    setAddingComment(true);
    try {
      await axios.post(`${API_URL}/comments/${roomId}`,
        { line_number: parseInt(commentLine), content: commentText },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setCommentLine("");
      setCommentText("");
      await fetchComments();
    } catch (e) {
      console.error("Failed to add comment", e);
    }
    setAddingComment(false);
  };

  // ── Delete comment ─────────────────────────────────────────────────────────
  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API_URL}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      await fetchComments();
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  };

  const handleEditorWillMount = (monaco) => {
  monaco.editor.defineTheme("collabreview-dark-trans", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", background: "00000000" }
    ],
    colors: {
      "editor.background": "#00000000",
      "editorGutter.background": "#00000000",
      "editor.lineHighlightBackground": "#ffffff0a",
    },
  });
};

  if (loading) return <div style={s.loadingPage}>Loading room...</div>;

  return (
    <div style={s.page}>
      <div style={s.overlay} />
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
    backdropFilter: "blur(12px)",
    zIndex: 100,
    fontFamily: "inherit",
  }}>
    {toast}
  </div>
)}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <span style={s.roomName}>{room?.name}</span>
          <span style={s.langBadge}>{room?.language}</span>
          {saving && <span style={s.savingText}>saving...</span>}
          {!saving && canEdit && <span style={s.savedText}>saved</span>}
          {!canEdit && <span style={s.readOnlyText}>read-only</span>}
        </div>
        <div style={s.topRight}>
          <div style={s.presence}>
            {online.map((u, i) => (
              <div key={i} style={s.avatar} title={u.name}>
                {u.name[0].toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ position: "relative" }}>
  <button
    ref={shareBtnRef}
    style={s.topBtn}
    onClick={() => setShowShare(v => !v)}
  >
    Share
  </button>

  {showShare && (
    <div ref={sharePopoverRef} style={s.sharePopover}>
      <div style={s.shareNotch} />
      <p style={s.shareTitle}>Share room</p>

      <div style={s.shareTokenRow}>
        <span style={s.shareToken}>{room?.share_token}</span>
        <button style={s.shareCopyBtn} onClick={() => {
          navigator.clipboard.writeText(room?.share_token || "");
          showToast("Token copied!");
        }}>
          Copy
        </button>
      </div>

      <p style={s.shareLabel}>Current mode: <span style={{
        color: room?.share_mode === "editor" ? "#39d353" : "#e3b341"
      }}>{room?.share_mode}</span></p>

      <p style={s.shareLabel}>Generate new link as:</p>
      <div style={s.shareBtns}>
        <button
          style={{ ...s.shareModeBtn, opacity: shareLoading ? 0.6 : 1 }}
          onClick={() => handleResetToken("reviewer")}
          disabled={shareLoading}
        >
          Reviewer
        </button>
        <button
          style={{ ...s.shareModeBtn, color: "#39d353", borderColor: "rgba(57,211,83,0.3)", background: "rgba(57,211,83,0.08)", opacity: shareLoading ? 0.6 : 1 }}
          onClick={() => handleResetToken("editor")}
          disabled={shareLoading}
        >
          Editor
        </button>
      </div>
    </div>
  )}
</div>
          <button style={s.topBtn} onClick={handleDownload}>Download</button>
          <button style={s.backBtn} onClick={() => navigate("/rooms")}>← Rooms</button>
        </div>
      </div>

      <div style={s.layout}>
        <div style={s.editorPanel}>
          <Editor
            height="100%"
            language={room?.language || "python"}
            value={code}
            theme="collabreview-dark-trans"          
            beforeMount={handleEditorWillMount} 
            onChange={handleCodeChange}
            options={{
              readOnly: !canEdit,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              padding: { top: 16 },
              smoothScrolling: true,
            }}
          />
        </div>

        <div style={s.commentsPanel}>
          <p style={s.commentsTitle}>Comments</p>
          <div style={s.commentsList}>
            {comments.length === 0 ? (
              <p style={s.noComments}>No comments yet</p>
            ) : (
              comments.map(c => (
                <div key={c.comment_id} style={s.commentCard}>
                  <div style={s.commentHeader}>
                    <span style={s.commentLine}>Line {c.line_number}</span>
                    {c.user_id === parseInt(user.userId) && (
                      <span
                        style={s.deleteComment}
                        onClick={() => handleDeleteComment(c.comment_id)}
                      >
                        ✕
                      </span>
                    )}
                  </div>
                  <p style={s.commentContent}>{c.content}</p>
                </div>
              ))
            )}
          </div>

          <div style={s.addComment}>
            <p style={s.addCommentTitle}>Add comment</p>
            <input
              style={s.commentInput}
              type="number"
              placeholder="Line number"
              value={commentLine}
              onChange={e => setCommentLine(e.target.value)}
              min="1"
            />
            <textarea
              style={s.commentTextarea}
              placeholder="Write your comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={3}
            />
            <button
              style={{ ...s.commentBtn, opacity: addingComment ? 0.7 : 1 }}
              onClick={handleAddComment}
              disabled={addingComment}
            >
              {addingComment ? "Adding..." : "Add comment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    backgroundImage: "url('/room-bg.jpg')",
    backgroundSize: "cover",     
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, rgba(10,10,15,0.85) 0%, rgba(5,15,10,0.8) 100%)",
    zIndex: 1,
    pointerEvents: "none",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#39d353",
    fontFamily: "'JetBrains Mono', monospace",
    background: "#000",
  },
  topBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.6rem 1.5rem",
    background: "inherit", 
    backgroundAttachment: "fixed",
    backdropFilter: "blur(4px)",
    borderBottom: "1px solid rgba(57,211,83,0.15)",
  },
  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  roomName: {
    color: "#e6edf3",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  langBadge: {
    background: "rgba(57,211,83,0.15)",
    border: "1px solid rgba(57,211,83,0.3)",
    color: "#39d353",
    fontSize: "0.7rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
    fontWeight: 600,
  },
  savingText: { color: "#8b949e", fontSize: "0.75rem" },
  savedText: { color: "#39d353", fontSize: "0.75rem" },
  readOnlyText: { color: "#f85149", fontSize: "0.75rem" },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  presence: { display: "flex", gap: "0.3rem" },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "rgba(57,211,83,0.2)",
    border: "1px solid rgba(57,211,83,0.4)",
    color: "#39d353",
    fontSize: "0.75rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  topBtn: {
    padding: "0.35rem 0.85rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#8b949e",
    fontSize: "0.78rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  backBtn: {
    padding: "0.35rem 0.85rem",
    background: "transparent",
    border: "1px solid rgba(57,211,83,0.2)",
    borderRadius: "6px",
    color: "#39d353",
    fontSize: "0.78rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  layout: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    height: "calc(100vh - 48px)",
    marginTop: "48px",
  },
  editorPanel: {
  flex: 1,
  backdropFilter: "blur(12px)",
},
  commentsPanel: {
  width: "280px",
  background: "inherit",
  backgroundAttachment: "fixed",
  backdropFilter: "blur(12px)",
  borderLeft: "1px solid rgba(57,211,83,0.1)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
},
  commentsTitle: {
    color: "#39d353",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: 0,
    padding: "1rem",
    borderBottom: "1px solid rgba(57,211,83,0.1)",
  },
  commentsList: {
    flex: 1,
    overflowY: "auto",
    padding: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  noComments: {
    color: "#484f58",
    fontSize: "0.8rem",
    textAlign: "center",
    marginTop: "2rem",
  },
  commentCard: {
    background: "rgba(57,211,83,0.05)",
    border: "1px solid rgba(57,211,83,0.1)",
    borderRadius: "8px",
    padding: "0.75rem",
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.4rem",
  },
  commentLine: { color: "#39d353", fontSize: "0.72rem", fontWeight: 700 },
  deleteComment: { color: "#f85149", fontSize: "0.7rem", cursor: "pointer" },
  commentContent: { color: "#8b949e", fontSize: "0.8rem", margin: 0, lineHeight: 1.6 },
  addComment: {
    padding: "0.75rem",
    borderTop: "1px solid rgba(57,211,83,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  addCommentTitle: {
    color: "#39d353",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: 0,
  },
  commentInput: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(57,211,83,0.15)",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    color: "#e6edf3",
    fontSize: "0.82rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  commentTextarea: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(57,211,83,0.15)",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    color: "#e6edf3",
    fontSize: "0.82rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    resize: "none",
  },
  commentBtn: {
    width: "100%",
    padding: "0.55rem",
    background: "rgba(57,211,83,0.15)",
    border: "1px solid rgba(57,211,83,0.3)",
    borderRadius: "6px",
    color: "#39d353",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  sharePopover: {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  width: "240px",
  background: "rgba(0,0,0,0.95)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(57,211,83,0.15)",
  borderRadius: "10px",
  padding: "1rem",
  zIndex: 50,
  boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
},
shareNotch: {
  position: "absolute",
  top: "-6px",
  right: "16px",
  width: "10px",
  height: "10px",
  background: "rgba(0,0,0,0.95)",
  border: "1px solid rgba(57,211,83,0.15)",
  borderBottom: "none",
  borderRight: "none",
  transform: "rotate(45deg)",
},
shareTitle: {
  color: "#e6edf3",
  fontSize: "0.82rem",
  fontWeight: 700,
  margin: 0,
  marginBottom: "0.75rem",
},
shareTokenRow: {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  background: "rgba(57,211,83,0.05)",
  border: "1px solid rgba(57,211,83,0.1)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  marginBottom: "0.75rem",
},
shareToken: {
  color: "#39d353",
  fontSize: "0.85rem",
  fontWeight: 700,
  flex: 1,
  letterSpacing: "0.1em",
},
shareCopyBtn: {
  background: "transparent",
  border: "1px solid rgba(57,211,83,0.2)",
  borderRadius: "4px",
  color: "#39d353",
  fontSize: "0.72rem",
  padding: "0.2rem 0.5rem",
  cursor: "pointer",
  fontFamily: "inherit",
},
shareLabel: {
  color: "#8b949e",
  fontSize: "0.75rem",
  margin: 0,
  marginBottom: "0.5rem",
},
shareBtns: {
  display: "flex",
  gap: "0.5rem",
  marginTop: "0.25rem",
},
shareModeBtn: {
  flex: 1,
  padding: "0.5rem",
  background: "rgba(227,179,65,0.08)",
  border: "1px solid rgba(227,179,65,0.3)",
  borderRadius: "6px",
  color: "#e3b341",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
},
};