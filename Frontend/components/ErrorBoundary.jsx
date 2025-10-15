// Frontend/components/ErrorBoundary.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('🚨 [ERROR BOUNDARY] React Error Caught:', error);
    console.error('🚨 [ERROR BOUNDARY] Error Info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to async storage for debugging
    this.logErrorToStorage(error, errorInfo);
  }

  logErrorToStorage = async (error, errorInfo) => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        userAgent: navigator.userAgent,
        url: window.location?.href
      };

      // Get existing error logs
      const existingLogs = await AsyncStorage.getItem('errorLogs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Add new log and keep only last 10
      logs.unshift(errorLog);
      const truncatedLogs = logs.slice(0, 10);
      
      await AsyncStorage.setItem('errorLogs', JSON.stringify(truncatedLogs));
    } catch (storageError) {
      console.error('Failed to log error to storage:', storageError);
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleReportError = async () => {
    try {
      // Get user info for error report
      const token = await AsyncStorage.getItem('token');
      const userInfo = await AsyncStorage.getItem('user');
      
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: this.state.error?.message || 'Unknown error',
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        userInfo: userInfo ? JSON.parse(userInfo) : null,
        hasToken: !!token
      };

      console.log('📧 [ERROR REPORT] Error report prepared:', errorReport);
      
      // Here you could send the error report to your backend
      // await fetch('/api/error-reports', { method: 'POST', body: JSON.stringify(errorReport) });
      
      alert('Error report has been prepared. Please contact support if the issue persists.');
    } catch (error) {
      console.error('Failed to prepare error report:', error);
      alert('Failed to prepare error report. Please try again.');
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            
            <Text style={styles.errorMessage}>
              We're sorry, but an unexpected error occurred. The app will try to recover automatically.
            </Text>

            {this.props.showDetails && this.state.error && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Error Details:</Text>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
                
                {__DEV__ && (
                  <View style={styles.stackContainer}>
                    <Text style={styles.stackTitle}>Stack Trace:</Text>
                    <Text style={styles.stackText}>{this.state.error.stack}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={this.handleRetry}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.reportButton]} 
                onPress={this.handleReportError}
              >
                <Text style={styles.buttonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            {this.props.fallbackComponent && (
              <View style={styles.fallbackContainer}>
                {this.props.fallbackComponent}
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for error reporting in functional components
export const useErrorHandler = () => {
  const reportError = (error, context = {}) => {
    console.error('🚨 [ERROR HANDLER] Error reported:', error);
    
    // Log to console with context
    console.error('Error context:', context);
    
    // Here you could send to error tracking service
    // crashlytics().recordError(error);
    
    return error;
  };

  const handleAsyncError = (asyncFn) => {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        reportError(error, { function: asyncFn.name, args });
        throw error;
      }
    };
  };

  return { reportError, handleAsyncError };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  detailsContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  stackContainer: {
    marginTop: 10,
  },
  stackTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  stackText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#2196f3',
  },
  reportButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fallbackContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
});

export default ErrorBoundary;