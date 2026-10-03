# ADR 0003: Patients reference their doctor instead of being embedded

## Context
A doctor has many patients. MongoDB allows embedding patients inside the doctor document
or storing them in their own collection with a `doctor` reference.

## Decision
Separate `patients` collection with an indexed `doctor` ObjectId reference.

## Consequences
+ Unbounded growth is safe: embedded arrays would push busy doctors toward the 16 MB document limit.
+ The Patients page (search, filter, paginate across all doctors) is a direct indexed query;
  with embedding it would need $unwind over every doctor on every request.
+ Editing or deleting one patient touches one small document.
- Showing a doctor's name next to a patient needs a lookup; done only for the current page.
- Deleting a doctor needs an explicit decision about their patients (out of scope).