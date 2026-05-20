export interface FoundationResult {
  status: 'foundation';
  message: string;
  module: string;
}

function foundationResult(module: string): FoundationResult {
  return {
    status: 'foundation',
    message: 'Service skeleton created. Real implementation pending.',
    module,
  };
}

export async function listDuaCategoriesFoundation(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('dua.service::listDuaCategoriesFoundation');
}

export async function listDuaEntriesFoundation(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('dua.service::listDuaEntriesFoundation');
}
