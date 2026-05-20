export type WasmDecision = 'ALLOW' | 'BLOCK' | 'NEEDS_REVIEW' | 'NEEDS_SCHOLAR_REVIEW' | 'ALLOW_NOTIFICATION' | 'BLOCK_STALE_CACHE' | 'HIDE_UNTIL_VERIFIED' | 'NEEDS_ONLINE_CHECK';

export interface WasmRuleInput {
  action: string;
  [key: string]: unknown;
}

export interface WasmRuleOutput {
  decision: WasmDecision;
  reasons: string[];
  requiresScholarReview: boolean;
}

export async function runWasmRuleFoundation(_moduleName: string, input: WasmRuleInput): Promise<WasmRuleOutput> {
  return {
    decision: 'NEEDS_REVIEW',
    reasons: ['placeholder runtime for ' + String(input.action || 'unknown')],
    requiresScholarReview: false,
  };
}