export async function enhancePlanWithAI(plan, inputs) {
  const provider = process.env.AI_PROVIDER?.toLowerCase() ?? "demo";

  if (provider === "openai") {
    return callOpenAI(plan, inputs);
  }

  if (provider === "gemini") {
    return callGemini(plan, inputs);
  }

  if (provider === "local") {
    return {
      ...plan,
      aiProvider: {
        name: "local",
        status: "not_configured",
        note: "Point this adapter at a local inference server when ready."
      }
    };
  }

  return {
    ...plan,
    aiProvider: {
      name: "demo",
      status: "deterministic",
      note: "Ranking, budget, and return-safety logic are running without an external LLM."
    }
  };
}

async function callOpenAI(plan, inputs) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return withMissingProvider(plan, "openai", "Set OPENAI_API_KEY and OPENAI_MODEL.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(plan, inputs)
    })
  });

  if (!response.ok) {
    return withProviderError(plan, "openai", await response.text());
  }

  const data = await response.json();
  return attachNarrative(plan, "openai", extractOpenAIText(data));
}

async function callGemini(plan, inputs) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    return withMissingProvider(plan, "gemini", "Set GEMINI_API_KEY and GEMINI_MODEL.");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPrompt(plan, inputs) }]
        }
      ]
    })
  });

  if (!response.ok) {
    return withProviderError(plan, "gemini", await response.text());
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ?? "";
  return attachNarrative(plan, "gemini", text);
}

function buildPrompt(plan, inputs) {
  const compactDestinations = plan.destinations.slice(0, 5).map((destination) => ({
    destination: destination.name,
    score: destination.score,
    cost: destination.budget.totalPerPerson,
    risk: destination.returnPlan.riskLevel,
    buffer: destination.returnPlan.mondayBufferHours,
    fatigue: destination.travelFatigue
  }));
  const agentDecision = plan.agent ? {
    pick: plan.agent.recommendedDestination,
    backup: plan.agent.backupDestination,
    confidence: plan.agent.confidence,
    memo: plan.agent.decisionMemo,
    guardrails: plan.agent.guardrails
  } : null;

  return [
    "You are SAN, an AI weekend travel planning agent for India.",
    "Give a concise decision memo with the best destination, one backup, and a Monday office-safe warning.",
    "Do not mention the underlying model provider.",
    `Inputs: ${JSON.stringify(inputs)}`,
    `Ranked options: ${JSON.stringify(compactDestinations)}`,
    `Agent decision: ${JSON.stringify(agentDecision)}`
  ].join("\n");
}

function extractOpenAIText(data) {
  if (data.output_text) return data.output_text;
  return data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .filter(Boolean)
    .join("\n") ?? "";
}

function attachNarrative(plan, name, narrative) {
  return {
    ...plan,
    aiProvider: {
      name,
      status: narrative ? "enhanced" : "empty_response",
      narrative
    }
  };
}

function withMissingProvider(plan, name, note) {
  return {
    ...plan,
    aiProvider: {
      name,
      status: "missing_env",
      note
    }
  };
}

function withProviderError(plan, name, detail) {
  return {
    ...plan,
    aiProvider: {
      name,
      status: "error",
      note: detail.slice(0, 600)
    }
  };
}
