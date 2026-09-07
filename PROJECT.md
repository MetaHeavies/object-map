# Dummy Project Generator

## Purpose

This specification defines a disposable software project used to develop and test Object Map.

It is **not part of the Object Map product specification**.

The generated application exists solely to provide a realistic codebase against which Object Map can be installed, initialized, tested, broken and iterated.

The generator should be capable of producing multiple variations so Object Map is not accidentally optimized around one hand-crafted repository.

---

# 1. Test application

The default generated application is called:

# Atlas

Atlas is a personal place-collection application.

People use Atlas to collect interesting places they discover:

* restaurants
* galleries
* architecture
* bookstores
* shops
* parks
* landscapes
* bars
* hotels
* cultural sites

Users can organize places into collections, attach notes and photographs, plan visits and share collections with other people.

The application should feel like a plausible early-stage product rather than a technical demonstration.

---

# 2. Why Atlas

Atlas provides a useful domain because its conceptual model is understandable without specialist knowledge while still containing ambiguity.

Potential objects include:

```text
Place
Collection
Person
Visit
Note
Photo
City
Tag
```

Several concepts are deliberately unclear:

```text
Address
Opening Hours
Location
Contact
Category
Companion
Collection Item
```

These ambiguities are intentional.

They create opportunities for Object Map to expose modelling questions.

---

# 3. Initial product functionality

The dummy application should contain working functionality for:

### Places

Create, edit, view and archive places.

### Collections

Create collections and add/remove places.

### Visits

Plan a future visit to a place and mark visits as completed or cancelled.

### Notes

Attach textual notes to places and visits.

### Photos

Attach photo records to places and visits.

### People

Represent the current user and other people with whom collections may be shared.

### Cities

Associate places with cities.

### Tags

Apply arbitrary tags to places.

The application does not need production-quality authentication, storage or media handling.

It needs enough implementation structure for repository analysis to be meaningful.

---

# 4. Initial conceptual objects

The clean conceptual interpretation is approximately:

```text
PLACE

COLLECTION

PERSON

VISIT

NOTE

PHOTO

CITY

TAG
```

However, the repository should not make this interpretation perfectly obvious.

The purpose is to test discovery rather than merely parse an intentionally clean domain model.

---

# 5. Example Place data

A Place may contain:

```text
id
name
description
address
latitude
longitude
website
phone
instagram
opening_hours
status
created_at
updated_at
```

Relationships may include:

```text
city
tags
collections
notes
photos
visits
```

Potential actions include:

```text
edit
archive
add_to_collection
plan_visit
add_note
add_photo
share
```

---

# 6. Example Collection data

A Collection may contain:

```text
id
name
description
cover_image
visibility
created_at
updated_at
```

Relationships:

```text
owner
places
shared_with
```

Actions:

```text
edit
add_place
remove_place
share
archive
```

---

# 7. Example Visit data

A Visit may contain:

```text
id
planned_date
completed_date
status
rating
private_note
created_at
```

Relationships:

```text
place
person
companions
notes
photos
```

Possible states:

```text
planned
completed
cancelled
```

---

# 8. Example Person data

A Person may contain:

```text
id
name
email
avatar
bio
```

Relationships:

```text
collections
visits
shared_collections
```

---

# 9. Example Note data

A Note may contain:

```text
id
body
created_at
updated_at
```

Its implementation should deliberately allow it to reference either:

```text
Place
Visit
```

This gives Object Map something interesting to interpret.

---

# 10. Example Photo data

A Photo may contain:

```text
id
url
caption
taken_at
created_at
```

It may relate to:

```text
Place
Visit
Person
```

This should create another non-trivial discovery case.

---

# 11. Deliberate modelling ambiguity

The generated repository must contain design imperfections.

These are test fixtures.

For example, Place initially contains:

```text
opening_hours
```

as a simple attribute.

During Object Map testing, the designer may decide that Opening Hours deserves promotion into an object with:

```text
day
opens_at
closes_at
closed
special_hours
```

Similarly:

```text
address
```

may initially be stored as a string.

The designer may later decide it should become structured information.

These situations allow promotion and restructuring to be tested against a real repository.

---

# 12. Deliberately missing concept

Generate at least one obvious product omission.

Default:

**Place has no primary contact.**

The existing Place structure may contain:

```text
name
website
phone
```

but no explicit Contact concept.

The intended discovery is that a designer examining Place may decide to introduce:

```text
CONTACT

name
role
email
phone
notes
```

and create:

```text
PLACE ───────── CONTACT
```

This reproduces the type of spontaneous discovery Object Map is intended to support.

---

# 13. Implementation noise

The repository should contain concepts that look like objects technically but probably should not appear as product objects.

Examples:

```text
CollectionItem
PlaceTag
ShareToken
PhotoUpload
UserPreference
PlaceMetadata
Session
AuditEntry
```

This tests whether repository discovery distinguishes:

**implementation entities**

from:

**user-recognizable product objects**

The Object Map bootstrap process should propose rather than blindly import them.

---

# 14. Inconsistent naming

Some implementation terminology should intentionally differ from product terminology.

For example:

```text
DB/API                 PRODUCT

user                   Person
saved_location         Place
list                    Collection
trip_event              Visit
media_asset             Photo
```

Do not make every name inconsistent.

A realistic mixture is more useful.

This tests whether discovery performs semantic interpretation rather than simple filename extraction.

---

# 15. Distributed evidence

Information about a product object should exist across multiple implementation surfaces.

For Place:

```text
database/schema
API routes
form
detail view
list/card component
service
validation
```

Object Map should therefore need to synthesize evidence rather than treating one model file as authoritative.

---

# 16. UI

The dummy application itself should have a simple functional interface.

Required screens:

```text
Places
Place detail
Collections
Collection detail
Visits
People
```

The visual design should be intentionally competent but unremarkable.

Do not spend significant design effort on Atlas.

The product under evaluation is Object Map.

---

# 17. Repository structure

Use a straightforward contemporary web application structure.

The exact stack may vary between generated test repositories.

A typical version could contain:

```text
src/
    components/
    pages/
    models/
    services/
    routes/
    data/
    utils/

server/
    routes/
    services/

database/
    schema/
    seed/
```

The repository should be understandable to a coding agent but contain enough distribution and inconsistency to make discovery non-trivial.

---

# 18. Seed data

Generate realistic seed data.

For example:

```text
PLACE

Casa Barragán
Mexico City
Architecture

Daunt Books
London
Bookstore

Louisiana Museum
Humlebæk
Museum

Jim Thompson House
Bangkok
Architecture / Museum
```

Create enough data that the application feels populated when running.

Approximately:

```text
20–30 places
5–8 collections
10–15 visits
5–10 people
30+ notes
30+ photo records
10+ cities
15+ tags
```

Exact numbers are unimportant.

---

# 19. Generator modes

The generator should eventually support at least three repository conditions.

## Clean

Domain concepts correspond relatively closely to implementation.

Used for basic Object Map development.

## Realistic

Domain concepts are distributed and naming is imperfect.

This should be the default.

## Messy

Contains:

* redundant fields
* legacy names
* unused components
* implementation-only entities
* duplicate terminology
* inconsistent relationships
* partially implemented features

Used to stress-test discovery.

---

# 20. Drift scenario

The generator should be able to create a second version of the repository after Object Map has already been initialized.

For example, V2 adds to Place:

```text
booking_url
instagram
phone
price_level
```

without updating Object Map.

It may also introduce:

```text
PLACE_CONTACT
```

in the implementation.

This allows future drift detection to be tested.

---

# 21. Reverse drift scenario

The Object Map test may introduce:

```text
CONTACT
```

before Contact exists in the application.

The coding agent can subsequently be instructed:

```text
Implement @object-map obj:contact
```

This tests the map → agent → implementation workflow.

---

# 22. Structural change scenario

Provide a fixture where:

```text
opening_hours
```

starts as an attribute of Place.

The designer promotes it to:

```text
OPENING HOURS
```

The coding agent is then asked to modify the dummy application accordingly.

This tests one of Object Map's signature workflows end-to-end.

---

# 23. Relationship scenario

Start with:

```text
Visit → Place
Visit → Person
```

but no companion model.

Object Map exploration should make it plausible for the designer to ask:

> Can other people accompany me on a Visit?

The designer can then introduce:

```text
Visit → Companions → Person
```

This provides a useful relationship-design test without requiring a new primary object.

---

# 24. State scenario

Visit contains:

```text
status
```

with:

```text
planned
completed
cancelled
```

Object Map may interpret these as States.

The test should explore whether representing them separately from attributes improves product reasoning.

---

# 25. CTA scenario

The dummy UI should expose an action such as:

```text
Share collection
```

while the implementation contains supporting entities such as:

```text
ShareToken
CollectionPermission
```

Object Map should ideally identify:

```text
Share
```

as a Collection action without necessarily treating `ShareToken` as a product object.

This is an important discovery test.

---

# 26. Generation requirements

Running the generator should create a complete runnable repository.

Conceptually:

```text
generate-dummy-project atlas
```

Optional:

```text
--condition clean
--condition realistic
--condition messy
```

Each run should be deterministic when supplied with a seed.

Example:

```text
--seed 42
```

This allows interaction and discovery behaviour to be tested repeatedly against identical repositories.

---

# 27. Object Map must not know the answer

Do not include an Object Map file in the generated repository unless explicitly testing an already-mapped scenario.

The bootstrap test begins with:

```text
Atlas codebase
+
Object Map skill
```

The skill must inspect Atlas and propose the initial map.

The expected conceptual model can exist separately as test-fixture metadata, but it must not be visible to the discovery agent during normal testing.

---

# 28. Evaluation fixture

The generator may maintain an internal expected interpretation:

```text
expected/
    objects.json
    ambiguities.json
    implementation-noise.json
    intentional-omissions.json
```

This allows discovery results to be evaluated systematically.

For example:

```text
Expected strong objects:
Place
Collection
Person
Visit
Note
Photo
City
Tag

Expected questionable objects:
Opening Hours
Contact

Expected implementation noise:
CollectionItem
PlaceTag
ShareToken
UserPreference
```

This metadata belongs to the testing system, not the generated application.

---

# 29. Primary test sequence

The standard Object Map development test should be:

```text
1. Generate Atlas.

2. Run Atlas and verify functionality.

3. Install Object Map.

4. Initialize Object Map.

5. Review proposed objects.

6. Accept/reject/restructure the proposed map.

7. Open Place.

8. Inspect attributes.

9. Add Contact.

10. Promote Contact to an object.

11. Add Contact attributes.

12. Explore relationships.

13. Modify Visit relationships.

14. Inspect Visit states.

15. Copy a map reference.

16. Give it to the coding agent.

17. Implement the change.

18. Restart Object Map.

19. Verify map persistence.

20. Test implementation drift.
```

This becomes the canonical development journey.

---

# 30. Success criteria

The dummy generator succeeds if it provides a repository that is:

**Understandable**

A human can comprehend Atlas without extensive explanation.

**Non-trivial**

Product concepts cannot be recovered simply by listing database tables.

**Ambiguous**

There are legitimate product-modelling decisions to make.

**Imperfect**

The repository contains realistic inconsistencies and omissions.

**Runnable**

The application behaves sufficiently like real software to make implementation changes meaningful.

**Repeatable**

The same scenarios can be regenerated for testing.

Most importantly, Atlas should repeatedly create moments where looking at Object Map causes someone to say:

> Wait. That's wrong.

or:

> We're missing something.

or:

> That shouldn't be an attribute. That's actually a thing.

Those are the behaviours the dummy project exists to test.
