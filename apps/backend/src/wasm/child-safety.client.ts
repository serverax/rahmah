import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function evaluateChildSafetyFoundation(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-child-safety-wasm', input);
}