import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useStore';
import { authAPI } from '../services/api';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

export default function SessionMonitor() {
    const { token, setAuth, clearAuth } = useAuthStore();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        // If no token, nothing to monitor
        if (!token) return;

        const checkToken = () => {
            try {
                // Simple JWT decoding (token has 3 parts separated by dots)
                const payload = JSON.parse(atob(token.split('.')[1]));
                const exp = payload.exp * 1000; // Convert to ms
                const now = Date.now();
                const remaining = exp - now;

                // Warn if less than 5 minutes (300000ms) remaining
                // And ensure it hasn't ALREADY expired (if so, handleLogout might be better, or let API fail)
                if (remaining < 5 * 60 * 1000 && remaining > 0) {
                    setShowWarning(true);
                    setTimeLeft(Math.floor(remaining / 1000));
                } else if (remaining <= 0) {
                    // Token expired locally
                    // We can force logout immediately or let the next API call fail (which will trigger auto-logout from api.js)
                    // Ideally force logout to be clean
                    handleLogout();
                } else {
                    // Can dismiss warning if time was extended in another tab (via localStorage sync if implemented)
                    // But strict check:
                    if (showWarning) setShowWarning(false);
                }
            } catch (e) {
                console.error("SessionMonitor: Invalid token format", e);
            }
        };

        // Check immediately and then every 10 seconds
        checkToken();
        const interval = setInterval(checkToken, 10000);

        return () => clearInterval(interval);
    }, [token, showWarning]);

    const handleRefresh = async () => {
        try {
            const response = await authAPI.refreshToken();
            if (response.data.token) {
                setAuth(response.data.user, response.data.token);
                setShowWarning(false);
            }
        } catch (error) {
            console.error("Failed to refresh session", error);
            // If refresh fails, they are effectively logged out
            handleLogout();
        }
    };

    const handleLogout = () => {
        clearAuth();
        // Force reload to clear any sensitive state in memory and redirect to login
        window.location.href = '/admin/login';
    };

    // Don't render if no warning needed
    if (!showWarning) return null;

    return (
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your session is about to expire. Unsaved changes may be lost.
                        Do you want to extend your session?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-red-600"
                    >
                        Log Out
                    </button>
                    <AlertDialogAction onClick={handleRefresh}>
                        Keep Session Active
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
