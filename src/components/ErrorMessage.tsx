import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-900 rounded-lg border border-slate-800 p-6">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
            <p className="text-slate-400 text-sm mb-4 text-center max-w-md">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-emerald-400/20 text-emerald-400 rounded-lg hover:bg-emerald-400/30 transition font-medium"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}
