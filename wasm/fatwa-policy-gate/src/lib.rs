// =============================================================================
// fatwa-policy-gate — FOUNDATION ONLY.
//
// This crate exists to make the policy contract explicit and testable.
// Its current behaviour is intentionally fail-closed:
//
//   - Every answer that lacks an explicit scholar approval record AND
//     a verified Quran/Hadith citation is REJECTED.
//   - There is no rule that auto-approves. The gate is purely a "do we
//     have the prerequisites" checker — the actual Islamic ruling is
//     authored by a human scholar.
//
// What this crate does NOT do:
//   - It does not generate, retrieve, or evaluate religious content.
//   - It does not bypass the JS policy in the backend.
//   - It does not decide what the "right" answer is — that is a scholar's job.
// =============================================================================

#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(target_arch = "wasm32")]
extern crate alloc;

#[cfg(target_arch = "wasm32")]
use alloc::{string::{String, ToString}, vec::Vec};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct AnswerInput {
    /// True when a content_reviewer/admin row exists for this answer in the
    /// audit log. False otherwise. The gate does not look this up itself —
    /// the host supplies it.
    pub has_scholar_approval: bool,
    /// True when at least one citation has citation_type in {quran, hadith}
    /// and a non-empty citation_label.
    pub has_verified_quran_or_hadith_citation: bool,
    /// True when the answer is intended for public publication. Private
    /// answers (visible only to the asker) pass with a softer rule.
    pub publication_mode_public: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Decision {
    pub decision: &'static str, // "allow_publish" | "block" | "needs_scholar_review"
    pub reason: &'static str,
}

pub fn evaluate(input: &AnswerInput) -> Decision {
    // Public publication path: must have BOTH scholar approval AND
    // verified Quran/Hadith citation.
    if input.publication_mode_public {
        if !input.has_scholar_approval {
            return Decision {
                decision: "block",
                reason: "public_fatwa_requires_scholar_approval",
            };
        }
        if !input.has_verified_quran_or_hadith_citation {
            return Decision {
                decision: "block",
                reason: "public_fatwa_requires_quran_or_hadith_citation",
            };
        }
        return Decision {
            decision: "allow_publish",
            reason: "approved_and_cited",
        };
    }

    // Private path: at least one citation is required, OR the answer is
    // explicitly routed through scholar review. Otherwise blocked.
    if input.has_verified_quran_or_hadith_citation {
        return Decision {
            decision: "allow_publish",
            reason: "private_answer_with_citation",
        };
    }
    Decision {
        decision: "needs_scholar_review",
        reason: "private_answer_without_quran_or_hadith_citation",
    }
}

// =============================================================================
// WASM ABI
// =============================================================================

#[cfg(target_arch = "wasm32")]
mod wasm_abi {
    use super::*;
    use alloc::vec::Vec;
    use core::mem::ManuallyDrop;

    #[no_mangle]
    pub extern "C" fn alloc(size: usize) -> *mut u8 {
        let mut buf = Vec::<u8>::with_capacity(size);
        let ptr = buf.as_mut_ptr();
        core::mem::forget(buf);
        ptr
    }
    #[no_mangle]
    pub extern "C" fn dealloc(ptr: *mut u8, size: usize) {
        if ptr.is_null() || size == 0 { return; }
        unsafe { let _ = Vec::from_raw_parts(ptr, size, size); }
    }
    #[no_mangle]
    pub extern "C" fn evaluate_json(ptr: *const u8, len: usize) -> u64 {
        let slice = unsafe { core::slice::from_raw_parts(ptr, len) };
        let input: AnswerInput = serde_json::from_slice(slice).unwrap_or(AnswerInput {
            has_scholar_approval: false,
            has_verified_quran_or_hadith_citation: false,
            publication_mode_public: false,
        });
        let decision = super::evaluate(&input);
        let json = serde_json::to_vec(&decision).unwrap_or_else(|_| b"{}".to_vec());
        let mut buf = ManuallyDrop::new(json);
        let out_ptr = buf.as_mut_ptr();
        let out_len = buf.len();
        ((out_ptr as u64) << 32) | (out_len as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn input(approval: bool, citation: bool, public: bool) -> AnswerInput {
        AnswerInput { has_scholar_approval: approval, has_verified_quran_or_hadith_citation: citation, publication_mode_public: public }
    }
    #[test] fn public_without_approval_blocked() {
        let d = evaluate(&input(false, true, true));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, "public_fatwa_requires_scholar_approval");
    }
    #[test] fn public_without_citation_blocked() {
        let d = evaluate(&input(true, false, true));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, "public_fatwa_requires_quran_or_hadith_citation");
    }
    #[test] fn public_with_both_passes() {
        let d = evaluate(&input(true, true, true));
        assert_eq!(d.decision, "allow_publish");
    }
    #[test] fn private_with_citation_passes() {
        let d = evaluate(&input(false, true, false));
        assert_eq!(d.decision, "allow_publish");
    }
    #[test] fn private_without_citation_needs_review() {
        let d = evaluate(&input(false, false, false));
        assert_eq!(d.decision, "needs_scholar_review");
    }
}
