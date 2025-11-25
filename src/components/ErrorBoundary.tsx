import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: any; errorInfo?: any; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
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
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      const params = new URLSearchParams(window.location.search);
      const debugMode = params.get('debug') === '1';

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900">Ha ocurrido un error</h1>
            </div>

            {debugMode && error ? (
              <div className="mt-6 text-left">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h2 className="font-semibold text-red-900 mb-2">Detalles del error:</h2>
                  <pre className="text-sm text-red-800 whitespace-pre-wrap break-words font-mono">
                    {errorMessage}
                  </pre>
                  {error?.stack && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-red-700 font-semibold">
                        Ver stack trace
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words font-mono overflow-auto max-h-64">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-red-700 font-semibold">
                        Ver información del componente
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-words font-mono overflow-auto max-h-64">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  {errorMessage.length > 100 
                    ? `${errorMessage.substring(0, 100)}...` 
                    : errorMessage}
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
