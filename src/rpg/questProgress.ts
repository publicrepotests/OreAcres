import questRules from "./questRules.json";
import type { CombatStyle, EnemyDefinition, ResourceDefinition } from "./gameData";

type CombatQuestRule = {
  from: number;
  to: number;
  enemyId?: string;
  enemyKind?: EnemyDefinition["kind"];
  combatStyle?: CombatStyle;
};

export const QUEST_MAX_STEP = questRules.maxStep;
export const QUEST_TURN_IN_STEPS = new Set(questRules.turnInSteps);

export function questStepAfterCombat(
  currentStep: number,
  enemy: Pick<EnemyDefinition, "id" | "kind">,
  combatStyle: CombatStyle,
) {
  const rule = (questRules.combat as CombatQuestRule[]).find((candidate) =>
    candidate.from === currentStep
    && (!candidate.enemyId || candidate.enemyId === enemy.id)
    && (!candidate.enemyKind || candidate.enemyKind === enemy.kind)
    && (!candidate.combatStyle || candidate.combatStyle === combatStyle));
  return rule?.to ?? currentStep;
}

export function questStepAfterGather(currentStep: number, resource: Pick<ResourceDefinition, "id" | "kind">) {
  const rule = questRules.gather.find((candidate) =>
    candidate.from === currentStep
    && (!candidate.resourcePrefix || resource.id.startsWith(candidate.resourcePrefix))
    && (!candidate.resourceKind || candidate.resourceKind === resource.kind));
  return rule?.to ?? currentStep;
}

export function questStepAfterCraft(currentStep: number, recipeId: string) {
  return questRules.craft.find((candidate) => candidate.from === currentStep && candidate.recipeId === recipeId)?.to
    ?? currentStep;
}
