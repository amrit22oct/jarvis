require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { Pool } = require("pg");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Sequelize } = require("sequelize");


const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
<<<<<<< HEAD

app.use(cors({
  origin: "http://localhost:5173", // ✅ Explicitly allow frontend origin
  credentials: true                // ✅ Allow cookies/authorization headers
}));
=======


>>>>>>> 0b84502a764ac3e81489482656945dabba421896
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded images

// ✅ Validate Required Environment Variables
if (!process.env.POSTGRES_URI || !process.env.JWT_SECRET || !process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: Missing environment variables. Check your .env file.");
  process.exit(1);
}

// PostgreSQL connection (neon DB)
const sequelize = new Sequelize(process.env.POSTGRES_URI, {
  dialect: "postgres",
  logging: false,
});

sequelize.authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ PostgreSQL Connection Error:", err.message));


// ✅ Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ✅ Multer Storage for Profile Picture Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

// ✅ File Upload Limit and Type Filter (Only Images)
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// ✅ User Schema
const { DataTypes } = require("sequelize");

const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  profilePic: { type: DataTypes.STRING, defaultValue: "/uploads/default-avatar.png" },
});

sequelize.sync(); // Sync the database

// ✅ Chat Schema
const Chat = sequelize.define("Chat", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  userMessage: { type: DataTypes.TEXT, allowNull: false },
  botResponse: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

sequelize.sync(); // Sync the database


// ✅ Middleware for JWT Verification
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

// ✅ Signup Route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) 
    return res.status(400).json({ message: "All fields are required." });

  try {
    console.log("🔍 Checking if user exists...");
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "User already exists." });

    console.log("🔑 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("📝 Creating new user...");
    const newUser = await User.create({ username, email, password: hashedPassword });

    console.log("✅ User created successfully:", newUser);
    res.status(201).json({ message: "User registered successfully", userId: newUser.id });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "Server error. Please try again.", error: error.message });
  }
});



// ✅ Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found." });

    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      profilePic: `http://localhost:${PORT}${user.profilePic}`,
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
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      ...user.toJSON(),
      profilePic: user.profilePic ? `http://localhost:${PORT}${user.profilePic}` : "/uploads/default-avatar.png",
    });
  } catch (error) {
    console.error("❌ Fetch user error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});


// ✅ Update User Profile (with Profile Pic)
app.put("/user/:id", verifyToken, upload.single("profilePic"), async (req, res) => {
  console.log("📂 Received file:", req.file);
  console.log("📂 Received body:", req.body);

  const { id } = req.params;
  const { username, email } = req.body;
  const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.username = username || user.username;
    user.email = email || user.email;
    if (profilePic) user.profilePic = profilePic;

    await user.save();

    res.json({
      message: "Profile updated successfully.",
      user: {
        ...user.toJSON(),
        profilePic: user.profilePic ? `http://localhost:${PORT}${user.profilePic}` : "/uploads/default-avatar.png",
      },
    });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});


// ✅ Chatbot API
// ✅ Chatbot API
app.post("/chat", verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required." });

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
    });

    const botResponse = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    await new Chat({ userId: req.userId, userMessage: message, botResponse }).save();

    res.json({ response: botResponse });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
