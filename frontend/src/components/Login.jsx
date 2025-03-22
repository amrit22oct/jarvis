import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './auth.css'; // Importing the CSS file

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(""); // Error state
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true while requesting
    setError(""); // Reset error before new login attempt
    try {
      const { data } = await axios.post("http://localhost:5000/login", { email, password });
      localStorage.setItem("token", data.token); // Store token in localStorage
      localStorage.setItem("userId", data.userId); // Store userId in localStorage
      setUser(data.userId); // Set user in global state (parent component)
      navigate("/chat"); // Redirect to chat page
    } catch (error) {
      // Handle login errors and display them to the user
      if (error.response) {
        setError(error.response.data.message || "Login failed");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false); // Reset loading state
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
      {error && <p className="error-message">{error}</p>} {/* Display error message */}
      <p onClick={() => navigate("/signup")}>Don't have an account? Sign up</p>
    </div>
  );
};

export default Login;
