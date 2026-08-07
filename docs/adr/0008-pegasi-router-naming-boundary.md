# Pegasi Router names the backend, not the Chat LM provider

Status: superseded by [0009](./0009-pegasi-router-provider-name.md)

In the Pegasi Distribution, **Pegasi Router** was only the student-facing name for the Router backend (`pegasi_router` via `routerBaseUrl`). The Classroom Chat Provider entry written by BYOK kept the shared engine `name` (`VCRouter`); we did not rename that field per brand, and student prompts for “pick a model” / Clear Classroom Connection used neutral wording plus a parenthetical of the real `name`. Rejected at the time: calling the provider Pegasi Router, changing only Marketplace copy to say Pegasi Router while JSON stays `VCRouter`, and renaming the provider in Pegasi alone without a migration path for existing Host settings.

Superseded: Pegasi now uses **Pegasi Router** as the Classroom Chat Provider `name` as well (see ADR 0009).
