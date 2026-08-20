export interface GimGroup {
  name: string;
  /** Which board the group was found on — the only public GIM/HCGIM signal. */
  isHardcore: boolean;
  members: string[];
}

/**
 * Member names are only rendered as links to each member's personal hiscores
 * page — there is no JSON representation of any of the group hiscores.
 */
export function parseGroupMembers(html: string) {
  const members = [...html.matchAll(/hiscorepersonal\?user1=([^'"&]+)/g)].map(
    ([, name]) => decodeURIComponent(name.replace(/\+/g, ' ')),
  );

  return [...new Set(members)];
}

export function isGroupMember(group: GimGroup, playerName: string) {
  return group.members.some(
    (member) => member.toLowerCase() === playerName.toLowerCase().trim(),
  );
}
