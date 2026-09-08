# Evaluation

Two fixtures exist, for two different jobs. This directory holds the expectations for one of them.

**Atlas** is a generated product — places, collections, visits — built deliberately messy so a mapping run has something real to fail at. `generator/` builds it, `tests/atlas-map.json` seeds the browser tests, and `atlas.json` here records what a good mapping of it looks like: the objects that should appear, the ambiguities worth raising, the implementation noise that should not become objects. No code reads `atlas.json`. It is the answer key a person checks a run against, and it must stay out of any repository an agent is asked to map.

**Bookshelf** is the demo that ships inside the skill, at `skills/object-map/demo/`. Five objects, written by hand, there to explain what an object, an attribute and a relationship are. It is never used to test discovery.

`skill-forward-test.md` records one independent run against Atlas.
