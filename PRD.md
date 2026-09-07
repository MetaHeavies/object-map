# Object Map

## Product Requirements Document

### 1. Product definition

Object Map is a repository-installed skill and shared visual artifact for builders using coding agents. The agent maintains a model of the product’s conceptual objects alongside implementation so the builder can see what exists, notice omissions and express new intentions.

It is based on Object-Oriented UX and the ORCA model:

* Objects
* Relationships
* Calls to action
* Attributes

The product provides a visual, spatial canvas where a builder can see what a software product is made of, inspect individual objects, modify their structure, discover missing concepts and use the resulting map as structured context when working with a coding agent.

The map is primarily a **thinking surface for the human designing the product**.

It is not intended to automatically design or generate the application. Its purpose is to make the conceptual structure of a software product visible and manipulable.

The central question it answers is:

**What is this product made of?**

---

## 2. Problem

Agent-assisted software development creates an increasing asymmetry.

The coding agent can inspect the repository, schemas, components, routes, models and implementation details. The human designer increasingly interacts with the product at a much higher level.

The codebase therefore becomes increasingly difficult to use as a representation of the product itself.

Traditional representations do not adequately solve this:

* sitemaps describe pages
* flow diagrams describe sequences
* ERDs describe data structures
* issue trackers describe work
* Figma describes interfaces
* code describes implementation

None provides a simple persistent representation of the **conceptual things that constitute the product**.

Object Map creates that representation.

---

## 3. Product thesis

Software should be understandable through its nouns.

Instead of beginning with screens or features, Object Map exposes the important conceptual objects in the product.

For example:

```text
Client
Project
Invoice
Contact
Payment
User
```

Each object can then expose:

```text
Attributes
Relationships
Actions
States
```

The map allows the designer to inspect this structure and discover omissions, inconsistencies and opportunities.

For example, seeing:

```text
CLIENT

Name
Code
Website
```

may immediately provoke:

> A client needs a contact.

Adding:

```text
Client contact
```

may then provoke:

> Contact isn't really an attribute. It has its own name, email, phone and notes.

The designer can therefore promote `Client contact` into a new `Contact` object.

This act of restructuring the product model is the core use case.

---

## 4. Product principles

### The map is for thinking

The map exists primarily to help a human reason about a software product.

Implementation fidelity is secondary to conceptual usefulness.

### Product objects are not code entities

A database table, class or API resource may suggest a product object, but the two are not equivalent.

Implementation concepts such as:

```text
CollectionItem
UserPreference
PlaceMetadata
```

may not belong in the conceptual product model at all.

The human remains authoritative.

### Interaction is a first-class asset

The map should not merely display product structure.

Manipulating that structure should feel direct, spatial and exceptionally well crafted.

Motion communicates conceptual change.

### The canvas is constrained

Object Map is not a generic diagramming application.

Users manipulate semantic product concepts rather than arbitrary rectangles, arrows and text.

### The code connection is deliberately lightweight

The map should be readable by coding agents and able to reference implementation evidence.

The agent maintains the model during authorized product work. The canvas does not independently generate implementation or infer conceptual changes.

---

# 5. Product architecture

The conceptual relationship is:

```text
DESIGNER

   ↓

OBJECT MAP

   ↕

CODING AGENT

   ↓

CODEBASE
```

The Object Map is stored inside the repository as structured data.

For example:

```text
.object-map/
    map.json
    layout.json
    config.json
```

`map.json` contains semantic product information.

`layout.json` contains visual canvas state.

These must remain separate so moving a card does not create meaningless semantic diffs.

---

# 6. Core model

The primary entity is an **Object**.

An object contains:

```text
Object
├── Attributes
├── Relationships
├── Actions
└── States
```

States are an extension of the core ORCA structure and should initially remain optional.

Every item has a persistent stable identifier.

Example:

```text
obj:client

obj:client/attr:website

obj:client/rel:contact

obj:client/action:archive

obj:invoice/state:paid
```

These identifiers allow humans and coding agents to refer to exactly the same product concept.

---

# 7. Canvas

Opening Object Map should reveal the product landscape immediately.

There should be no dashboard between the user and the map.

Example:

```text
CLIENT        PROJECT        INVOICE

CONTACT       PAYMENT        USER
```

Objects are represented as relatively large cards.

The visual language should be quiet:

* canvas
* cards
* typography
* lines
* whitespace

Avoid decorative interface chrome.

The static interface should feel understated.

Its character should emerge through interaction.

---

# 8. Object states

## Closed object

A closed object is a compact card.

```text
┌─────────────────┐
│ CLIENT          │
│                 │
│ 8 attributes    │
└─────────────────┘
```

## Expanded object

Selecting an object transforms the existing card rather than replacing it.

It reveals:

```text
                         CLIENT

ATTRIBUTES       RELATIONSHIPS       ACTIONS       STATES

Name             Projects            Edit          Active
Code             Contacts            Archive       Archived
Website          Invoices            Add contact

+
```

Other objects remain spatially meaningful but visually recede.

---

# 9. Semantic primitives

The user can create, edit and remove:

### Objects

Important conceptual nouns in the product.

### Attributes

Information describing an object.

### Relationships

Connections between objects.

### Actions

Things a user or system can meaningfully do with an object.

### States

Meaningful lifecycle conditions of an object.

States remain optional until testing demonstrates that they deserve equal prominence with the core ORCA primitives.

---

# 10. Direct editing

Editing should happen directly on the canvas wherever possible.

Adding an attribute:

```text
ATTRIBUTES

Name
Website

+
```

Selecting `+` creates a new mini-card in place.

The user types directly into it.

Avoid modal dialogs and property inspectors for simple operations.

---

# 11. Promotion

Promotion is a foundational product operation.

An attribute can become an object.

Example:

```text
CLIENT

Client contact
```

The designer realizes that Client Contact has its own structure.

They select:

**Promote to object**

The resulting model becomes:

```text
CLIENT ───────── CONTACT

                  Name
                  Email
                  Phone
                  Notes
```

The system performs the structural bookkeeping:

* creates Contact
* converts the original attribute into a relationship
* preserves relevant naming
* updates the product model

Promotion must be reversible where structurally possible.

---

# 12. Relationships

Relationships connect objects.

Creating a relationship should be possible from an expanded object.

Existing objects should be discoverable through autocomplete or direct spatial connection.

Dragging a relationship onto empty canvas may allow the user to create a new object there.

Example:

```text
PLACE
   │
   └──────────────→ CITY
```

Relationships may contain additional information such as direction and cardinality, but this should not dominate the default canvas.

---

# 13. Contextual relationships

Object Map should avoid becoming a permanent web of connecting lines.

Relationships appear contextually.

Selecting an object reveals its immediate network.

For example:

```text
          CITY

           │

PHOTO ── PLACE ── COLLECTION

           │

          VISIT
```

Selecting a connected object transfers focus.

This makes the product model traversable rather than merely zoomable.

---

# 14. Actions

Actions represent meaningful operations associated with an object.

For example:

```text
PLACE

Edit
Save
Add to collection
Plan visit
Add note
Share
Archive
```

An action represents a product capability, not necessarily a literal button.

---

# 15. States

Where useful, objects may expose meaningful lifecycle states.

Example:

```text
VISIT

Planned
Completed
Cancelled
```

States should provoke questions about product behaviour:

* What actions are available in each state?
* Which transitions are allowed?
* Are some apparent states actually derived attributes?
* What happens to related objects when state changes?

States should not become an engineering state-machine editor.

---

# 16. Interaction philosophy

Object Map uses **direct manipulation and liquid motion**.

Liquid describes movement, not visual appearance.

The interaction vocabulary is:

```text
expand
contract
split
merge
promote
demote
connect
disconnect
pull
release
reorder
focus
traverse
```

Prefer these conceptual transformations over:

```text
open modal
close modal
navigate
fade out
fade in
```

---

# 17. Liquid motion principles

### Continuity

An element transforming into another element retains perceptual identity.

### Origin

New material emerges from the object responsible for creating it.

### Conservation

Elements should rarely disappear and independently reappear elsewhere.

### Momentum

Direct manipulation can preserve pointer velocity.

### Deformation

Small amounts of stretch, compression or scale can communicate physical forces.

### Settling

Major transformations may slightly overshoot and settle.

### Interruptibility

The user must remain in control while animation occurs.

### Restraint

Frequent interactions should become fast and quiet.

Motion must explain what happened rather than decorate it.

---

# 18. Signature interaction: attribute → object

Promotion is the benchmark interaction for the product.

Starting state:

```text
PLACE

Opening hours
```

Promotion:

```text
Opening hours

      ↓

detaches

      ↓

moves outward

      ↓

changes proportions

      ↓

expands

      ↓

OPENING HOURS
```

Final state:

```text
PLACE ───────── OPENING HOURS
```

The user should perceive:

**I turned this thing into that thing.**

The implementation must not simply fade the attribute out and fade an unrelated object in.

---

# 19. Multiple-object exploration

Following a relationship may expand another object alongside the current one.

Example:

```text
PLACE                         VISIT

Attributes                    Attributes
Relationships ─────────────── Relationships
Actions                       Actions
States                        States
```

The canvas creates room automatically.

Unrelated objects move rather than abruptly disappearing.

This allows the designer to explore a conceptual neighbourhood of the product.

---

# 20. Layout

Object placement may be manually adjustable because spatial grouping can carry meaning.

Internal mini-cards should primarily use automatic layout.

Do not implement arbitrary drawing tools.

Users manipulate:

```text
Object
Attribute
Relationship
Action
State
```

The system handles presentation.

---

# 21. Motion implementation

Anime.js v4 should be the primary motion library.

Create semantic motion primitives rather than scattering animation configuration throughout the codebase.

For example:

```text
motion.expand()
motion.contract()
motion.promote()
motion.demote()
motion.connect()
motion.detach()
motion.settle()
motion.reflow()
motion.focus()
```

The motion system should coordinate layout changes, transforms and relationship lines.

Prefer transforms and opacity for high-frequency animation.

Use layout measurement and FLIP-style techniques where necessary.

Motion should remain smooth during ordinary interaction on contemporary hardware.

---

# 22. Motion prototyping

Signature interactions must be prototyped rather than implemented once and accepted.

For each important transformation, create multiple materially different treatments.

Priority prototypes:

1. open object
2. close object
3. create attribute
4. promote attribute to object
5. create relationship
6. traverse relationship
7. drag object
8. delete object
9. undo
10. canvas reflow

During development, provide temporary switching between alternatives.

Example:

```text
PROMOTION

A  Restrained
B  Elastic separation
C  Momentum
```

The selected behaviour then becomes part of the product motion system.

---

# 23. Undo

All semantic manipulations must support undo.

Where appropriate, undo should visually reverse the original conceptual transformation.

For promotion:

```text
ATTRIBUTE
    ↓
OBJECT
```

undo becomes:

```text
OBJECT
    ↓
contracts
    ↓
returns toward parent
    ↓
relationship collapses
    ↓
ATTRIBUTE
```

Undo therefore reinforces the conceptual model.

---

# 24. Repository deployment

Object Map is ultimately distributed as a skill that can be installed into a new or existing software repository.

Installation should create the necessary product-map structure and agent instructions.

The exact structure should follow the current specification of the target coding-agent skill system.

Conceptually:

```text
repo/

.object-map/
    map.json
    layout.json
    config.json

agent skill/
    instructions
    references
    scripts
    hooks
```

---

# 25. Existing repository bootstrap

When installed into an existing repository, the skill should inspect relevant implementation evidence.

Potential sources include:

* database models
* schemas
* routes
* APIs
* domain types
* UI components
* forms
* permissions
* domain terminology

The system proposes candidate product objects.

Example:

```text
LIKELY PRODUCT OBJECTS

Place
Collection
Visit
Person

POSSIBLE IMPLEMENTATION OBJECTS

CollectionItem
PlaceMetadata
UserPreference
```

When the builder asks to run Object Map, the agent inspects the implementation and populates evidence-supported concepts. It preserves builder decisions and records ambiguous candidates for discussion. The builder can inspect, reject or restructure the result. The bounded visual discovery adapter remains an optional candidate-review flow.

---

# 26. Implementation evidence

Mapped concepts may retain implementation references.

Example:

```text
Place

src/models/place.js
src/routes/places.js
src/components/PlaceCard.js
```

These references should remain secondary or hidden in the normal visual experience.

Their purpose is to give coding agents deterministic paths between the conceptual model and implementation.

---

# 27. Agent context

At appropriate agent lifecycle points, the coding agent should read the Object Map.

The map establishes shared vocabulary.

For example, when the designer says:

```text
@object-map obj:place/rel:city
```

the agent can resolve that stable identifier and inspect the relevant product context.

This avoids repeatedly explaining which product concept is being discussed.

---

# 28. Hooks

Hooks should maintain awareness of the product model.

At session start and every submitted user prompt, supported host hooks supply current map context. Repository instructions provide the same read/work/reconcile obligation when hooks are unavailable.

During authorized product work, the agent updates the affected concepts and preserves unimplemented builder intentions. Before finishing, it validates the map and records a review, including a reason if no conceptual change was needed. A Stop hook checks the current revision against that receipt and can request review once, without an endless continuation loop.

Hooks provide context and check a recorded review; they do not perform conceptual interpretation or prove semantic correctness. SKILL.md contains the shared workflow, while Claude Code and Codex use their own repository configuration files. Installation must preserve unrelated instructions and settings.

The map is the shared articulation of implemented product behavior and builder intent. “New object” lets the builder add a concept directly; it is not the primary mechanism for keeping the map current.

---

# 29. Drift

The architecture should allow future comparison between the product model and implementation.

Example:

```text
OBJECT MAP

Place
 └─ website
```

Implementation contains:

```text
website
instagram
phone
booking_url
```

The system may eventually report:

```text
Possible product-model drift

Three implementation fields are not represented.

Review
Ignore
Add
```

The inverse is equally useful.

A mapped concept that has no implementation evidence may represent intended but unfinished product work.

Sophisticated drift detection is not required for V1.

---

# 30. Change sets

A design session should be able to expose its semantic changes.

Example:

```text
THIS SESSION

+ Object: Contact
+ Contact.name
+ Contact.email
+ Contact.phone
+ Client → Contact

~ Client.contact promoted to object
```

The user can copy this as compact coding-agent context.

The map itself does not need to automatically implement those changes.

---

# 31. V1 requirements

V1 must support:

### Installation

Deploy Object Map into a repository.

### Discovery

Inspect an existing repository and propose an initial product model.

### Mapping

Create, edit and remove Objects, Attributes, Relationships, Actions and optional States.

### Interaction

Provide high-quality spatial direct manipulation and the defined liquid-motion system.

### Persistence

Store semantic and layout information separately and keep both Git-friendly.

### Stable references

Give every semantic item a persistent identifier.

### Handoff

Copy individual references or session change sets for coding-agent use.

### Agent awareness

Allow the coding agent to read the map through the deployed skill/hooks.

---

# 32. Explicitly outside V1

Do not build:

* multiplayer
* cloud accounts
* project management
* ticket management
* arbitrary diagramming
* embedded AI chat
* automatic UI generation
* automatic database generation
* automatic implementation from the canvas
* complex bidirectional synchronization
* Figma integration
* generic documentation management

Do not expand scope until actual use demonstrates the need.

---

# 33. Success criteria

The primary success metric is **product insight generated by looking at and manipulating the map**.

A designer unfamiliar with a mapped application should quickly understand its principal conceptual objects.

Within several minutes of exploration, the map should begin provoking questions such as:

> Why isn't this an object?

> What's missing from this object?

> Why are these objects related?

> Should this attribute actually have its own attributes?

> We have this action, but where is the object it creates?

> Is this really a state?

> Can this object exist without that one?

Those discoveries are the product.

The ultimate quality bar is that Object Map becomes something a designer keeps open while building software with an agent—not because it documents the application, but because **seeing the product this way changes the quality of the decisions they make about it.**
