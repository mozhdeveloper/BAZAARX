/**
 * Address Test Button Component
 * Add this to any screen to test address flow
 * 
 * Usage:
 * import { AddressTestButton } from './AddressTestButton';
 * 
 * <AddressTestButton userId={user?.id} />
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { runAddressFlowTest, validateAddressFormFields, validateRegionLogic } from '../utils/addressTestUtils';
import { COLORS } from '../constants/theme';

interface Props {
  userId?: string;
}

export const AddressTestButton: React.FC<Props> = ({ userId }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const handleRunTests = async () => {
    if (!userId) {
      alert('Please log in first to run tests');
      return;
    }

    setIsRunning(true);
    setShowResults(true);
    setTestResults(['🧪 Running tests...']);

    try {
      const results = await runAddressFlowTest(userId);
      setTestResults(results.results);
    } catch (error) {
      setTestResults(['❌ Test error: ' + (error as Error).message]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleValidateForm = () => {
    setShowResults(true);
    const fields = validateAddressFormFields();
    setTestResults([
      '📝 Required Address Form Fields:',
      ...fields.map(f => `  • ${f}`),
    ]);
  };

  const handleValidateRegions = () => {
    setShowResults(true);
    validateRegionLogic();
    setTestResults([
      '📍 Address Region Logic:',
      '',
      'Metro Manila/NCR:',
      '  ✅ Province is OPTIONAL',
      '  ✅ Cities load directly',
      '',
      'Other Regions:',
      '  ⚠️ Province is REQUIRED',
      '  ⚠️ Cities load from province',
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Address Flow Tests</Text>
      
      <Pressable 
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={handleRunTests}
        disabled={isRunning || !userId}
      >
        {isRunning ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>
            Run Full Test Suite
          </Text>
        )}
      </Pressable>

      <View style={styles.buttonRow}>
        <Pressable 
          style={[styles.smallButton, styles.buttonSecondary]}
          onPress={handleValidateForm}
        >
          <Text style={styles.smallButtonText}>Validate Form</Text>
        </Pressable>

        <Pressable 
          style={[styles.smallButton, styles.buttonSecondary]}
          onPress={handleValidateRegions}
        >
          <Text style={styles.smallButtonText}>Region Logic</Text>
        </Pressable>
      </View>

      {!userId && (
        <Text style={styles.warning}>⚠️ Login required to run tests</Text>
      )}

      {/* Results Modal */}
      <Modal
        visible={showResults}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Test Results</Text>
              <Pressable onPress={() => setShowResults(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>
            
            <ScrollView style={styles.resultsScroll}>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </ScrollView>

            <Pressable 
              style={styles.closeButtonBottom}
              onPress={() => setShowResults(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#6B7280',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  warning: {
    marginTop: 8,
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  resultsScroll: {
    flex: 1,
    padding: 20,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    fontFamily: 'monospace',
  },
  closeButtonBottom: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
});
