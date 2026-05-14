// =============================================================================
// citation-gate — deterministic Rust port of
// backend/app/src/sheikh/citation-requirement.js.
//
// Pure module: no I/O, no time, no randomness. Compiles to a native rlib for
// testing and to a wasm32-unknown-unknown cdylib for sidecar / in-process
// loaders.
// =============================================================================

#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(target_arch = "wasm32")]
extern crate alloc;

#[cfg(target_arch = "wasm32")]
use alloc::{string::{String, ToString}, vec::Vec};

use serde::{Deserialize, Serialize};

/// Allowed citation types — mirrors CITATION_TYPES in JS.
pub const CITATION_TYPES: &[&str] = &["quran", "hadith", "fiqh", "scholar_note"];

#[derive(Debug, Clone, Deserialize)]
pub struct CitationInput {
    pub citation_type: Option<String>,
    pub citation_label: Option<String>,
    pub citation_text: Option<String>,
    pub citation_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Citation {
    pub citation_type: String,
    pub citation_label: String,
    pub citation_text: Option<String>,
    pub citation_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Decision {
    pub citation_status: &'static str,
    pub can_publish_public: bool,
    pub can_publish_private: bool,
    pub reason: Option<&'static str>,
}

fn trim_nonempty(s: &Option<String>) -> Option<String> {
    let v = s.as_ref()?.trim();
    if v.is_empty() {
        None
    } else {
        Some(v.to_string())
    }
}

/// Normalise an incoming list of citation rows. Mirrors normalizeCitations()
/// in the JS module: drops rows whose type isn't allowed, drops rows with an
/// empty `citation_label`, trims labels/texts/urls.
pub fn normalize(input: &[CitationInput]) -> Vec<Citation> {
    let mut out = Vec::with_capacity(input.len());
    for c in input {
        let ty = match &c.citation_type {
            Some(t) if CITATION_TYPES.contains(&t.as_str()) => t.clone(),
            _ => continue,
        };
        let label = match trim_nonempty(&c.citation_label) {
            Some(v) => v,
            None => continue,
        };
        out.push(Citation {
            citation_type: ty,
            citation_label: label,
            citation_text: trim_nonempty(&c.citation_text),
            citation_url: trim_nonempty(&c.citation_url),
        });
    }
    out
}

/// Evaluate the citation list against the public-publication policy.
/// Output shape mirrors evaluateCitationRequirement() in the JS module
/// byte-for-byte (modulo JSON encoding).
pub fn evaluate(input: &[CitationInput]) -> Decision {
    let cs = normalize(input);

    if cs.is_empty() {
        return Decision {
            citation_status: "insufficient_citation",
            can_publish_public: false,
            can_publish_private: false,
            reason: Some("no_citations_provided"),
        };
    }

    let mut has_quran = false;
    let mut has_hadith = false;
    let mut has_fiqh = false;
    let mut has_scholar = false;
    for c in &cs {
        match c.citation_type.as_str() {
            "quran" => has_quran = true,
            "hadith" => has_hadith = true,
            "fiqh" => has_fiqh = true,
            "scholar_note" => has_scholar = true,
            _ => {}
        }
    }

    if has_quran && has_hadith {
        return Decision {
            citation_status: "quran_and_hadith_cited",
            can_publish_public: true,
            can_publish_private: true,
            reason: None,
        };
    }
    if has_quran {
        return Decision {
            citation_status: "quran_cited",
            can_publish_public: true,
            can_publish_private: true,
            reason: None,
        };
    }
    if has_hadith {
        return Decision {
            citation_status: "hadith_cited",
            can_publish_public: true,
            can_publish_private: true,
            reason: None,
        };
    }
    if has_fiqh {
        return Decision {
            citation_status: "scholar_advice_needs_review",
            can_publish_public: false,
            can_publish_private: true,
            reason: Some("fiqh_only_requires_moderation"),
        };
    }
    if has_scholar {
        return Decision {
            citation_status: "scholar_advice_needs_review",
            can_publish_public: false,
            can_publish_private: true,
            reason: Some("scholar_note_only_requires_moderation"),
        };
    }
    Decision {
        citation_status: "insufficient_citation",
        can_publish_public: false,
        can_publish_private: false,
        reason: Some("unknown_citation_types_only"),
    }
}

// =============================================================================
// WASM ABI — JSON in, JSON out.
//
// Host calls `evaluate_json(ptr, len)`; returns `(out_ptr << 32) | out_len`.
// Caller must free using the matching allocator pair.
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

    /// Evaluate a JSON array of citation inputs. Returns the JSON-encoded
    /// `Decision` packed as `(out_ptr << 32) | out_len`. On JSON-decode error,
    /// returns the JSON-encoded fail-closed decision.
    #[no_mangle]
    pub extern "C" fn evaluate_json(ptr: *const u8, len: usize) -> u64 {
        let slice = unsafe { core::slice::from_raw_parts(ptr, len) };
        let inputs: Vec<CitationInput> = serde_json::from_slice(slice).unwrap_or_default();
        let decision = super::evaluate(&inputs);
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

    fn cite(ty: &str, label: &str) -> CitationInput {
        CitationInput {
            citation_type: Some(ty.to_string()),
            citation_label: Some(label.to_string()),
            citation_text: None,
            citation_url: None,
        }
    }

    #[test]
    fn empty_list_is_insufficient() {
        let d = evaluate(&[]);
        assert_eq!(d.citation_status, "insufficient_citation");
        assert!(!d.can_publish_public);
        assert!(!d.can_publish_private);
    }

    #[test]
    fn quran_only_publishes() {
        let d = evaluate(&[cite("quran", "Al-Baqarah 2:255")]);
        assert_eq!(d.citation_status, "quran_cited");
        assert!(d.can_publish_public);
    }

    #[test]
    fn hadith_only_publishes() {
        let d = evaluate(&[cite("hadith", "Sahih Muslim 1162")]);
        assert_eq!(d.citation_status, "hadith_cited");
        assert!(d.can_publish_public);
    }

    #[test]
    fn quran_and_hadith_strongest() {
        let d = evaluate(&[cite("quran", "Q"), cite("hadith", "H")]);
        assert_eq!(d.citation_status, "quran_and_hadith_cited");
        assert!(d.can_publish_public);
    }

    #[test]
    fn fiqh_only_requires_moderation() {
        let d = evaluate(&[cite("fiqh", "Mughni")]);
        assert_eq!(d.citation_status, "scholar_advice_needs_review");
        assert!(!d.can_publish_public);
        assert!(d.can_publish_private);
        assert_eq!(d.reason, Some("fiqh_only_requires_moderation"));
    }

    #[test]
    fn scholar_note_only_requires_moderation() {
        let d = evaluate(&[cite("scholar_note", "Note")]);
        assert_eq!(d.citation_status, "scholar_advice_needs_review");
        assert!(!d.can_publish_public);
    }

    #[test]
    fn empty_label_is_dropped() {
        let inputs = [
            CitationInput {
                citation_type: Some("quran".into()),
                citation_label: Some("   ".into()),
                citation_text: None,
                citation_url: None,
            },
        ];
        let d = evaluate(&inputs);
        assert_eq!(d.citation_status, "insufficient_citation");
    }

    #[test]
    fn unknown_type_is_dropped() {
        let inputs = [cite("rumour", "X"), cite("quran", "Q 1:1")];
        let d = evaluate(&inputs);
        assert_eq!(d.citation_status, "quran_cited");
    }

    #[test]
    fn citation_types_constant_matches_js() {
        assert_eq!(CITATION_TYPES, &["quran", "hadith", "fiqh", "scholar_note"]);
    }
}
