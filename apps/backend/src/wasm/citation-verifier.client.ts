import { runWasmRuleFoundation, type WasmRuleInput, type WasmRuleOutput } from './wasm-runtime';

export async function verifyCitationFoundation(input: WasmRuleInput): Promise<WasmRuleOutput> {
  return runWasmRuleFoundation('rahma-citation-verifier-wasm', input);
}