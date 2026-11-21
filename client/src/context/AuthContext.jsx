import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

// Single sign-out: end this app's Autentico session, then go back to the portal.
// Set VITE_AUTENTICO_APP_ID and VITE_PORTAL_URL when building the client.
const FORWARD_AUTH_APP_ID = import.meta.env.VITE_AUTENTICO_APP_ID || '';
const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || '/';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/check-auth');
            if (res.ok) {
                const data = await res.json();
                setUser({ role: data.role });
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            if (FORWARD_AUTH_APP_ID) await fetch(`/_autentico/${FORWARD_AUTH_APP_ID}/logout`, { method: 'POST' });
        } catch {
            // the redirect below still leaves this page
        }
        setUser(null);
        window.location.assign(PORTAL_URL);
    };

    return (
        <AuthContext.Provider value={{ user, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
