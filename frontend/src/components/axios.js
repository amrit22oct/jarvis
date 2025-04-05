import axios from "axios";

export const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : ""; // "" for relative path in production

export const axiosInstance = axios.create({
  baseURL: `${BASE_URL}`, 
  withCredentials: true,
});