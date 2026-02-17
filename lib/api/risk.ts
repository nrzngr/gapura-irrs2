
export interface RiskSummaryResponse {
  last_updated: string;
  airline_risks: Record<string, number>;
  branch_risks: Record<string, number>;
  hub_risks: Record<string, number>;
  top_risky_airlines: string[];
  top_risky_branches: string[];
  total_airlines: number;
  total_branches: number;
  total_hubs: number;
}

export async function fetchRiskSummary(): Promise<RiskSummaryResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
  const response = await fetch(`${baseUrl}/api/ai/risk/summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch risk summary');
  }

  return response.json();
}
