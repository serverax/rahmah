import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function evaluatePolicyGate(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-policy-gate-wasm', input);
}