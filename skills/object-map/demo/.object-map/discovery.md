# Object Map discovery — Bookshelf

## Boundary

A small lending library. Members borrow books; a hold reserves one that is out.

## Boundary calls made

- **Loan kept as an object.** It has its own dates, its own states and its own
  actions, and both a book and a member refer to it. It is never met on a page
  of its own, which is why it appears inside Book and inside Member.
- **Shelf demoted to an attribute.** A shelf is a location printed on a book,
  with no records, no actions and nothing that refers to it.

## Unresolved questions

1. **A hold has no code behind it.** The brief describes reserving a book that
   is out, and nothing implements it. Mapped as `intended`, which is why it has
   no page and appears under nothing.
2. **Is a returned loan still a loan?** `Returned` is a state on Loan, and the
   product also archives loans older than a year to a separate table. Whether
   an archived loan is the same object is a product decision.
