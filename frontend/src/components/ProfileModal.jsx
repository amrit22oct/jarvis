import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FaTimes, FaCamera, FaEdit, FaSave, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";
import { axiosInstance } from "./axios";
import "./ProfileModal.css";
import Avatar from "react-avatar";





const ProfileModal = ({ isOpen, onClose, userId, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const profilePicFile = useRef(null);
  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp";


  const fetchUserData = useCallback(async () => {
    setError("");
    const id = userId || localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!id || !token) {
      setError("User authentication failed.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      

      setUserData({
        ...data,
        profilePic: data.profilePic || defaultAvatar, // Ensure default avatar if none exists
      });

      window.dispatchEvent(new Event("profileUpdated"));
    } catch (error) {
      setError("Failed to fetch user data. Please try again.");
      console.error("❌ Error fetching user data:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const profilePicUrl = useMemo(() => userData?.profilePic || defaultAvatar, [userData?.profilePic]); // Always place before return

useEffect(() => {
  if (isOpen) {
    fetchUserData();
  }
}, [isOpen]);

  


  // const handleSave = useCallback(async () => {
  //   if (!userData) return;

  //   const id = userId || localStorage.getItem("userId");
  //   const token = localStorage.getItem("token");

  //   if (!id || !token) {
  //     setError("Authentication issue. Please log in again.");
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     setError("");

  //     const formData = new FormData();
  //     formData.append("username", userData.username);
  //     if (profilePicFile.current) {
  //       formData.append("profilePic", profilePicFile.current);
  //     }

  //     const { data } = await axiosInstance.put(`/user/${id}`, formData, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "multipart/form-data",
  //       },
  //     });
      

  //     setUserData((prev) => ({
  //       ...prev,
  //       profilePic: data.user.profilePic || defaultAvatar,
  //     }));

  //     profilePicFile.current = null;
  //     setIsEditing(false);
  //   } catch (error) {
  //     setError("Error updating profile. Try again.");
  //     console.error("❌ Error updating user data:", error.response?.data || error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [userData, userId]);

  const handleSave = useCallback(async () => {
    if (!userData) return;
  
    const id = userId || localStorage.getItem("userId");
    const token = localStorage.getItem("token");
  
    if (!id || !token) {
      setError("Authentication issue. Please log in again.");
      return;
    }
  
    try {
      setLoading(true);
      setError("");
  
      const formData = new FormData();
      formData.append("username", userData.username);
      if (profilePicFile.current) {
        formData.append("profilePic", profilePicFile.current);
      }
  
      // ✅ Save user profile (backend already sends updated profilePic URL)
      await axiosInstance.put(`/user/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
  
      profilePicFile.current = null;
  
      // ✅ Fetch latest user data with correct full profilePic URL
      await fetchUserData();
  
      setIsEditing(false);
    } catch (error) {
      console.error("❌ Error updating user profile:", error.response?.data || error.message);
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }, [userData, userId, fetchUserData]);
  
  

  const handleProfilePicChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      profilePicFile.current = file;
      setUserData((prev) => ({ ...prev,  profilePic: file ? URL.createObjectURL(file) : prev.profilePic, }));
    } else {
      e.target.value = ""; // Reset file input
      setError("Invalid file type. Please select an image.");
    }
  }, []);
  

  const handleLogout = useCallback(() => {
    localStorage.clear();
    window.location.href = "/login";
  }, []);

  if (!isOpen || !userData) return null;

  return (
    <div className={`profile-modal-overlay ${darkMode ? "dark" : ""}`}>
      <div className={`profile-modal ${darkMode ? "dark" : ""}`}>
      <button className="close-profile" onClick={onClose} aria-label="Close profile modal">
  <FaTimes />
</button>

        <h3>User Profile</h3>

        {error && <p className="error-text">{error}</p>}

        <div className="profile-pic-container">
  {userData?.profilePic && !userData.profilePic.includes("default") ? (
    <img src={profilePicUrl} alt="Profile" className="profile-pic fade-in" />
  ) : (
    <Avatar
      name={userData?.username}
      size="100"
      round
      className="profile-pic"
    />
  )}

  {isEditing && (
    <>
      <label htmlFor="profilePicInput" className="profile-pic-edit" aria-label="Upload profile picture">
        <FaCamera />
      </label>
      <input
        type="file"
        id="profilePicInput"
        accept="image/*"
        onChange={handleProfilePicChange}
        hidden
      />
    </>
  )}
</div>


        <div className="profile-details">
          {isEditing ? (
            <>
              <label>Username:</label>
              <input
                type="text"
                value={userData.username}
                onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                className={darkMode ? "dark-input" : ""}
              />
            </>
          ) : (
            <>
              <p><strong>Username:</strong> {userData.username}</p>
              <p><strong>Email:</strong> {userData.email}</p>
            </>
          )}
        </div>

        {loading && <p className="loading-text">Updating...</p>}

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="save-profile-btn" onClick={handleSave} disabled={loading}>
                <FaSave /> {loading ? "Saving..." : "Save Changes"}
              </button>
              <button className="back-btn" onClick={() => setIsEditing(false)} disabled={loading}>
                <FaArrowLeft /> Back
              </button>
            </>
          ) : (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              <FaEdit /> Edit Profile
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout} disabled={loading}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
