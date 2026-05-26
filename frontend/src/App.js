import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Rooms from "./components/Rooms";
import Room from "./components/Room";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Join redirect component — must be outside App ──────────────────────────
function JoinRedirect({ user }) {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/rooms/join/${token}`)
      .then(res => {
        // Store token for this room so guest stays joined on refresh
        localStorage.setItem(`cr_room_${res.data.room_id}`, token);
        navigate(`/rooms/${res.data.room_id}`);
      })
      .catch(() => {
        alert("Invalid or expired token");
        navigate("/rooms");
      });
  }, [token, navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#39d353", fontFamily: "monospace" }}>
      Joining room...
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("cr_token");
    const userId = localStorage.getItem("cr_user_id");
    if (token && userId) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ token, userId, name: payload.name });
    }
  }, []);

  const handleLogin = (token, userId) => {
    const payload = JSON.parse(atob(token.split('.')[1]));
    setUser({ token, userId, name: payload.name });
  };

  const handleLogout = () => {
    localStorage.removeItem("cr_token");
    localStorage.removeItem("cr_user_id");
    setUser(null);
  };


  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={!user ? <Auth onLogin={handleLogin} /> : <Home user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/rooms"
          element={user ? <Rooms user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/rooms/:roomId"
          element={user ? <Room user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/join/:token"
          element={user ? <JoinRedirect user={user} /> : <Navigate to="/" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;