require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg"); // ✅ PostgreSQL client
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;


// Serve frontend (React) build files
app.use(express.static(path.join(__dirname, "../frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});


// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Validate Environment Variables
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.GEMINI_API_KEY) {
  console.error("❌ Missing environment variables. Check your .env file.");
  process.exit(1);
}

// ✅ Connect to NeonDB (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for NeonDB
  },
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 20000, // Timeout for new connections (20s)
  keepAlive: true, // ✅ Enable Keep-Alive
});

pool
  .connect()
  .then(() => console.log("✅ Connected to NeonDB with Keep-Alive enabled"))
  .catch((err) => {
    console.error("❌ Database Connection Error:", err.message);
    process.exit(1);
  });

// ✅ Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ✅ Multer Storage for Profile Picture Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed."));
    cb(null, true);
  },
});

// ✅ Middleware for JWT Verification
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

// ✅ Signup Route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: "All fields are required." });

  try {
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) return res.status(400).json({ message: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", [username, email, hashedPassword]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userQuery.rows[0];
    if (!user) return res.status(400).json({ message: "User not found." });

    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      profilePic: `http://localhost:${PORT}${user.profile_pic || "/uploads/default-avatar.png"}`,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ✅ Get User Data
app.get("/user/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const userQuery = await pool.query("SELECT id, username, email, profile_pic FROM users WHERE id = $1", [id]);
    const user = userQuery.rows[0];
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ ...user, profilePic: user.profile_pic ? `http://localhost:${PORT}${user.profile_pic}` : "/uploads/default-avatar.png" });
  } catch (error) {
    console.error("❌ Fetch user error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ✅ Update User Profile
app.put("/user/:id", verifyToken, upload.single("profilePic"), async (req, res) => {
  const { id } = req.params;
  const { username, email } = req.body;
  const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const updateQuery = `
      UPDATE users SET 
        username = COALESCE($1, username), 
        email = COALESCE($2, email), 
        profile_pic = COALESCE($3, profile_pic) 
      WHERE id = $4 RETURNING *`;
    
    const updatedUser = await pool.query(updateQuery, [username, email, profilePic, id]);

    if (!updatedUser.rows.length) return res.status(404).json({ message: "User not found." });

    res.json({ message: "Profile updated.", user: updatedUser.rows[0] });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ✅ Chatbot API
app.post("/chat", verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required." });

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
    });

    const botResponse = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    await pool.query("INSERT INTO chats (user_id, user_message, bot_response) VALUES ($1, $2, $3)", [req.userId, message, botResponse]);

    res.json({ response: botResponse });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
