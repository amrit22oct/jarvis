import React, { useState, useEffect } from "react";
import { FaBars, FaPlus, FaUserCircle } from "react-icons/fa";
import Sidebar from "./Sidebar";
import ChatBox from "./ChatBox";
import ProfileModal from "./ProfileModal";
import "bootstrap/dist/css/bootstrap.min.css";
import "./HomePage.css";


const HomePage = () => {
  const storedUserId = localStorage.getItem("userId");
  const [userId, setUserId] = useState(storedUserId);
  const [chats, setChats] = useState(() => {
    return storedUserId ? JSON.parse(localStorage.getItem(`chats-${storedUserId}`)) || {} : {};
  });
  const [selectedChat, setSelectedChat] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "enabled");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Redirect to login if no userId
  useEffect(() => {
    if (!userId) {
      window.location.href = "login";
    }
  }, [userId]);

  // Save chats to localStorage when updated
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`chats-${userId}`, JSON.stringify(chats));
    }
  }, [chats, userId]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode ? "enabled" : "disabled");
  }, [darkMode]);

  // Function to add a new chat
  const addNewChat = () => {
    const newChatName = `Chat ${Object.keys(chats).length + 1}`;
    setChats((prevChats) => ({ ...prevChats, [newChatName]: [] }));
    setSelectedChat(newChatName);
  };

  // Function to delete a chat
  const handleDeleteChat = (chatToDelete) => {
    setChats((prevChats) => {
      const updatedChats = { ...prevChats };
      delete updatedChats[chatToDelete];

      const remainingChatKeys = Object.keys(updatedChats);
      const newSelectedChat = remainingChatKeys.length > 0 ? remainingChatKeys[0] : null;

      setSelectedChat(newSelectedChat);
      localStorage.setItem(`chats-${userId}`, JSON.stringify(updatedChats));

      return updatedChats;
    });
  };

  return (
    <div className={`homepage-container ${darkMode ? "dark-mode" : "light-mode"}`}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <Sidebar
          chats={chats}
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          addNewChat={addNewChat}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode((prev) => !prev)}
          userId={userId}
          openProfile={() => setIsProfileModalOpen(true)}
        />
      )}

      {/* ChatBox */}
      <div className={`chatbox-container ${isSidebarOpen ? "with-sidebar" : "full-width"}`}>
        {!isSidebarOpen && (
          <div className="top-left-buttons">
            <button className="hamburger-menu" onClick={() => setIsSidebarOpen(true)}>
              <FaBars size={24} />
            </button>
            <button className="new-chat-button" onClick={addNewChat} title="New Chat">
              <FaPlus size={24} />
            </button>
          </div>
        )}

        <ChatBox
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          chats={chats}
          setChats={setChats}
          darkMode={darkMode}
          handleDeleteChat={handleDeleteChat}
        />
      </div>

      {/* Profile Button */}
      <button className="profile-btn" onClick={() => setIsProfileModalOpen(true)}>
        <FaUserCircle size={30} />
      </button>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userId={userId}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default HomePage;
