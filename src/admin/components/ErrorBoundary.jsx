import React, { Component } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';

/**
 * Error Boundary Component for Admin Panel
 * Catches JavaScript errors anywhere in child component tree and displays a fallback UI
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console (could also send to error reporting service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/admin';
    };

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-6">
                    <Card className="max-w-lg w-full border-destructive/50">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                            <CardTitle className="text-xl">Something went wrong</CardTitle>
                            <CardDescription>
                                {this.props.fallbackMessage ||
                                    "An unexpected error occurred. Don't worry, your data is safe."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Error details (only in development) */}
                            {import.meta.env.DEV && this.state.error && (
                                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                    <p className="font-mono text-destructive mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="text-xs text-muted-foreground">
                                            <summary className="cursor-pointer hover:text-foreground">
                                                View stack trace
                                            </summary>
                                            <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={this.handleRetry}
                                >
                                    <RefreshCcw className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={this.handleGoHome}
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Go to Dashboard
                                </Button>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                If this keeps happening, try refreshing the page or contact support.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
