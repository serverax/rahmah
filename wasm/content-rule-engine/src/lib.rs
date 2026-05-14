// =============================================================================
// content-rule-engine — FOUNDATION ONLY.
//
// Computes the per-item visibility flags the mobile app uses to decide
// whether to render an answer / citation / category card.
//
// Pure module: same inputs → same outputs. No I/O. No randomness.
// =============================================================================

#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(target_arch = "wasm32")]
extern crate alloc;

#[cfg(target_arch = "wasm32")]
use alloc::{string::{String, ToString}, vec::Vec};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct ItemInput {
    /// One of: "approved", "pending_review", "rejected", "unverified".
    pub verification_status: String,
    /// True when the item carries a non-empty citation_label and a
    /// recognised source_type.
    pub has_citation: bool,
    /// True when the item is published and not retracted.
    pub is_published: bool,
    /// True when the item is a fixture / test row.
    pub is_test_fixture: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Visibility {
    pub show_in_public_list: bool,
    pub citation_required:   bool,   // mobile app must render the citation badge if true
    pub public_visible:      bool,
    pub private_visible:     bool,
    pub reason:              &'static str,
}

pub fn evaluate(item: &ItemInput) -> Visibility {
    if item.is_test_fixture {
        return Visibility {
            show_in_public_list: false, citation_required: true,
            public_visible: false, private_visible: false,
            reason: "test_fixture_hidden_from_public",
        };
    }
    if item.verification_status != "approved" {
        return Visibility {
            show_in_public_list: false, citation_required: true,
            public_visible: false, private_visible: true,
            reason: "not_approved",
        };
    }
    if !item.has_citation {
        return Visibility {
            show_in_public_list: false, citation_required: true,
            public_visible: false, private_visible: false,
            reason: "missing_citation",
        };
    }
    if !item.is_published {
        return Visibility {
            show_in_public_list: false, citation_required: true,
            public_visible: false, private_visible: true,
            reason: "not_published",
        };
    }
    Visibility {
        show_in_public_list: true, citation_required: true,
        public_visible: true, private_visible: true,
        reason: "approved_published_with_citation",
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm_abi {
    use super::*;
    use alloc::vec::Vec;
    use core::mem::ManuallyDrop;
    #[no_mangle] pub extern "C" fn alloc(size: usize) -> *mut u8 { let mut buf = Vec::<u8>::with_capacity(size); let ptr = buf.as_mut_ptr(); core::mem::forget(buf); ptr }
    #[no_mangle] pub extern "C" fn dealloc(ptr: *mut u8, size: usize) { if ptr.is_null() || size == 0 { return; } unsafe { let _ = Vec::from_raw_parts(ptr, size, size); } }
    #[no_mangle] pub extern "C" fn evaluate_json(ptr: *const u8, len: usize) -> u64 {
        let slice = unsafe { core::slice::from_raw_parts(ptr, len) };
        let input: ItemInput = serde_json::from_slice(slice).unwrap_or(ItemInput { verification_status: "unverified".into(), has_citation: false, is_published: false, is_test_fixture: true });
        let decision = super::evaluate(&input);
        let json = serde_json::to_vec(&decision).unwrap_or_else(|_| b"{}".to_vec());
        let mut buf = ManuallyDrop::new(json); let out_ptr = buf.as_mut_ptr(); let out_len = buf.len();
        ((out_ptr as u64) << 32) | (out_len as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn item(status: &str, citation: bool, published: bool, fixture: bool) -> ItemInput {
        ItemInput { verification_status: status.into(), has_citation: citation, is_published: published, is_test_fixture: fixture }
    }
    #[test] fn fixture_hidden() { let v = evaluate(&item("approved", true, true, true)); assert!(!v.show_in_public_list); assert_eq!(v.reason, "test_fixture_hidden_from_public"); }
    #[test] fn pending_hidden() { let v = evaluate(&item("pending_review", true, true, false)); assert!(!v.show_in_public_list); assert!(!v.public_visible); assert!(v.private_visible); }
    #[test] fn missing_citation_blocked() { let v = evaluate(&item("approved", false, true, false)); assert!(!v.public_visible); assert!(!v.private_visible); }
    #[test] fn approved_published_cited_visible() { let v = evaluate(&item("approved", true, true, false)); assert!(v.show_in_public_list); assert!(v.public_visible); }
    #[test] fn citation_always_required() { for s in ["approved","pending_review","rejected","unverified"] { for c in [true,false] { for p in [true,false] { for f in [true,false] { let v = evaluate(&item(s,c,p,f)); assert!(v.citation_required, "citation_required must be true for ({s}, c={c}, p={p}, f={f})"); }}}} }
}
