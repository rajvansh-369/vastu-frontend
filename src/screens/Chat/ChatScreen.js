// src/screens/Chat/ChatScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import {
  getChats,
  createChat,
  getMessages,
  postMessage,
  chatWithOpenRouter,
  setAuthToken,
} from "../../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SIDEBAR_RATIO = 0.7; // cover 70% of screen width
const SIDEBAR_WIDTH = Math.round(SCREEN_WIDTH * SIDEBAR_RATIO);

/* ---------- TypingIndicator ---------- */
const TypingIndicator = ({ dotSize = 8, dotSpacing = 6 }) => {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (anim) =>
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 350, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 350, easing: Easing.linear, useNativeDriver: true }),
      ]);
    const loop = Animated.loop(Animated.stagger(120, [animate(a1), animate(a2), animate(a3)]));
    loop.start();
    return () => loop.stop();
  }, [a1, a2, a3]);

  const dotStyle = (anim) => ({
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    marginHorizontal: dotSpacing / 2,
    opacity: anim,
    transform: [{ translateY: Animated.multiply(anim, -3) }],
    backgroundColor: "#6D4C41",
  });

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={dotStyle(a1)} />
      <Animated.View style={dotStyle(a2)} />
      <Animated.View style={dotStyle(a3)} />
    </View>
  );
};

/* ---------- ChatScreen (mobile overlay sidebar 70%) ---------- */
const ChatScreen = ({ navigation }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.token || user?.api_token) setAuthToken(user.token || user.api_token);
  }, [user]);

  // chat state
  const [messages, setMessages] = useState([
    { id: "1", role: "assistant", text: "Hey! I’m your Vastu assistant 🧠✨\nAsk me anything or send an image 📷", image: null },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);

  // sidebar & chats
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const flatListRef = useRef(null);

  // animation refs
  const sidebarAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const sidebarTranslateX = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_WIDTH, 0] });
  const backdropOpacity = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.46] });
  const mainScale = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.995] });

  // keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // auto-scroll
  useEffect(() => {
    if (flatListRef.current) setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
  }, [messages, isSending]);

  /* ---------------- API helpers ---------------- */
  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const data = await getChats();
      const list = data?.data || data?.items || data || [];
      setChats(list);
      if (!currentChatId && list.length > 0) {
        setCurrentChatId(list[0].id);
        await loadMessages(list[0].id);
      }
    } catch (err) {
      console.warn("loadChats error:", err);
    } finally {
      setLoadingChats(false);
    }
  };

  const onCreateChat = async (title = "New chat") => {
    setCreatingChat(true);
    try {
      const data = await createChat({ title, user_id: user?.id });
      const chat = data?.data || data;
      setChats((prev) => [chat, ...prev]);
      setCurrentChatId(chat.id);
      setMessages([]);
      closeSidebar();
    } catch (err) {
      console.warn("createChat error:", err);
      Alert.alert("Error", "Could not create chat. Try again.");
    } finally {
      setCreatingChat(false);
    }
  };

  const loadMessages = async (chatId) => {
    if (!chatId) return;
    try {
      const data = await getMessages(chatId);
      const list = data?.data || data || [];
      const uiMessages = list.map((m) => ({
        id: String(m.id || m._id || Date.now()),
        role: m.role || (m.from === "user" ? "user" : "assistant"),
        text: m.text || m.content || "",
        image: m.image_url || null,
      }));
      setMessages(uiMessages.length ? uiMessages : []);
    } catch (err) {
      console.warn("loadMessages error:", err);
    }
  };

  const saveMessageDB = async (chatId, message) => {
    if (!chatId) return;
    try {
      await postMessage(chatId, {
        role: message.role,
        text: message.text,
        image_url: message.image || null,
        user_id: user?.id,
      });
    } catch (err) {
      console.warn("saveMessageDB error:", err);
    }
  };

  useEffect(() => { if (user) loadChats(); }, [user]);

  /* ---------------- image handlers ---------------- */
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return alert("Gallery permission required");
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
    if (!result.canceled) setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return alert("Camera permission required");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled) setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  };

  /* ---------------- parseAIReply ---------------- */
  const parseAIReply = (aiReply) => {
    if (!aiReply) return "No response from assistant.";
    if (typeof aiReply === "string") return aiReply;
    if (Array.isArray(aiReply)) {
      return aiReply.map((p) => (typeof p === "string" ? p : p.text || p.content || JSON.stringify(p))).join("\n").trim();
    }
    if (typeof aiReply === "object") {
      if (aiReply.choices && Array.isArray(aiReply.choices)) {
        return aiReply.choices.map((c) => c.text || c.message?.content || JSON.stringify(c)).join("\n").trim();
      }
      return aiReply.message?.content || aiReply.content || aiReply.text || JSON.stringify(aiReply);
    }
    return String(aiReply);
  };

  /* ---------------- sendMessage ---------------- */
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed && !pendingImage) return;
    if (isSending) return;
    if (!currentChatId) {
      Alert.alert("No chat selected", "Please create or select a chat from the menu.");
      return;
    }

    setIsSending(true);
    const userMsg = { id: Date.now().toString(), role: "user", text: trimmed, image: pendingImage?.uri || null, json: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    saveMessageDB(currentChatId, userMsg).catch(() => {});

    const formattedMessages = [
      { role: "system", content: "You are a helpful Vastu assistant." },
      ...messages.map((m) => ({ role: m.role, content: m.text || "" })),
    ];
    const contentPayload = [];
    if (trimmed) contentPayload.push({ type: "text", text: trimmed });
    if (pendingImage?.base64) contentPayload.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${pendingImage.base64}` } });
    formattedMessages.push({ role: "user", content: contentPayload });
    setPendingImage(null);

    try {
      const aiRawReply = await chatWithOpenRouter(formattedMessages);
      const parsed = parseAIReply(aiRawReply);
      const botMsg = { id: (Date.now() + 1).toString(), role: "assistant", text: parsed, image: null, json: aiRawReply };
      setMessages((prev) => [...prev, botMsg]);
      saveMessageDB(currentChatId, botMsg).catch(() => {});
      loadChats();
    } catch (err) {
      console.warn("chatWithOpenRouter error:", err);
      const errMsg = { id: (Date.now() + 2).toString(), role: "assistant", text: "Sorry — I couldn't get a response. Please try again.", image: null };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------- sidebar animation control ---------------- */
  const openSidebar = () => {
    Animated.timing(sidebarAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setSidebarOpen(true);
  };
  const closeSidebar = () => {
    Animated.timing(sidebarAnim, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setSidebarOpen(false));
  };

  /* ---------------- render helpers ---------------- */
  const renderMessage = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          {item.image && <Image source={{ uri: item.image }} style={styles.chatImage} />}
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isSending) return <View style={{ height: 8 }} />;
    return (
      <View style={{ paddingVertical: 6 }}>
        <View style={[styles.messageRow, { justifyContent: "flex-start" }]}>
          <View style={[styles.bubble, styles.bubbleBot]}>
            <TypingIndicator />
          </View>
        </View>
      </View>
    );
  };

  const onSelectChat = async (chat) => {
    setCurrentChatId(chat.id);
    closeSidebar();
    await loadMessages(chat.id);
  };

  const onCreateChatPress = () => onCreateChat("New chat");

  const renderChatItem = ({ item }) => {
    const active = item.id === currentChatId;
    return (
      <TouchableOpacity style={[styles.chatItem, active && styles.chatItemActive]} onPress={() => onSelectChat(item)}>
        <View style={styles.chatThumb}><Text style={styles.chatThumbText}>{(item.title || "Chat").charAt(0)}</Text></View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text numberOfLines={1} style={styles.chatTitle}>{item.title || "Untitled Chat"}</Text>
          <Text numberOfLines={1} style={styles.chatPreview}>{item.last_message || item.preview || ""}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- layout ---------------- */
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.container}>
          {/* Header (stays fixed and NOT moved) */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity style={styles.sidebarToggle} onPress={openSidebar}><Text style={styles.sidebarToggleText}>☰</Text></TouchableOpacity>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.headerTitle}>Vastu AI Talk 🤖</Text>
                <Text style={styles.headerSubtitle}>{isSending ? "Thinking..." : "Ask anything"}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
            </TouchableOpacity>
          </View>

          {/* Chat area */}
          <Animated.View style={[styles.chatWrap, { transform: [{ scale: mainScale }] }]}>
            <View style={styles.chatBox}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={renderFooter}
              />
            </View>

            {pendingImage && (
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: pendingImage.uri }} style={styles.previewImg} />
                <TouchableOpacity onPress={() => setPendingImage(null)}><Text style={styles.removeImg}>✖</Text></TouchableOpacity>
              </View>
            )}

            <View style={[styles.inputRow, { marginBottom: keyboardVisible ? 0 : 50 }]}>
              <TouchableOpacity onPress={takePhoto} style={styles.iconBtn}><Text style={styles.iconText}>📷</Text></TouchableOpacity>
              <TouchableOpacity onPress={pickImageFromGallery} style={styles.iconBtn}><Text style={styles.iconText}>🖼</Text></TouchableOpacity>
              <TextInput style={styles.input} placeholder="Message..." value={input} onChangeText={setInput} multiline />
              <TouchableOpacity style={[styles.sendBtn, isSending && { opacity: 0.75 }]} onPress={sendMessage} disabled={isSending}>
                {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendText}>➤</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Backdrop (dim the rest) */}
          <Animated.View pointerEvents={sidebarOpen ? "auto" : "none"} style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSidebar} />
          </Animated.View>

          {/* Animated Sidebar (overlay, full top->bottom, 70% width) */}
          <Animated.View style={[styles.sidebarAnimated, { width: SIDEBAR_WIDTH, transform: [{ translateX: sidebarTranslateX }] }]}>
            <View style={styles.sidebarContent}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Chats</Text>
                <TouchableOpacity onPress={onCreateChatPress} style={styles.newChatBtn}>
                  {creatingChat ? <ActivityIndicator color="#fff" /> : <Text style={styles.newChatBtnText}>＋ New</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.sidebarList}>
                {loadingChats ? (
                  <ActivityIndicator />
                ) : (
                  <FlatList data={chats} keyExtractor={(i) => String(i.id)} renderItem={renderChatItem} ListEmptyComponent={<View style={{ padding: 12 }}><Text style={{ color: "#6d4c41" }}>No chats yet — create one.</Text></View>} />
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

/* ---------------- styles ---------------- */
const ORANGE = "#FFB74D";
const LIGHT_ORANGE = "#FFF3E0";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT_ORANGE, paddingTop: Platform.OS === "android" ? 22 : 0 },
  container: { flex: 1, position: "relative" },

  /* Header */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, zIndex: 10, backgroundColor: "transparent" },
  sidebarToggle: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FFE6C4" },
  sidebarToggleText: { fontSize: 18 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#D35400" },
  headerSubtitle: { fontSize: 12, color: "#6D4C41" },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#D35400", backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700" },

  /* chat area (fills screen under header) */
  chatWrap: { flex: 1, paddingHorizontal: 14, paddingBottom: 10 },
  chatBox: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#FFE0B2", padding: 10, marginTop: 6 },
  messageRow: { marginVertical: 4, flexDirection: "row" },
  bubble: { maxWidth: "80%", padding: 10, borderRadius: 14 },
  bubbleUser: { backgroundColor: ORANGE },
  bubbleBot: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#FFD699" },
  messageText: { color: "#4E342E", fontSize: 14 },
  chatImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 6 },

  /* input */
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 10, paddingHorizontal: 2 },
  iconBtn: { backgroundColor: "#FFE6C4", padding: 8, borderRadius: 10 },
  iconText: { fontSize: 18 },
  input: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, maxHeight: 130 },
  sendBtn: { backgroundColor: ORANGE, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  sendText: { color: "#fff", fontWeight: "700" },
  imagePreviewBox: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  previewImg: { width: 70, height: 70, borderRadius: 10 },
  removeImg: { fontSize: 20, color: "#D84315" },
  typingContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: 46, height: 22 },

  /* backdrop dims remaining 30% */
  backdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#000", zIndex: 18 },

  /* sidebar animated overlay (left) */
  sidebarAnimated: { position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 20 },
  sidebarContent: { flex: 1, backgroundColor: "#FFF", paddingTop: Platform.OS === "android" ? 22 : 44, borderRightWidth: 1, borderRightColor: "#FFE0B2" },
  sidebarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12 },
  sidebarTitle: { fontWeight: "700", color: "#D35400", fontSize: 18 },
  newChatBtn: { backgroundColor: ORANGE, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  newChatBtnText: { color: "#fff", fontWeight: "700" },
  sidebarList: { flex: 1, paddingHorizontal: 6 },

  /* chat list items */
  chatItem: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, marginVertical: 6 },
  chatItemActive: { backgroundColor: "#FFF7EA" },
  chatThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#FFE6C4", alignItems: "center", justifyContent: "center" },
  chatThumbText: { color: "#D35400", fontWeight: "700" },
  chatTitle: { fontWeight: "700", color: "#4E342E" },
  chatPreview: { fontSize: 12, color: "#6D4C41" },
});

