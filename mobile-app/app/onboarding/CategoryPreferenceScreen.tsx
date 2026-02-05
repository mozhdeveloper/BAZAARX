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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Search, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryPreference'>;

const CATEGORIES = [
  { id: 'electronics', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
  { id: 'fashion', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300' },
  { id: 'home-garden', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300' },
  { id: 'beauty', name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
  { id: 'sports', name: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300' },
];

const { width } = Dimensions.get('window');
const COLUMN_count = 2;
const GAP = 12;
const PADDING = 20;
const ITEM_WIDTH = (width - (PADDING * 2) - GAP) / COLUMN_count;

export default function CategoryPreferenceScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(prev => prev.filter(catId => catId !== id));
    } else {
      if (selectedCategories.length < 3) {
        setSelectedCategories(prev => [...prev, id]);
      }
    }
  };

  const handleContinue = () => {
    navigation.navigate('AddressSetup', { signupData: route.params.signupData });
  };

  const filteredCategories = CATEGORIES.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: typeof CATEGORIES[0] }) => {
    const isSelected = selectedCategories.includes(item.id);
    return (
      <Pressable
        style={[styles.itemContainer, isSelected && styles.itemSelectedBorder]}
        onPress={() => toggleCategory(item.id)}
      >
        <ImageBackground
            source={{ uri: item.image }}
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
      {/* STANDARD HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
             <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={24} color="#111827" />
             </Pressable>
             <Text style={styles.headerTitle}>Interests</Text>
             <View style={{ width: 24 }} />
        </View>
        <Text style={styles.headerSubtitle}>Pick up to 3 categories to start</Text>
        
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
      </View>

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
                {selectedCategories.length}/3 <Text style={{fontWeight: '400'}}>Selected</Text>
            </Text>
        </View>
        <Pressable
          style={[styles.button, selectedCategories.length === 0 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={selectedCategories.length === 0}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
        <Pressable 
            style={styles.skipButton}
            onPress={() => navigation.navigate('AddressSetup', { signupData: route.params.signupData })}
        >
            <Text style={styles.skipText}>Skip for now</Text>
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
    height: ITEM_WIDTH, // Square
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
    backgroundColor: '#FF6A00',
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
  skipButton: {
      alignItems: 'center',
      padding: 8
  },
  skipText: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '600'
  }
});
