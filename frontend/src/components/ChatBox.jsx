import React, { useState, useEffect, useRef } from "react";
import { FaPaperclip, FaRobot, FaMicrophone, FaTrash } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ChatBox.css";

import { axiosInstance } from "./axios";

const ChatBox = ({ selectedChat, setSelectedChat, chats, setChats, darkMode }) => {
  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const storedChats = JSON.parse(localStorage.getItem("chats")) || {};
    setChats(storedChats);
  }, []);

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const formatResponse = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold text
      .replace(/\n{2,}/g, "<br/><br/>") // Paragraph spacing
      .replace(/- (.*?)/g, "<li>$1</li>") // Bullet points
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>") // Code blocks
      .replace(/### (.*?)/g, "<h3>$1</h3>") // Headings
      .replace(/\n/g, "<br/>"); // Line breaks
  };

  const handleSend = async () => {
    if (!query.trim() || !selectedChat) return;

    const timestamp = Date.now();
    const userMessage = { id: timestamp, text: query, type: "sent", timestamp };

    setChats((prev) => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), userMessage],
    }));
    setQuery("");
    setIsTyping(true);

    try {
      let botResponse = "";
      if (/what is your name|who are you|what everyone calls you/i.test(query)) {
        botResponse = "**I am Jarvis, your AI assistant.**";
      } else {
        // Retrieve the JWT token from localStorage or from a global state
        const token = localStorage.getItem("token"); // You should store the token during login

        if (!token) {
          throw new Error("Authentication token is missing. Please log in.");
        }

        // Send the message along with the token in the request headers
        const response = await axiosInstance.post(
          "/chat",  // <-- Correct endpoint
          { message: query },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        

        botResponse = response.data.response;
      }

      setTimeout(() => {
        const botMessage = { id: Date.now(), text: formatResponse(botResponse), type: "received", timestamp: Date.now() };
        setChats((prev) => ({
          ...prev,
          [selectedChat]: [...(prev[selectedChat] || []), botMessage],
        }));
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching chatbot response:", error);
      setIsTyping(false);
      alert("There was an error while fetching the response. Please try again.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 🎤 Voice Recognition Function
  const handleVoiceInput = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }
  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
  
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
  
    recognition.onstart = () => {
      console.log("🎤 Voice recognition started...");
      setIsListening(true);
    };
  
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      console.log("✅ Recognized speech:", speechResult);
  
      // Append recognized speech to the existing input text
      setQuery((prevQuery) => (prevQuery ? `${prevQuery} ${speechResult}` : speechResult));
    };
  
    recognition.onerror = (event) => {
      console.error("❌ Speech recognition error:", event.error);
      setIsListening(false);
    };
  
    recognition.onend = () => {
      console.log("🎤 Voice recognition stopped.");
      setIsListening(false);
    };
  
    recognition.start();
  };
  
  // 🗑️ Delete Chat Function
  const handleDeleteChat = () => {
    if (!selectedChat) return;

    const updatedChats = { ...chats };
    delete updatedChats[selectedChat];

    const remainingChatKeys = Object.keys(updatedChats);
    const newSelectedChat = remainingChatKeys.length > 0 ? remainingChatKeys[0] : null;

    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));

    if (newSelectedChat !== selectedChat) {
      setSelectedChat(newSelectedChat);
    }
  };

  return (
    <div className={`chatbox ${darkMode ? "dark-mode" : "light-mode"}`}>
      {!selectedChat ? (
        <div className="default-chatbox">
          <FaRobot className="chatbox-logo" />
          <h2>Welcome to ChatBot</h2>
          <p>Start a new conversation or select an existing chat.</p>
        </div>
      ) : (
        <>
          <div className="chatbox-header">
            <FaRobot className="chatbox-logo" />
            <span className="chat-title">{selectedChat}</span>
            <FaTrash className="delete-chat-icon" onClick={handleDeleteChat} />
          </div>

          <div className="chat-messages">
            {chats[selectedChat]?.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.type}`}>
                <div dangerouslySetInnerHTML={{ __html: msg.text }}></div>
                <span className="chat-timestamp small">{formatTimestamp(msg.timestamp)}</span>
              </div>
            ))}
            {isTyping && <div className="chat-bubble received">Jarvis is typing...</div>}
            <div ref={chatEndRef}></div>
          </div>

          <div className="chatbox-footer">
            <FaPaperclip className="icon attachment-icon" onClick={() => fileInputRef.current.click()} />
            <input type="file" ref={fileInputRef} style={{ display: "none" }} />
            <textarea
              className="chatbox-input"
              placeholder="Type a message..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn btn-light voice-btn" onClick={handleVoiceInput}>
              <FaMicrophone className={isListening ? "listening" : ""} />
            </button>
            <button className="btn btn-primary" onClick={handleSend}>Send</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBox;

//perfect