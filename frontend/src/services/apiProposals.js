import { supabase } from "./supabase";

export async function getProposalsByGroupId({ groupId }) {
  if (!groupId) {
    throw new Error("groupId is required");
  }

  // Convert single groupId to array if it's not already
  const groupIds = Array.isArray(groupId) ? groupId : [groupId];

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposals")
    .select(
      `
      *,
      groups (
        name
      )
    `
    )
    .in("group_id", groupIds);

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  // Transform the data to include group name directly in the proposal object
  return data.map((proposal) => ({
    ...proposal,
    group_name: proposal.groups.name,
  }));
}
