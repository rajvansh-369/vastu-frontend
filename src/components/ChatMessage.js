// src/components/ChatMessage.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii, spacing } from "../theme/theme";

const ChatMessage = ({ message, isUser }) => {
  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
        ]}
      >
        <Text style={styles.author}>
          {isUser ? "You" : "AI Assistant"}
        </Text>
        <Text style={styles.text}>{message.text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
  },
  bubbleBot: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  author: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    color: colors.text,
  },
});

export default ChatMessage;
