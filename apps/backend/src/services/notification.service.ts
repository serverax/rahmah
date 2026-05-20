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

export async function scheduleNotificationFoundation(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('notification.service::scheduleNotificationFoundation');
}

export async function sendNotificationTestFoundation(_input: unknown = null): Promise<FoundationResult> {
  return foundationResult('notification.service::sendNotificationTestFoundation');
}
