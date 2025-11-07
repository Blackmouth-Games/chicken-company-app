import { supabase } from "@/integrations/supabase/client";

type LogLevel = 'info' | 'warning' | 'error' | 'critical';

interface LogOptions {
  context?: Record<string, any>;
  stackTrace?: string;
  url?: string;
}

/**
 * Logger utility for tracking errors and events in the application
 */
export const logger = {
  /**
   * Log an informational message
   */
  info: async (message: string, options?: LogOptions) => {
    return logMessage('info', message, options);
  },

  /**
   * Log a warning message
   */
  warning: async (message: string, options?: LogOptions) => {
    return logMessage('warning', message, options);
  },

  /**
   * Log an error message
   */
  error: async (message: string, error?: Error, options?: LogOptions) => {
    const stackTrace = error?.stack || options?.stackTrace;
    return logMessage('error', message, {
      ...options,
      stackTrace,
      context: {
        ...options?.context,
        errorName: error?.name,
        errorMessage: error?.message,
      },
    });
  },

  /**
   * Log a critical error message
   */
  critical: async (message: string, error?: Error, options?: LogOptions) => {
    const stackTrace = error?.stack || options?.stackTrace;
    return logMessage('critical', message, {
      ...options,
      stackTrace,
      context: {
        ...options?.context,
        errorName: error?.name,
        errorMessage: error?.message,
      },
    });
  },
};

/**
 * Internal function to log messages
 */
async function logMessage(
  level: LogLevel,
  message: string,
  options?: LogOptions
): Promise<string | null> {
  try {
    // Get current user ID from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    const userId = profile?.id || null;
    const userAgent = navigator.userAgent;
    const url = options?.url || window.location.href;

    const { data, error } = await supabase.rpc('log_error', {
      p_user_id: userId,
      p_level: level,
      p_message: message,
      p_context: options?.context || null,
      p_stack_trace: options?.stackTrace || null,
      p_user_agent: userAgent,
      p_url: url,
    });

    if (error) {
      console.error('Failed to log to database:', error);
      return null;
    }

    // Also log to console for development
    const consoleMethod = level === 'info' ? 'log' : level === 'warning' ? 'warn' : 'error';
    console[consoleMethod](`[${level.toUpperCase()}]`, message, options);

    return data;
  } catch (err) {
    console.error('Logger error:', err);
    return null;
  }
}
