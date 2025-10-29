import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMessaging } from "../hooks/useMessaging";

export default function TripMessagingModal({
  visible,
  onClose,
  tripMatch,
  currentUserId,
}) {
  const [messageText, setMessageText] = useState("");
  const scrollViewRef = useRef(null);
  
  const {
    messages,
    isLoading,
    isSending,
    networkError,
    hasNewMessages,
    unreadCount,
    sendMessage,
    markAsRead,
  } = useMessaging(tripMatch?.matchId, 3000, visible);

  const isOrganizer = tripMatch?.organizer?.userId === currentUserId;
  const otherUser = isOrganizer ? tripMatch?.companion : tripMatch?.organizer;

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const success = await sendMessage(messageText);
    if (success) {
      setMessageText("");
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isMyMessage = (message) => {
    return message.senderId === currentUserId;
  };

  // Mark messages as read when modal opens
  useEffect(() => {
    if (visible && hasNewMessages) {
      setTimeout(() => markAsRead(), 1000);
    }
  }, [visible, hasNewMessages, markAsRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (!tripMatch) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>
                  Chat with {otherUser?.userName}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Trip to {tripMatch.tripDetails?.destination}
                </Text>
              </View>
            </View>
            {networkError && (
              <View style={styles.errorBadge}>
                <Ionicons name="warning-outline" size={16} color="#ff6b6b" />
              </View>
            )}
          </View>

          {/* Messages List */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {isLoading && messages.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={styles.loadingText}>Loading messages...</ThemedText>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>💬</ThemedText>
                <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Start a conversation with your trip companion!
                </ThemedText>
              </View>
            ) : (
              messages.map((message, index) => {
                const isMine = isMyMessage(message);
                // Use combination of messageId and index to ensure uniqueness
                const uniqueKey = `${message.messageId}-${index}`;
                return (
                  <View
                    key={uniqueKey}
                    style={[
                      styles.messageContainer,
                      isMine ? styles.myMessageContainer : styles.theirMessageContainer,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isMine ? styles.myMessageBubble : styles.theirMessageBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMine ? styles.myMessageText : styles.theirMessageText,
                        ]}
                      >
                        {message.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isMine ? styles.myMessageTime : styles.theirMessageTime,
                        ]}
                      >
                        {formatMessageTime(message.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Network Error Display */}
          {networkError && (
            <View style={styles.networkErrorContainer}>
              <Text style={styles.networkErrorText}>
                ⚠️ {networkError}
              </Text>
            </View>
          )}

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <Text style={styles.sendButtonText}>...</Text>
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    backgroundColor: "#1c52c8",
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  errorBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 4,
  },
  messagesList: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  myMessageContainer: {
    alignSelf: "flex-end",
  },
  theirMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "100%",
  },
  myMessageBubble: {
    backgroundColor: "#1c52c8",
    borderBottomRightRadius: 6,
  },
  theirMessageBubble: {
    backgroundColor: "#e5e7eb",
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: "white",
  },
  theirMessageText: {
    color: "#374151",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "right",
  },
  theirMessageTime: {
    color: "#6b7280",
  },
  networkErrorContainer: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  networkErrorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    color: "#374151",
    backgroundColor: "#f9fafb",
  },
  sendButton: {
    backgroundColor: "#1c52c8",
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});