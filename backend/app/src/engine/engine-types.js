/**
 * Rahma Control Engine — type contracts.
 *
 * The engine is a deterministic rule-based router; **not** an LLM, **not**
 * an inference system. Every decision must be reproducible from the
 * `{ event_type, payload }` input alone.
 */

export const SUPPORTED_EVENTS = Object.freeze([
  'USER_ASKED_SHEIKH_QUESTION',
  'SHEIKH_DRAFTED_ANSWER',
  'SHEIKH_REQUESTED_PUBLISH',
  'NEW_ISLAMIC_CONTENT_ADDED',
  'CONTENT_REVIEW_REQUESTED',
  'CHILD_GAME_SCENARIO_ADDED',
  'USER_OPENED_HOME',
  'USER_OPENED_CHILD_GAME',
  'USER_SEARCHED_CONTENT',
  'DAILY_CONTENT_REFRESH',
  'SOURCE_VERIFICATION_REQUIRED',
  'CHARITY_CAMPAIGN_CREATED',
  'CHARITY_CAMPAIGN_REQUESTED_PUBLICATION',
  'FAMILY_CHILD_PROFILE_CREATED',
  'ADMIN_REQUESTED_RECOMMENDATIONS',
]);

export const ALLOWED_DECISIONS = Object.freeze([
  'allow',
  'block',
  'queue_review',
  'publish',
  'hide',
  'recommend',
  'needs_source',
  'needs_auth',
  'service_not_configured',
]);

export const ACTOR_TYPES = Object.freeze(['user', 'sheikh', 'moderator', 'admin', 'system']);

export function isSupportedEvent(t) { return SUPPORTED_EVENTS.includes(t); }
export function isAllowedDecision(d) { return ALLOWED_DECISIONS.includes(d); }
export function isAllowedActor(a) { return ACTOR_TYPES.includes(a); }
