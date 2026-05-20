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

export async function listSurahsFoundation(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('quran.service::listSurahsFoundation');
}

export async function searchQuranFoundation(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('quran.service::searchQuranFoundation');
}
