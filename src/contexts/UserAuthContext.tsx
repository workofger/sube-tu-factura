import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserProfile,
  userLogin,
  userLogout,
  checkUserSession,
  getOnboardingStatus,
  OnboardingStatus,
} from '../services/userService';

interface UserAuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingStatus: OnboardingStatus | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshOnboarding: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | null>(null);

export const useUserAuthContext = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuthContext must be used within a UserAuthProvider');
  }
  return context;
};

interface UserAuthProviderProps {
  children: ReactNode;
}

export const UserAuthProvider: React.FC<UserAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const result = await checkUserSession();
      if (result.isValid && result.user) {
        setUser(result.user);
        // Also fetch onboarding status if not complete
        if (!result.user.onboarding_completed) {
          const onboardingResult = await getOnboardingStatus();
          if (onboardingResult.success && onboardingResult.data) {
            setOnboardingStatus(onboardingResult.data);
          }
        }
      } else {
        setUser(null);
        setOnboardingStatus(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const result = await userLogin(email, password);

    if (result.success && result.user) {
      setUser(result.user);

      // Fetch onboarding status if not complete
      if (!result.user.onboarding_completed) {
        const onboardingResult = await getOnboardingStatus();
        if (onboardingResult.success && onboardingResult.data) {
          setOnboardingStatus(onboardingResult.data);
        }
      }

      return { success: true, message: 'Login exitoso' };
    }

    return { success: false, message: result.message };
  }, []);

  const logout = useCallback(async () => {
    await userLogout();
    setUser(null);
    setOnboardingStatus(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await checkSession();
  }, []);

  const refreshOnboarding = useCallback(async () => {
    if (!user) return;

    const result = await getOnboardingStatus();
    if (result.success && result.data) {
      setOnboardingStatus(result.data);
    }
  }, [user]);

  const value: UserAuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    onboardingStatus,
    login,
    logout,
    refreshUser,
    refreshOnboarding,
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};

export default UserAuthProvider;
