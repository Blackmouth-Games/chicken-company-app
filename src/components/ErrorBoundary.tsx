import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: any; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      // Minimal fallback inviting to use ?debug=1
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Ha ocurrido un error</h1>
            <p className="text-muted-foreground mb-4">Añade ?debug=1 a la URL para ver detalles de diagnóstico.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
