import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, MessageCircle, Store } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import type { Ticket } from '../types/ticketTypes';

export default function TicketListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused && user?.id) {
      loadTickets();
    }
  }, [isFocused, user?.id]);

  const loadTickets = async () => {
    let userId = user?.id;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) return;
    
    setLoading(true);
    try {
      const data = await TicketService.fetchTickets(userId);
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    let userId = user?.id;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) return;
    
    setRefreshing(true);
    try {
      const data = await TicketService.fetchTickets(userId);
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'open': return '#3B82F6';
        case 'in_progress': return '#F59E0B';
        case 'waiting_response': return '#8B5CF6';
        case 'resolved': return '#10B981';
        case 'closed': return '#6B7280';
        default: return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: Ticket }) => (
    <Pressable 
      style={styles.ticketCard}
      onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
    >
        <View style={styles.cardHeader}>
            <Text style={styles.ticketId}>#{item.id.substring(0, 8).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
        </View>
        
        <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        
        {item.sellerStoreName && (
            <View style={styles.storeInfo}>
                <Store size={14} color="#6B7280" />
                <Text style={styles.storeName}>{item.sellerStoreName}</Text>
            </View>
        )}
        
        <View style={styles.cardFooter}>
            <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.categoryName || 'General'}</Text>
            </View>
            <Text style={styles.dateText}>
                {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
        </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <Pressable 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateTicket')}
        >
            <Plus size={24} color={COLORS.primary} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
                <MessageCircle size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptyText}>You haven't created any support tickets yet.</Text>
            <Pressable 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateTicket')}
            >
                <Text style={styles.emptyButtonText}>Create New Ticket</Text>
            </Pressable>
        </View>
      ) : (
        <FlatList
            data={tickets}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  createButton: {
      padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
      padding: 16,
  },
  ticketCard: {
      backgroundColor: '#FFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  ticketId: {
      fontSize: 12,
      color: '#6B7280',
      fontWeight: '600',
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
  },
  statusText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
  },
  subject: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 4,
  },
  description: {
      fontSize: 14,
      color: '#4B5563',
      marginBottom: 12,
      lineHeight: 20,
  },
  storeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      backgroundColor: '#F9FAFB',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
  },
  storeName: {
      fontSize: 12,
      color: '#6B7280',
      marginLeft: 4,
      fontWeight: '500',
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  categoryBadge: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
  },
  categoryText: {
      fontSize: 12,
      color: '#4B5563',
      fontWeight: '500',
  },
  dateText: {
      fontSize: 12,
      color: '#9CA3AF',
  },
  emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
  },
  emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#E5E7EB',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
  },
  emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 8,
  },
  emptyText: {
      fontSize: 16,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 32,
  },
  emptyButton: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
  },
  emptyButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
  },
});
