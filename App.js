// App.js
import React from "react";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

// 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