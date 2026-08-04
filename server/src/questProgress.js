import questRules from "./questRules.json" with { type: "json" };

export const QUEST_MAX_STEP = questRules.maxStep;

export function questStepAfterCombat(currentStep, enemy, combatStyle) {
  const rule = questRules.combat.find((candidate) =>
    candidate.from === currentStep
    && (!candidate.enemyId || candidate.enemyId === enemy.id)
    && (!candidate.enemyKind || candidate.enemyKind === enemy.kind)
    && (!candidate.combatStyle || candidate.combatStyle === combatStyle));
  return rule?.to ?? currentStep;
}

export function questStepAfterGather(currentStep, resource) {
  const rule = questRules.gather.find((candidate) =>
    candidate.from === currentStep
    && (!candidate.resourcePrefix || resource.id.startsWith(candidate.resourcePrefix))
    && (!candidate.resourceKind || candidate.resourceKind === resource.kind));
  return rule?.to ?? currentStep;
}

export function questStepAfterCraft(currentStep, recipeId) {
  return questRules.craft.find((candidate) => candidate.from === currentStep && candidate.recipeId === recipeId)?.to
    ?? currentStep;
}
