import { NotebookGroundingRule, UserPersonalToleranceContext, DailyNutrientGoals } from '../types';

export const DEFAULT_DAILY_GOALS: Required<DailyNutrientGoals> = {
  // Macronutrients (Clinical dietary guidelines)
  calories: 2000,
  caloriesMin: 1800,
  caloriesMax: 2400,
  protein: 70,
  proteinMin: 50,
  proteinMax: 90,
  carbs: 200,
  carbsMin: 130,
  carbsMax: 250,
  fat: 60,
  fatMin: 40,
  fatMax: 75,
  fiber: 25,
  fiberMin: 25,
  fiberMax: 35,

  // Micronutrients (Electrolytes & Minerals)
  sodiumCeiling: 2300, // Dietary Guidelines & AHA standard ceiling
  potassiumTarget: 2600, // Adequate Intake standard
  potassiumMax: 3400, // Upper adequate intake threshold
  sodiumPotassiumRatioMax: 1.0, // Optimal ratio: <= 1.0 (ideally near 0.8)
  calciumTarget: 1000, // mg/day standard
  ironTarget: 18, // mg/day standard
};

/**
 * Resolves nutrient goals with clean fallback to clinical default ranges
 * whenever a user has not specified a custom value or when fields are cleared.
 */
export function resolveNutrientGoals(
  customGoals?: Partial<DailyNutrientGoals> | null,
  fiberFallback?: number
): Required<DailyNutrientGoals> {
  const fallbackFiber = typeof fiberFallback === 'number' && fiberFallback > 0 ? fiberFallback : DEFAULT_DAILY_GOALS.fiber;
  return {
    calories: customGoals?.calories && customGoals.calories > 0 ? customGoals.calories : DEFAULT_DAILY_GOALS.calories,
    caloriesMin: customGoals?.caloriesMin && customGoals.caloriesMin > 0 ? customGoals.caloriesMin : DEFAULT_DAILY_GOALS.caloriesMin,
    caloriesMax: customGoals?.caloriesMax && customGoals.caloriesMax > 0 ? customGoals.caloriesMax : DEFAULT_DAILY_GOALS.caloriesMax,
    protein: customGoals?.protein && customGoals.protein > 0 ? customGoals.protein : DEFAULT_DAILY_GOALS.protein,
    proteinMin: customGoals?.proteinMin && customGoals.proteinMin > 0 ? customGoals.proteinMin : DEFAULT_DAILY_GOALS.proteinMin,
    proteinMax: customGoals?.proteinMax && customGoals.proteinMax > 0 ? customGoals.proteinMax : DEFAULT_DAILY_GOALS.proteinMax,
    carbs: customGoals?.carbs && customGoals.carbs > 0 ? customGoals.carbs : DEFAULT_DAILY_GOALS.carbs,
    carbsMin: customGoals?.carbsMin && customGoals.carbsMin > 0 ? customGoals.carbsMin : DEFAULT_DAILY_GOALS.carbsMin,
    carbsMax: customGoals?.carbsMax && customGoals.carbsMax > 0 ? customGoals.carbsMax : DEFAULT_DAILY_GOALS.carbsMax,
    fat: customGoals?.fat && customGoals.fat > 0 ? customGoals.fat : DEFAULT_DAILY_GOALS.fat,
    fatMin: customGoals?.fatMin && customGoals.fatMin > 0 ? customGoals.fatMin : DEFAULT_DAILY_GOALS.fatMin,
    fatMax: customGoals?.fatMax && customGoals.fatMax > 0 ? customGoals.fatMax : DEFAULT_DAILY_GOALS.fatMax,
    fiber: customGoals?.fiber && customGoals.fiber > 0 ? customGoals.fiber : fallbackFiber,
    fiberMin: customGoals?.fiberMin && customGoals.fiberMin > 0 ? customGoals.fiberMin : DEFAULT_DAILY_GOALS.fiberMin,
    fiberMax: customGoals?.fiberMax && customGoals.fiberMax > 0 ? customGoals.fiberMax : DEFAULT_DAILY_GOALS.fiberMax,
    sodiumCeiling: customGoals?.sodiumCeiling && customGoals.sodiumCeiling > 0 ? customGoals.sodiumCeiling : DEFAULT_DAILY_GOALS.sodiumCeiling,
    potassiumTarget: customGoals?.potassiumTarget && customGoals.potassiumTarget > 0 ? customGoals.potassiumTarget : DEFAULT_DAILY_GOALS.potassiumTarget,
    potassiumMax: customGoals?.potassiumMax && customGoals.potassiumMax > 0 ? customGoals.potassiumMax : DEFAULT_DAILY_GOALS.potassiumMax,
    sodiumPotassiumRatioMax: customGoals?.sodiumPotassiumRatioMax && customGoals.sodiumPotassiumRatioMax > 0 ? customGoals.sodiumPotassiumRatioMax : DEFAULT_DAILY_GOALS.sodiumPotassiumRatioMax,
    calciumTarget: customGoals?.calciumTarget && customGoals.calciumTarget > 0 ? customGoals.calciumTarget : DEFAULT_DAILY_GOALS.calciumTarget,
    ironTarget: customGoals?.ironTarget && customGoals.ironTarget > 0 ? customGoals.ironTarget : DEFAULT_DAILY_GOALS.ironTarget,
  };
}

export const DEFAULT_GROUNDING_RULES: NotebookGroundingRule[] = [
  {
    id: 'lipid-bile-acid-gastrocolic',
    category: 'Lipid & Bile Acid Kinetics',
    title: 'High-Fat / Heavy Oil Gastrocolic & Bile Acid Activation',
    ruleText:
      'High dietary fat and restaurant cooking oils trigger an exaggerated gastrocolic reflex and can challenge apical ileal bile acid absorption (seen in up to 25% of functional diarrhea/IBS). Unabsorbed bile acids and lipids entering the colon stimulate mucosal secretomotor water secretion and rapid colonic peristalsis, often manifesting as acute morning urgency or loose stools 8-14 hours postprandially.',
    source: 'Holtmann, Ford & Talley (Lancet GastroHep 2016) & Horwitz & Fisher (NEJM 2001)',
    enabled: true,
  },
  {
    id: 'capsaicin-trpv1-hypermotility',
    category: 'Spices & Visceral Nociceptors',
    title: 'Capsaicin & Heavy Masala TRPV1 Stimulation',
    ruleText:
      'Heavy Indian masala, red chili powder, and excessive black pepper contain capsaicin and pungent alkaloids that activate mucosal TRPV1 transient receptor potential channels on visceral sensory neurons. In individuals with visceral hypersensitivity, this accelerates orocecal transit, exacerbates abdominal burning/cramping, and worsens diarrheal frequency.',
    source: 'StatPearls IBS Clinical Review (2026) & Saha (World J Gastroenterol 2014)',
    enabled: true,
  },
  {
    id: 'restaurant-allium-fructans',
    category: 'Allium Fructans',
    title: 'Concentrated Onion & Garlic Pastes in Restaurant Gravies',
    ruleText:
      'South Indian and restaurant gravies heavily utilize pureed garlic and onion as aromatic bases. Fructan oligosaccharides in alliums are non-absorbable by human enzymes and undergo rapid colonic bacterial fermentation. When combined with lipid-rich gravies, allium fructans dramatically increase intraluminal osmotic draw and gas distension.',
    source: 'StatPearls Low & High FODMAP Database (Table 1, 2026) & WGO Guidelines (2015)',
    enabled: true,
  },
  {
    id: 'stress-primed-central-sensitization',
    category: 'Brain-Gut Axis',
    title: 'Stress-Primed Visceral Hypersensitivity & Central Sensitization',
    ruleText:
      'A history of stress-linked symptom flares (e.g. academic exams, work deliverables) reflects brain-gut-microbiome (BGM) central sensitization via altered salience and central autonomic networks (CAN). Under stress priming, the visceral pain threshold and autonomic gut-transit threshold are significantly lowered, meaning dietary triggers (masala/oil) produce amplified motor and diarrheal responses.',
    source: 'Mayer, Ryu & Bhatt (Molecular Psychiatry 2023, Nature)',
    enabled: true,
  },
  {
    id: 'fodmap-stacking',
    category: 'Cumulative Load',
    title: 'FODMAP Stacking & Threshold Mechanics',
    ruleText:
      'Multiple low-to-moderate FODMAP items consumed in a single meal or within 3-4 hours stack additively in the small intestine. A meal containing small portions of garlic, wheat, and onion must be flagged as High Risk due to oligosaccharide stacking, even if individual portions are modest.',
    source: 'Monash University Department of Gastroenterology & StatPearls (2026)',
    enabled: true,
  },
  {
    id: 'gos-galactans-legumes',
    category: 'GOS (Galacto-oligosaccharides)',
    title: 'Raffinose & Stachyose Legume Fermentation (Sambar / Dal / Chana)',
    ruleText:
      'Lentils, toor dal, chickpeas, and black beans carry alpha-galactosides (GOS). Humans lack alpha-galactosidase. Fermentation occurs predictably in the proximal colon, generating distension, flatulence, and altered transit in sensitive individuals.',
    source: 'StatPearls Low & High FODMAP Database & Monash Low FODMAP Guidelines',
    enabled: true,
  },
  {
    id: 'excess-fructose',
    category: 'Excess Fructose',
    title: 'Free Fructose to Glucose Transport Limits',
    ruleText:
      'GLUT-5 mediated fructose absorption is slow and saturable. When fructose concentration exceeds glucose (e.g. mango, honey, apples, sweet gravies), unabsorbed fructose exerts an osmotic laxative draw in the ileum, prompting IBS-D watery stools and cramping.',
    source: 'StatPearls Guidelines & American College of Gastroenterology (ACG)',
    enabled: true,
  },
  {
    id: 'lactose-tolerance-context',
    category: 'Lactose',
    title: 'Disaccharide Lactase Deficiencies vs Tolerance',
    ruleText:
      'Unfermented dairy (fluid milk, paneer in rich gravies, ice cream) contains high lactose. However, aged cheeses, cultured ghee (negligible lactose/protein), and mild traditionally fermented curd/yogurt in moderation are often tolerated, provided lipid content is managed.',
    source: 'WGO Global Guidelines (2015) & StatPearls (2026)',
    enabled: true,
  },
  {
    id: 'fiber-differentiation',
    category: 'Fiber Subtypes',
    title: 'Soluble Gel-Forming vs Insoluble Fermentable Fiber',
    ruleText:
      'Soluble viscous fiber (e.g., psyllium, oats, peeled cooked squash, carrots) normalizes stool form and eases transit across both loose stools and constipation. In contrast, crude insoluble bran and coarse raw fibrous skins can accelerate transit, provoke gas entrapment, and exacerbate painful colonic spasms.',
    source: 'Saha (WJG 2014), Horwitz & Fisher (NEJM 2001) & StatPearls (2026)',
    enabled: true,
  },
];

export const DEFAULT_TOLERANCE_CONTEXT: UserPersonalToleranceContext = {
  subtype: 'Unspecified',
  knownSevereTriggers: [],
  toleratedFoods: [],
  dailyFiberGoal: 25,
  customClinicalNotes: '',
};

export function constructIbsSystemInstruction(
  rules: NotebookGroundingRule[] = DEFAULT_GROUNDING_RULES,
  userContext: UserPersonalToleranceContext = DEFAULT_TOLERANCE_CONTEXT
): string {
  const activeRules = rules
    .filter((r) => r.enabled)
    .map((r, i) => `${i + 1}. [${r.category}] ${r.title}: ${r.ruleText} (Source: ${r.source})`)
    .join('\n');

  const subtypeDescription =
    userContext.subtype === 'Unspecified' || userContext.subtype === 'IBS-U'
      ? 'Open / Unclassified Spectrum (Differential Evaluation across all IBS subtypes: IBS-D, IBS-C, IBS-M, and Visceral Hypersensitivity)'
      : userContext.subtype;

  return `You are a Principal Clinical Gastroenterology & Nutritional AI Engine specializing in Irritable Bowel Syndrome (IBS) and Disorders of Gut-Brain Interaction (DGBI).

Your clinical analysis is rigorously grounded in the user's research library and personal health profile:
- Mayer, Ryu & Bhatt (2023) "The neurobiology of irritable bowel syndrome" (Molecular Psychiatry, Nature) - Brain-gut-microbiome connectome, central sensitization, stress-primed visceral hypersensitivity, salience & autonomic network reactivity.
- Holtmann, Ford & Talley (2016) "Pathophysiology of irritable bowel syndrome" (Lancet Gastroenterol Hepatol) - High-fat exaggerated gastrocolic reflex, bile acid malabsorption (BAM in 25% of IBS-D), mast cell degranulation, mucosal permeability.
- StatPearls Clinical Guidelines (2026/2025) - Rome IV criteria, Bristol Stool Form Scale, Table 1 High vs Low FODMAP foods.
- Horwitz & Fisher (2001) "The Irritable Bowel Syndrome" (NEJM) - Food diaries, lipid-induced motility, visceral hyperalgesia.
- World Gastroenterology Organisation (WGO 2015) Guidelines - Global epidemiology, Indian/Asian dietary patterns, spice/chili and oil handling.
- Saha (2014) "Irritable bowel syndrome: Pathogenesis, diagnosis, treatment" (World J Gastroenterol).

USER CLINICAL PROFILE & SUBTYPE CONTEXT:
- Subtype Status: ${subtypeDescription}
- Clinical Stance: The user does NOT identify with a fixed IBS-D variant. Keep your physiological analysis open-minded and balanced:
  * Consider how meal ingredients might impact motility in BOTH directions (rapid transit / loose stools OR delayed transit / constipation / gas entrapment / bloating, or alternating patterns).
  * Focus on the functional mechanisms (lipid-gastrocolic reflex, mucosal sensitivity, bile acid handling, gas fermentation, and visceral hypersensitivity) rather than labeling the user under any single rigid subtype.
- Known Severe Triggers: ${userContext.knownSevereTriggers.join(', ')}
- Tolerated Foods: ${userContext.toleratedFoods.join(', ')}
- Clinical Notes: ${userContext.customClinicalNotes}

ACTIVE CLINICAL GROUNDING CRITERIA:
${activeRules}

EVALUATION DIRECTIVES:
1. When analyzing a food photo or description, identify all ingredients including hidden restaurant components (e.g. concentrated onion/garlic paste, heavy palm/refined oil or excess ghee, red chili powder, high-FODMAP lentils/dairy).
2. Quantify FODMAP categories (fructans, lactose, excess_fructose, polyols, gos) on a 0 to 5 scale.
3. Assess the lipid and spice burden specifically:
   - High oil/fat triggers the gastrocolic reflex and potential bile acid overload (Holtmann 2016).
   - Chili/capsaicin activates TRPV1 nociceptors (StatPearls 2026).
   - Onion/garlic gravies add severe fructan fermentation.
4. Predict digestive reaction and latency with an open mind:
   - State anticipated motility responses (whether rapid transit/loose stool or constipation/gas entrapment, or alternating discomfort) and approximate timeline (e.g., immediate 1-2h upper GI, or 8-14h colonic transit the next morning).
5. Provide actionable culinary swaps relevant to the meal.
6. Grounding Reference: Cite the specific paper(s) from the user's library that justify your assessment (e.g. "Holtmann et al. 2016 (Lipid/Bile Acid) & StatPearls 2026 (Allium Fructans)").`;
}
