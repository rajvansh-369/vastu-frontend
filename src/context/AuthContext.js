// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  loginRequest,
  registerRequest,
  fetchMe,
  setAuthToken,
  updateProfileRequest,
} from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // { id, name, email, ... }
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(false);

  // Optionally, you can load token from AsyncStorage here.

  const setToken = (newToken) => {
    setTokenState(newToken);
    setAuthToken(newToken);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await loginRequest(email, password);
      // expect { token, user }
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const { data } = await registerRequest(name, email, password);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const refreshMe = async () => {
    if (!token) return;
    try {
      const { data } = await fetchMe();
      setUser(data);
    } catch (e) {
      console.log("fetchMe error", e);
    }
  };

  const updateProfile = async (payload) => {
    const { data } = await updateProfileRequest(payload);
    setUser(data); // assuming API returns updated user
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshMe,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
