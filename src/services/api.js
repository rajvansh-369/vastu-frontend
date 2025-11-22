// src/services/api.js
import axios from "axios";

// 🔹 CHANGE THIS to your Laravel API base URL
export const API_BASE_URL = "https://snehal.info/project/vastuAPI/public/api/";
// export const API_BASE_URL = "http://192.168.1.2:8000/api/";

// Axios instance for Laravel
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Set / clear auth token
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

/* ---------------- Laravel AUTH APIs ---------------- */

// POST /login
export const loginRequest = (email, password) =>
  api.post("/login", { email, password });

// POST /register
export const registerRequest = (name, email, password) =>
  api.post("/register", { name, email, password });

// GET /me (current user)
export const fetchMe = () => api.get("/me");

// PUT /profile
export const updateProfileRequest = (payload) =>
  api.put("/profile", payload);

/* ---------------- OpenRouter AI chat ---------------- */

// ❗ Put your OpenRouter key here (for dev only)
// For production, do this on backend.
const OPENROUTER_API_KEY = "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";
// const OPENROUTER_API_KEY = "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";

export const chatWithOpenRouter = async (messages) => {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://your-app.example", // optional
        "X-Title": "React Native Chat App",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // or any model you enabled
        messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("OpenRouter error:", data);
      return "Sorry, I had an issue talking to the AI API.";
    }

    // I need to pass full response for debugging and save into DB
    return data?.choices?.[0]?.message?.content ?? "No response from model.";
  } catch (error) {
    console.log("OpenRouter network error:", error);
    return "Network error contacting AI API.";
  }
};


/* ---------------- Chats API ---------------- */
// GET /chats  -> returns list of chats for current user
export const getChats = async () => {
  const res = await api.get("chats");
  return res.data;
};

// POST /chats -> create new chat (payload: { title, user_id? })
export const createChat = async (payload) => {
  console.log("createChat response:",  payload);
  const res = await api.post("chats", payload);

  return res.data;
};

// GET /chats/:chatId/messages -> messages for a chat
export const getMessages = async (chatId) => {
  console.log("getMessages called with chatId:", chatId);
  const res = await api.get(`chats/${chatId}/messages`);
  return res.data;
};

// POST /chats/:chatId/messages -> save message (payload: { role, text, image_url, user_id })
export const postMessage = async (chatId, payload) => {
  console.log("postMessage called with:", chatId, payload);
  const res = await api.post(`chats/${chatId}/messages`, payload);
  return res.data;
};

