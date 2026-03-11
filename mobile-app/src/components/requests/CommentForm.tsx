import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useCommentStore } from '@/stores/commentStore';
import type { CommentType } from '@/stores/commentStore';
import { COLORS } from '@/constants/theme';

interface CommentFormProps {
  requestId: string;
  onSubmitted?: () => void;
}

const TYPE_OPTIONS: { type: CommentType; label: string; bc: number; desc: string }[] = [
  { type: 'sourcing', label: 'Sourcing', bc: 150, desc: 'Supplier / price info (Lab only)' },
  { type: 'qc',       label: 'QC',       bc: 50,  desc: 'Quality check details' },
  { type: 'general',  label: 'General',  bc: 25,  desc: 'Market insight or feedback' },
];

const PLACEHOLDERS: Record<CommentType, string> = {
  sourcing: 'Share supplier details, pricing, or sourcing leads…',
  qc:       'Describe quality requirements or inspection notes…',
  general:  'Share your market insights or general feedback…',
};

export const CommentForm: React.FC<CommentFormProps> = ({ requestId, onSubmitted }) => {
  const { postComment, isPosting } = useCommentStore();
  const [selectedType, setSelectedType] = useState<CommentType>('general');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const success = await postComment(requestId, selectedType, content.trim());
    if (success) {
      setContent('');
      onSubmitted?.();
    }
  };

  const selected = TYPE_OPTIONS.find((o) => o.type === selectedType)!;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Contribution Type</Text>
      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.type}
            style={[styles.typeBtn, selectedType === opt.type && styles.typeBtnSelected]}
            onPress={() => setSelectedType(opt.type)}
          >
            <Text style={[styles.typeBtnLabel, selectedType === opt.type && styles.typeBtnLabelSelected]}>
              {opt.label}
            </Text>
            <Text style={[styles.typeBtnBC, selectedType === opt.type && styles.typeBtnBCSelected]}>
              +{opt.bc} BC
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.typeDesc}>{selected.desc}</Text>

      <TextInput
        style={styles.textarea}
        placeholder={PLACEHOLDERS[selectedType]}
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={content}
        onChangeText={setContent}
        editable={!isPosting}
      />

      <Pressable
        style={[styles.submitBtn, (!content.trim() || isPosting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!content.trim() || isPosting}
      >
        {isPosting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>
            Submit · +{selected.bc} BC
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  typeBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  typeBtnLabelSelected: {
    color: COLORS.primary,
  },
  typeBtnBC: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  typeBtnBCSelected: {
    color: COLORS.primary,
  },
  typeDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 90,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
