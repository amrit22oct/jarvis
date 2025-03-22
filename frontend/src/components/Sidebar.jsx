import React, { useState, useMemo, useEffect } from "react";
import {
  FaPlus,
  FaBars,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaMoon,
  FaUserCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom"; // ✅ Improved Logout Handling
import "bootstrap/dist/css/bootstrap.min.css";
import "./Sidebar.css";

const Sidebar = ({
  chats,
  selectedChat,
  setSelectedChat,
  addNewChat,
  isOpen,
  toggleSidebar,
  darkMode,
  toggleDarkMode,
  userId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate(); // ✅ Use for logout redirection

  // ✅ Store the current logged-in user ID in sessionStorage
  useEffect(() => {
    if (userId) {
      sessionStorage.setItem("activeUser", userId);
    }
  }, [userId]);

  // ✅ Ensure the correct user's chats are loaded
  useEffect(() => {
    const activeUser = sessionStorage.getItem("activeUser");
    if (activeUser && activeUser !== userId) {
      navigate("/login"); // Redirect if session mismatches
    }
  }, [userId, navigate]);

  // ✅ Filter chats based on search term
  const filteredChats = useMemo(() => {
    if (!searchTerm) return Object.keys(chats);

    return Object.keys(chats).filter((chatKey) => {
      const chatMessages = chats[chatKey] || [];
      const chatTitle = chatMessages.length > 0 ? chatMessages[0].text : ""; // First message
      return (
        chatTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chatMessages.some((msg) =>
          msg.text.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    });
  }, [searchTerm, chats]);

  // ✅ Get Chat Name (First 5 words of first message, single line, hidden overflow)
  const getChatName = (chatKey) => {
    const chatMessages = chats[chatKey] || [];
    if (chatMessages.length === 0) return "New Chat"; // Default name if no messages

    let firstMessage = chatMessages[0].text.trim();
    return firstMessage.split(/\s+/).slice(0, 5).join(" ") + // ✅ Handles extra spaces correctly
      (firstMessage.split(/\s+/).length > 5 ? "..." : ""); // ✅ More robust "..." condition
  };

  // ✅ Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem(`chats-${userId}`); // ✅ Ensure only the current user's chats are removed
    sessionStorage.removeItem("activeUser"); // ✅ Remove active session
    navigate("/login"); // ✅ Redirect properly
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"} ${darkMode ? "dark-mode" : "light-mode"}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <FaBars />
        </button>

        {isOpen && (
          <>
            {/* Search Bar */}
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleDarkMode}>
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
          </>
        )}
      </div>

      {/* Sidebar Content */}
      {isOpen && (
        <div className="sidebar-content">
          {/* New Chat Button */}
          <button className="new-chat-btn" onClick={addNewChat}>
            <FaPlus className="chat-icon" /> New Chat
          </button>

          {/* Chat List */}
          <ul className="chat-list">
            {filteredChats.length > 0 ? (
              filteredChats.map((chatKey) => (
                <li
                  key={chatKey}
                  className={`chat-item ${chatKey === selectedChat ? "active" : ""}`}
                  onClick={() => chatKey !== selectedChat && setSelectedChat(chatKey)} // ✅ Prevent Unnecessary Re-renders
                >
                  <FaUserCircle className="chat-avatar" />
                  <span className="chat-name" title={getChatName(chatKey)}>
                    {getChatName(chatKey)}
                  </span>
                </li>
              ))
            ) : (
              <li className="no-chat">No Chats Found</li>
            )}
          </ul>
        </div>
      )}

      {/* Sidebar Footer */}
      {isOpen && (
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt className="logout-icon" /> Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
