import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import HomePage from "./components/HomePage";
import axios from "axios";

const App = () => {
  const [user, setUser] = useState(localStorage.getItem("userId") || null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      // Fetch user data using the stored userId
      axios
        .get(`http://localhost:5000/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUserData(res.data))
        .catch(() => {
          setUser(null);
          setUserData(null);
        });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} setUserData={setUserData} />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/chat"
          element={user ? <HomePage userId={user} userData={userData} /> : <Navigate to="." />}
        />
        <Route path="*" element={<Navigate to={user ? "/chat" : "."} />} />
      </Routes>
    </Router>
  );
};

export default App;
// perfect