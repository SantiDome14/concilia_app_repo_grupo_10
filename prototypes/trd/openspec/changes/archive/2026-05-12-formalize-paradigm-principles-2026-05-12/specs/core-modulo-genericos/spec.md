## ADDED Requirements

### Requirement: External CTAs MUST invoke a capability of the target app, not a specific execution route ("Wizard of Oz" principle)

A CTA in one app of the financial-core (CLP, Pago Directo, RFQ Gateway, FIN, OPS, …) that needs work done by another app SHALL invoke a **capability** declared by the destination app (e.g. `ejecutar_retiro` of OPS, `validar_kyc` of LEX, `liquidar_operacion` of TRD) and SHALL NOT couple to a specific execution path. The capability — implemented inside the destination app — SHALL decide at runtime, based on its own configuration (which MAY vary by amount, client, hour, operation type, or any other parameter the destination app owns), whether to satisfy the invocation by:

- **(a) Direct integration** — the destination app processes the request immediately and returns the result. No Solicitud is created in the Centro de Solicitudes; the CTA receives a synchronous outcome.
- **(b) Creating a Solicitud/Tarea in the Centro** — the destination app persists the work as a Solicitud/Tarea in its Inbox and returns a handle. The CTA subscribes to the eventual state of that Solicitud and surfaces "en proceso" → "completado" / "rechazado" to the user when the human operator closes it.

The decision between (a) and (b) is **implementation-level** and is the destination app's concern only. The calling CTA SHALL render the same UI for the user regardless of which path is taken — the only difference visible to the user is whether the outcome is immediate (a) or eventual (b). Switching from (b) to (a) — automating a previously-human capability — MUST NOT require any change to the calling CTA's code. This habilita the "Wizard of Oz arquitectónico" pattern: a product can launch with 100 % human execution in the Centro on day one and automate progressively by changing the destination app's internal configuration only.

The CTA SHALL NOT contain logic that explicitly creates a Solicitud in the Centro on behalf of the destination app. CTAs that need to model "submit to Centro" semantics (e.g. an internal Inbox-create form on the same module) are a different pattern — that pattern is the **manual creation flow** scoped to the destination app's own Inbox, not the cross-app CTA pattern this Requirement governs.

#### Scenario: Capability resolves via direct integration

- **GIVEN** an OPS capability `ejecutar_retiro` whose configuration routes retiros under USD 10 000 through a direct integration with the PSP
- **WHEN** a CLP user clicks "Retirar" with amount USD 5 000 and the CTA invokes `ejecutar_retiro`
- **THEN** the destination app processes the retiro inline (no Solicitud is persisted in the OPS Inbox), the CTA receives the success outcome synchronously, and the CLP user sees "completado" without any intermediate state

#### Scenario: Capability resolves by creating a Solicitud in the Centro

- **GIVEN** the same OPS capability `ejecutar_retiro` whose configuration routes retiros over USD 10 000 to the Centro for human review
- **WHEN** a CLP user clicks "Retirar" with amount USD 50 000 and the CTA invokes `ejecutar_retiro`
- **THEN** the destination app persists a Solicitud of type `retiro_aprobacion` in the OPS Inbox with `state: 'pendiente'`, returns a handle to the CLP CTA, the CLP user sees "en proceso" while the Solicitud is open, and the user transitions to "completado" or "rechazado" when an OPS operator closes the Solicitud via the `<ClosureModal>`

#### Scenario: Switching paths is invisible to the calling CTA

- **GIVEN** the same CTA code on CLP invoking `ejecutar_retiro`
- **WHEN** the OPS team changes the runtime configuration of `ejecutar_retiro` to lift the threshold from USD 10 000 to USD 100 000 (so retiros previously routed to the Centro now resolve via direct integration)
- **THEN** the CLP CTA continues to work unchanged; no PR, no redeploy, no test against the CLP repo is required; the change is purely on the OPS side

#### Scenario: A CTA hard-wired to "create Solicitud" is a contract violation

- **GIVEN** a CLP developer proposes a "Retirar" CTA whose `on_click` calls the OPS Inbox endpoint directly with a hand-built Solicitud payload, bypassing the `ejecutar_retiro` capability
- **WHEN** PR review checks the implementation against this Requirement
- **THEN** the change is REJECTED — the CTA MUST invoke the capability, not the persistence endpoint; the capability owns the (a) / (b) decision

---

### Requirement: Centro de Solicitudes scope is exclusive to human-intervention work; pure programmatic jobs live outside

The Inbox / Centro de Solicitudes SHALL house only Solicitudes/Tareas that require **human intervention from the backoffice**. Pure programmatic jobs — synchronization of records, audit sweeps, data normalization, depuración / cleanup, cron-driven internal maintenance, scheduler infrastructure of Reportes — MUST NOT be modeled as Solicitudes or Tareas. They live in code as **Task Definitions of Tecnología**, scheduler infrastructure, or equivalent technical primitives. Their state, retries, lag, and failures are observability concerns, not Centro concerns.

A programmatic job MAY declare an **opt-in fallback to the Centro**. When the fallback is enabled and the job fails (or hits an unrecoverable state that requires human follow-up), the system SHALL invoke the Centro endpoint with `source_app: 'system'` and create a Solicitud/Tarea for human escalation. The Solicitud carries enough context (job identifier, run id, failure reason, payload snapshot) for an operator to act. Without the fallback, the same failure routes to Observabilidad alerts only and the Centro is not touched.

The Solicitud canonical model SHALL NOT grow an `execution: manual | programmatic` discriminator. Pure programmatic jobs live outside the Centro entirely, so the discriminator would be meaningless. Every Solicitud / Tarea in the Centro is implicitly "manual / requires-human-action" — the `kind: 'solicitud' | 'tarea'` discriminator that already exists captures the semantic / presentational difference (a third-party-requested unit vs a self-issued unit), not the mode of execution.

#### Scenario: Programmatic job completes without touching the Centro

- **GIVEN** a daily cron job `sync_psp_movements` that pulls movements from a PSP and persists them in the OPS movements table, with no fallback declared
- **WHEN** the job runs successfully on a given day
- **THEN** no Solicitud is created in the OPS Inbox; the OPS operator does not see any entry for the run; the job's state is tracked only in the Tecnología scheduler logs

#### Scenario: Programmatic job with opt-in fallback escalates failure to the Centro

- **GIVEN** the same job `sync_psp_movements` but configured with `fallback_to_centro: { enabled: true, target_role: 'OPS_OFFICER', type: 'sync_failure_escalation' }`
- **WHEN** the job fails on a given day with an unrecoverable error
- **THEN** the system invokes the Centro endpoint with `source_app: 'system'`, `target_app: 'OPS'`, `type: 'sync_failure_escalation'`, payload including the run id and the error message, creating a Solicitud (or Tarea, per the type's `kind`) in `state: 'pendiente'` for an OPS operator to follow up

#### Scenario: A "data sync job tracking view" in the Inbox is a contract violation

- **GIVEN** a developer proposes adding to the Inbox a list of in-flight cron job runs ("sync running", "sync paused", "sync errored at step 3"), framed as Tareas
- **WHEN** PR review checks the proposal against this Requirement
- **THEN** the change is REJECTED — cron job state is observability data and belongs in monitoring (Grafana / equivalent), not in the human-work Centro; an opt-in fallback that creates a Solicitud on failure is the only sanctioned interaction between programmatic jobs and the Centro

#### Scenario: An `execution: 'programmatic'` field on Solicitud is a contract violation

- **GIVEN** a developer proposes adding `execution: 'manual' | 'programmatic'` to the `Solicitud` type to distinguish endpoints invoked by humans from endpoints invoked by schedulers
- **WHEN** PR review checks the proposal against this Requirement
- **THEN** the change is REJECTED — pure programmatic jobs do not appear in the Centro at all, so the discriminator is meaningless inside the model; the `kind: 'solicitud' | 'tarea'` discriminator already in place captures the only relevant axis (third-party-requested vs self-issued); the 2026-05-12 product session explicitly decided against this addition
