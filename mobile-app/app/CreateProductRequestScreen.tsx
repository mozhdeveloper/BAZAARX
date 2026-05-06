/**
 * CreateProductRequestScreen — Epic 7 (BX-07-001, BX-07-024)
 * Full-screen form for submitting a new product request with all Epic 7 fields:
 * title, category, description/summary, reference_links[], estimated_demand.
 *
 * Cross-platform: KeyboardAvoidingView, Platform shadows, safe-area insets.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Package,
  Link2,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProductRequest'>;

const CATEGORIES = [
  'Fruits & Vegetables',
  'Seafood',
  'Meat & Poultry',
  'Coffee & Tea',
  'Rice & Grains',
  'Snacks & Beverages',
  'Handicrafts',
  'Phone Accessories',
  'Home & Kitchen',
  'Health & Beauty',
  'Sports & Outdoors',
  'Office & Work-from-Home',
  'Other',
];

export default function CreateProductRequestScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [description, setDescription] = useState('');
  const [refLink, setRefLink] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ─── Validation ────────────────────────────────────────────
  const isValid = title.trim().length >= 3 && category !== '' && description.trim().length >= 10;


  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    try {
      // Resolve profile name
      let requestedByName = 'Anonymous Buyer';
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        if (profile) {
          requestedByName =
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Buyer';
        }
      }

      const trimmedLink = refLink.trim();
      const filteredLinks = trimmedLink ? [trimmedLink] : [];

      const payload = {
        product_name: title.trim(),
        title: title.trim(),
        description: description.trim(),
        summary: description.trim(),
        category,
        requested_by_name: requestedByName,
        requested_by_id: user?.id ?? null,
        reference_links: filteredLinks,
        status: 'new',
        priority: 'medium',
      };

      const { error } = await supabase.from('product_requests').insert(payload);

      if (error) {
        if (error.message?.includes('row-level security')) {
          // Edge Function fallback
          const { error: fnErr } = await supabase.functions.invoke('submit-product-request', {
            body: {
              productName: title.trim(),
              description: description.trim(),
              category,
              requestedByName,
              requestedById: user?.id,
              referenceLinks: filteredLinks,
            },
          });
          if (fnErr) throw fnErr;
        } else {
          throw error;
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Submission failed', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <View style={[styles.root, styles.successRoot, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successCard}>
          <CheckCircle2 size={56} color="#16A34A" />
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successSub}>
            Your product request has been received. The community can support it to help
            it move forward.
          </Text>
          <Pressable
            style={styles.successBtn}
            onPress={() => (navigation as any).navigate('MyRequests')}
          >
            <Text style={styles.successBtnText}>View My Requests</Text>
          </Pressable>
          <Pressable
            style={styles.successBtnOutline}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.successBtnOutlineText}>Back to Discover</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={COLORS.textHeadline} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Package size={18} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Request a Product</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow */}
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowTitle}>Submit a Product Request</Text>
          <Text style={styles.eyebrowSub}>
            Describe what you're looking for. Other buyers can support your request to
            help it get sourced.
          </Text>
        </View>

        {/* ── PRODUCT TITLE ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Product Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, title.trim().length > 0 && title.trim().length < 3 && styles.inputError]}
            placeholder="e.g. Durable braided USB-C cable, 2 m"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            returnKeyType="next"
          />
          <Text style={styles.fieldHint}>{title.length}/120 characters</Text>
        </View>

        {/* ── CATEGORY ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <Pressable
            style={[styles.input, styles.pickerRow]}
            onPress={() => setShowCategories(!showCategories)}
          >
            <Text style={category ? styles.pickerValue : styles.pickerPlaceholder}>
              {category || 'Select a category…'}
            </Text>
            <ChevronDown size={16} color={COLORS.textMuted} style={{ transform: [{ rotate: showCategories ? '180deg' : '0deg' }] }} />
          </Pressable>
          {showCategories && (
            <View style={styles.categoryDropdown}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryOption, category === cat && styles.categoryOptionSelected]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategories(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat && styles.categoryOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                  {category === cat && <CheckCircle2 size={14} color={COLORS.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── DESCRIPTION ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textarea, description.trim().length > 0 && description.trim().length < 10 && styles.inputError]}
            placeholder="Describe the product, key specs, why you need it, and what alternatives you've tried…"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
          />
          <Text style={styles.fieldHint}>{description.length}/1000 characters · min 10 chars</Text>
        </View>

        {/* ── REFERENCE LINK ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Reference Link (optional)</Text>
          <Text style={styles.refLinkHint}>
            Link to a similar product, supplier page, or spec sheet
          </Text>
          <View style={styles.refLinkRow}>
            <Link2 size={15} color={COLORS.textMuted} style={styles.refLinkIcon} />
            <TextInput
              style={styles.refLinkInput}
              placeholder="https://..."
              placeholderTextColor={COLORS.textMuted}
              value={refLink}
              onChangeText={setRefLink}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* ── HINT BOX ── */}
        <View style={styles.hintBox}>
          <Text style={styles.hintBoxTitle}>📋 What happens next?</Text>
          <Text style={styles.hintBoxText}>
            Once submitted, your request becomes visible to the community. Other buyers
            can support it. When it gathers enough interest, our team contacts suppliers
            and works to bring it to the marketplace.
          </Text>
        </View>

        {/* ── SUBMIT ── */}
        <Pressable
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitText}>Submit Request</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...shadow,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textHeadline },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 4 },

  // Eyebrow
  eyebrow: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  eyebrowTitle: { fontSize: 15, fontWeight: '800', color: '#166534', marginBottom: 6 },
  eyebrowSub: { fontSize: 13, color: '#15803D', lineHeight: 18 },

  // Form fields
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textHeadline, marginBottom: 8 },
  required: { color: COLORS.error },
  fieldHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 5 },
  refLinkHint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10, marginTop: -4 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: COLORS.textHeadline,
    ...shadow,
  },
  inputError: { borderColor: COLORS.error },
  textarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textHeadline,
    minHeight: 110,
    ...shadow,
  },

  // Category picker
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: { fontSize: 14, color: COLORS.textHeadline },
  pickerPlaceholder: { fontSize: 14, color: COLORS.textMuted },
  categoryDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    ...shadow,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionSelected: { backgroundColor: '#FFF4EC' },
  categoryOptionText: { fontSize: 13, color: COLORS.textHeadline },
  categoryOptionTextSelected: { color: COLORS.primary, fontWeight: '700' },

  // Ref links
  refLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    ...shadow,
  },
  refLinkIcon: { marginRight: 6 },
  refLinkInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textHeadline,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
  },
  refLinkRemove: { padding: 6, marginLeft: 4 },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Hint box
  hintBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  hintBoxTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  hintBoxText: { fontSize: 12, color: '#1E40AF', lineHeight: 18 },

  // Submit
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    ...shadow,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

  // Success
  successRoot: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    ...shadow,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textHeadline, marginTop: 16, marginBottom: 10 },
  successSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  successBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  successBtnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  successBtnOutlineText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
});
