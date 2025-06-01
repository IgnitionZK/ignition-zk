import { supabase } from "./supabase";

export async function getGroupMemberId({ userId }) {
  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select("group_member_id")
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);

  return data?.group_member_id;
}
