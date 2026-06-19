import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate} from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import React from 'react';


const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Room({ user, onLogout }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };
  const [inputData, setInputData] = React.useState("");
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
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

  // file import ref
  const fileInputRef = useRef(null);

  const wsRef = useRef(null);
  const saveTimer = useRef(null);


  const JUDGE0_LANGUAGES = {
    python: { id: 71, name: "Python (3.8.1)" },
    javascript: { id: 63, name: "JavaScript (Node.js 12.14.0)" },
    typescript: { id: 74, name: "TypeScript (3.7.4)" },
    java: { id: 62, name: "Java (OpenJDK 13.0.1)" },
    c: { id: 50, name: "C (GCC 9.2.0)" },
    cpp: { id: 54, name: "C++ (GCC 9.2.0)" },
    csharp: { id: 51, name: "C# (Mono 6.6.0.161)" },
    go: { id: 60, name: "Go (1.13.5)" },
    rust: { id: 73, name: "Rust (1.40.0)" },
    ruby: { id: 72, name: "Ruby (2.7.0)" },
    php: { id: 68, name: "PHP (7.4.1)" },
    swift: { id: 83, name: "Swift (5.2.3)" },
    kotlin: { id: 78, name: "Kotlin (1.3.72)" },
    bash: { id: 46, name: "Bash (5.0.0)" },
    sql: { id: 82, name: "SQL (SQLite 3.31.1)" },
  };

  // fetchComments FIRST before any useEffect that uses it
  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/comments/room/${roomId}`, {
        withCredentials: true
      });
      setComments(res.data);
    } catch (e) {
      console.error("Failed to fetch comments", e);
    }
  }, [roomId]);

  // Fetch room
  useEffect(() => {
    const fetchRoom = async () => {
      console.log("fetching room:", roomId, "user:", user.userId)
      try {
        const res = await axios.get(`${API_URL}/rooms/info/${roomId}`, {
          withCredentials: true
        });
        setRoom(res.data);
        setCode(res.data.code_content || "# Start coding here...");
        setCanEdit(
          res.data.owner_id === parseInt(user.userId) ||
          res.data.share_mode === "editor"
        );
      } catch (e) {
        console.log("fetchRoom error:", e.response?.status, e.message)
        navigate("/rooms");
      }
      setLoading(false);
    };
    fetchRoom();
  }, [roomId, user, navigate]);

  // Fetch comments on mount
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

  // WebSocket
  useEffect(() => {
    let ws;
    const timer = setTimeout(() => {
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(
        `${wsProtocol}://${window.location.hostname}:8000/ws/${roomId}`
      );
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        console.log("WS message received:", msg.type, msg)
        if (msg.type === "presence_list") {
          setOnline(msg.users.map(name => ({ name })));
        }
        if (msg.type === "code_update") {
          if (msg.user_id !== parseInt(user.userId)) {
            setCode(msg.code);
          }
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
        if (msg.type === "comment_deleted") {
          setComments(prev => prev.filter(c => c.comment_id !== msg.comment_id));
        }
        if (msg.type === "comment_added") {
          setComments(prev => {
            if (prev.find(c => c.comment_id === msg.comment.comment_id)) return prev;
            return [...prev, msg.comment];
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
  }, [roomId, fetchComments, user.userId]);

  // Auto-save
  const handleCodeChange = (value) => {
    setCode(value);
    console.log("code changed, canEdit:", canEdit)
    if (!canEdit) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      console.log("auto-saving...")
      setSaving(true);
      try {
        await axios.patch(`${API_URL}/rooms/${roomId}/code`,
          { code_content: value },
          { withCredentials: true }
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
        { withCredentials: true }
      );
      setRoom(prev => ({ ...prev, share_token: res.data.share_token, share_mode: res.data.share_mode }));
      showToast(`New ${mode} link generated!`);
    } catch (e) {
      showToast("Failed to reset token");
    }
    setShareLoading(false);
  };

  // Download
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

  // File import handler
  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      showToast("File too large (max 500KB)");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      setCode(content);
      showToast(`Imported: ${file.name}`);
      if (canEdit) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          setSaving(true);
          try {
            await axios.patch(`${API_URL}/rooms/${roomId}/code`,
              { code_content: content },
              { withCredentials: true }
            );
          } catch (err) {
            console.error("Auto-save after import failed", err);
          }
          setSaving(false);
        }, 500);
      }
    };
    reader.onerror = () => showToast("Failed to read file");
    reader.readAsText(file);

    e.target.value = "";
  };

  // Run code
  const handleRun = async () => {

    const currentLangName = room?.language?.toLowerCase() || "";
    
    const lang = JUDGE0_LANGUAGES[currentLangName];

    if (!lang) {
      setOutput({ error: `${room?.language} execution not supported` });
      setShowOutput(true);
      return;
    }

    setRunning(true);
    setShowOutput(true);
    setOutput(null);
    setShowInputPanel(false);

    const payload = {
      source_code: code || '\n',
      language_id: lang.id,
      stdin: inputData || ""
    };


    if (currentLangName === 'c' || currentLangName === 'c++' || currentLangName === 'cpp') {
      payload.compiler_options = "-lm";
    }

    try {
      const res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        setRunning(false);
        return;
      }

      const data = await res.json();
      const stdout = data.stdout || "";
      const stderr = data.stderr || data.compile_output || "";
      const statusCode = data.status?.id === 3 ? 0 : data.status?.id || 1;

      const errorText = (stderr + stdout).toLowerCase();
      const needsInput =
        errorText.includes("eoferror") ||
        errorText.includes("time limit exceeded") ||
        errorText.includes("nosuchelementexception") ||
        errorText.includes("fatal error: broken pipe");

      if (needsInput) {
        setShowInputPanel(true);
        setOutput({
          stdout: stdout,
          stderr: stderr,
          code: statusCode,
          error: "This program requires user input. Please provide it below and click Run again."
        });
      } else {
        setOutput({ stdout, stderr, code: statusCode });
      }

    } catch (e) {
      setOutput({ error: "Network error: Connection blocked or server unreachable." });
    }
    setRunning(false);
  };

  // Add comment
  const handleAddComment = async () => {
    if (!commentLine || !commentText) return;
    setAddingComment(true);
    try {
      await axios.post(`${API_URL}/comments/${roomId}`,
        { line_number: parseInt(commentLine), content: commentText },
        { withCredentials: true }
      );
      setCommentLine("");
      setCommentText("");
      await fetchComments();
    } catch (e) {
      console.error("Failed to add comment", e);
    }
    setAddingComment(false);
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API_URL}/comments/${commentId}`, {
        withCredentials: true
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
                {u.name}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
            <button
              ref={shareBtnRef}
              style={s.topBtn}
              onClick={() => setShowShare(v => !v)}
            >
              Share
            </button>

            <button
              style={{
                ...s.topBtn,
                color: running ? "#8b949e" : "#39d353",
                borderColor: running ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #090d0a 0%, #111813 35%, #0b100c 70%, #162219 100%)",
                border: "1px solid #233528",
                borderTop: "1px solid #3a543f",
                borderLeft: "1px solid #2d4333",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
                fontSize: "0.9rem"
              }}
              onClick={handleRun}
              disabled={running}
            >
              {running ? "Running..." : "▶ Run"}
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.js,.ts,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.swift,.kt,.sql,.sh,.txt,.html,.css,.md,.json,.xml,.yaml,.yml"
            style={{ display: "none" }}
            onChange={handleFileImport}
          />
          <button
            style={s.topBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Import a code file into the editor"
          >
            Import
          </button>

          <button style={s.topBtn} onClick={handleDownload}>Download</button>
          <button style={s.backBtn} onClick={() => navigate("/rooms")}>← Rooms</button>
        </div>
      </div>

      <div style={s.layout}>

        <div style={s.editorPanel}>
          <div style={{ flex: 1, minHeight: 0, height: "100%" }}>
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

          {showInputPanel && (
            <div style={s.inputPanel}>
              <div style={s.inputHeader}>
                <span style={s.inputTitle}>stdin — Program Input</span>
                <span
                  style={{ ...s.outputClose, marginLeft: "auto", color: "#e3b341" }}
                  onClick={() => setShowInputPanel(false)}
                  title="Hide input panel"
                >
                  ✕
                </span>
              </div>
              <textarea
                style={s.inputTextarea}
                placeholder="Your program expects input. Type it here (e.g., 153)..."
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {showOutput && (
            <div style={s.outputPanel}>
              <div style={s.outputHeader}>
                <span style={s.outputTitle}>Output</span>
                <span style={s.outputStatus}>
                  {running ? "running..." : output?.code === 0 ? "exited 0" : output?.code !== undefined ? `exited ${output.code}` : ""}
                </span>
                <span style={s.outputClose} onClick={() => setShowOutput(false)}>✕</span>
              </div>
              <div style={s.outputContent}>
                {running && <span style={{ color: "#8b949e" }}>Executing...</span>}
                {output?.error && <span style={{ color: "#f85149" }}>{output.error}</span>}
                {output?.stdout && <span style={{ color: "#39d353" }}>{output.stdout}</span>}
                {output?.stderr && <span style={{ color: "#f85149" }}>{output.stderr}</span>}
                {output && !output.stdout && !output.stderr && !output.error && (
                  <span style={{ color: "#8b949e" }}>No output</span>
                )}
              </div>
            </div>
          )}
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
    padding: "0.4rem 1.2rem", 
    background: "linear-gradient(135deg, #090d0a 0%, #111813 35%, #0b100c 70%, #162219 100%)",
    border: "1px solid #233528",
    borderTop: "1px solid #3a543f",
    borderLeft: "1px solid #2d4333",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    color: "#ffffff",
    borderRadius: "50px", 
    fontFamily: "'VT323', monospace",
    fontSize: "1.1rem", 
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  topBtn: {
    padding: "0.4rem 1.2rem", 
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#ffffff",
    borderRadius: "50px", 
    fontFamily: "'VT323', monospace",
    fontSize: "1.1rem", 
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  
  backBtn: {
    padding: "0.4rem 1.2rem",
    background: "transparent",
    border: "1px solid rgba(57,211,83,0.3)",
    color: "#39d353",
    borderRadius: "50px",
    fontFamily: "'VT323', monospace",
    fontSize: "1.1rem",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
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
    backdropFilter: "blur(5px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
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
    color: "grey",
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
    color: "grey",
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
    background: "linear-gradient(135deg, #090d0a 0%, #111813 35%, #0b100c 70%, #162219 100%)",
    border: "1px solid #233528",
    borderTop: "1px solid #3a543f",
    borderLeft: "1px solid #2d4333",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    borderRadius: "6px",
    color: "grey",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'VT323', monospace",
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
  outputPanel: {
    height: "200px",
    borderTop: "1px solid rgba(57,211,83,0.2)",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
    fontSize: "13px",                 
    lineHeight: "1.5",                
    letterSpacing: "normal",
    WebkitFontSmoothing: "antialiased", 
    MozOsxFontSmoothing: "grayscale",
  },
  outputHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.4rem 1rem",
    borderBottom: "1px solid rgba(57,211,83,0.1)",
  },
  outputTitle: {
    color: "#39d353",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    flex: 1,
  },
  outputStatus: {
    color: "#8b949e",
    fontSize: "0.72rem",
  },
  outputClose: {
    color: "#484f58",
    fontSize: "0.72rem",
    cursor: "pointer",
  },
  outputContent: {
    flex: 1,
    overflowY: "auto",
    padding: "0.75rem 1rem",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.82rem",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  inputPanel: {
    borderTop: "1px solid rgba(57,211,83,0.15)",
    background: "rgba(10,10,15,0.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "0.5rem"
  },
  inputHeader: {
    display: "flex",
    alignItems: "center",
    padding: "0.5rem 1rem",
  },
  inputTitle: {
    color: "#e3b341",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  inputTextarea: {
    background: "transparent",
    border: "none",
    padding: "0.25rem 1rem 0.5rem 1rem",
    color: "#e6edf3",
    fontSize: "0.85rem",
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    resize: "none",
    width: "100%",
    boxSizing: "border-box",
    lineHeight: "1.5",
  },
};