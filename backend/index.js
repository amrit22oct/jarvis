require("dotenv").config(); // ✅ Load environment variables at the beginning
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware

app.use(cors({
  origin: "http://localhost:5173", // ✅ Explicitly allow frontend origin
  credentials: true                // ✅ Allow cookies/authorization headers
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded images

// ✅ Validate Required Environment Variables
if (!process.env.MONGO_URI || !process.env.JWT_SECRET || !process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: Missing environment variables. Check your .env file.");
  process.exit(1);
}

// ✅ MongoDB Connection (Fixed)
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });


// ✅ Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ✅ Multer Storage for Profile Picture Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});


// ✅ File Upload Limit and Type Filter (Only Images)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// ✅ User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: "/uploads/default-avatar.png" },
});
const User = mongoose.model("User", UserSchema);

// ✅ Chat Schema
const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userMessage: { type: String, required: true },
  botResponse: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const Chat = mongoose.model("Chat", ChatSchema);

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
  if (!username || !email || !password) return res.status(400).json({ message: "All fields are required." });

  try {
    if (await User.findOne({ email })) return res.status(400).json({ message: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

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
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found." });

    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({
      token,
      userId: user._id,
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
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID." });

  try {
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      ...user.toObject(),
      profilePic: user.profilePic ? `http://localhost:${PORT}${user.profilePic}` : '/uploads/default-avatar.png',

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
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID." });

  const { username, email } = req.body;
  const profilePic = req.file ? `/uploads/${req.file.filename}` : undefined;


  try {
    const updateData = { username, email };
    if (profilePic) updateData.profilePic = profilePic;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedUser) return res.status(404).json({ message: "User not found." });

    res.json({
      message: "Profile updated successfully.",
      user: {
        ...updatedUser.toObject(),
        profilePic: updatedUser.profilePic ? `http://localhost:${PORT}${updatedUser.profilePic}` : '/uploads/default-avatar.png',

      },
    });
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

    await new Chat({ userId: req.userId, userMessage: message, botResponse }).save();

    res.json({ response: botResponse });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
