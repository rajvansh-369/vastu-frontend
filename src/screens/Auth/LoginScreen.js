// src/screens/Auth/LoginScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, radii } from "../../theme/theme";

/**
 * IMPORTANT:
 * - Add an astro image at: src/assets/astro.png
 *   OR change ASTRO_IMAGE to a remote URL if you prefer.
 */
const ASTRO_IMAGE = "";
// const ASTRO_IMAGE = require("../../assets/astro.png");
// const ASTRO_IMAGE = { uri: "https://example.com/your-astro.png" };

const LoginScreen = ({ navigation }) => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // animation for astro
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -8,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const onSubmit = async () => {
    setErrorMessage("");
    if (!email || !password) {
      setErrorMessage("Please enter email & password.");
      return;
    }
    try {
      await login(email.trim(), password);
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong, try again.";
      console.log("🚨 API ERROR:", err);
      setErrorMessage(msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrapper}>
        {/* Decorative background circles */}
        <View style={styles.bgCircleTop} />
        <View style={styles.bgCircleBottom} />

        <View style={styles.card}>
          {/* Astro image + heading */}
          <View style={styles.headerRow}>
            <Animated.Image
              source={ASTRO_IMAGE}
              style={[styles.astro, { transform: [{ translateY: bob }] }]}
              resizeMode="contain"
            />
            <View style={styles.titleCol}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.smallText}>Login to continue to your Vastu assistant</Text>
            </View>
          </View>

          {/* error */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              editable={!loading}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              editable={!loading}
            />

            <View style={styles.rowBetween}>
              <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.linkText}>Create account</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* alternative sign-in (optional) */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

/* ---------------- styles ---------------- */
const ORANGE = "#FFB74D";
const DARK_ORANGE = "#D35400";
const CARD_BG = "#FFF8F0";
const SAFE_BG = "#FFF3E0";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SAFE_BG,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  // background decorative circles (soft, blurred look)
  bgCircleTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -80,
    top: -80,
    backgroundColor: ORANGE,
    opacity: 0.06,
    transform: [{ rotate: "12deg" }],
  },
  bgCircleBottom: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    left: -70,
    bottom: -70,
    backgroundColor: DARK_ORANGE,
    opacity: 0.06,
    transform: [{ rotate: "-18deg" }],
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: radii.lg || 20,
    padding: spacing.xl || 28,
    borderWidth: 1,
    borderColor: "rgba(211,83,0,0.08)",
    // soft shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 8,
      },
    }),
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md || 16,
  },
  astro: {
    width: 72,
    height: 72,
    marginRight: 12,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK_ORANGE,
  },
  smallText: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },

  errorText: {
    color: "#D84315",
    marginBottom: 8,
    fontSize: 13,
  },

  form: {
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    borderRadius: radii.md || 10,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    paddingHorizontal: spacing.md || 12,
    paddingVertical: (spacing.sm || 8) + 2,
    marginBottom: spacing.sm || 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#ffffff",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  linkText: {
    color: DARK_ORANGE,
    fontSize: 13,
    fontWeight: "600",
  },

  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: radii.pill || 28,
    paddingVertical: (spacing.sm || 8) + 8,
    alignItems: "center",
    marginTop: spacing.md || 16,
    shadowColor: ORANGE,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md || 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#FFE9CF",
  },
  orText: {
    paddingHorizontal: 10,
    color: colors.textMuted,
    fontSize: 12,
  },

  socialRow: {
    marginTop: spacing.sm || 10,
  },
  socialBtn: {
    borderWidth: 1,
    borderColor: "#FFE0B2",
    borderRadius: radii.md || 10,
    paddingVertical: (spacing.sm || 8) + 6,
    alignItems: "center",
  },
  socialText: {
    color: DARK_ORANGE,
    fontWeight: "600",
  },
});
