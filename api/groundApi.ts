import { supabase } from "./supabaseClient";

export const getGrounds = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('grounds')
    .select('name')
    .order('name');

  if (error) {
    console.error("Error fetching grounds:", error);
    throw error;
  }

  return (data || []).map(g => g.name);
};

export const addGround = async (groundName: string, location?: string): Promise<void> => {
  const { error } = await supabase
    .from('grounds')
    .insert({
      name: groundName,
      location: location || null,
    });

  if (error) {
    console.error("Error adding ground:", error);
    throw error;
  }
};
