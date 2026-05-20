# Rahma Agentic Development Guardrails

Rahma can draft improvements. Humans own release authority.

## Allowed

- detect missing content and repeated unanswered questions
- redact personal data before analysis
- generate proposals, developer tasks, and test plans
- prepare branch plans only after approval
- write audit records for improvement actions

## Forbidden

- auto-publish religious content
- auto-approve Sheikh answers
- auto-merge to `main`
- auto-push to GitHub
- auto-deploy production infrastructure
- auto-migrate production databases without approval
- leak secrets, phone numbers, exact GPS history, or private questions

## Release path

1. Proposal drafted
2. Human review
3. Code-generation approval
4. Safe branch work
5. Local CI
6. Human merge approval
7. Deployment approval
8. Release

