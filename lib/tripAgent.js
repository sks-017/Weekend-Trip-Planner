export function runTripAgent(plan, rawInputs = plan.inputs ?? {}) {
  const inputs = {
    ...plan.inputs,
    ...rawInputs
  };
  const destinations = plan.destinations ?? [];
  const recommendation = chooseRecommendation(destinations, inputs);
  const backup = chooseBackup(destinations, recommendation);
  const constraints = auditConstraints(recommendation, inputs);
  const confidence = calculateConfidence(recommendation, backup, constraints);

  return {
    ...plan,
    agent: {
      name: "SAN",
      status: "ready",
      mode: "deterministic",
      objective: buildObjective(inputs),
      recommendedDestination: recommendation.name,
      backupDestination: backup?.name ?? null,
      confidence,
      decisionMemo: buildDecisionMemo(recommendation, backup, constraints, inputs),
      actions: buildActions(recommendation, constraints, inputs),
      handoffQuestions: buildHandoffQuestions(recommendation, inputs),
      toolTrace: buildToolTrace(destinations, recommendation, backup, constraints),
      guardrails: buildGuardrails(recommendation, inputs)
    }
  };
}

function chooseRecommendation(destinations, inputs) {
  const officeSafeOptions = destinations.filter((destination) => destination.returnPlan.officeSafe);
  const budgetSafeOptions = officeSafeOptions.filter((destination) => destination.budget.totalPerPerson <= inputs.budget);
  const stretchOptions = officeSafeOptions.filter((destination) => destination.budget.totalPerPerson <= inputs.budget * 1.1);

  return budgetSafeOptions[0] ?? stretchOptions[0] ?? officeSafeOptions[0] ?? destinations[0];
}

function chooseBackup(destinations, recommendation) {
  const alternatives = destinations.filter((destination) => destination.id !== recommendation.id);
  return alternatives.find((destination) => destination.returnPlan.officeSafe && destination.budget.remainingPerPerson >= 0)
    ?? alternatives.find((destination) => destination.returnPlan.officeSafe)
    ?? alternatives[0]
    ?? null;
}

function auditConstraints(destination, inputs) {
  const budgetGap = destination.budget.remainingPerPerson;
  const isBudgetSafe = budgetGap >= 0;
  const isOfficeSafe = destination.returnPlan.officeSafe;
  const groupFit = destination.groupCompatibility.score >= 68;
  const fatigueOk = destination.returnPlan.fatigueHours < 9 || destination.returnPlan.riskLevel !== "High";
  const transportFit = !(inputs.transport === "bike" && destination.driveHours > 7.5);

  return {
    budgetGap,
    isBudgetSafe,
    isOfficeSafe,
    groupFit,
    fatigueOk,
    transportFit,
    blockers: [
      isBudgetSafe ? null : `Budget is short by Rs.${Math.abs(budgetGap).toLocaleString("en-IN")} per person.`,
      isOfficeSafe ? null : "Return plan is risky for a Monday 8 AM deadline.",
      groupFit ? null : "Group preference match is selective.",
      fatigueOk ? null : "Travel fatigue is high for a short weekend.",
      transportFit ? null : "Bike mode is too tiring for this distance."
    ].filter(Boolean)
  };
}

function calculateConfidence(destination, backup, constraints) {
  const scoreGap = backup ? Math.max(0, destination.score - backup.score) : 10;
  const budgetBonus = constraints.isBudgetSafe ? 8 : -10;
  const officeBonus = constraints.isOfficeSafe ? 10 : -18;
  const fatigueBonus = constraints.fatigueOk ? 5 : -9;
  const groupBonus = constraints.groupFit ? 6 : -5;
  const transportBonus = constraints.transportFit ? 4 : -12;

  return clamp(Math.round(64 + scoreGap * 1.7 + budgetBonus + officeBonus + fatigueBonus + groupBonus + transportBonus), 35, 96);
}

function buildObjective(inputs) {
  return [
    `Plan a ${inputs.duration} SAN getaway from ${inputs.startCity}`,
    `for ${inputs.groupSize} people`,
    `under Rs.${Number(inputs.budget).toLocaleString("en-IN")} per person`,
    `after ${inputs.officeEndTime} office logout`,
    `with a ${inputs.returnDeadline} return deadline.`
  ].join(" ");
}

function buildDecisionMemo(destination, backup, constraints, inputs) {
  const budgetLine = constraints.isBudgetSafe
    ? `It keeps a Rs.${destination.budget.remainingPerPerson.toLocaleString("en-IN")} per-person buffer.`
    : `It needs Rs.${Math.abs(destination.budget.remainingPerPerson).toLocaleString("en-IN")} more per person than the current budget.`;
  const returnLine = destination.returnPlan.officeSafe
    ? `The return window leaves ${destination.returnPlan.mondayBufferHours} hours before ${inputs.returnDeadline}.`
    : `The return window is tight for ${inputs.returnDeadline}.`;
  const backupLine = backup
    ? `${backup.name} is the fallback if stays or road conditions look weak.`
    : "No fallback is needed from the current ranked set.";

  return `${destination.name} is the SAN pick because it balances worth-it score, budget, group fit, transport fatigue, and return safety. ${budgetLine} ${returnLine} ${backupLine}`;
}

function buildActions(destination, constraints, inputs) {
  const bookingWindow = destination.crowd >= 7 ? "book stays before prices move" : "shortlist two stays and confirm by evening";
  const transportStep = buildTransportStep(inputs.transport);

  return [
    {
      title: "Lock the route",
      detail: `Use the ${destination.route.join(" to ")} corridor and leave Friday night after office.`,
      state: "ready"
    },
    {
      title: "Control the budget",
      detail: constraints.isBudgetSafe
        ? `Keep the emergency margin untouched; planned spend is Rs.${destination.budget.totalPerPerson.toLocaleString("en-IN")}/person.`
        : "Reduce activity spend or switch stays before confirming.",
      state: constraints.isBudgetSafe ? "ready" : "watch"
    },
    {
      title: "Prepare booking",
      detail: `${bookingWindow}; prefer ${destination.stays[0].toLowerCase()}.`,
      state: destination.crowd >= 7 ? "watch" : "ready"
    },
    {
      title: "Protect Monday",
      detail: `${transportStep} Return starts ${destination.returnPlan.sundayDeparture}.`,
      state: destination.returnPlan.riskLevel === "High" || !constraints.transportFit ? "watch" : "ready"
    }
  ];
}

function buildHandoffQuestions(destination, inputs) {
  const questions = [
    buildTransportQuestion(inputs.transport),
    destination.crowd >= 7
      ? "Is the group okay with crowded food and parking zones?"
      : "Would the group trade nightlife for a quieter stay?",
    inputs.groupSize >= 8
      ? "Should rooms be split by couples, friends, or mixed dorm comfort?"
      : "Does anyone need a private room or low-walking itinerary?"
  ];

  if (destination.returnPlan.riskLevel !== "Low") {
    questions.push("Can Sunday checkout move earlier if traffic builds up?");
  }

  return questions;
}

function buildToolTrace(destinations, recommendation, backup, constraints) {
  return [
    {
      tool: "rank_destinations",
      result: `Scored ${destinations.length} ${recommendation.origin} weekend options and selected ${recommendation.name}.`
    },
    {
      tool: "budget_auditor",
      result: constraints.isBudgetSafe
        ? `Budget passes with Rs.${recommendation.budget.remainingPerPerson.toLocaleString("en-IN")} spare.`
        : `Budget needs Rs.${Math.abs(recommendation.budget.remainingPerPerson).toLocaleString("en-IN")} more per person.`
    },
    {
      tool: "weekend_safety",
      result: `${recommendation.returnPlan.riskLevel} risk; arrival ${recommendation.returnPlan.expectedArrival}; fatigue ${recommendation.returnPlan.fatigueHours} hr.`
    },
    {
      tool: "fallback_picker",
      result: backup ? `${backup.name} is held as backup.` : "No backup available."
    }
  ];
}

function buildGuardrails(destination, inputs) {
  return [
    `Do not push departure later than ${destination.returnPlan.sundayDeparture}.`,
    `Keep final spend near Rs.${Math.min(destination.budget.totalPerPerson, inputs.budget).toLocaleString("en-IN")}/person before emergency costs.`,
    `Use ${destination.budget.transportLabel} only if the group accepts the fatigue level.`,
    destination.returnPlan.nightDriving
      ? "Avoid optional detours because this plan already touches late driving."
      : "Optional stops are fine only if the return buffer stays above 8 hours."
  ];
}

function buildTransportStep(transport) {
  if (transport === "bike") return "Check helmets, rain gear, fuel stops, and avoid late highway riding.";
  if (transport === "bus") return "Confirm overnight seats and first-mile cabs before locking the plan.";
  if (transport === "tempo") return "Confirm driver duty hours, luggage space, and parking near the stay.";
  if (transport === "trainCab") return "Lock the train timing first and pre-book the local cab.";
  return "Assign two rested drivers and rotate before hill or ghat sections.";
}

function buildTransportQuestion(transport) {
  if (transport === "bike") return "Is every rider comfortable with the return distance after a full weekend?";
  if (transport === "bus") return "Does the group prefer sleeper bus timing or a faster daytime return?";
  if (transport === "tempo") return "Is everyone comfortable splitting a tempo traveller and driver cost?";
  if (transport === "trainCab") return "Can the group commit to fixed train timings before booking stays?";
  return "How many people can drive comfortably after a hill-road weekend?";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
