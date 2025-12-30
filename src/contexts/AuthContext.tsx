import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginApi, register as registerApi, type AuthResponse, type UserResponse } from '../services/api';
import { fetchLiveLeaderboard } from '../services/api';

interface AuthContextType {
    user: UserResponse | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, name: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load token from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        
        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse stored user:', e);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }
        
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response: AuthResponse = await loginApi({ email, password });
            
            // Store token
            setToken(response.access_token);
            localStorage.setItem('auth_token', response.access_token);
            
            // Extract user info from token (simplified - in production, decode JWT or call /auth/me)
            // For now, we'll store a basic user object
            const userData: UserResponse = {
                id: 0, // Will be set from token or /auth/me endpoint
                email: email,
                name: email.split('@')[0], // Temporary name
            };
            
            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            
            // Immediately call live leaderboard after login
            try {
                await fetchLiveLeaderboard('day', 'PNL', 100, 0);
                console.log('✅ Live leaderboard called after login');
            } catch (error) {
                console.error('Failed to call live leaderboard after login:', error);
                // Don't fail login if leaderboard call fails
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (email: string, name: string, password: string) => {
        try {
            const userData: UserResponse = await registerApi({ email, name, password });
            
            // After registration, automatically login
            await login(email, password);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    };

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
