import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface DeleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  description,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.deleteButton]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: width - 40,
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textHeadline,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: -20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cancelButtonText: {
    color: COLORS.gray500,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff0000ff',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
