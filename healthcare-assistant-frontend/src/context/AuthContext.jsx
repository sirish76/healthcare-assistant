import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const GOOGLE_CLIENT_ID = '1045121225058-evthv0bogs2i0k5l015a04eoig1ltsnp.apps.googleusercontent.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('healthassist_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('healthassist_user');
      }
    }
    setLoading(false);
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const signIn = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            // Send token to backend for verification
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: response.credential }),
            });

            if (!res.ok) {
              throw new Error('Authentication failed');
            }

            const userData = await res.json();
            setUser(userData);
            localStorage.setItem('healthassist_user', JSON.stringify(userData));
            resolve(userData);
          } catch (error) {
            console.error('Sign-in error:', error);
            reject(error);
          }
        },
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: use the button-based flow
          const buttonDiv = document.createElement('div');
          buttonDiv.id = 'google-signin-fallback';
          buttonDiv.style.position = 'fixed';
          buttonDiv.style.top = '50%';
          buttonDiv.style.left = '50%';
          buttonDiv.style.transform = 'translate(-50%, -50%)';
          buttonDiv.style.zIndex = '10000';
          buttonDiv.style.background = 'white';
          buttonDiv.style.padding = '32px';
          buttonDiv.style.borderRadius = '16px';
          buttonDiv.style.boxShadow = '0 25px 50px rgba(0,0,0,0.25)';

          const overlay = document.createElement('div');
          overlay.id = 'google-signin-overlay';
          overlay.style.position = 'fixed';
          overlay.style.inset = '0';
          overlay.style.background = 'rgba(0,0,0,0.4)';
          overlay.style.zIndex = '9999';
          overlay.onclick = () => {
            overlay.remove();
            buttonDiv.remove();
            reject(new Error('Sign-in cancelled'));
          };

          document.body.appendChild(overlay);
          document.body.appendChild(buttonDiv);

          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'signin_with',
          });
        }
      });
    });
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem('healthassist_user');

    // Clean up any Google sign-in UI
    const overlay = document.getElementById('google-signin-overlay');
    const fallback = document.getElementById('google-signin-fallback');
    if (overlay) overlay.remove();
    if (fallback) fallback.remove();

    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

