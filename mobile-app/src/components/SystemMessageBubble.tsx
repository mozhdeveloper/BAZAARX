import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react-native';

interface SystemMessageBubbleProps {
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const getEventIcon = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) return null;

  const eventType = metadata.event_type as string;

  switch (eventType) {
    case 'pending':
      return <Clock size={16} color="#8B5CF6" strokeWidth={2} />;
    case 'confirmed':
      return <CheckCircle size={16} color="#10B981" strokeWidth={2} />;
    case 'processing':
      return <Package size={16} color="#F59E0B" strokeWidth={2} />;
    case 'shipped':
      return <Truck size={16} color="#3B82F6" strokeWidth={2} />;
    case 'out_for_delivery':
      return <Truck size={16} color="#06B6D4" strokeWidth={2} />;
    case 'delivered':
      return <CheckCircle size={16} color="#14B8A6" strokeWidth={2} />;
    case 'cancelled':
      return <XCircle size={16} color="#EF4444" strokeWidth={2} />;
    default:
      return <AlertCircle size={16} color="#6B7280" strokeWidth={2} />;
  }
};

export default function SystemMessageBubble({
  content,
  metadata,
  createdAt,
}: SystemMessageBubbleProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Clean content by removing the "📋 System: " prefix if present
  const cleanContent = content
    .replace(/^📋\s*System:\s*/, '')
    .trim();

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {getEventIcon(metadata)}
        </View>

        {/* Message */}
        <View style={styles.contentContainer}>
          <Text style={styles.label}>System Update</Text>
          <Text style={styles.message} numberOfLines={0}>
            {cleanContent}
          </Text>
        </View>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {formatTime(createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
    gap: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '85%',
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontWeight: '400',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
