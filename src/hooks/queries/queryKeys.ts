export const queryKeys = {
  associations: {
    all: ['associations'] as const,
  },
  lifeAreas: {
    all: ['lifeAreas'] as const,
  },
  dailyAgenda: {
    all: ['dailyAgenda'] as const,
    byDate: (date: string) => ['dailyAgenda', date] as const,
  },
  grantsHome: {
    all: ['grantsHome'] as const,
  },
};
