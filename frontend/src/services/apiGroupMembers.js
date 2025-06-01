import { supabase } from "./supabase";

export async function getGroupMemberId({ userId }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select("group_member_id")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.group_member_id;
}
