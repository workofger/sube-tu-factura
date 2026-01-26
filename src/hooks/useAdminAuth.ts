import { useState, useEffect, useCallback } from 'react';
import { 
  AdminUser, 
  adminLogin, 
  adminLogout, 
  checkSession,
  getStoredToken 
} from '../services/adminService';

interface UseAdminAuthReturn {
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    
    const token = getStoredToken();
    if (!token) {
      setAdminUser(null);
      setIsLoading(false);
      return;
    }

    const result = await checkSession();
    
    if (result.isValid && result.admin) {
      setAdminUser(result.admin);
    } else {
      setAdminUser(null);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Sign in handler
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    const result = await adminLogin(email, password);
    
    if (result.success && result.admin) {
      setAdminUser(result.admin);
    }
    
    setIsLoading(false);
    
    return {
      success: result.success,
      message: result.message,
    };
  }, []);

  // Sign out handler
  const signOut = useCallback(async () => {
    setIsLoading(true);
    await adminLogout();
    setAdminUser(null);
    setIsLoading(false);
  }, []);

  return {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
    signIn,
    signOut,
    refreshSession,
  };
};

export default useAdminAuth;
