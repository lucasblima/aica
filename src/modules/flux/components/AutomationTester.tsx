/**
 * AutomationTester - Manual automation testing UI
 *
 * Allows coaches to test automation triggers and actions manually
 * before relying on scheduled execution
 */

import React, { useState } from 'react';
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { AutomationEngineService } from '../services/automationEngineService';

interface AutomationTesterProps {
  automationId?: string; // Test single automation, or all if undefined
  className?: string;
}

interface TestResult {
  automationId: string;
  triggered: boolean;
  actionExecuted: boolean;
  error?: string;
  details?: string;
  reason?: string;
}

export function AutomationTester({ automationId, className = '' }: AutomationTesterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults([]);

    try {
      const testResults = await AutomationEngineService.detectAndExecuteAutomations();
      setResults(testResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const triggeredCount = results.filter((r) => r.triggered).length;
  const executedCount = results.filter((r) => r.actionExecuted).length;
  const errorCount = results.filter((r) => r.error).length;

  return (
    <div className={`ceramic-card p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Test Automations
          </h3>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            Run trigger detection and action execution manually
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-ceramic-error flex-shrink-0" />
            <p className="text-sm text-ceramic-error">{error}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="p-3 ceramic-inset rounded-lg">
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
              Total
            </p>
            <p className="text-2xl font-bold text-ceramic-text-primary">{results.length}</p>
          </div>

          <div className="p-3 ceramic-inset rounded-lg">
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
              Triggered
            </p>
            <p className="text-2xl font-bold text-ceramic-info">{triggeredCount}</p>
          </div>

          <div className="p-3 ceramic-inset rounded-lg">
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
              Executed
            </p>
            <p className="text-2xl font-bold text-ceramic-success">{executedCount}</p>
          </div>

          <div className="p-3 ceramic-inset rounded-lg">
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
              Errors
            </p>
            <p className="text-2xl font-bold text-ceramic-error">{errorCount}</p>
          </div>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
            Results
          </p>

          {results.map((result, index) => (
            <ResultCard key={result.automationId || index} result={result} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !error && !isRunning && (
        <div className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 text-ceramic-text-secondary mx-auto mb-2 opacity-50" />
          <p className="text-sm text-ceramic-text-secondary">
            Click "Run Test" to check for automation triggers
          </p>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: TestResult }) {
  const getStatusIcon = () => {
    if (result.error) return <XCircle className="w-4 h-4 text-ceramic-error" />;
    if (result.actionExecuted) return <CheckCircle className="w-4 h-4 text-ceramic-success" />;
    if (result.triggered) return <AlertTriangle className="w-4 h-4 text-ceramic-warning" />;
    return <div className="w-4 h-4 rounded-full bg-ceramic-text-secondary/20" />;
  };

  const getStatusLabel = () => {
    if (result.error) return 'Error';
    if (result.actionExecuted) return 'Executed';
    if (result.triggered) return 'Triggered (action failed)';
    return 'Not triggered';
  };

  const getStatusColor = () => {
    if (result.error) return 'border-ceramic-error/20 bg-ceramic-error/5';
    if (result.actionExecuted) return 'border-ceramic-success/20 bg-ceramic-success/5';
    if (result.triggered) return 'border-ceramic-warning/20 bg-ceramic-warning/5';
    return 'border-ceramic-text-secondary/10';
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()} transition-all`}>
      <div className="flex items-start gap-3">
        {getStatusIcon()}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-ceramic-text-primary">
              {getStatusLabel()}
            </span>
            <span className="text-[10px] text-ceramic-text-secondary font-mono">
              {result.automationId.slice(0, 8)}
            </span>
          </div>

          {result.reason && (
            <p className="text-xs text-ceramic-text-secondary">{result.reason}</p>
          )}

          {result.details && (
            <p className="text-xs text-ceramic-success mt-1">{result.details}</p>
          )}

          {result.error && (
            <p className="text-xs text-ceramic-error mt-1">{result.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
