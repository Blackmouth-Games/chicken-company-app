import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: any; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary] Error caught:", error);
    console.error("[ErrorBoundary] Error info:", info);
    console.error("[ErrorBoundary] Error stack:", error?.stack);
    console.error("[ErrorBoundary] Component stack:", info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Minimal fallback inviting to use ?debug=1
      const errorMessage = this.state.error?.message || "Error desconocido";
      const errorStack = this.state.error?.stack || "";
      
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Ha ocurrido un error</h1>
            <p className="text-muted-foreground mb-4">Añade ?debug=1 a la URL para ver detalles de diagnóstico.</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-left">
                <p className="text-sm font-semibold text-destructive mb-2">Error (solo en desarrollo):</p>
                <p className="text-xs text-muted-foreground break-words">{errorMessage}</p>
                {errorStack && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Ver stack trace</summary>
                    <pre className="text-xs text-muted-foreground mt-2 overflow-auto max-h-40">{errorStack}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
