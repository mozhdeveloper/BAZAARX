import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, ArrowLeft, MessageSquare } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../src/constants/theme';
import AIChatModal from '../src/components/AIChatModal';

export default function MessagesScreen() {
  const navigation = useNavigation();
  const [showAIChat, setShowAIChat] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <Pressable onPress={() => setShowAIChat(true)} style={styles.aiButton}>
          <Bot size={24} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.emptyState}>
          <View style={styles.iconContainer}>
            <MessageSquare size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Chat with sellers or use our AI assistant for help!</Text>
          
          <Pressable style={styles.startChatButton} onPress={() => setShowAIChat(true)}>
             <Bot size={20} color="#FFF" style={{ marginRight: 8 }} />
             <Text style={styles.startChatText}>Ask AI Assistant</Text>
          </Pressable>
        </View>
      </ScrollView>

      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  aiButton: { padding: 8, backgroundColor: '#FFF5F0', borderRadius: 12 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyState: { alignItems: 'center', maxWidth: 280 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  startChatText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
