// Frontend/utils/networkErrorHandler.js
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Network error types and their handling
 */
const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Categorize network errors based on response/error type
 */
const categorizeError = (error) => {
  // Network connectivity issues
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      return ErrorTypes.NETWORK_ERROR;
    }
    if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
      return ErrorTypes.TIMEOUT_ERROR;
    }
    return ErrorTypes.NETWORK_ERROR;
  }

  // HTTP status-based categorization
  const status = error.response.status;
  
  if (status === 401 || status === 403) {
    return ErrorTypes.AUTH_ERROR;
  }
  if (status === 400 || status === 422) {
    return ErrorTypes.VALIDATION_ERROR;
  }
  if (status === 429) {
    return ErrorTypes.RATE_LIMIT_ERROR;
  }
  if (status >= 500) {
    return ErrorTypes.SERVER_ERROR;
  }
  
  return ErrorTypes.UNKNOWN_ERROR;
};

/**
 * Get user-friendly error messages
 */
const getErrorMessage = (errorType, originalError) => {
  const messages = {
    [ErrorTypes.NETWORK_ERROR]: {
      title: 'Connection Error',
      message: 'Please check your internet connection and try again.',
      action: 'Retry'
    },
    [ErrorTypes.TIMEOUT_ERROR]: {
      title: 'Request Timeout',
      message: 'The request is taking longer than expected. Please try again.',
      action: 'Retry'
    },
    [ErrorTypes.SERVER_ERROR]: {
      title: 'Server Error',
      message: 'Our servers are experiencing issues. Please try again in a few moments.',
      action: 'Retry'
    },
    [ErrorTypes.AUTH_ERROR]: {
      title: 'Authentication Error',
      message: 'Your session has expired. Please log in again.',
      action: 'Login'
    },
    [ErrorTypes.VALIDATION_ERROR]: {
      title: 'Invalid Data',
      message: originalError.response?.data?.message || 'Please check your input and try again.',
      action: 'Fix'
    },
    [ErrorTypes.RATE_LIMIT_ERROR]: {
      title: 'Too Many Requests',
      message: 'You\'re sending requests too quickly. Please wait a moment and try again.',
      action: 'Wait'
    },
    [ErrorTypes.UNKNOWN_ERROR]: {
      title: 'Unexpected Error',
      message: 'Something unexpected happened. Please try again.',
      action: 'Retry'
    }
  };

  return messages[errorType] || messages[ErrorTypes.UNKNOWN_ERROR];
};

/**
 * Enhanced fetch with retry logic and error handling
 */
const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    retryMultiplier = 2,
    retryOn = [ErrorTypes.NETWORK_ERROR, ErrorTypes.TIMEOUT_ERROR, ErrorTypes.SERVER_ERROR]
  } = retryOptions;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 [FETCH] Attempt ${attempt + 1}/${maxRetries + 1}: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        timeout: 10000, // 10 second timeout
        ...options
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.response = response;
        throw error;
      }

      return response;
    } catch (error) {
      lastError = error;
      const errorType = categorizeError(error);
      
      console.log(`❌ [FETCH] Attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry if it's the last attempt or error type shouldn't be retried
      if (attempt === maxRetries || !retryOn.includes(errorType)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(retryMultiplier, attempt);
      console.log(`⏳ [FETCH] Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * API call wrapper with comprehensive error handling
 */
const apiCall = async (url, options = {}, config = {}) => {
  const {
    showErrorAlert = true,
    customErrorHandler = null,
    retryOptions = {},
    requireAuth = true
  } = config;

  try {
    // Add authentication token if required
    if (requireAuth) {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }

    // Add default headers
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetchWithRetry(url, options, retryOptions);
    const data = await response.json();
    
    console.log(`✅ [API] Success: ${options.method || 'GET'} ${url}`);
    return data;

  } catch (error) {
    const errorType = categorizeError(error);
    const errorInfo = getErrorMessage(errorType, error);
    
    console.error(`❌ [API] Error: ${options.method || 'GET'} ${url}`, error);
    
    // Handle authentication errors by clearing token
    if (errorType === ErrorTypes.AUTH_ERROR) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    
    // Use custom error handler if provided
    if (customErrorHandler) {
      return customErrorHandler(error, errorType, errorInfo);
    }
    
    // Show error alert if enabled
    if (showErrorAlert) {
      showErrorAlert(errorInfo);
    }
    
    // Re-throw the error for component-level handling
    throw {
      ...error,
      errorType,
      userMessage: errorInfo.message,
      title: errorInfo.title,
      action: errorInfo.action
    };
  }
};

/**
 * Show error alert to user
 */
const showErrorAlert = (errorInfo, onAction = null) => {
  Alert.alert(
    errorInfo.title,
    errorInfo.message,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: errorInfo.action,
        onPress: onAction || (() => {})
      }
    ]
  );
};

/**
 * Connection status checker
 */
const checkConnectionStatus = async () => {
  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Retry queue for failed requests
 */
class RetryQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  add(requestFn, maxRetries = 3) {
    this.queue.push({ requestFn, maxRetries, attempts: 0 });
    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      try {
        await item.requestFn();
        this.queue.shift(); // Remove successful request
      } catch (error) {
        item.attempts++;
        
        if (item.attempts >= item.maxRetries) {
          console.error('❌ [RETRY QUEUE] Max retries exceeded:', error);
          this.queue.shift(); // Remove failed request
        } else {
          console.log(`🔄 [RETRY QUEUE] Retrying request (${item.attempts}/${item.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * item.attempts));
        }
      }
    }
    
    this.isProcessing = false;
  }
}

const retryQueue = new RetryQueue();

/**
 * Network-aware request handler
 */
const networkAwareRequest = async (requestFn, options = {}) => {
  const { fallbackValue = null, useRetryQueue = true } = options;
  
  try {
    return await requestFn();
  } catch (error) {
    const errorType = categorizeError(error);
    
    // For network errors, add to retry queue
    if (useRetryQueue && errorType === ErrorTypes.NETWORK_ERROR) {
      retryQueue.add(requestFn);
      console.log('📤 [NETWORK AWARE] Request added to retry queue');
    }
    
    // Return fallback value if provided
    if (fallbackValue !== null) {
      console.log('🔄 [NETWORK AWARE] Using fallback value');
      return fallbackValue;
    }
    
    throw error;
  }
};

export {
  ErrorTypes,
  categorizeError,
  getErrorMessage,
  fetchWithRetry,
  apiCall,
  showErrorAlert,
  checkConnectionStatus,
  RetryQueue,
  retryQueue,
  networkAwareRequest
};