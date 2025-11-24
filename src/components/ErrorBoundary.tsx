import { Component, ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { Copy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: any; errorInfo?: any; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ErrorBoundary] Error caught:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);
    console.error("[ErrorBoundary] Error stack:", error?.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
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

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Error desconocido";
      const errorStack = this.state.error?.stack || "";
      const componentStack = this.state.errorInfo?.componentStack || "";
      
      return (
        <ErrorDisplay 
          errorMessage={errorMessage}
          errorStack={errorStack}
          componentStack={componentStack}
          onCopy={this.handleCopyError}
          onReload={this.handleReload}
        />
      );
    }
    return this.props.children;
  }
}

// Componente separado para usar hooks
const ErrorDisplay = ({ 
  errorMessage, 
  errorStack, 
  componentStack,
  onCopy,
  onReload 
}: { 
  errorMessage: string;
  errorStack: string;
  componentStack: string;
  onCopy: () => void;
  onReload: () => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleCopy = async () => {
    setCopyStatus('idle');
    try {
      // onCopy es síncrono pero puede lanzar errores
      onCopy();
      // Dar un pequeño delay para que el clipboard tenga tiempo de copiar
      await new Promise(resolve => setTimeout(resolve, 100));
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error("Error al copiar:", error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };
  
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
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={onReload}
            variant="default"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar página
          </Button>
          <Button 
            onClick={handleCopy}
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
            onClick={() => setShowDetails(!showDetails)}
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
};
