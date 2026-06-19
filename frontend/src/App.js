import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Rooms from "./components/Rooms";
import Room from "./components/Room";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function JoinRedirect({ user }) {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/rooms/join/${token}`, { withCredentials: true })
      .then(res => {
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

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
  axios.get(`${API_URL}/users/me`, { withCredentials: true })
    .then(res => {
      setUser({
        userId: res.data.user_id,
        name: res.data.user_name,
        email: res.data.email,
      });
    })
    .catch(() => {
    });
}, []);

  const handleLogin = (userName,userEmail,userId) => {
    setUser({userId,name: userName,email: userEmail});
  };

  const handleLogout = () => {
  axios.post(`${API_URL}/users/logout`, {}, { withCredentials: true })
    .finally(() => setUser(null));
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