# Pegasi Router is also the Classroom Chat Provider name

Status: accepted (supersedes [0008](./0008-pegasi-router-naming-boundary.md))

In the Pegasi Distribution, **Pegasi Router** names both the Router backend (`pegasi_router` via `routerBaseUrl`) and the Classroom Chat Provider `name` written into Host `chatLanguageModels.json`. BYOK forces that `name` on write even if the router template still says `VCRouter`. Clear Classroom Connection matches only `Pegasi Router` + `customendpoint` and does not migrate or delete legacy `VCRouter` rows. Student select/clear copy uses the real list name in parentheses. Rejected: keeping ADR 0008’s split (backend Pegasi Router / list VCRouter), dual-matching clear, and auto-removing old `VCRouter` on connect.
