import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Paperclip, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import type { TicketCategory } from '../types/ticketTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTicket'>;

const CATEGORIES: TicketCategory[] = ['Order', 'Account', 'Payment', 'Technical', 'Other'];

export default function CreateTicketScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Order');
  const [showcategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe your issue.');
      return;
    }

    setLoading(true);
    try {
      await TicketService.createTicket({
        category,
        subject,
        description,
        priority: 'medium', // Default
      });
      Alert.alert('Success', 'Ticket created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={28} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Create New Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Category Selection */}
        <Text style={styles.label}>What can we help you with?</Text>
        <Pressable 
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(!showcategoryPicker)}
        >
            <Text style={styles.pickerButtonText}>{category}</Text>
            <ChevronDown size={24} color="#6B7280" />
        </Pressable>

        {showcategoryPicker && (
            <View style={styles.pickerContainer}>
                {CATEGORIES.map((cat) => (
                    <Pressable 
                        key={cat} 
                        style={[styles.pickerItem, category === cat && styles.pickerItemSelected]}
                        onPress={() => {
                            setCategory(cat);
                            setShowCategoryPicker(false);
                        }}
                    >
                        <Text style={[styles.pickerItemText, category === cat && styles.pickerItemTextSelected]}>
                            {cat}
                        </Text>
                    </Pressable>
                ))}
            </View>
        )}

        {/* Subject */}
        <Text style={styles.label}>Subject</Text>
        <TextInput
            style={styles.input}
            placeholder="Brief summary of issue"
            placeholderTextColor="#9CA3AF"
            value={subject}
            onChangeText={setSubject}
            maxLength={50}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please describe your issue in detail..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
        />

        {/* Attachments Placeholder */}
        <Pressable style={styles.attachButton} onPress={() => Alert.alert('Coming Soon', 'Attachment upload will be available soon.')}>
            <Paperclip size={20} color="#6B7280" />
            <Text style={styles.attachButtonText}>Attach Photo or Screenshot</Text>
        </Pressable>

      </ScrollView>

      {/* Footer / Submit Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
              {loading ? (
                  <ActivityIndicator color="#FFF" />
              ) : (
                  <Text style={styles.submitButtonText}>Submit Ticket</Text>
              )}
          </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
  },
  pickerButtonText: {
      fontSize: 16,
      color: '#111827',
  },
  pickerContainer: {
      marginTop: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  pickerItem: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
      backgroundColor: '#FEF3E8',
  },
  pickerItemText: {
      fontSize: 16,
      color: '#374151',
  },
  pickerItemTextSelected: {
      color: '#E65100', // Deep Orange
      fontWeight: '600',
  },
  input: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#111827',
  },
  textArea: {
      height: 150,
  },
  attachButton: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderStyle: 'dashed',
      borderRadius: 12,
      backgroundColor: '#F9FAFB',
  },
  attachButtonText: {
      marginLeft: 8,
      fontSize: 16,
      color: '#6B7280',
      fontWeight: '500',
  },
  footer: {
      paddingHorizontal: 24,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingTop: 16,
  },
  submitButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
  },
  submitButtonDisabled: {
      opacity: 0.7,
  },
  submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
  },
});
