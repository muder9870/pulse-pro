import React from 'react';
import { AlertTriangle, WifiOff, Database, Clock } from 'lucide-react';

/**
 * Network Error Boundary
 * 
 * Specifically handles network-related errors (connection issues, API failures, etc.)
 */
class NetworkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorType: null,
      isOnline: navigator.onLine
    };
  }

  componentDidMount() {
    // Monitor network status
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  static getDerivedStateFromError(error) {
    let errorType = 'unknown';
    
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('timeout')) {
      errorType = 'timeout';
    } else if (error.status >= 500) {
      errorType = 'server';
    } else if (error.status >= 400) {
      errorType = 'client';
    }

    return { hasError: true, errorType };
  }

  componentDidCatch(error, errorInfo) {
    const { endpoint, onError } = this.props;
    
    // Log network errors specifically
    if (window.errorReporting) {
      window.errorReporting.log(error, {
        componentStack: errorInfo.componentStack,
        endpoint,
        errorType: this.state.errorType,
        isOnline: navigator.onLine,
        userInfo: { userAgent: navigator.userAgent },
        timestamp: new Date().toISOString()
      });
    }

    // Custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({ error });
  }

  getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="w-12 h-12" />;
      case 'timeout':
        return <Clock className="w-12 h-12" />;
      case 'server':
        return <Database className="w-12 h-12" />;
      default:
        return <AlertTriangle className="w-12 h-12" />;
    }
  };

  getErrorMessage = (errorType) => {
    switch (errorType) {
      case 'network':
        return 'Network connection issue. Please check your internet connection.';
      case 'timeout':
        return 'Request timed out. The server took too long to respond.';
      case 'server':
        return 'Server error. The service is temporarily unavailable.';
      case 'client':
        return 'Request error. Please check your request and try again.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  render() {
    const { hasError, error, errorType, isOnline } = this.state;
    const { 
      endpoint, 
      fallback, 
      children,
      showOfflineWarning = true
    } = this.props;

    // Show offline warning
    if (!isOnline && showOfflineWarning) {
      return (
        <div className="min-h-[200px] flex items-center justify-center bg-orange-50 border border-orange-200 rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <WifiOff className="w-12 h-12 mx-auto text-orange-500" />
            </div>
            <h3 className="text-lg font-medium text-orange-900 mb-2">
              You're offline
            </h3>
            <p className="text-orange-700 mb-6">
              Please check your internet connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Retry Connection
            </button>
          </div>
        </div>
      );
    }

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback({ 
          error, 
          errorType, 
          isOnline,
          endpoint 
        });
      }

      // Default network error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-12 h-12 mx-auto text-red-500">
                {this.getErrorIcon(errorType)}
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connection Error
            </h3>
            <p className="text-gray-500 mb-6">
              {this.getErrorMessage(errorType)}
            </p>
            {endpoint && (
              <p className="text-xs text-gray-400 mb-4">
                Failed to load: {endpoint}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default NetworkErrorBoundary;
