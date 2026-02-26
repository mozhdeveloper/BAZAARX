import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  TextInput,
  ImageBackground,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Search, ArrowLeft } from 'lucide-react-native';
import { safeImageUri } from '../../src/utils/imageUtils';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authService } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS } from '../../src/constants/theme';

// IMPORT THE NEW DATA FILE HERE
import { categories, type Category } from '../../src/data/categories';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryPreference'>;

const { width } = Dimensions.get('window');
const COLUMN_count = 2;
const GAP = 12;
const PADDING = 20;
const ITEM_WIDTH = (width - (PADDING * 2) - GAP) / COLUMN_count;

export default function CategoryPreferenceScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get signup data passed from previous screens
  const { signupData } = route.params || {};

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(prev => prev.filter(catId => catId !== id));
    } else {
      setSelectedCategories(prev => [...prev, id]);
    }
  };

  const handleFinishOnboarding = async () => {
    // Validation: Ensure at least 3 categories are selected
    if (selectedCategories.length < 3) {
      Alert.alert("Selection Required", "Please select at least 3 interests to continue.");
      return;
    }

    if (!signupData) {
      Alert.alert("Error", "Missing signup information.");
      return;
    }

    setIsSaving(true);

    try {
      const success = await useAuthStore.getState().signUp(
        signupData.email,
        signupData.password,
        {
          full_name: `${signupData.firstName} ${signupData.lastName}`.trim(),
          phone: signupData.phone,
          user_type: 'buyer',
          preferences: { interestedCategories: selectedCategories }
        }
      );

      if (!success) throw new Error('Signup failed. Please try again.');

      Alert.alert('Success', 'Welcome to BazaarX!', [
        {
          text: 'Get Started',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }
      ]);

    } catch (error: any) {
      console.error('Signup Error:', error);
      Alert.alert('Error', error.message || 'Failed to create account.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategories.includes(item.id);
    return (
      <Pressable
        style={[styles.itemContainer, isSelected && styles.itemSelectedBorder]}
        onPress={() => toggleCategory(item.id)}
      >
        <ImageBackground
          source={{ uri: safeImageUri(item.image) }}
          style={styles.imageBackground}
          imageStyle={{ borderRadius: 12 }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}
          >
            <Text style={styles.itemText}>{item.name}</Text>
          </LinearGradient>

          {isSelected && (
            <View style={styles.checkIcon}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </ImageBackground>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Interests</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={[styles.headerSubtitle, { color: COLORS.textMuted }]}>Select at least 3 categories</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <FlatList
        data={filteredCategories}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={COLUMN_count}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {selectedCategories.length} <Text style={{ fontWeight: '400' }}>Selected</Text>
          </Text>
        </View>

        <Pressable
          style={[styles.button, selectedCategories.length < 3 && styles.buttonDisabled]}
          onPress={handleFinishOnboarding}
          disabled={selectedCategories.length < 3 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Finish Setup</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  listContent: {
    padding: PADDING,
    paddingTop: 20,
  },
  columnWrapper: {
    gap: GAP,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: 16,
    marginBottom: GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#FFF',
  },
  itemSelectedBorder: {
    borderWidth: 3,
    borderColor: '#FF6A00',
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientOverlay: {
    height: '50%',
    justifyContent: 'flex-end',
    padding: 12,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6A00',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  progressText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700'
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});