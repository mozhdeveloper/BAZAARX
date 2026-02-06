/**
 * Service Test Component
 * Provides an in-app UI for running service tests
 * 
 * Usage: Import and render in a debug/dev screen
 */

import React, { useState, useCallback } from 'react';

// Import test functions (adjust path as needed)
import {
  runAllTests,
  testAuthService,
  testProductService,
  testCartService,
  testOrderService,
  testQAService,
  testChatService,
  testBuyerFlow,
  testSellerFlow,
  testQAFlow,
  TestConfig,
} from './service-tests';

interface TestLog {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ServiceTestRunnerProps {
  userId?: string;
  buyerId?: string;
  sellerId?: string;
  productId?: string;
}

export const ServiceTestRunner: React.FC<ServiceTestRunnerProps> = ({
  userId,
  buyerId,
  sellerId,
  productId,
}) => {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const config: TestConfig = {
    testUserId: userId || buyerId,
    testBuyerId: buyerId,
    testSellerId: sellerId,
    testProductId: productId,
  };

  const runTests = useCallback(async (testFn: () => Promise<unknown>, name: string) => {
    if (isRunning) return;
    
    setIsRunning(true);
    clearLogs();
    addLog(`Starting ${name}...`, 'info');
    
    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      addLog(args.join(' '), 'info');
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      addLog(args.join(' '), 'error');
      originalError.apply(console, args);
    };
    
    try {
      await testFn();
      addLog(`${name} completed`, 'success');
    } catch (error) {
      addLog(`${name} failed: ${error}`, 'error');
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  }, [isRunning, addLog, clearLogs]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🧪 Service Test Runner</h2>
      
      <div style={styles.buttonRow}>
        <button
          style={styles.button}
          onClick={() => runTests(() => runAllTests(config), 'All Tests')}
          disabled={isRunning}
        >
          Run All Tests
        </button>
        
        <button
          style={styles.button}
          onClick={() => runTests(() => testAuthService(config.testUserId), 'Auth Tests')}
          disabled={isRunning}
        >
          Auth Tests
        </button>
        
        <button
          style={styles.button}
          onClick={() => runTests(() => testProductService(config.testSellerId), 'Product Tests')}
          disabled={isRunning}
        >
          Product Tests
        </button>
        
        <button
          style={styles.button}
          onClick={() => runTests(() => testCartService(config.testBuyerId), 'Cart Tests')}
          disabled={isRunning}
        >
          Cart Tests
        </button>
        
        <button
          style={styles.button}
          onClick={() => runTests(() => testOrderService(config.testBuyerId, config.testSellerId), 'Order Tests')}
          disabled={isRunning}
        >
          Order Tests
        </button>
        
        <button
          style={styles.button}
          onClick={() => runTests(() => testQAService(config.testProductId), 'QA Tests')}
          disabled={isRunning}
        >
          QA Tests
        </button>
        
        <button
          style={styles.button}
          onClick={() => runTests(() => testChatService(config.testBuyerId), 'Chat Tests')}
          disabled={isRunning}
        >
          Chat Tests
        </button>
      </div>
      
      <div style={styles.buttonRow}>
        <button
          style={{ ...styles.button, ...styles.flowButton }}
          onClick={() => buyerId && runTests(() => testBuyerFlow(buyerId), 'Buyer Flow')}
          disabled={isRunning || !buyerId}
        >
          🛍️ Test Buyer Flow
        </button>
        
        <button
          style={{ ...styles.button, ...styles.flowButton }}
          onClick={() => sellerId && runTests(() => testSellerFlow(sellerId), 'Seller Flow')}
          disabled={isRunning || !sellerId}
        >
          🏪 Test Seller Flow
        </button>
        
        <button
          style={{ ...styles.button, ...styles.flowButton }}
          onClick={() => runTests(() => testQAFlow(), 'QA Flow')}
          disabled={isRunning}
        >
          🔍 Test QA Flow
        </button>
      </div>
      
      <div style={styles.configInfo}>
        <strong>Test Configuration:</strong>
        <ul>
          <li>User ID: {config.testUserId || 'Not set'}</li>
          <li>Buyer ID: {config.testBuyerId || 'Not set'}</li>
          <li>Seller ID: {config.testSellerId || 'Not set'}</li>
          <li>Product ID: {config.testProductId || 'Not set'}</li>
        </ul>
      </div>
      
      <div style={styles.logContainer}>
        <div style={styles.logHeader}>
          <strong>Test Output</strong>
          <button style={styles.clearButton} onClick={clearLogs}>
            Clear
          </button>
        </div>
        <div style={styles.logContent}>
          {logs.length === 0 && (
            <div style={styles.emptyLog}>No test output yet. Run a test to see results.</div>
          )}
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                ...styles.logEntry,
                color:
                  log.type === 'success'
                    ? '#10b981'
                    : log.type === 'error'
                    ? '#ef4444'
                    : '#6b7280',
              }}
            >
              <span style={styles.timestamp}>
                {log.timestamp.toLocaleTimeString()}
              </span>
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    marginBottom: '20px',
    color: '#1f2937',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '15px',
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  flowButton: {
    backgroundColor: '#8b5cf6',
  },
  configInfo: {
    padding: '15px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  logContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  clearButton: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  logContent: {
    padding: '15px',
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: '1.5',
    maxHeight: '400px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
  },
  emptyLog: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  logEntry: {
    marginBottom: '4px',
  },
  timestamp: {
    color: '#6b7280',
    marginRight: '10px',
  },
};

export default ServiceTestRunner;
