/**
 * content-rule-engine runtime policy — deterministic JS port of
 * wasm/content-rule-engine/src/lib.rs.
 */

/**
 * @param {{
 *   verification_status: string,
 *   has_citation: boolean,
 *   is_published: boolean,
 *   is_test_fixture: boolean
 * }} item
 * @returns {{
 *   show_in_public_list: boolean,
 *   citation_required: boolean,
 *   public_visible: boolean,
 *   private_visible: boolean,
 *   reason: string
 * }}
 */
export function evaluate(item) {
  const {
    verification_status = 'unverified',
    has_citation = false,
    is_published = false,
    is_test_fixture = false,
  } = item || {};

  if (is_test_fixture) {
    return {
      show_in_public_list: false,
      citation_required: true,
      public_visible: false,
      private_visible: false,
      reason: 'test_fixture_hidden_from_public',
    };
  }
  if (verification_status !== 'approved') {
    return {
      show_in_public_list: false,
      citation_required: true,
      public_visible: false,
      private_visible: true,
      reason: 'not_approved',
    };
  }
  if (!has_citation) {
    return {
      show_in_public_list: false,
      citation_required: true,
      public_visible: false,
      private_visible: false,
      reason: 'missing_citation',
    };
  }
  if (!is_published) {
    return {
      show_in_public_list: false,
      citation_required: true,
      public_visible: false,
      private_visible: true,
      reason: 'not_published',
    };
  }
  return {
    show_in_public_list: true,
    citation_required: true,
    public_visible: true,
    private_visible: true,
    reason: 'approved_published_with_citation',
  };
}
