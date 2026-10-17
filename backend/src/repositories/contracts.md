# Repository contracts

Services depend on these shapes only. `json/` and `firestore/` each implement all of them,
so a service never knows (or cares) which database is behind it. All methods are async and return copies.

UserRepository
- findById(id) -> user | null
- findByLoginId(loginId) -> user | null          (case-insensitive: National ID or staff username)
- create(user) -> boolean                         (false if the id already exists)
- update(id, mutator) -> user | null              (mutator edits a copy; applied atomically)
- listStaff() -> user[]                           (officers and admins)
- listActiveOfficers(dept) -> user[]
- count() -> number

RequestRepository
- create(request) -> boolean                      (false if the reference already exists)
- findByRef(ref) -> request | null
- findByCheckoutId(id) -> request | null
- update(ref, mutator) -> request | null          (atomic read-modify-write)
- listForUser(userId) -> request[]                (newest first)
- listForStaff(dept | null) -> request[]          (paid or awaiting payment; dept null = all)

SmsLogRepository
- add(entry), latest(n)

SchoolRepository
- listByWard(subCounty, ward) -> {id, name}[]
- findById(id) -> school | null
- addMany(schools) -> number                      (idempotent: same ward+name = same id)
