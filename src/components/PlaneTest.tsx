
import React, { useState } from 'react';
import { getWorkspaceDetails, getProjects } from '../services/planeApi';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export const PlaneTest = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testConnection = async () => {
        setStatus('loading');
        setError(null);
        try {
            const workspace = await getWorkspaceDetails();
            const projects = await getProjects();
            setData({ workspace, projects });
            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Failed to connect to Plane API');
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Plane API Test</h3>
                <button
                    onClick={testConnection}
                    disabled={status === 'loading'}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {status === 'loading' ? 'Testing...' : 'Test Connection'}
                </button>
            </div>

            <div className="p-4 max-h-64 overflow-y-auto text-xs font-mono">
                {status === 'idle' && (
                    <p className="text-slate-400 text-center py-4">Click to test connection...</p>
                )}

                {status === 'error' && (
                    <div className="text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Connection Failed</p>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-3">
                        <div className="text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-bold">Connection Successful!</span>
                        </div>
                        <pre className="text-slate-600 whitespace-pre-wrap break-all">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
