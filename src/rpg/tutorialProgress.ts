export type TutorialMilestoneSnapshot = {
  movedDistance: number;
  questStep: number;
  panel: string | null;
  gatheringXp: number;
  combatXp: number;
  enemiesDefeated: number;
};

export function tutorialMilestoneComplete(stepId: string, snapshot: TutorialMilestoneSnapshot) {
  if (stepId === "move") return snapshot.movedDistance >= 46;
  if (stepId === "mira") return snapshot.questStep >= 1;
  if (stepId === "inventory") return snapshot.panel === "inventory";
  if (stepId === "map") return snapshot.panel === "map";
  if (stepId === "gather") return snapshot.gatheringXp > 0;
  if (stepId === "combat") return snapshot.combatXp > 0 || snapshot.enemiesDefeated > 0;
  return false;
}
