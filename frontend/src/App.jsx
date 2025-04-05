import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import HomePage from "./components/HomePage";
import { axiosInstance } from "./components/axios"; // ✅ Use this everywhere

const App = () => {
  const [user, setUser] = useState(localStorage.getItem("userId") || null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      axiosInstance
        .get("/profile")
        .then((res) => {
          setUser(res.data.userId);
          setUserData(res.data);
        })
        .catch(() => {
          setUser(null);
          setUserData(null);
          localStorage.removeItem("userId");
          localStorage.removeItem("token");
        });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={user ? <HomePage userId={user} userData={userData} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/chat" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;
