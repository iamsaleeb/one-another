# One Another

Churches publish Events and Series; members follow, attend and help run them. This glossary covers the language of who may do what, and of what happens when an Event changes.

## Events

**Event lifecycle**:
Every change to an Event's state, and everything that must follow from it: reminders, Series-follower notices, the Creator Grant, and which pages go stale. A change and its consequences commit together or not at all.
_Avoid_: publish side effects, event hooks

## Access

**Grant**:
A role a user holds on one Church, Series or Event. Grants only ever add access; there is no grant that takes access away.
_Avoid_: permission, membership (when meaning the role itself), assignment

**Capability**:
A single thing a user may do to a kind of resource, such as updating an Event or managing a Church's members. In code, an `Action` on the Ability.
_Avoid_: permission, right

**Ability**:
Everything a user may do, derived from all of their Grants at once.
_Avoid_: permissions, access list

**Role cascade**:
A Grant reaches down the hierarchy: a Church Grant covers every Series and Event in that Church, and a Series Grant covers every Event in that Series.
_Avoid_: inheritance

**Creator Grant**:
The Event-level Grant a user receives when they create an Event, unless a Church Grant already lets them edit every Event in that Church. It is a normal Grant, so it can be removed or handed to someone else.
_Avoid_: ownership, owner
