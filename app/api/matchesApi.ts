import { TypeBallInfo } from "@/types/match";
import { supabase } from "./supabaseClient"


export const getMatches = async () => {
  const { data, error } = await supabase
    .from('names')
    .select('*');

  if (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }

  console.log("Data:", data.map(player => (player.name)));

  return data;
};

export const uploadBallInfo = async (ballInfo: TypeBallInfo) => {
  const { data, error } = await supabase
    .from('ball_info')
    .insert(ballInfo);
  if (error) {
    console.error("Error uploading ball info:", error);
    throw error;
  }
}
