import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Folder, Heart, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../constants/theme';

interface FolderCardProps {
    name: string;
    itemCount: number;
    thumbnailUrl?: string;
    isDefault?: boolean;
    onPress: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ name, itemCount, thumbnailUrl, isDefault, onPress }) => {
    return (
        <Pressable 
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed
            ]}
        >
            <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                    <View style={[styles.folderThumbnail, isDefault ? styles.defaultIcon : styles.customIcon]}>
                        {thumbnailUrl ? (
                            <Image 
                                source={{ uri: thumbnailUrl }} 
                                style={styles.thumbnailImage} 
                                contentFit="cover"
                            />
                        ) : isDefault ? (
                            <Heart size={24} color={COLORS.primary} fill={COLORS.primary} />
                        ) : (
                            <Folder size={24} color="#D1D5DB" strokeWidth={1.5} />
                        )}
                    </View>
                </View>
                
                <View style={styles.infoContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.name} numberOfLines={1}>{name}</Text>
                        <Text style={styles.itemCountBadge}>
                            {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
                        </Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
        backgroundColor: '#FAFAFA',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
    },
    folderThumbnail: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    defaultIcon: {
        backgroundColor: '#FFF7ED',
    },
    customIcon: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary,
        flex: 1,
        marginRight: 8,
    },
    itemCountBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 0.5,
    },
    metadataText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 0.8,
    },
});
