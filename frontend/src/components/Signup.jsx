import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "./axios"; // ✅ Import custom axios instance
import "./auth.css";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post(
        "/signup",
        { username, email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("✅ Signup Success:", response.data);
      navigate("/login");
    } catch (error) {
      if (error.response) {
        console.error("❌ Signup Error:", error.response.data);
        setError(error.response.data.message || "Signup failed. Try again.");
      } else {
        console.error("❌ Network Error:", error);
        setError("Network error. Check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Signup</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
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
          {loading ? "Signing up..." : "Signup"}
        </button>
      </form>
      <p onClick={() => navigate("/login")}>Already have an account? Login</p>
    </div>
  );
};

export default Signup;
