import React, { Component, ReactNode } from "react";
import { Button } from "./ui/button";
import { Copy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

// Diagnostic: Verify React is imported correctly
if (typeof React === 'undefined') {
  console.error("[ErrorBoundary] CRITICAL: React is undefined!");
}
if (typeof Component === 'undefined') {
  console.error("[ErrorBoundary] CRITICAL: Component is undefined!");
}

interface Props { children: ReactNode; }
interface State { 
  hasError: boolean; 
  error?: any; 
  errorInfo?: any;
  showDetails?: boolean;
  copyStatus?: 'idle' | 'success' | 'error';
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { 
    hasError: false,
    showDetails: false,
    copyStatus: 'idle'
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ErrorBoundary] Error caught:", error);
    console.error("[ErrorBoundary] Error message:", error?.message);
    console.error("[ErrorBoundary] Error name:", error?.name);
    console.error("[ErrorBoundary] Error info:", errorInfo);
    console.error("[ErrorBoundary] Error stack:", error?.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
    
    // Diagnostic info
    console.error("[ErrorBoundary] React version check:", {
      React: typeof React !== 'undefined' ? 'available' : 'missing',
      Component: typeof Component !== 'undefined' ? 'available' : 'missing',
      ReactVersion: React?.version || 'unknown',
    });
    
    // Check if useState is being used anywhere
    const errorString = error?.toString() || '';
    const stackString = error?.stack || '';
    if (errorString.includes('useState') || stackString.includes('useState')) {
      console.error("[ErrorBoundary] DIAGNOSTIC: Error mentions useState!");
      console.error("[ErrorBoundary] Full error string:", errorString);
      console.error("[ErrorBoundary] Full stack:", stackString);
    }
    
    this.setState({ errorInfo });
  }

  handleCopyError = () => {
    try {
      const errorText = `
Error: ${this.state.error?.message || "Error desconocido"}
Stack: ${this.state.error?.stack || "No disponible"}
Component Stack: ${this.state.errorInfo?.componentStack || "No disponible"}
      `.trim();
      
      // Intentar usar la API moderna de clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(errorText).then(() => {
          // Éxito - no mostrar alert para evitar errores adicionales
          console.log("Error copiado al portapapeles");
        }).catch((err) => {
          console.error("Error al copiar con clipboard API:", err);
          // Fallback al método antiguo
          this.fallbackCopyTextToClipboard(errorText);
        });
      } else {
        // Fallback si clipboard API no está disponible
        this.fallbackCopyTextToClipboard(errorText);
      }
    } catch (error) {
      console.error("Error en handleCopyError:", error);
      // Intentar fallback
      try {
        const errorText = `
Error: ${this.state.error?.message || "Error desconocido"}
Stack: ${this.state.error?.stack || "No disponible"}
Component Stack: ${this.state.errorInfo?.componentStack || "No disponible"}
        `.trim();
        this.fallbackCopyTextToClipboard(errorText);
      } catch (fallbackError) {
        console.error("Error en fallback copy:", fallbackError);
      }
    }
  };

  fallbackCopyTextToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log("Error copiado al portapapeles (método fallback)");
      } else {
        console.error("No se pudo copiar el texto");
      }
    } catch (err) {
      console.error("Error en fallbackCopyTextToClipboard:", err);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleToggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  handleCopy = async () => {
    this.setState({ copyStatus: 'idle' });
    try {
      this.handleCopyError();
      // Dar un pequeño delay para que el clipboard tenga tiempo de copiar
      await new Promise(resolve => setTimeout(resolve, 100));
      this.setState({ copyStatus: 'success' });
      setTimeout(() => this.setState({ copyStatus: 'idle' }), 2000);
    } catch (error) {
      console.error("Error al copiar:", error);
      this.setState({ copyStatus: 'error' });
      setTimeout(() => this.setState({ copyStatus: 'idle' }), 2000);
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Error desconocido";
      const errorStack = this.state.error?.stack || "";
      const componentStack = this.state.errorInfo?.componentStack || "";
      const showDetails = this.state.showDetails || false;
      const copyStatus = this.state.copyStatus || 'idle';
      
      return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full bg-card border border-destructive/20 rounded-lg shadow-lg p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-4xl">❌</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2 text-destructive">Ha ocurrido un error</h1>
            <p className="text-muted-foreground mb-4">
              Se ha producido un error inesperado en la aplicación.
            </p>
          </div>
        </div>

        {/* Mensaje de error principal */}
        <div className="mb-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-sm font-semibold text-destructive mb-2">Mensaje de error:</p>
          <p className="text-sm text-foreground break-words font-mono">{errorMessage}</p>
          {errorMessage.includes('useState') && (
            <div className="mt-2 p-2 bg-yellow-500/20 rounded text-xs">
              <p className="font-semibold text-yellow-700">⚠️ Diagnóstico:</p>
              <p className="text-yellow-600">Este error menciona useState, pero ErrorBoundary no lo usa.</p>
              <p className="text-yellow-600">El error probablemente viene de otro componente.</p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={this.handleReload}
            variant="default"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar página
          </Button>
          <Button 
            onClick={this.handleCopy}
            variant="outline"
            className="flex-1"
            disabled={copyStatus !== 'idle'}
          >
            <Copy className="h-4 w-4 mr-2" />
            {copyStatus === 'success' ? '¡Copiado!' : copyStatus === 'error' ? 'Error' : 'Copiar error'}
          </Button>
        </div>

        {/* Detalles expandibles */}
        <div className="border-t pt-4">
          <button
            onClick={this.handleToggleDetails}
            className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Detalles técnicos</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {showDetails && (
            <div className="mt-4 space-y-4">
              {errorStack && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Stack Trace:</p>
                  <pre className="text-xs text-muted-foreground p-3 bg-muted rounded-md overflow-auto max-h-60 font-mono">
                    {errorStack}
                  </pre>
                </div>
              )}
              
              {componentStack && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Component Stack:</p>
                  <pre className="text-xs text-muted-foreground p-3 bg-muted rounded-md overflow-auto max-h-60 font-mono">
                    {componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Si el problema persiste, contacta con soporte técnico.
        </p>
      </div>
    </div>
      );
    }
    return this.props.children;
  }
}
