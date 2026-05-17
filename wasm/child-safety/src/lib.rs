// =============================================================================
// child-safety — deterministic Rust port of
// backend/app/src/family/child-safety-policy.js.
//
// Pure module: no I/O. Block lists are inlined literal Arabic strings; this
// crate uses substring contains, not regex, so it works in core (no_std on
// the wasm target). Mirrors JS behaviour exactly for the personal-data and
// shaming/political/sectarian gates.
// =============================================================================

#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(target_arch = "wasm32")]
extern crate alloc;

#[cfg(target_arch = "wasm32")]
use alloc::{string::{String, ToString}, vec::Vec};

use serde::{Deserialize, Serialize};

pub const AGE_BANDS: &[&str] = &["4-6", "7-9", "10-12", "13+"];
pub const SENSITIVE_TOPICS: &[&str] = &[
    "death",
    "fitan",
    "punishment",
    "jihad",
    "detailed_aqidah_dispute",
    "detailed_fiqh_dispute",
];

const PERSONAL_DATA_KEYWORDS_AR: &[&str] = &[
    "رقم الجوال",
    "رقم الهاتف",
    "العنوان السكني",
    "كلمة المرور",
    "الموقع الجغرافي",
    "تاريخ الميلاد",
    "البريد الإلكتروني الخاص",
];

// JS uses regex; in WASM (no_std) we use literal substring checks.
const SHAMING_PATTERNS: &[&str] = &["غبي", "أحمق", "فاشل", "سيء جداً"];
const POLITICAL_PATTERNS: &[&str] = &["حزب سياسي", "انتخابات"];
const SECTARIAN_PATTERNS: &[&str] = &["سني خير من شيعي", "شيعي خير من سني"];

#[derive(Debug, Clone, Deserialize)]
pub struct ContentInput {
    pub body_ar: Option<String>,
    pub age_band: Option<String>,
    #[serde(default)]
    pub topic_tags: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Decision {
    pub decision: &'static str, // "allow" | "block"
    pub reason: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sensitive_topic: Option<String>,
}

pub fn is_valid_age_band(b: &str) -> bool {
    AGE_BANDS.contains(&b)
}

pub fn evaluate(input: &ContentInput) -> Decision {
    let body = input.body_ar.as_deref().unwrap_or("");
    if body.trim().is_empty() {
        return Decision {
            decision: "block",
            reason: Some("empty_body"),
            sensitive_topic: None,
        };
    }
    let age = input.age_band.as_deref().unwrap_or("7-9");
    if !is_valid_age_band(age) {
        return Decision {
            decision: "block",
            reason: Some("invalid_age_band"),
            sensitive_topic: None,
        };
    }

    for kw in PERSONAL_DATA_KEYWORDS_AR {
        if body.contains(kw) {
            return Decision {
                decision: "block",
                reason: Some("asks_personal_data"),
                sensitive_topic: None,
            };
        }
    }
    for p in SHAMING_PATTERNS {
        if body.contains(p) {
            return Decision {
                decision: "block",
                reason: Some("shaming_language"),
                sensitive_topic: None,
            };
        }
    }
    for p in POLITICAL_PATTERNS {
        if body.contains(p) {
            return Decision {
                decision: "block",
                reason: Some("political_content"),
                sensitive_topic: None,
            };
        }
    }
    for p in SECTARIAN_PATTERNS {
        if body.contains(p) {
            return Decision {
                decision: "block",
                reason: Some("sectarian_content"),
                sensitive_topic: None,
            };
        }
    }

    if age == "4-6" || age == "7-9" {
        for t in &input.topic_tags {
            if SENSITIVE_TOPICS.contains(&t.as_str()) {
                return Decision {
                    decision: "block",
                    reason: Some("topic_not_for_younger_band"),
                    sensitive_topic: Some(t.clone()),
                };
            }
        }
    }

    Decision {
        decision: "allow",
        reason: None,
        sensitive_topic: None,
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProfileInput {
    pub field: String,
    pub value: String,
}

pub fn evaluate_profile_field(input: &ProfileInput) -> Decision {
    match input.field.as_str() {
        "nickname_ar" => {
            let t = input.value.trim();
            if t.is_empty() {
                return Decision {
                    decision: "block",
                    reason: Some("empty_nickname"),
                    sensitive_topic: None,
                };
            }
            if t.len() > 32 {
                return Decision {
                    decision: "block",
                    reason: Some("nickname_too_long"),
                    sensitive_topic: None,
                };
            }
            // Looks like email or phone (PII check)
            if t.contains('@') || t.chars().filter(|c| c.is_ascii_digit()).count() >= 6 {
                return Decision {
                    decision: "block",
                    reason: Some("nickname_looks_like_pii"),
                    sensitive_topic: None,
                };
            }
            Decision {
                decision: "allow",
                reason: None,
                sensitive_topic: None,
            }
        }
        "age_band" => {
            if is_valid_age_band(&input.value) {
                Decision {
                    decision: "allow",
                    reason: None,
                    sensitive_topic: None,
                }
            } else {
                Decision {
                    decision: "block",
                    reason: Some("invalid_age_band"),
                    sensitive_topic: None,
                }
            }
        }
        _ => Decision {
            decision: "block",
            reason: Some("field_not_collected_for_children"),
            sensitive_topic: None,
        },
    }
}

// =============================================================================
// WASM ABI — JSON in, JSON out.
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
        let input: ContentInput = serde_json::from_slice(slice).unwrap_or(ContentInput {
            body_ar: None, age_band: None, topic_tags: Vec::new(),
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

    fn ci(body: &str, age: &str, topics: &[&str]) -> ContentInput {
        ContentInput {
            body_ar: Some(body.to_string()),
            age_band: Some(age.to_string()),
            topic_tags: topics.iter().map(|s| s.to_string()).collect(),
        }
    }

    #[test]
    fn empty_body_blocked() {
        let d = evaluate(&ci("", "7-9", &[]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("empty_body"));
    }

    #[test]
    fn invalid_age_blocked() {
        let d = evaluate(&ci("نص جميل ومناسب للأطفال", "99", &[]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("invalid_age_band"));
    }

    #[test]
    fn pii_prompt_blocked() {
        let d = evaluate(&ci("ما هو رقم الجوال الذي تستخدمه؟", "7-9", &[]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("asks_personal_data"));
    }

    #[test]
    fn shaming_blocked() {
        let d = evaluate(&ci("أنت غبي إذا لم تفهم.", "7-9", &[]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("shaming_language"));
    }

    #[test]
    fn political_blocked() {
        let d = evaluate(&ci("نناقش حزب سياسي معين.", "10-12", &[]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("political_content"));
    }

    #[test]
    fn sectarian_blocked() {
        let d = evaluate(&ci("سني خير من شيعي.", "13+", &[]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("sectarian_content"));
    }

    #[test]
    fn younger_age_blocks_sensitive_topic() {
        let d = evaluate(&ci("نص محايد", "7-9", &["death"]));
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("topic_not_for_younger_band"));
        assert_eq!(d.sensitive_topic.as_deref(), Some("death"));
    }

    #[test]
    fn older_age_allows_sensitive_topic() {
        let d = evaluate(&ci("نص ملائم لسن أكبر", "13+", &["death"]));
        assert_eq!(d.decision, "allow");
    }

    #[test]
    fn safe_content_allowed() {
        let d = evaluate(&ci("نتعلم آداب الصلاة اليوم.", "7-9", &["salah"]));
        assert_eq!(d.decision, "allow");
    }

    #[test]
    fn profile_nickname_allowed() {
        let d = evaluate_profile_field(&ProfileInput {
            field: "nickname_ar".to_string(),
            value: "بطل صغير".to_string(),
        });
        assert_eq!(d.decision, "allow");
    }

    #[test]
    fn profile_nickname_too_long_blocked() {
        let d = evaluate_profile_field(&ProfileInput {
            field: "nickname_ar".to_string(),
            value: "هذا الاسم طويل جدا جدا جدا جدا جدا جدا جدا".to_string(),
        });
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("nickname_too_long"));
    }

    #[test]
    fn profile_nickname_pii_blocked() {
        let d = evaluate_profile_field(&ProfileInput {
            field: "nickname_ar".to_string(),
            value: "alice@example.com".to_string(),
        });
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("nickname_looks_like_pii"));

        let d2 = evaluate_profile_field(&ProfileInput {
            field: "nickname_ar".to_string(),
            value: "0123456789".to_string(),
        });
        assert_eq!(d2.decision, "block");
        assert_eq!(d2.reason, Some("nickname_looks_like_pii"));
    }

    #[test]
    fn profile_age_band_allowed() {
        let d = evaluate_profile_field(&ProfileInput {
            field: "age_band".to_string(),
            value: "13+".to_string(),
        });
        assert_eq!(d.decision, "allow");
    }

    #[test]
    fn profile_invalid_field_blocked() {
        let d = evaluate_profile_field(&ProfileInput {
            field: "unknown_field".to_string(),
            value: "some value".to_string(),
        });
        assert_eq!(d.decision, "block");
        assert_eq!(d.reason, Some("field_not_collected_for_children"));
    }
}
