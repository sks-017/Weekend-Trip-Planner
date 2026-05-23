import { cityOptions, defaultTripInputs, destinations, planningConstants, transportProfiles } from "./tripData";

const weights = {
  budget: 0.22,
  returnSafety: 0.18,
  fatigue: 0.13,
  scenic: 0.14,
  crowd: 0.1,
  road: 0.1,
  weather: 0.06,
  group: 0.07
};

export function buildTripPlan(rawInputs = {}) {
  const inputs = normalizeInputs(rawInputs);
  const availableDestinations = destinations.filter((destination) => destination.origin === inputs.startCity);
  const rankedDestinations = availableDestinations
    .map((destination) => enrichDestination(destination, inputs))
    .sort((a, b) => b.score - a.score);

  return {
    inputs,
    generatedAt: new Date().toISOString(),
    bestDestination: rankedDestinations[0],
    destinations: rankedDestinations,
    summary: buildSummary(rankedDestinations, inputs)
  };
}

function normalizeInputs(rawInputs) {
  const startCity = cityOptions.includes(rawInputs.startCity) ? rawInputs.startCity : defaultTripInputs.startCity;
  const transport = transportProfiles[rawInputs.transport] ? rawInputs.transport : defaultTripInputs.transport;
  const preference = rawInputs.preference ?? defaultTripInputs.preference;

  return {
    ...defaultTripInputs,
    ...rawInputs,
    startCity,
    transport,
    preference,
    budget: Number(rawInputs.budget ?? defaultTripInputs.budget),
    groupSize: Number(rawInputs.groupSize ?? defaultTripInputs.groupSize),
    groupStyle: {
      ...defaultTripInputs.groupStyle,
      ...(rawInputs.groupStyle ?? {})
    }
  };
}

function enrichDestination(destination, inputs) {
  const budget = calculateBudget(destination, inputs);
  const returnPlan = calculateReturnPlan(destination, inputs);
  const group = calculateGroupCompatibility(destination, inputs);
  const scoreParts = calculateScoreParts(destination, budget, returnPlan, group, inputs);
  const score = Math.round(
    Object.entries(weights).reduce((total, [key, weight]) => total + scoreParts[key] * weight, 0)
  );

  return {
    ...destination,
    score,
    budget,
    returnPlan,
    groupCompatibility: group,
    scoreParts,
    crowdScore: destination.crowd,
    travelFatigue: labelFatigue(returnPlan.fatigueHours),
    budgetFit: labelBudgetFit(budget.totalPerPerson, inputs.budget),
    travelRisk: labelTravelRisk(returnPlan.riskLevel, destination.road),
    itinerary: buildItinerary(destination, inputs, budget, returnPlan)
  };
}

function calculateBudget(destination, inputs) {
  const profile = transportProfiles[inputs.transport] ?? transportProfiles.car;
  const groupSize = Math.max(1, Math.min(15, inputs.groupSize));
  const roundTripKm = destination.distanceKm * 2;
  const vehicleCount = profile.seatsPerVehicle ? Math.ceil(groupSize / profile.seatsPerVehicle) : 0;
  const fuel = profile.mileage ? (roundTripKm / profile.mileage) * planningConstants.fuelPrice * vehicleCount : 0;
  const toll = destination.tollRoundTrip * (profile.tollMultiplier ?? 1) * Math.max(vehicleCount, 1);
  const carTravelPerPerson = profile.mileage ? (fuel + toll) / groupSize : 0;
  const tempoTravelPerPerson = ((roundTripKm * planningConstants.tempoTravellerPerKm) + destination.tollRoundTrip * 1.25) / groupSize;
  const transportCosts = {
    car: carTravelPerPerson,
    bike: carTravelPerPerson,
    bus: destination.busFareRoundTrip,
    tempo: tempoTravelPerPerson,
    trainCab: destination.trainCabFareRoundTrip
  };
  const travelPerPerson = transportCosts[inputs.transport] ?? carTravelPerPerson;
  const stayDiscount = groupSize >= 8 ? 0.9 : groupSize >= 6 ? 0.95 : 1;
  const hotelPerPerson = destination.hotelPerPerson * stayDiscount;
  const foodMultiplier = inputs.food === "Indian" ? 1 : 1.12;
  const foodPerPerson = destination.foodPerPerson * foodMultiplier;
  const subtotal = travelPerPerson + hotelPerPerson + foodPerPerson + destination.activityPerPerson;
  const emergency = subtotal * planningConstants.emergencyMargin;
  const totalPerPerson = subtotal + emergency;

  return {
    roundTripKm,
    travelPerPerson: Math.round(travelPerPerson),
    fuelPerCar: Math.round(fuel),
    tollPerGroup: Math.round(toll),
    hotelPerPerson: Math.round(hotelPerPerson),
    foodPerPerson: Math.round(foodPerPerson),
    activityPerPerson: destination.activityPerPerson,
    emergencyPerPerson: Math.round(emergency),
    totalPerPerson: Math.round(totalPerPerson),
    remainingPerPerson: Math.round(inputs.budget - totalPerPerson),
    transportLabel: profile.label,
    vehicles: vehicleCount || (inputs.transport === "tempo" ? 1 : 0)
  };
}

function calculateReturnPlan(destination, inputs) {
  const profile = transportProfiles[inputs.transport] ?? transportProfiles.car;
  const stopBuffer = destination.distanceKm > 450 ? 2.2 : destination.distanceKm > 330 ? 1.7 : 1.3;
  const trafficMultiplier = destination.crowd >= 7 ? 1.18 : destination.crowd >= 5 ? 1.1 : 1.04;
  const returnHours = destination.driveHours * trafficMultiplier * profile.timeMultiplier + stopBuffer;
  const fatigueHours = destination.driveHours * profile.fatigueMultiplier;
  const departureHour = getSundayDepartureHour(destination, inputs);
  const arrivalHour = departureHour + returnHours;
  const bufferToMonday = planningConstants.mondayDeadlineHour - arrivalHour;
  const nightDriving = arrivalHour >= 22 || destination.driveHours >= 11;
  const bikePenalty = inputs.transport === "bike" && destination.driveHours >= 6 ? 14 : 0;
  const familyPenalty = inputs.groupSize >= 8 && destination.driveHours >= 8 ? 6 : 0;
  const fatiguePenalty = fatigueHours >= 11 ? 24 : fatigueHours >= 8 ? 12 : 4;
  const bufferScore = clamp((bufferToMonday / 12) * 100, 0, 100);
  const riskScore = clamp(100 - bufferScore + fatiguePenalty + bikePenalty + familyPenalty + (nightDriving ? 14 : 0), 0, 100);
  const riskLevel = riskScore >= 68 ? "High" : riskScore >= 50 ? "Medium" : "Low";

  return {
    sundayDeparture: formatSundayTime(departureHour),
    expectedArrival: formatSundayTime(arrivalHour),
    returnHours: roundOne(returnHours),
    fatigueHours: roundOne(fatigueHours),
    mondayBufferHours: roundOne(bufferToMonday),
    nightDriving,
    riskScore: Math.round(riskScore),
    riskLevel,
    officeSafe: riskLevel !== "High"
  };
}

function getSundayDepartureHour(destination, inputs) {
  if (inputs.transport === "bike" && destination.distanceKm > 250) return 11;
  if (inputs.transport === "trainCab" && destination.distanceKm > 420) return 10;
  if (destination.distanceKm > 500) return 8.5;
  if (destination.distanceKm > 450) return 9.5;
  if (destination.distanceKm > 330) return 13;
  if (destination.distanceKm > 285) return 14;
  return 15.5;
}

function calculateGroupCompatibility(destination, inputs) {
  const style = inputs.groupStyle;
  const checks = [
    style.adventure ? hasAny(destination, ["adventure", "rafting", "trekking", "camping"]) : null,
    style.party ? hasAny(destination, ["party", "cafes"]) : null,
    style.relaxation ? hasAny(destination, ["peaceful", "nature", "hidden", "beach"]) : null,
    style.photography ? hasAny(destination, ["photography", "nature", "beach", "mountains", "hidden"]) : null,
    style.trekking ? hasAny(destination, ["trekking", "hidden", "nature"]) : null
  ].filter((value) => value !== null);
  const activeCount = checks.length || 1;
  const matched = checks.filter(Boolean).length;
  const groupSizeFit = inputs.groupSize > 8 && hasAny(destination, ["party", "camping", "family"])
    ? 8
    : inputs.groupSize <= 5 && hasAny(destination, ["peaceful", "family", "hidden"])
      ? 7
      : 4;
  const score = clamp((matched / activeCount) * 88 + groupSizeFit, 35, 100);

  return {
    score: Math.round(score),
    label: score >= 84 ? "Excellent" : score >= 68 ? "Strong" : score >= 50 ? "Selective" : "Weak",
    matchedSignals: destination.tags.filter((tag) =>
      ["adventure", "party", "peaceful", "nature", "photography", "trekking", "camping", "beach", "family"].includes(tag)
    )
  };
}

function calculateScoreParts(destination, budget, returnPlan, group, inputs) {
  const budgetRatio = budget.totalPerPerson / inputs.budget;
  const budgetScore = budgetRatio <= 0.92 ? 100 : budgetRatio <= 1 ? 88 : budgetRatio <= 1.16 ? 65 : 38;
  const crowdScore = clamp(104 - destination.crowd * 9, 20, 100);
  const fatigueScore = clamp(110 - returnPlan.fatigueHours * 4.8, 10, 100);
  const returnSafetyScore = clamp(100 - returnPlan.riskScore, 0, 100);
  const preferenceBonus = matchesPreference(destination, inputs.preference) ? 14 : -10;
  const baseRatingBonus = (destination.baseRating - 6) * 2.5;
  const transportBonus = calculateTransportBonus(destination, inputs.transport);

  return {
    budget: clamp(budgetScore + preferenceBonus, 0, 100),
    returnSafety: returnSafetyScore,
    fatigue: fatigueScore,
    scenic: clamp(destination.scenic + baseRatingBonus + preferenceBonus, 0, 100),
    crowd: crowdScore,
    road: clamp(destination.road + transportBonus, 0, 100),
    weather: destination.weather,
    group: group.score
  };
}

function buildItinerary(destination, inputs, budget, returnPlan) {
  const arrival = destination.driveHours > 9 ? "late Saturday morning" : "Saturday morning";
  const stayType = destination.tags.includes("camping") ? "camp check-in" : "hotel, homestay, or villa check-in";
  const foodStop = inputs.food === "Indian" ? "regional breakfast and Indian dinner" : "regional breakfast and mixed cafe dinner";
  const departure = formatFridayTime(planningConstants.fridayDepartureHour);
  const transportAdvice = buildTransportAdvice(inputs.transport);

  return [
    {
      time: departure,
      title: `Depart from ${inputs.startCity}`,
      detail: `Use the ${destination.route.slice(0, -1).join(" to ")} corridor. ${transportAdvice}`
    },
    {
      time: "Saturday morning",
      title: `Arrive ${arrival}`,
      detail: `Plan ${foodStop}, then ${stayType}. Estimated travel share is Rs.${budget.travelPerPerson}/person.`
    },
    {
      time: "Saturday afternoon",
      title: destination.activities[0],
      detail: `Keep the first activity easy so the group has energy for ${destination.activities[1].toLowerCase()}.`
    },
    {
      time: "Saturday night",
      title: destination.activities[3],
      detail: destination.weatherNote
    },
    {
      time: "Sunday morning",
      title: destination.activities[2],
      detail: "Checkout before lunch and avoid stretching the plan past the office-safe return window."
    },
    {
      time: returnPlan.sundayDeparture,
      title: "Start return drive",
      detail: `Expected arrival ${returnPlan.expectedArrival}; Monday 8 AM buffer is ${returnPlan.mondayBufferHours} hours.`
    }
  ];
}

function buildSummary(rankedDestinations, inputs) {
  const officeSafeCount = rankedDestinations.filter((destination) => destination.returnPlan.officeSafe).length;
  const underBudgetCount = rankedDestinations.filter((destination) => destination.budget.totalPerPerson <= inputs.budget).length;
  const highRiskNames = rankedDestinations
    .filter((destination) => destination.returnPlan.riskLevel === "High")
    .map((destination) => destination.name);

  return {
    officeSafeCount,
    underBudgetCount,
    highRiskNames,
    city: inputs.startCity,
    topAdvice: rankedDestinations[0].returnPlan.riskLevel === "High"
      ? "Top scenic choice is not office-safe; pick the next low-risk destination."
      : `${rankedDestinations[0].name} is the strongest fit for this group and budget.`
  };
}

function hasAny(destination, tags) {
  return tags.some((tag) => destination.tags.includes(tag));
}

function matchesPreference(destination, preference) {
  const aliases = {
    peaceful: ["peaceful", "hidden", "nature", "family"],
    camping: ["camping", "adventure", "nature"],
    adventure: ["adventure", "trekking", "camping"],
    beach: ["beach"],
    mountains: ["mountains"],
    party: ["party", "cafes"],
    spiritual: ["spiritual"],
    trekking: ["trekking", "mountains", "forest"],
    family: ["family", "peaceful"],
    hidden: ["hidden", "peaceful"]
  };
  return hasAny(destination, aliases[preference] ?? [preference]);
}

function calculateTransportBonus(destination, transport) {
  if (transport === "bike" && destination.driveHours > 7) return -12;
  if (transport === "bike" && destination.road < 75) return -10;
  if (transport === "tempo" && destination.road < 74) return -7;
  if (transport === "trainCab" && destination.distanceKm > 320) return 8;
  if (transport === "bus" && destination.distanceKm > 250) return 5;
  return 0;
}

function buildTransportAdvice(transport) {
  if (transport === "bike") return "Keep riding groups small, carry rain layers, and avoid late-night return stretches.";
  if (transport === "bus") return "Pre-book overnight seats and keep first-mile cabs confirmed.";
  if (transport === "tempo") return "Confirm driver duty hours and parking near the stay before paying.";
  if (transport === "trainCab") return "Lock train timing first, then reserve the local cab for last-mile movement.";
  return "Keep two drivers rested and rotate before hill or ghat sections.";
}

function labelFatigue(hours) {
  if (hours >= 11) return "Very high";
  if (hours >= 8.8) return "Medium-high";
  if (hours >= 7) return "Medium";
  return "Low";
}

function labelBudgetFit(total, budget) {
  if (total <= budget * 0.9) return "Excellent";
  if (total <= budget) return "Good";
  if (total <= budget * 1.15) return "Stretch";
  return "Over budget";
}

function labelTravelRisk(riskLevel, road) {
  if (riskLevel === "High") return "High for Monday office timing";
  if (road < 73) return "Medium due to road quality";
  return `${riskLevel} return risk`;
}

function formatSundayTime(hour) {
  const day = hour >= 24 ? "Monday" : "Sunday";
  const normalized = ((hour % 24) + 24) % 24;
  const whole = Math.floor(normalized);
  const minutes = Math.round((normalized - whole) * 60);
  const period = whole >= 12 ? "PM" : "AM";
  const displayHour = whole % 12 || 12;
  return `${day} ${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatFridayTime(hour) {
  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  const period = whole >= 12 ? "PM" : "AM";
  const displayHour = whole % 12 || 12;
  return `Friday ${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
