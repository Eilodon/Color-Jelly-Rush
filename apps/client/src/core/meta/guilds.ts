export type GuildMember = {
  id: string;
  name: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: number;
};

export type Guild = {
  id: string;
  name: string;
  level: number;
  experience: number;
  members: GuildMember[];
  createdAt: number;
};

export const createGuild = (name: string, leader: GuildMember): Guild => ({
  id: `guild_${Math.random().toString(36).slice(2, 10)}`,
  name,
  level: 1,
  experience: 0,
  members: [{ ...leader, role: 'leader' }],
  createdAt: Date.now(),
});

export const addGuildMember = (guild: Guild, member: GuildMember): Guild => ({
  ...guild,
  members: [...guild.members, member],
});

export const promoteGuildMember = (guild: Guild, memberId: string): Guild => ({
  ...guild,
  members: guild.members.map(member =>
    member.id === memberId ? { ...member, role: 'officer' } : member
  ),
});

export const awardGuildXP = (guild: Guild, amount: number): Guild => {
  const nextXP = guild.experience + amount;
  const nextLevel = nextXP >= 1000 ? guild.level + 1 : guild.level;
  return {
    ...guild,
    experience: nextXP % 1000,
    level: nextLevel,
  };
};
