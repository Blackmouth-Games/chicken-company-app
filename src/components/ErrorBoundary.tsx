import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: any; errorInfo?: any; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Capture error details before they might be lost
    const errorDetails: any = {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      toString: error?.toString?.(),
    };
    
    // Try to get all properties from the error object
    if (error && typeof error === 'object') {
      try {
        const allProps = Object.getOwnPropertyNames(error);
        allProps.forEach(prop => {
          try {
            errorDetails[prop] = error[prop];
          } catch {
            // Skip properties that can't be accessed
          }
        });
      } catch {
        // If we can't enumerate properties, at least try to capture what we can
      }
    }
    
    console.error("[ErrorBoundary]", error, errorInfo, errorDetails);
    this.setState({ 
      errorInfo: {
        ...errorInfo,
        errorDetails, // Store captured error details
      },
      error: errorDetails, // Store the detailed error instead of the original
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleAddDebug = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('debug', '1');
    window.location.href = url.toString();
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorInfo = this.state.errorInfo;
      
      // Try to extract error message from various possible formats
      let errorMessage = 'Error desconocido';
      let errorName = '';
      let errorStack = '';
      
      // First check if we have errorDetails from componentDidCatch
      const errorToCheck = errorInfo?.errorDetails || error;
      
      if (errorToCheck) {
        // Check if error has a message property
        if (errorToCheck.message) {
          errorMessage = errorToCheck.message;
        }
        // Check if error has a name property (e.g., ReferenceError, TypeError)
        if (errorToCheck.name) {
          errorName = errorToCheck.name;
        }
        // Check if error has a stack trace
        if (errorToCheck.stack) {
          errorStack = errorToCheck.stack;
        }
        // If error is a string, use it directly
        if (typeof errorToCheck === 'string') {
          errorMessage = errorToCheck;
        }
        // Check toString if available
        if (errorToCheck.toString && typeof errorToCheck.toString === 'function') {
          const toStringResult = errorToCheck.toString();
          if (toStringResult && toStringResult !== '[object Object]') {
            errorMessage = errorMessage === 'Error desconocido' ? toStringResult : errorMessage;
          }
        }
        // If error is an object but has no message, try to stringify it
        if (typeof errorToCheck === 'object' && !errorToCheck.message && !errorToCheck.stack) {
          try {
            // Use Object.getOwnPropertyNames to get all properties
            const errorStr = JSON.stringify(errorToCheck, Object.getOwnPropertyNames(errorToCheck), 2);
            if (errorStr !== '{}' && errorStr !== 'null') {
              errorMessage = `Error object: ${errorStr}`;
            } else if (errorInfo?.componentStack) {
              // If error is empty but we have componentStack, use that as context
              errorMessage = 'Error durante el renderizado (ver Component Stack para más detalles)';
            }
          } catch {
            // If stringify fails, try toString
            errorMessage = errorToCheck.toString?.() || 'Error desconocido (objeto sin propiedades)';
          }
        }
      }
      
      // If we still don't have a good error message but have componentStack, provide context
      if (errorMessage === 'Error desconocido' && errorInfo?.componentStack) {
        errorMessage = 'Error durante el renderizado de un componente';
      }
      
      // Combine name and message if both exist
      const fullErrorMessage = errorName && errorMessage !== errorName 
        ? `${errorName}: ${errorMessage}` 
        : errorMessage;
      
      const params = new URLSearchParams(window.location.search);
      const debugMode = params.get('debug') === '1';

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900">Ha ocurrido un error</h1>
            </div>

            {debugMode ? (
              <div className="mt-6 text-left">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <h2 className="font-semibold text-red-900 mb-2">Detalles del error:</h2>
                    <pre className="text-sm text-red-800 whitespace-pre-wrap break-words font-mono bg-red-100 p-2 rounded">
                      {fullErrorMessage}
                    </pre>
                  </div>
                  
                  {errorStack && (
                    <details className="mt-3" open>
                      <summary className="cursor-pointer text-sm text-red-700 font-semibold mb-2">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words font-mono overflow-auto max-h-64 bg-red-100 p-2 rounded">
                        {errorStack}
                      </pre>
                    </details>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <details className="mt-3" open>
                      <summary className="cursor-pointer text-sm text-red-700 font-semibold mb-2">
                        Component Stack (útil para identificar dónde ocurrió el error)
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words font-mono overflow-auto max-h-64 bg-red-100 p-2 rounded">
                        {errorInfo.componentStack}
                      </pre>
                      <p className="text-xs text-red-600 mt-2 italic">
                        💡 El componente "nb" es un nombre minificado. Busca en el código componentes que rendericen divs anidados.
                      </p>
                    </details>
                  )}
                  
                  {error && Object.keys(error).length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-red-700 font-semibold mb-2">
                        Objeto de error completo
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words font-mono overflow-auto max-h-64 bg-red-100 p-2 rounded">
                        {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
                      </pre>
                    </details>
                  )}
                  
                  {errorInfo && Object.keys(errorInfo).length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-red-700 font-semibold mb-2">
                        Información completa del error
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words font-mono overflow-auto max-h-64 bg-red-100 p-2 rounded">
                        {JSON.stringify(errorInfo, Object.getOwnPropertyNames(errorInfo), 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  {fullErrorMessage.length > 150 
                    ? `${fullErrorMessage.substring(0, 150)}...` 
                    : fullErrorMessage}
                </p>
                <p className="text-sm text-gray-500">
                  Añade <code className="bg-gray-100 px-2 py-1 rounded">?debug=1</code> a la URL para ver detalles completos de diagnóstico.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Recargar página
              </button>
              {!debugMode && (
                <button
                  onClick={this.handleAddDebug}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  Activar modo debug
                </button>
              )}
            </div>

            {debugMode && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  El modo debug está activo. Revisa la consola del navegador (F12) para más información.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
