# Discover and populate a product model

The outcome is a populated, valid map with defensible concepts and explicit uncertainty. “Run Object Map” authorizes discovery and population. It does not require another round of approval for every well-supported object. Report ambiguous decisions; do not silently settle them by treating every table as a product object.

## Establish the boundary

1. Read repository instructions, the builder’s brief/PRD and an existing map before scanning code. Identify the product or monorepo package in scope. If several independent products exist, map the requested one and explain the boundary.
2. Use `rg --files` or the host’s file search to locate manifests, entry points, schemas, migrations, routes, navigation, forms, services, validation, tests and public documentation. Exclude dependencies, build output, vendored code, secrets, logs, production datasets and Object Map’s own files. Do not read evaluation/expected-model fixtures as discovery evidence.
3. Identify the stack from files, not assumptions. Examples: Prisma/Django/Rails models, SQL migrations, GraphQL schemas, REST controllers, Next/React routes and forms, Swift models/views, CMS content schemas. Adapt your inspection to the actual stack. A route inventory or ERD alone is insufficient.
4. For a large codebase, work by product area. Record inspected paths and uninspected boundaries in `.object-map/discovery.md`; never label a partial scan complete.

## New product

1. Extract user-recognizable nouns, relationships, actions, attributes and lifecycle states explicitly stated in the conversation and PRD.
2. Populate these as `status: "intended"`. Cite the actual PRD path in evidence when available. Explain that a brief is intent evidence, not evidence of working behavior.
3. Avoid speculative fields. If the brief says Pizza has a size and toppings, do not invent inventory, tax rules or a delivery lifecycle.
4. Build the requested feature, trace its actual implementation, and mark confirmed entries as observed. A partly built concept may be mixed. Keep the remaining intentions visible in the document.

## Existing product

For each candidate, trace a concrete record or user task through the implementation. Use the following evidence matrix as a working aid, not a rigid schema to dump into the UI:

| Evidence | Extract | Check against |
| --- | --- | --- |
| Forms, details, navigation, copy | User-facing vocabulary and meaningful fields | Whether labels alias existing concepts |
| Schemas, models, migrations, types | Stored identity, field types, references, enum values | Current code rather than obsolete migrations alone |
| Services, controllers, validators | Operations, allowed transitions, required relationships | Whether the visible control actually invokes this behavior |
| Tests and runnable UI | Examples, constraints, actual behavior | Whether the test is current and verifies that behavior |
| PRD and conversation | Intended concepts and outstanding work | Distinguish requested behavior from observed implementation |

1. **Collect candidate nouns.** Prefer things that users recognize, distinguish, act on, collect or refer to over time. A product object can span several implementation entities. A table can contain several product concepts.
2. **Define each object in one line.** `description` is the object's heading on the canvas, and it is the first thing a builder reads. Say what the thing is to a person using the product and, where it is not obvious, why it exists: "A place someone saved to return to later," not "A place in atlas." A definition that restates the object's own name, names its table, or describes its implementation is worse than an empty field, because it fills the space where a real definition belongs and looks answered. Leave it empty rather than writing filler; an empty definition is a visible, honest question. Where two objects are easy to confuse, define each against the other — say what Person is that Account is not.
3. **Reconcile names.** For `saved_location` in SQL and “Place” in the UI, propose Place with both evidence paths. Record aliases in the discovery notes. Do not create two objects just because two code identifiers differ. Conversely, do not merge Person and Account merely because both refer to a human.
4. **Separate implementation machinery.** Sessions, tokens, join rows and caches are usually implementation details. A join can still reveal a meaningful relationship; if it has its own user-visible identity, behavior or lifecycle, it may warrant an object. Explain the evidence.
5. **Extract attributes.** Capture meaningful fields from visible forms/details and their validated model. Omit internal keys, timestamps used only for bookkeeping and plumbing. Do not omit technical-looking fields that matter to the product: latitude and longitude can be essential Place attributes.
6. **Extract relationships.** Trace both direct references and join-backed associations. Capture the role at the source object (Owner, Shared with) and the actual target object (Person). Verify direction; many-to-many tables often reveal relationships absent from direct foreign keys. Avoid duplicating a foreign-key attribute when the relationship already represents it.
   A relationship is a structural claim and needs structural evidence: a foreign key, an identifier, a lookup, a join, a route parameter or a resolved reference. A list of display strings rendered into text is an attribute, not a relationship, however much it names other concepts. If the only evidence is the same bytes that already justify an attribute, keep the attribute and record the question; do not add a relationship to make a column look connected.
   Name the role for what the relationship means at the source, as a predicate that reads source to target: Collection — owned by → Person, Photo — taken at → Place, Place — located in → City, Note — about → Place, Tag — applied to → Place. Use one grammatical form across the whole map. Prefer predicates over role nouns (Owned by, not Owner; Made by, not Visitor): every relationship has a predicate, while many have no natural noun, and a mixed map reads as though the roles were guessed separately. Terse predicates are acceptable where an event object relates to its participants (At, Made by, During).
   The role, not the target's name, is what the builder reads, and the canvas shows the target beside it. A role that repeats its target says nothing; a map where roles mostly repeat their targets means the source's foreign keys were transcribed instead of the relationships being understood. Where the evidence genuinely does not distinguish the reading — a bare `person_id` that could mean photographer or subject — name the better-supported predicate and record the alternative in the discovery notes rather than falling back to the target's name.
7. **Extract actions.** Use operations a user can perform, not every service method. Trace UI handlers or endpoints to real behavior. A button label alone is weak evidence if the handler is a stub. Write “Add to collection,” not an internal function name.
   Include generic Create/Edit/Delete when they are real product operations the builder should see. Avoid inferring them for every object simply because the storage layer supports CRUD. Record a relationship at its meaningful source; the canvas already reveals inbound references, so do not add inverse duplicates solely to make both columns connected.
8. **Extract states.** Verify lifecycle values and transitions in current validation/service code. Do not treat every category or taxonomy term as a lifecycle state.
9. **Resolve the object boundary.** A structured value is not automatically an object. Examine independent identity, reuse, relationships and user actions. When evidence remains ambiguous (Address, Opening Hours, Contact), preserve the current builder choice or record the ambiguity rather than enforcing a guessed ontology.
   Two of those four tests depend on facts that do not exist until relationships and actions have been extracted, so this decision is provisional when first made and must be re-tested in step 12. A candidate whose only support is a vocabulary of labels — service lines, tags, categories, disciplines — usually fails independent identity; check whether the terms have records, identifiers or routes before promoting the vocabulary to an object, and whether separate lists of such terms actually share members before merging them into one.
10. **Assess confidence per claim.** Strong: agreeing current UI and implementation evidence. Provisional: only one source, conflicting terminology or unreachable behavior. Unknown: inferred purpose without supporting behavior. Record reasoning and repository-relative evidence in `.object-map/discovery.md`. File-name coincidence is not enough.
11. **Populate in two passes.** Read the current map with its revision. First establish object IDs, reusing existing concepts and preserving all builder entries. Then add attributes, actions, states and relationships targeting those IDs. Add clear observed concepts now; retain ambiguous candidates in the discovery notes instead of fabricating certainty.
12. **Validate coverage and re-test boundaries.** Trace at least one representative task per inspected product area through the proposed objects. Check orphaned references, duplicate concepts, missing join relationships and whether user-visible fields/actions were lost.
   Now re-run step 9 against the populated model. Any object created in this session that ended with no relationships, no actions and no states failed the boundary test on completed evidence: demote it to an attribute of the object that referenced it, or keep it and record in the discovery notes which test it passes and on what evidence. Builder-authored objects and stated intentions are exempt — intent does not require implementation evidence. Demoting is not deleting; carry the finding that prompted the candidate into the notes, since a vocabulary too thin to be an object is often still a real product problem.
   Validate JSON and write with the original revision; handle conflicts as described in SKILL.md.
13. **Open and report.** Run the bundled viewer, verify that the populated objects render, and give the builder its local URL. Summarize the main concepts, what remains intended, the most consequential unresolved question and any uninspected areas. Avoid claiming exhaustive understanding of a large repository.
   If the canvas bundle is missing, keep the completed map and validation result. Report that rendering is unverified and use the packaged skill or rebuild it from the Object Map source; do not populate an unrelated sample app or claim the viewer opened.

## Worked reasoning example

A form labels a thing “Place”; its records live in `saved_location`. A collection has an `owner_id`, while `collection_member` relates collections to people who can access them. The product exposes “Share.” A defensible map has Place, Collection and Person, with distinct Owner and Shared with relationships. The join table need not become an object, but its meaning must not disappear. A builder-created Pizza object remains intact even if no source file mentions pizza.

Do not import these example objects into unrelated products. They illustrate the reasoning, not an expected answer.

## Bounded discovery adapter

The optional `scripts/discovery.mjs` implementation supports SQL CREATE TABLE plus JSON page metadata. It is a source of candidates, not a general parser and not the required workflow. For any other stack, inspect implementation directly using the procedure above. Even on supported fixtures, verify join relationships, naming and actual behavior before treating candidates as the completed product model.
