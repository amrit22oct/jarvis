import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "./axios"; // ✅ Use custom axios instance
import './auth.css';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("🔍 Sending Request:", { email, password });

      const { data } = await axiosInstance.post(
        "/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      setUser(data.userId);
      navigate("/chat");
    } catch (error) {
      if (error.response) {
        console.error("❌ Login Error Response:", error.response.data);
        setError(error.response.data.message || "Login failed");
      } else {
        console.error("❌ Network Error:", error);
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <p onClick={() => navigate("/signup")}>Don't have an account? Sign up</p>
    </div>
  );
};

export default Login;
