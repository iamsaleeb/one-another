# One Another

Churches publish Events and Series; members follow, attend and help run them. This glossary covers the language of who may do what, and of what happens when an Event changes.

## Events

**Event lifecycle**:
Every change to an Event's state, and everything that must follow from it: reminders, Series-follower notices, the Creator Grant, and which pages go stale. An Attendee joining or leaving is such a change. A change and its consequences commit together or not at all.
_Avoid_: publish side effects, event hooks

**Owning Church**:
The Church an Event or Series belongs to; every one has exactly one. A Series' Owning Church is fixed when it is created. An Event's is fixed once it is first published: a draft may still change Church, which needs the Capability to create an Event there and gives the mover the Creator Grant as if they had created it there. Whether an Event is a session of a Series, and of which, is fixed when it is created.
_Avoid_: placement, moving an Event

**Category**:
The kind of Event, such as Worship or Camp; stored as its `tag`. Fixed once the Event is first published, since what a Camp collects at registration depends on it. A draft may still change Category.
_Avoid_: type, tag (outside code)

**Happened**:
A published Event has happened once its start time has passed. It is then read-only: it can no longer be edited, cancelled, un-cancelled or unpublished, only deleted. An Event can only be published with a start time still to come.
_Avoid_: past event, expired, finished

**Series lifecycle**:
Every change to a Series, and everything that must follow from it: its Events becoming standalone Events in the same Church when it is deleted, followers coming and going, and which pages go stale. A change and what it does to the Series' Events commit together or not at all.
_Avoid_: series DAL, series cache

**Attendee**:
A user attending an Event. On an Event that requires registration, attending means registering: the Event's capacity, camp days and required questions decide whether they may join, however they ask. Attending again updates the registration; it never counts twice.
_Avoid_: RSVP, registrant (as a separate concept), guest

## Access

**Grant**:
A role a user holds on one Church, Series or Event. Grants only ever add access; there is no grant that takes access away. Granting a role never lowers one the user already holds on the same resource.
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

**Access request**:
A user asking for a Grant on one Church, Series or Event. Someone who may manage that resource's Helpers approves or denies it; approving gives the Grant, and revoking takes back only the Grant it gave.
_Avoid_: approval, application

**Helper**:
A user holding a Grant that came from an approved Access request.
_Avoid_: staff, volunteer

**Creator Grant**:
The Event-level Grant a user receives when they create an Event (or move a draft to another Church), unless a Church Grant already lets them edit every Event in that Church. It is a normal Grant, so it can be removed or handed to someone else.
_Avoid_: ownership, owner (an Event's owner is its Owning Church)
