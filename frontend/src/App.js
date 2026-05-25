import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Home from "./components/Home";
import Rooms from "./components/Rooms";

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
          path="*"
          element={<Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;