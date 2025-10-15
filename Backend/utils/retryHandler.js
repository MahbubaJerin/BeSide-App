// Backend/utils/retryHandler.js
const AppError = require('./AppError');

/**
 * Retry function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of successful operation
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryIf = (error) => true,
    onRetry = (error, attempt) => console.log(`Retry attempt ${attempt}: ${error.message}`)
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!retryIf(error) || attempt === maxAttempts) {
        throw error;
      }
      
      // Call the retry callback
      onRetry(error, attempt);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      
      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;
      
      console.log(`⏳ [RETRY] Waiting ${Math.round(totalDelay)}ms before retry ${attempt}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
};

/**
 * Database operation retry handler
 * Retries on connection errors, timeout errors, and temporary failures
 */
const retryDatabaseOperation = (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    retryIf: (error) => {
      // Retry on connection errors, timeout errors, and some MongoDB errors
      const retryableErrors = [
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'MongoNetworkError',
        'MongoTimeoutError',
        'MongoServerSelectionError'
      ];
      
      return retryableErrors.some(errorType => 
        error.name === errorType || 
        error.code === errorType || 
        error.message.includes(errorType)
      );
    },
    onRetry: (error, attempt) => {
      console.log(`🔄 [DB RETRY] Database operation failed (attempt ${attempt}):`, error.message);
    },
    ...options
  });
};

/**
 * External API call retry handler
 * Retries on network errors and 5xx server errors
 */
const retryApiCall = (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    retryIf: (error) => {
      // Retry on network errors and 5xx server errors
      if (error.code && ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error.code)) {
        return true;
      }
      
      // Retry on HTTP 5xx errors (server errors)
      if (error.response && error.response.status >= 500) {
        return true;
      }
      
      // Don't retry on client errors (4xx)
      return false;
    },
    onRetry: (error, attempt) => {
      console.log(`🔄 [API RETRY] External API call failed (attempt ${attempt}):`, error.message);
    },
    ...options
  });
};

/**
 * File upload retry handler
 * Retries on network errors and temporary upload failures
 */
const retryFileUpload = (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxAttempts: 2, // Fewer attempts for file uploads
    baseDelay: 2000,
    maxDelay: 10000,
    retryIf: (error) => {
      // Retry on network errors and some upload errors
      const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'upload_failed'];
      return retryableErrors.some(errorType => 
        error.code === errorType || 
        error.message.includes(errorType)
      );
    },
    onRetry: (error, attempt) => {
      console.log(`🔄 [UPLOAD RETRY] File upload failed (attempt ${attempt}):`, error.message);
    },
    ...options
  });
};

/**
 * Circuit breaker implementation for external services
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('🔧 [CIRCUIT BREAKER] Transitioning to HALF_OPEN state');
      } else {
        throw new AppError('Circuit breaker is OPEN - service unavailable', 503);
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 2) {
          this.reset();
          console.log('✅ [CIRCUIT BREAKER] Service recovered - transitioning to CLOSED state');
        }
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('⚠️ [CIRCUIT BREAKER] Failure threshold exceeded - transitioning to OPEN state');
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  getState() {
    return this.state;
  }
}

/**
 * Graceful degradation helper
 * Provides fallback values when operations fail
 */
const withFallback = async (primaryFn, fallbackValue, options = {}) => {
  const { 
    logError = true,
    errorMessage = 'Primary operation failed, using fallback'
  } = options;
  
  try {
    return await primaryFn();
  } catch (error) {
    if (logError) {
      console.warn(`⚠️ [FALLBACK] ${errorMessage}:`, error.message);
    }
    return fallbackValue;
  }
};

module.exports = {
  retryWithBackoff,
  retryDatabaseOperation,
  retryApiCall,
  retryFileUpload,
  CircuitBreaker,
  withFallback
};