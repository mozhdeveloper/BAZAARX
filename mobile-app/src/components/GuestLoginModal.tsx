import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import { X, LogIn, UserPlus } from 'lucide-react-native';
import { RootStackParamList } from '../../App';

interface GuestLoginModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
  hideCloseButton?: boolean;
  cancelText?: string;
}

const { width } = Dimensions.get('window');

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({ 
  visible, 
  onClose,
  message = "Please log in or sign up to continue.",
  hideCloseButton = false,
  cancelText
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = () => {
    onClose();
    setTimeout(() => {
        navigation.navigate('Login');
    }, 100);
  };

  const handleSignup = () => {
    onClose();
    setTimeout(() => {
        navigation.navigate('Signup');
    }, 100);
  };

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { zIndex: 9999, elevation: 9999, backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={styles.modalContainer}>
            {/* Close Button - Conditionally Rendered */}
            {!hideCloseButton && (
              <Pressable style={styles.closeButton} onPress={() => {
                console.log('Close button pressed');
                onClose();
              }}>
                  <X size={20} color="#9CA3AF" />
              </Pressable>
            )}

            {/* Icon/Illustration could go here */}
            <View style={styles.iconContainer}>
                <LogIn size={32} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>Account Required</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>Do you already have an account?</Text>

            <View style={styles.buttonContainer}>
                <Pressable style={styles.loginButton} onPress={() => {
                  console.log('Login pressed');
                  handleLogin();
                }}>
                    <Text style={styles.loginText}>Yes, Log In</Text>
                </Pressable>

                <Pressable style={styles.signupButton} onPress={() => {
                  console.log('Signup pressed');
                  handleSignup();
                }}>
                    <Text style={styles.signupText}>No, Create Account</Text>
                </Pressable>

                {/* Optional Cancel/Back Button */}
                {cancelText && (
                  <Pressable style={styles.cancelButton} onPress={() => {
                    console.log('Cancel pressed');
                    onClose();
                  }}>
                    <Text style={styles.cancelText}>{cancelText}</Text>
                  </Pressable>
                )}
            </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... existing styles ...
  overlay: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.5)', // Removed in favor of BlurView tint
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width - 40,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signupButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
