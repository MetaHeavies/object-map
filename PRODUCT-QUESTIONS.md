# Questions for the product beneath the code

September 7 clarification: the audience is builders using agents. The agent must populate and maintain the map while building; the canvas lets the builder inspect the current product, spot omissions and add intentions. This answers the earlier audience and maintenance questions and takes priority over the hypotheses below.

Discussion opened September 6, 2026. These are questions and working hypotheses, not agreed requirements. The user wants to explore subjects, taxonomy and information architecture alongside OOUX, and extract the core of an implemented product into an understandable, editable surface.

At the time of writing, the application discovered candidates from SQL schemas and JSON page metadata. That built-in extractor was removed before release: a schema reader only sees schema-backed products, it cannot tell a product object from a table, and its presence implied the map could populate itself. Mapping is the agent's job. The questions below predate that decision and are kept as a record of the reasoning.

The current interface direction is a quiet canvas, single-click selection, double-click inline editing, and distinct controls for following references. Relationship roles lead, and target object names appear as secondary text when different. This labeling hierarchy is a working assumption awaiting discussion: “Owner → Person” and “Shared with → Person” express different relationships to the same object type.

## What understanding should this product create?

1. What decision should a designer be able to make after ten minutes here that they cannot make by using the application or reading its documentation?
2. Is the first audience a person inheriting an unfamiliar product, a product team redesigning an existing one, or someone whose agent-built product has become hard to understand?
3. Should the initial surface show the existing implementation, intended design, or a comparison with disagreements visible?
4. What actual Atlas decision would demonstrate value: recognizing a missing Trip concept, separating Person from Account, repairing a classification scheme, or improving discovery of saved places?
5. What evidence would show that understanding improved: a resolved ambiguity, fewer contradictory implementation requests, successful navigation tasks, or a clearer shared vocabulary?

## What counts as a primitive?

6. When you say “subject,” do you mean what content is about, the actor doing something, or a domain such as travel planning?
7. Are Place, Person and Visit enough to explain Atlas, or do intentions such as “plan a weekend” and policies such as “only an owner can share” need their own representations?
8. Is “Owner” a kind of Person, a role held in relation to a particular Collection, or a distinct product concept? What behavior would make that distinction matter?
9. When should Opening Hours become an object rather than an attribute: when it has several fields, independent identity, exceptions, reusable schedules, or its own actions?
10. Are “Café” and “Museum” types of Place, classification terms applied to Place, or independent objects with different capabilities?
11. Which relationship meanings must remain distinct: is a kind of, is part of, is located in, is about, is owned by, and may be edited by?
12. Does the model need one/many and required/optional relationships to expose product questions such as whether a Visit can include several Places?

## Subjects, taxonomy and vocabulary

13. Should place type, atmosphere, accessibility and intended activity be separate facets rather than branches of one category tree?
14. Can a bookstore café belong to multiple categories, and can a category itself have multiple parents?
15. Is “quiet places to work” an editorial subject, a user-created collection, a combination of filters, or a saved query? Must the model preserve those differences even when the screens look similar?
16. When someone says “coffee shop” and the interface says “café,” are these alternate labels for one concept or meaningfully different concepts? Who decides?
17. Which terms come from users, which from editors, and which are implementation enums? Can those vocabularies coexist without being silently merged?
18. What does a useful taxonomy edit do: rename a term, merge synonyms, split an ambiguous category, reassign content, or change search and filtering behavior?
19. Should every term have a definition, examples and exclusions so two team members can classify the same item consistently?
20. Can users safely retire a term while retaining old references, redirects and the rationale for the change?

Separating concepts from their labels, supporting preferred and alternative labels, and distinguishing hierarchical from associative relationships has a useful precedent in the [W3C SKOS Primer](https://www.w3.org/TR/skos-primer/). This is conceptual grounding, not a decision to adopt RDF or implement SKOS.

## Information architecture and finding things

21. Is the useful IA unit a page, a content type, a navigation label, a destination, or a route into a user task?
22. Can one Place appear through search, a city page, a collection and a planned visit while remaining one shared object in the model?
23. Should the surface expose user-facing information structure independently of how routes and components happen to be implemented?
24. How should we represent navigation that changes by role, access rights, device, locale or lifecycle state?
25. Would the most useful operation be moving pages in a tree, or asking “show every path by which someone can find a saved place”?
26. What evidence should test a proposed structure: tree testing, card sorting, search queries, observed journeys, or task completion? Which of these can the user bring into the product?

IA spans finding, understanding and organizing information; the scope of [Information Architecture Essentials](https://rosenfeldmedia.com/courses/information-architecture-essentials/) includes search and conceptual modeling. A route inventory would therefore be one input to this product, not a sufficient account of its IA.

## Extraction, uncertainty and change

27. When the schema says User, the interface says Person and service code says Member, should the agent propose one concept, three concepts, or an unresolved naming question?
28. What is enough evidence to accept an extracted primitive: a schema field, visible UI use, service behavior, tests, or agreement across several sources?
29. Can a designer add a concept the code cannot reveal, such as Trip, and keep it visibly proposed until it is implemented or rejected?
30. Should uncertainty belong to individual claims? For example, the existence of Person may be clear while “only owners can share” remains unverified.
31. After code changes, should the tool propose differences with source evidence, preserve the designer's decisions, and remember previously rejected suggestions?
32. When a person merges two concepts or changes a category, what should the agent receive: the desired model, an explanation, affected code locations, behavior examples, or all of these?
33. Which design decisions should produce implementation proposals, and which should remain exploratory alternatives?
34. Would coordinated views over shared concepts let people move between OOUX, vocabulary and navigation without maintaining three conflicting diagrams?
35. How should disagreement between team members or between code and research remain visible until someone resolves it?

The working hypothesis is an editable account of product meaning supported by implementation evidence. The critical distinction to evaluate is between observed facts, interpretations awaiting review, and accepted design intent. The next discussion should choose a real Atlas question and follow it through extraction, human judgment, a model edit, and an agent handoff before committing to a broader schema.
