import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function evaluatePrayerRulesFoundation(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-prayer-rules-wasm', input);
}