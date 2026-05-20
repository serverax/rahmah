# Rahma Children And Family Policy Audit

Date: 2026-05-20

`NO_DOMAIN_AVAILABLE=true`

Current public candidate server: `148.251.247.56`

Current cluster nodes:

- master/control-plane: `148.251.247.56`
- worker-llm: `138.201.253.245`
- worker-secondary: `138.201.202.174`

Recommendation: list Rahma as a general-audience Islamic education app, not an app directed primarily to children, unless the whole Google Play Families program path is deliberately completed.

| Area | Evidence | Status | Required action |
|---|---|---|---|
| Children feature exists | Children game/scenarios screens and tests exist. | PASS | Keep family-friendly wording. |
| Child data collection | Tests and policy block personal-data prompts; no child PII flow found. | PASS | Keep no child PII rule. |
| Ads | No ads SDK found. | PASS | Do not add ads without Families review. |
| External links | Web pages include legal/support/source links; app should keep links controlled. | PARTIAL | Confirm all external links are appropriate for target audience. |
| AI/chat for children | Child learning should be low-risk and cited/safe; prompt injection blocked. | PARTIAL | Keep child mode away from fatwa/open-ended high-risk answers. |
| Parental guidance | Added privacy/terms wording. | PASS | Make same wording visible in store listing. |
| Store target audience | Not yet configured in Play Console. | PARTIAL | Choose general audience unless Families compliance is completed. |

Blockers:
- No Play Console target-audience form completed in this environment.
- No real-device child-flow smoke test completed.
