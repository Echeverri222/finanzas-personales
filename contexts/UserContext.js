import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
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

      if (error && error.code === 'PGRST116') {
        // User profile doesn't exist, create it
        console.log('User profile not found, creating new profile...');
        await createUserProfile();
      } else if (error) {
        throw error;
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            user_id: user.id,
            email: user.email || 'demo@test.com',
            nombre: user.user_metadata?.name || 'Usuario Demo',
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setUserProfile(data);
      console.log('User profile created successfully:', data);
    } catch (error) {
      console.error('Error creating user profile:', error);
      setUserProfile(null);
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