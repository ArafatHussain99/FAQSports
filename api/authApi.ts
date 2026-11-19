import { supabase } from "./supabaseClient";

// ===================================================================
// AUTHENTICATION
// ===================================================================

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.error("Error signing up:", error);
    throw error;
  }

  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in:", error);
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return data.user;
};

export const getUserRole = async (email: string): Promise<'admin' | 'player' | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single();

  console.log("data: ", data);

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return (data?.role as 'admin' | 'player') || null;
};
