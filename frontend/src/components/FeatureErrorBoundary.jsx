import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Feature-specific Error Boundary
 * 
 * Catches errors in specific feature areas and provides
 * contextual error information and recovery options.
 */
class FeatureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const { featureName, onError } = this.props;
    
    // Log to error reporting service
    if (window.errorReporting) {
      window.errorReporting.log(error, {
        componentStack: errorInfo.componentStack,
        featureName,
        userInfo: { userAgent: navigator.userAgent },
        timestamp: new Date().toISOString()
      });
    }

    // Custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { 
      featureName, 
      fallback, 
      maxRetries = 3,
      showRetry = true,
      children 
    } = this.props;

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback({ error, retryCount, canRetry: retryCount < maxRetries });
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {featureName ? `${featureName} Error` : 'Something went wrong'}
            </h3>
            <p className="text-gray-500 mb-6">
              {error?.message || 'An unexpected error occurred while loading this feature.'}
            </p>
            
            {showRetry && retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            {retryCount >= maxRetries && (
              <p className="text-sm text-gray-400">
                Maximum retry attempts reached. Please refresh the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping features with error boundaries
 */
export const withErrorBoundary = (WrappedComponent, options = {}) => {
  const WrappedWithErrorBoundary = (props) => (
    <FeatureErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </FeatureErrorBoundary>
  );

  WrappedWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WrappedWithErrorBoundary;
};

export default FeatureErrorBoundary;
