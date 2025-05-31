import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const UserContext = createContext({});

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserProfile(prev => ({ ...prev, ...updates }));
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return (
    <UserContext.Provider value={{ userProfile, loading, updateProfile }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
}; 