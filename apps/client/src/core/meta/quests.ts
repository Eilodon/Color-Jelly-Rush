export type QuestType = 'daily' | 'weekly';

export type QuestDefinition = {
  id: string;
  type: QuestType;
  name: string;
  description: string;
  target: number;
  reward: {
    soft: number;
    cosmeticId?: string;
  };
};

export type QuestProgress = {
  id: string;
  progress: number;
  completed: boolean;
};

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'daily_match',
    type: 'daily',
    name: 'Perfect Match',
    description: 'Reach 85% match 3 times.',
    target: 3,
    reward: { soft: 200 },
  },
  {
    id: 'daily_eat',
    type: 'daily',
    name: 'Clean Plate',
    description: 'Consume 60 pickups.',
    target: 60,
    reward: { soft: 150 },
  },
  {
    id: 'weekly_boss',
    type: 'weekly',
    name: 'Guardian Slayer',
    description: 'Defeat the Ring Guardian 3 times.',
    target: 3,
    reward: { soft: 1000, cosmeticId: 'badge_boss' },
  },
];

export const getQuestBoard = (type: QuestType): QuestDefinition[] =>
  QUEST_DEFINITIONS.filter(q => q.type === type);

export const initializeProgress = (type: QuestType): QuestProgress[] =>
  getQuestBoard(type).map(q => ({ id: q.id, progress: 0, completed: false }));

export const applyQuestProgress = (
  progressList: QuestProgress[],
  questId: string,
  amount: number
): QuestProgress[] => {
  return progressList.map(progress => {
    if (progress.id !== questId || progress.completed) return progress;
    const next = Math.min(progress.progress + amount, getTarget(questId));
    return { ...progress, progress: next, completed: next >= getTarget(questId) };
  });
};

const getTarget = (questId: string): number => {
  const quest = QUEST_DEFINITIONS.find(q => q.id === questId);
  return quest?.target ?? 1;
};
