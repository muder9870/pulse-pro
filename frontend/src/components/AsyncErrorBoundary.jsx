import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Async Error Boundary
 * 
 * Specifically handles async operation errors (API calls, promises, etc.)
 * with retry capabilities and loading states.
 */
class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      isRetrying: false,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Check if it's an async error
    const isAsyncError = error instanceof Error && (
      error.message.includes('Network Error') ||
      error.message.includes('timeout') ||
      error.message.includes('fetch') ||
      error.name === 'TypeError'
    );

    return { 
      hasError: true, 
      isAsyncError 
    };
  }

  componentDidCatch(error, errorInfo) {
    const { operationName, onError } = this.props;
    
    // Log async errors specifically
    if (window.errorReporting) {
      window.errorReporting.log(error, {
        componentStack: errorInfo.componentStack,
        operationName,
        errorType: 'async',
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

  handleRetry = async () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState({ isRetrying: true });
      
      // Exponential backoff
      const delay = retryDelay * Math.pow(2, this.state.retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        isRetrying: false,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  render() {
    const { hasError, error, isRetrying, retryCount } = this.state;
    const { 
      operationName, 
      fallback, 
      maxRetries = 3,
      children,
      loadingComponent: LoadingComponent
    } = this.props;

    if (isRetrying && LoadingComponent) {
      return <LoadingComponent message="Retrying..." />;
    }

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback({ 
          error, 
          retryCount, 
          canRetry: retryCount < maxRetries,
          isRetrying,
          onRetry: this.handleRetry
        });
      }

      // Default async error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto text-orange-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {operationName ? `${operationName} Failed` : 'Operation Failed'}
            </h3>
            <p className="text-gray-500 mb-6">
              {error?.message || 'The operation could not be completed. Please check your connection and try again.'}
            </p>
            
            {retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry'} ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            {retryCount >= maxRetries && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Maximum retry attempts reached.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh Page
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default AsyncErrorBoundary;
