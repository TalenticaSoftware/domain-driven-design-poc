# Order Fulfillment & Delivery Scheduling — a DDD proof of concept

This repo implements a small order fulfillment backend (order → inventory check → shipment → delivery) as an exercise in Domain-Driven Design. The point here was never feature count — it was to get the domain model right and keep the layers honest. Node.js + TypeScript + Express + TypeORM + PostgreSQL.

Quick orientation if you're reviewing this: start with the three aggregates (`src/contexts/*/domain`), then look at `src/app.ts` to see how everything is wired together. The rest is plumbing.

---

## Domain design decisions

### Model

**`Order` (Ordering context)** — the aggregate root, with `OrderItem` as an internal entity. Items live and die with their order; there's no use case where you'd load an order item on its own. The invariants that must hold together — "an order has at least one item", "no duplicate products", "quantities are positive integers", "you can't confirm a rejected order" — all sit inside this one boundary, so they're enforced in one place.

`Order` carries a proper state machine:

```
CREATED ──▶ CONFIRMED ──▶ SHIPPED ──▶ DELIVERED
   └──────▶ REJECTED
```

Transitions are validated in the `OrderStatus` value object (`transitionTo`), not in a service. If someone tries to confirm an already-confirmed order, the domain throws — the application layer doesn't have to remember to check.

**`InventoryItem` (Inventory context)** — deliberately tiny. One aggregate per product, one invariant: stock never goes negative. That rule lives in the `StockLevel` value object; `deduct()` throws before it will ever produce a negative number. I kept this aggregate small on purpose — stock checks happen on every order confirmation and I didn't want them contending with unrelated data.

**`Shipment` (Shipping context)** — owns the delivery lifecycle with its own forward-only state machine:

```
SCHEDULED ──▶ DISPATCHED ──▶ IN_TRANSIT ──▶ DELIVERED
```

No skipping, no going back. A shipment references its order by ID only (`orderId: string`) — aggregates never hold object references to other aggregates. That's what keeps the contexts separable.

### Entities vs value objects

Rule of thumb I followed: identity + lifecycle → entity; defined purely by its attributes → value object.

| Concept | Kind | Why |
|---|---|---|
| `Order`, `Shipment`, `InventoryItem` | Aggregate roots | Have identity, change over time, own invariants |
| `OrderItem` | Entity (internal to `Order`) | Has a lifecycle, but only inside its order |
| `OrderStatus`, `ShipmentStatus` | Value objects | Two orders in `CONFIRMED` state are interchangeable in that respect; transitions return *new* instances |
| `Quantity`, `StockLevel` | Value objects | Self-validating — you cannot construct an invalid one, so invalid values can't leak into the model |
| `OrderId`, `ShipmentId`, `ProductId` | Value objects (typed IDs) | Prevents the classic "passed an orderId where a productId was expected" bug |
| `DeliveryDate`, `DeliveryPartner` | Value objects | `DeliveryDate` rejects past dates at construction; partner comes from a fixed list |

Everything is immutable. "Changing" a value object gives you a new one (`StockLevel.deduct` returns a fresh `StockLevel`), and aggregates swap their internal props object rather than mutating in place.

### Domain first, database second

The schema is a projection of the model, not the other way around. Persistence classes (`OrderEntity`, `InventoryEntity`, `ShipmentEntity`) are completely separate from the domain classes, and the TypeORM repositories do explicit mapping in both directions (`toEntity` / `toDomain`). It's a bit of boilerplate, but it means the domain layer has **zero** TypeORM imports and the model was free to be designed without worrying about columns.

One consequence worth pointing out: since order items are immutable after creation, `TypeOrmOrderRepository.save` only updates the order's status on re-save instead of re-cascading items (which would duplicate rows).

---

## Bounded contexts

Three contexts, split along lines where the language and the rules change:

```
┌──────────────┐    OrderConfirmed (event)     ┌──────────────┐
│   Ordering   │ ────────────────────────────▶ │   Shipping   │
│              │ ◀──────────────────────────── │              │
└──────┬───────┘   ShipmentScheduled /         └──────────────┘
       │           DeliveryCompleted (events)
       │
       │  StockValidator (port/interface)
       ▼
┌──────────────┐
│  Inventory   │
└──────────────┘
```

- In **Ordering**, "delivered" is a line item on the order's history. In **Shipping**, delivery is the whole job, with its own granular states. Different rules, different language → different contexts.
- **Inventory** knows nothing about orders. It answers exactly one question: "can I reserve these quantities?"

**How they talk to each other** — this is where the decoupling actually lives:

1. *Ordering → Inventory* goes through a **port**: `StockValidator` is an interface that Ordering owns (`src/contexts/ordering/application/ports/`). Inventory's `StockValidationService` implements it. Ordering never imports Inventory's domain types, so I could swap Inventory for an external service tomorrow without touching order logic.
2. *Ordering ↔ Shipping* is **event-driven** via an in-process event bus. Confirming an order publishes `OrderConfirmed`; Shipping subscribes and schedules a shipment. When a shipment hits `DELIVERED`, it publishes `DeliveryCompleted` and Ordering marks the order delivered. Neither side calls the other directly.

The full event flow for the happy path:

```
POST /api/orders                      Order CREATED         (OrderCreated)
POST /api/orders/:id/confirm          stock reserved
                                      Order CONFIRMED       (OrderConfirmed)
                                        └─▶ Shipment SCHEDULED (ShipmentScheduled)
                                              └─▶ Order SHIPPED
PATCH /api/shipments/:id/status  x3   DISPATCHED → IN_TRANSIT → DELIVERED
                                        └─▶ (DeliveryCompleted) ─▶ Order DELIVERED
```

The bus is synchronous and in-process (`src/shared/events/EventBus.ts`). For a POC that's the right trade-off — you get the decoupling in the code without operating a broker. The subscription wiring is three lines in `app.ts`, so replacing it with RabbitMQ/SQS later is an infrastructure change, not a domain change.

### Layering

Each context has the same four slices:

```
contexts/<name>/
├── domain/           # aggregates, VOs, events, repository *interfaces* — pure TS
├── application/      # use cases + event handlers, orchestration only
├── infrastructure/   # TypeORM entities + repository implementations
└── api/              # DTOs, routes — HTTP concerns only
```

Dependency direction: `api → application → domain ← infrastructure`. Controllers do validation and delegate; use cases orchestrate; business rules live in the aggregates. There is no "OrderService" god class — if you're looking for where a rule is enforced, it's on the aggregate.

---

## Key assumptions

Aumptions taken since this is a POC:

- **Customers and products are external.** `customerId`/`productId` are opaque UUIDs — no auth, no catalog, no payments. Confirmation is gated only by inventory.
- **Stock is reserved at confirmation time, all-or-nothing.** If any product in the order lacks stock, nothing is deducted and the order goes to `REJECTED` (with the reason recorded in the response). No partial fulfillment, no backorders.
- **Delivery partner is static** — picked from a hardcoded list, defaults to "SwiftShip Logistics". Delivery date is confirmation + 3 days. Both are trivially configurable in `ScheduleShipmentHandler`.
- **`SHIPPED` on an order means "a shipment exists for it".** The fine-grained tracking status belongs to Shipping and is exposed via the shipment payload on `GET /api/orders/:id`.
- **A rejected order is terminal.** Retry = create a new order. Kept the state machine simple on purpose.
- **`synchronize: true` for schema** in non-production. Real project → migrations. Not the point of this exercise.
- **Consistency across contexts is eventual** (though effectively immediate with the in-process bus). Within an aggregate it's strict — that's the whole reason the boundaries are where they are.

---

## Getting started

You need Node 18+ and a local PostgreSQL.

```bash
npm install
cp .env.example .env                                   # tweak DB creds if yours differ
psql -h localhost -U postgres -c "CREATE DATABASE order_fulfillment;"
npm run dev                                            # or: npm run build && npm start
```

Server defaults to port 3000 (`PORT` env var to change it). Health check on `GET /health`.

---

## API endpoints

Every response uses the same envelope:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": { } } }
```

Domain rule violations come back as `422` with the domain error code (e.g. `INVALID_ORDER_STATUS_TRANSITION`); malformed input is `400 VALIDATION_ERROR` with per-field constraints.

### Inventory (supporting endpoints — you need stock before you can confirm anything)

**`POST /api/inventory`** — create stock for a product, or top up existing stock.

```bash
curl -X POST localhost:3000/api/inventory \
  -H 'Content-Type: application/json' \
  -d '{"productId":"0e63880c-0360-44a9-84c2-da0f60691f31","quantity":10}'
# 201 → { "success": true, "data": { "productId": "...", "stock": 10, "updatedAt": "..." } }
```

**`GET /api/inventory/:productId`** — current stock. `404 INVENTORY_NOT_FOUND` if unseeded.

### Orders

**`POST /api/orders`** — create an order.

```bash
curl -X POST localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "aa3c05c9-e4f8-4ddf-8d4f-fe61cdf77702",
    "items": [{ "productId": "0e63880c-0360-44a9-84c2-da0f60691f31", "quantity": 4 }]
  }'
# 201 → { "success": true, "data": { "orderId": "...", "status": "CREATED" } }
```

Bad input example — `quantity: 0` gets you:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "errors": [ { "property": "items.0.quantity",
      "constraints": { "isPositive": "quantity must be a positive integer" } } ] }
  }
}
```

**`POST /api/orders/:id/confirm`** — runs the inventory check and confirms (or rejects) the order. Confirming also triggers shipment scheduling via the event bus, so by the time you fetch the order it will read `SHIPPED`.

```bash
curl -X POST localhost:3000/api/orders/<orderId>/confirm
# 200 → { "data": { "orderId": "...", "status": "CONFIRMED" } }
# insufficient stock → { "data": { "status": "REJECTED", "rejectionReason": "Insufficient stock for products: ..." } }
# already confirmed  → 422 INVALID_ORDER_STATUS_TRANSITION
# unknown id         → 404 ORDER_NOT_FOUND
```

**`GET /api/orders/:id`** — full order details, shipment included when one exists:

```json
{
  "success": true,
  "data": {
    "orderId": "...", "customerId": "...", "status": "SHIPPED", "createdAt": "...",
    "items": [{ "productId": "...", "quantity": 4 }],
    "shipment": {
      "shipmentId": "...", "status": "SCHEDULED",
      "deliveryDate": "...", "deliveryPartner": "SwiftShip Logistics"
    }
  }
}
```

### Shipments

**`PATCH /api/shipments/:id/status`** — advance the delivery status, one step at a time.

```bash
curl -X PATCH localhost:3000/api/shipments/<shipmentId>/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"DISPATCHED"}'    # then IN_TRANSIT, then DELIVERED
```

Trying to skip a step (or move backwards) returns:

```json
{ "success": false, "error": { "code": "INVALID_SHIPMENT_STATUS_TRANSITION",
  "message": "Invalid shipment status transition from SCHEDULED to DELIVERED" } }
```

The final `DELIVERED` transition also flips the order to `DELIVERED` through the `DeliveryCompleted` event.

**`GET /api/shipments/:id`** — shipment details. `404 SHIPMENT_NOT_FOUND` if missing.

---

## Tests

```bash
npm test                 # 78 tests / 12 suites
npm run test:coverage    # coverage gate at 85% (jest.config.js)
npm run lint
```

The tests follow the assignment's emphasis: business rules first, API responses second.

**Domain tests** are pure — no mocks, no DB, just aggregates being exercised. Samples of what they pin down:

- `Order.spec.ts` — creating an order emits `OrderCreated`; empty item list throws `EMPTY_ORDER`; duplicate products throw; `confirm()` on a confirmed order throws `INVALID_ORDER_STATUS_TRANSITION`; a rejected order can't be revived; `reconstitute` (loading from DB) emits no events.
- `InventoryItem.spec.ts` — deducting more than available throws `INSUFFICIENT_STOCK` *and leaves stock untouched*; deducting to exactly zero is fine; negative/fractional stock can't be constructed.
- `Shipment.spec.ts` — full `SCHEDULED → DISPATCHED → IN_TRANSIT → DELIVERED` walk emits three `ShipmentStatusUpdated` plus one `DeliveryCompleted`; skipping a step throws; past delivery dates are rejected at construction.

**Application-layer tests** mock the repositories and event bus, and each use case covers both the happy path and failure paths:

- `ConfirmOrderUseCase.spec.ts` — confirms and publishes `OrderConfirmed` when stock is available; rejects (and publishes `OrderRejected`) when it isn't; 404 on unknown order; refuses double-confirmation.
- `StockValidationService.spec.ts` — the all-or-nothing behaviour: one unavailable product in a multi-item order means *nothing* gets reserved.
- `ScheduleShipmentHandler.spec.ts` — schedules exactly one shipment per confirmed order; a duplicate `OrderConfirmed` is a no-op (idempotency guard).
- `EventBus.spec.ts` — subscriber ordering, isolation between event types, error propagation from a failing handler.

---

## Things to do next (deliberately out of scope)

- Replace `synchronize` with proper migrations and add a transactional outbox so events and state changes commit atomically.
- Reservation with TTL instead of immediate deduction (currently a rejected shipment never returns stock — acceptable here, not in production).
- Optimistic locking on `InventoryItem` for concurrent confirmations against the same product.
- An integration test suite against a throwaway Postgres (testcontainers) covering the create→confirm→deliver flow end to end.
