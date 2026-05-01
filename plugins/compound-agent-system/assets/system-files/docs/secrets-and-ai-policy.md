# Secrets and Optional AI Policy

The harness must remain fully usable without AI provider keys. Optional AI may improve ranking quality, but it is never a hidden dependency for install, bootstrap, idea intake, task ledger operations, validation, or tests.

## Deterministic baseline

- `assemble.mjs` always runs the local ranker first.
- `--ai` is optional. Without `--ai`, provider keys are ignored.
- With `--ai` but no key, the CLI prints that no provider will be called and keeps local ranking.
- Tests use no live LLM providers and must pass with `GROQ_API_KEY` and `OPENROUTER_API_KEY` unset.

## Secret names

| Secret | Scope | Used by | Required? |
|---|---|---|---|
| `GROQ_API_KEY` | Process environment | `assemble.mjs --ai` causal rerank | No |
| `OPENROUTER_API_KEY` | Process environment | `assemble.mjs --ai` fallback provider | No |

Future secrets must follow descriptive names, document the exact command that reads them, and preserve a no-secret path.

## Storage expectations

- Do not commit secrets, `.env` files, provider keys, private keys, or copied credentials.
- Prefer session or organization secret managers for real credentials.
- Use placeholders in docs: `GROQ_API_KEY=<key>`, never real-looking token prefixes.
- Keep secrets in process environment only for the command that needs them.

## CLI behavior

When AI is unavailable or skipped, output must be explicit:

```text
--ai set but no GROQ_API_KEY / OPENROUTER_API_KEY in env. No AI provider will be called; keeping deterministic local ranking.
```

When AI fails, the command must keep the deterministic local ranking and tell the operator to retry without `--ai` or verify credentials.

## Closing

Premium behavior means optional AI can be removed from the environment entirely and the harness still installs, plans, validates, tests, and produces usable artifacts.
