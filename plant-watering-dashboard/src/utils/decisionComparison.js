export const normalizeRuleDecision = decision => {
  if (decision?.wateringRequired === true) return 'NEEDS_WATER';
  if (decision?.wateringRequired === false) return 'NO_WATER';
  return null;
};

export const normalizeAiDecision = prediction => {
  if (prediction === 1) return 'NEEDS_WATER';
  if (prediction === 0) return 'NO_WATER';
  return null;
};

export const compareDecisions = (ruleDecision, aiDecision) => {
  if (!ruleDecision || !aiDecision) return 'NOT_AVAILABLE';
  return ruleDecision === aiDecision ? 'AGREE' : 'DISAGREE';
};

export function summarizeComparisons(comparisons) {
  const comparable = comparisons.filter(result => result === 'AGREE' || result === 'DISAGREE');
  const agreements = comparable.filter(result => result === 'AGREE').length;
  const disagreements = comparable.length - agreements;
  return {
    plantsCompared: comparable.length,
    agreements,
    disagreements,
    agreementRate: comparable.length ? (agreements / comparable.length) * 100 : null,
  };
}
