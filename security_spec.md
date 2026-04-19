# Security Specification for Bookmytable

## Data Invariants
1. A booking must have a valid `userId` (the person booking) and `restaurantId`.
2. A user can only create/update their own profile.
3. Only the owner of a restaurant or an admin can update restaurant details.
4. Users can only see their own bookings. Owners can see bookings for their restaurants.
5. Bookings can only be confirmed or cancelled by the restaurant owner or admin. Users can cancel their own bookings while `pending`.

## The Dirty Dozen Payloads (Rejection Targets)

1. **Identity Spoofing**: Attempting to create a profile with a `uid` that doesn't match `request.auth.uid`.
2. **Role Escalation**: Attempting to set `role: 'admin'` in a user profile creation.
3. **Ghost Booking**: Creating a booking for another user (`userId` mismatch).
4. **Unauthorized Restaurant Creation**: Creating a restaurant with an `ownerId` that isn't the current user.
5. **Unauthorized Status Change**: A user trying to set their booking status to `confirmed` (only owner should do this).
6. **Self-Approval**: A restaurant owner trying to set `approved: true` on their own restaurant (only admin should do this).
7. **Cross-User Leak**: Attempting to `list` all bookings without a `where('userId', '==', uid)` filter.
8. **Owner Data Leak**: A different user trying to read `ownerId` private info (if we had private fields).
9. **Update Gap**: Updating a booking's `dateTime` but injecting a `maliciousField: true`.
10. **ID Poisoning**: Injecting a 1.5KB string as a restaurant ID.
11. **Negative Guests**: Creating a booking with `-1` guests.
12. **Future Tampering**: Attempting to update `createdAt` field after creation.
