import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { ArrowLeft, User, Mail, Shield, Clock, LogOut, CheckCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminAuth } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';
import { safeImageUri, PLACEHOLDER_AVATAR } from '../../../src/utils/imageUtils';

export default function AdminProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAdminAuth();

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    logout();
    navigation.navigate('Login' as never);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Account settings</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: safeImageUri(user.avatar, PLACEHOLDER_AVATAR) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'A'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'admin@bazaarph.com'}</Text>
          <View style={styles.roleBadge}>
            <Shield size={14} color={COLORS.primary} />
            <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase() || 'SUPER ADMIN'}</Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account Information</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <User size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'Admin User'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Mail size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || 'admin@bazaarph.com'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Shield size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role?.replace('_', ' ') || 'Super Admin'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Clock size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Login</Text>
              <Text style={styles.infoValue}>{formatDate(user?.lastLogin)}</Text>
            </View>
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Permissions & Access</Text>
          <Text style={styles.cardDescription}>Resources you have access to manage</Text>
          
          {user?.permissions && user.permissions.length > 0 ? (
            user.permissions.map((permission) => (
              <View key={permission.id} style={styles.permissionItem}>
                <CheckCircle size={18} color="#059669" />
                <View style={styles.permissionContent}>
                  <Text style={styles.permissionName}>{permission.name}</Text>
                  {permission.description && (
                    <Text style={styles.permissionDesc}>{permission.description}</Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.permissionItem}>
              <CheckCircle size={18} color="#059669" />
              <View style={styles.permissionContent}>
                <Text style={styles.permissionName}>Full Access</Text>
                <Text style={styles.permissionDesc}>Access to all platform resources</Text>
              </View>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  scrollView: { flex: 1, padding: 16 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, marginBottom: 16, alignItems: 'center', elevation: 2 },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  userName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF5F0' },
  roleText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDescription: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoIconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#111827' },
  permissionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  permissionContent: { flex: 1 },
  permissionName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  permissionDesc: { fontSize: 12, color: '#6B7280' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 10, borderWidth: 2, borderColor: '#FEE2E2', marginBottom: 24 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
});
