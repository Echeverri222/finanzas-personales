import React from 'react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">💥</div>
              <h1 className="mb-2 text-xl font-semibold text-foreground">
                ¡Oops! Algo salió mal
              </h1>
              <p className="text-muted-foreground">
                Ha ocurrido un error inesperado. Puedes intentar recargar la página o contactar soporte si el problema persiste.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
              >
                Intentar de nuevo
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Recargar página
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Ir al Dashboard
              </Button>
            </div>

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Detalles técnicos (solo en desarrollo)
                </summary>
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 whitespace-pre-wrap">
                  <strong>Error:</strong> {this.state.error && this.state.error.toString()}
                  <br />
                  <strong>Stack trace:</strong>
                  {this.state.errorInfo.componentStack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
