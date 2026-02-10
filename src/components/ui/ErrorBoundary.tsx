/**
 * ERROR BOUNDARY - GRACEFUL DEGRADATION PATTERN
 *
 * Princípio: O sistema não deve ser "tudo ou nada"
 *
 * Se um componente quebrar, o resto da aplicação continua funcionando.
 * Exemplo: Se o módulo de Associações falhar, o usuário ainda consegue
 * acessar Perfil, Agenda, Finanças, etc.
 *
 * USAGE:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <ComponenteThatMightFail />
 * </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Atualiza o state para mostrar o fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro para monitoramento
    log.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Callback customizado para logging externo (Sentry, etc)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Renderizar fallback customizado ou default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-ceramic-error-bg border-l-4 border-ceramic-error rounded-[20px]">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-ceramic-error mb-2">
              Algo deu errado
            </h2>
            <p className="text-ceramic-text-secondary mb-4">
              Este componente encontrou um erro, mas o resto do sistema continua funcionando.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-ceramic-error font-mono mb-2">
                  Detalhes do erro (dev only)
                </summary>
                <pre className="text-xs bg-ceramic-error-bg p-2 rounded-lg overflow-auto max-h-40 text-ceramic-text-primary">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="mt-4 px-4 py-2 ceramic-button-secondary rounded-lg transition"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * FALLBACK COMPONENTS - Reusable UI para diferentes contextos
 */

export const ModuleErrorFallback: React.FC<{ moduleName: string; onReset?: () => void }> = ({
  moduleName,
  onReset,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
    <div className="text-center max-w-md">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-ceramic-error-bg flex items-center justify-center">
        <svg className="w-6 h-6 text-ceramic-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
        Erro ao carregar {moduleName}
      </h3>
      <p className="text-ceramic-text-secondary mb-4">
        Não foi possível carregar este módulo. Outros módulos continuam disponíveis no menu lateral.
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="px-6 py-2 ceramic-button-secondary rounded-lg transition"
        >
          Tentar novamente
        </button>
      )}
    </div>
  </div>
);

export const DataFetchErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center p-6 ceramic-tray border border-ceramic-accent/20 rounded-lg">
    <div className="text-center">
      <p className="text-ceramic-text-primary font-bold mb-3">
        Erro ao carregar dados
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ceramic-card px-4 py-2 text-ceramic-text-primary rounded hover:shadow-lg transition"
        >
          Tentar novamente
        </button>
      )}
    </div>
  </div>
);

/**
 * HOOK: useErrorHandler - Para lançar erros de forma controlada
 *
 * Usage:
 * const throwError = useErrorHandler();
 *
 * try {
 *   await fetchData();
 * } catch (error) {
 *   throwError(error); // Vai para o ErrorBoundary mais próximo
 * }
 */
export function useErrorHandler() {
  const [, setError] = React.useState();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

export default ErrorBoundary;
