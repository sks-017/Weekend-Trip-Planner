import { enhancePlanWithAI } from "../../../lib/aiProviders";
import { buildTripPlan } from "../../../lib/planner";
import { runTripAgent } from "../../../lib/tripAgent";

export const runtime = "edge";

export async function POST(request) {
  const inputs = await request.json();
  const deterministicPlan = buildTripPlan(inputs);
  const agentPlan = runTripAgent(deterministicPlan, deterministicPlan.inputs);
  const plan = await enhancePlanWithAI(agentPlan, agentPlan.inputs);

  return Response.json(plan);
}
