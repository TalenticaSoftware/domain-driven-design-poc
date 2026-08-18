# Order Fulfillment & Delivery Scheduling System — DDD POC

A backend system for an e-commerce logistics platform that manages the order lifecycle from placement to delivery, built with **Domain-Driven Design** principles using Node.js, TypeScript, Express, TypeORM, and PostgreSQL.

## Table of Contents

- [Domain Design Decisions](#domain-design-decisions)
- [Bounded Contexts](#bounded-contexts)
- [Architecture & Layering](#architecture--layering)
- [Domain Events & Flow](#domain-events--flow)
- [Key Assumptions](#key-assumptions)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing](#testing)

## Domain Design Decisions

### Aggregates, Entities & Value Objects

| Context | Aggregate Root | Internal Entities | Value Objects |
|---|---|---|---|
| Ordering | `Order` | `OrderItem` | `OrderId`, `OrderStatus`, `Quantity`, `ProductId` |
| Inventory | `InventoryItem` | — | `ProductId`, `StockLevel` |
| Shipping | `Shipment` | — | `ShipmentId`, `ShipmentStatus`, `DeliveryDate`, `DeliveryPartner` |

**Why these boundaries?**

- **`Order` + `OrderItem`**: order items have no meaning outside their order and must be consistent with it (an order must have ≥1 item, no duplicate products). They change together, so they form one aggregate. `OrderItem` is an entity local to the aggregate — never accessed from outside.
- **`InventoryItem`**: keyed by `ProductId`, holds a single invariant — *stock can never go negative*. Kept deliberately small so stock checks/deductions don't contend with unrelated data.
- **`Shipment`**: references its order only by ID (`orderId: string`), never by object reference — aggregates reference other aggregates by identity only.

**Invariants enforced inside the domain (not in services/controllers):**

- `Order`: ≥1 item, positive integer quantities, no duplicate products, and a strict state machine `CREATED → CONFIRMED|REJECTED`, `CONFIRMED → SHIPPED → DELIVERED` (enforced by `OrderStatus.transitionTo`)
- `StockLevel`: non-negative integer; `deduct` throws `INSUFFICIENT_STOCK` before ever going negative
- `Shipment`: forward-only state machine `SCHEDULED → DISPATCHED → IN_TRANSIT → DELIVERED`; delivery date must be in the future when scheduling

**Value objects are immutable** — every "mutation" (e.g. `StockLevel.deduct`) returns a new instance; aggregate state is replaced, never mutated in place.

## Bounded Contexts

```
┌─────────────────┐      OrderConfirmed       ┌─────────────────┐
│    Ordering     │ ────────────────────────▶ │    Shipping     │
│  (order         │ ◀──────────────────────── │  (shipment      │
│   lifecycle)    │  ShipmentScheduled /      │   lifecycle)    │
└───────┬─────────┘  DeliveryCompleted        └─────────────────┘
        │
        │ StockValidator port (interface owned by Ordering)
        ▼
┌─────────────────┐
│    Inventory    │
│  (stock levels) │
└─────────────────┘
```

- **Ordering** — owns the order lifecycle and its business rules.
- **Inventory** — owns stock levels and the "never oversell" rule.
- **Shipping** — owns shipment scheduling and delivery-tracking progress.

**Context communication:**

- *Ordering → Inventory*: via the `StockValidator` **port** (interface defined in Ordering's application layer, implemented by Inventory's `StockValidationService`). Ordering never imports Inventory's domain — it only knows "is stock available and reserved, yes/no".
- *Ordering ↔ Shipping*: fully decoupled through **domain events** on an in-process event bus. Confirming an order publishes `OrderConfirmed`; Shipping reacts by scheduling a shipment. Delivery completion publishes `DeliveryCompleted`; Ordering reacts by marking the order delivered.

## Architecture & Layering

```
src/
├── shared/                  # shared kernel
│   ├── domain/              # AggregateRoot, EntityId, ValueObject, DomainEvent, ProductId
│   ├── events/              # InProcessEventBus (publish/subscribe)
│   ├── errors/              # DomainError, CustomHttpException
│   ├── api/                 # validation + error middleware, response envelope
│   └── infrastructure/      # TypeORM data source, config, logger
├── contexts/
│   ├── ordering/
│   │   ├── domain/          # Order aggregate, OrderItem, VOs, events, OrderRepository (interface)
│   │   ├── application/     # CreateOrder, ConfirmOrder, GetOrder use cases, event handlers, ports
│   │   ├── infrastructure/  # OrderEntity (TypeORM), TypeOrmOrderRepository + mapping
│   │   └── api/             # DTOs, routes
│   ├── inventory/           # same 4-layer split
│   └── shipping/            # same 4-layer split
├── app.ts                   # composition root: wiring, DI, event subscriptions
└── main.ts                  # bootstrap (DB init + HTTP listen)
```

**Dependency rule:** `api → application → domain ← infrastructure`

- The **domain layer has zero framework imports** — no Express, no TypeORM.
- **Persistence models are separate classes** (`OrderEntity`, `InventoryEntity`, `ShipmentEntity`) mapped to/from domain aggregates inside repository implementations. The domain was designed first; tables are just a mapping of it.
- **Repositories** are interfaces owned by the domain; TypeORM implementations live in infrastructure and are injected at the composition root (`app.ts`).

## Domain Events & Flow

| Event | Published by | Handled by |
|---|---|---|
| `OrderCreated` | `Order.create` | — (available for extension) |
| `OrderConfirmed` | `Order.confirm` | Shipping → schedules shipment |
| `OrderRejected` | `Order.reject` | — (available for extension) |
| `ShipmentScheduled` | `Shipment.schedule` | Ordering → marks order `SHIPPED` |
| `ShipmentStatusUpdated` | `Shipment.advanceTo` | — (available for extension) |
| `DeliveryCompleted` | `Shipment.advanceTo(DELIVERED)` | Ordering → marks order `DELIVERED` |

Happy-path flow:

```
POST /api/orders                 → Order CREATED            (OrderCreated)
POST /api/orders/:id/confirm     → stock validated+reserved → Order CONFIRMED (OrderConfirmed)
                                 → shipment auto-scheduled  (ShipmentScheduled) → Order SHIPPED
PATCH /api/shipments/:id/status  → DISPATCHED → IN_TRANSIT → DELIVERED (DeliveryCompleted)
                                 → Order DELIVERED
```

## Key Assumptions

- **Customers/products are external**: `customerId` and `productId` are accepted as opaque UUIDs; no auth, catalog, or payment flows (out of scope per assignment).
- **Delivery partner is static**: assigned from a fixed list (`SwiftShip Logistics` by default); delivery date = confirmation time + 3 days (configurable in `ScheduleShipmentHandler`).
- **Stock is reserved (deducted) at confirmation time**, all-or-nothing: if any product lacks stock, nothing is deducted and the order is `REJECTED`.
- **`SHIPPED` order status** means "a shipment has been scheduled for the order" — the shipment's own granular status lives in the Shipping context.
- **Eventual consistency across contexts** via in-process, synchronous event handling. In production this bus could be swapped for a message broker without touching the domain.
- **Schema sync**: TypeORM `synchronize: true` is used for the POC (disabled for production); migrations would replace it in a real system.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL running locally

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env          # adjust DB credentials if needed

# 3. Create the database
psql -h localhost -U postgres -c "CREATE DATABASE order_fulfillment;"

# 4. Run
npm run dev                   # development (auto-reload)
npm run build && npm start    # production build
```

## API Documentation

All responses use the envelope `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message", "details?" } }`.

### Inventory

#### `POST /api/inventory` — seed / add stock

```json
{ "productId": "0e63880c-0360-44a9-84c2-da0f60691f31", "quantity": 10 }
```

`201` → `{ "success": true, "data": { "productId": "...", "stock": 10, "updatedAt": "..." } }`

#### `GET /api/inventory/:productId` — view stock

`200` → stock details · `404 INVENTORY_NOT_FOUND`

### Orders

#### `POST /api/orders` — create order

```json
{
  "customerId": "aa3c05c9-e4f8-4ddf-8d4f-fe61cdf77702",
  "items": [{ "productId": "0e63880c-0360-44a9-84c2-da0f60691f31", "quantity": 4 }]
}
```

`201` → `{ "success": true, "data": { "orderId": "...", "status": "CREATED" } }`

Invalid example (`quantity: 0`) → `400 VALIDATION_ERROR` with per-property constraint details.

#### `POST /api/orders/:id/confirm` — validate inventory & confirm

`200` → `{ "data": { "orderId": "...", "status": "CONFIRMED" } }`
Insufficient stock → `200` with `{ "status": "REJECTED", "rejectionReason": "Insufficient stock for products: ..." }`
Already confirmed → `422 INVALID_ORDER_STATUS_TRANSITION` · Unknown ID → `404 ORDER_NOT_FOUND`

#### `GET /api/orders/:id` — order details (includes shipment, if any)

`200` →

```json
{
  "success": true,
  "data": {
    "orderId": "...", "customerId": "...", "status": "SHIPPED", "createdAt": "...",
    "items": [{ "productId": "...", "quantity": 4 }],
    "shipment": { "shipmentId": "...", "status": "SCHEDULED", "deliveryDate": "...", "deliveryPartner": "SwiftShip Logistics" }
  }
}
```

### Shipments

#### `PATCH /api/shipments/:id/status` — advance delivery status

```json
{ "status": "DISPATCHED" }
```

Valid statuses: `DISPATCHED`, `IN_TRANSIT`, `DELIVERED` (must follow `SCHEDULED → DISPATCHED → IN_TRANSIT → DELIVERED`).
Skipping/reversing a step → `422 INVALID_SHIPMENT_STATUS_TRANSITION`

#### `GET /api/shipments/:id` — shipment details

`200` → shipment details · `404 SHIPMENT_NOT_FOUND`

## Testing

```bash
npm test                # run all tests
npm run test:coverage   # with coverage (85% threshold enforced)
npm run lint            # ESLint
```

- **Domain tests** (`Order.spec.ts`, `InventoryItem.spec.ts`, `Shipment.spec.ts`): pure unit tests of business rules — state machines, invariants, event emission. No mocks needed.
- **Application tests** (use cases + event handlers): repositories and the event bus are mocked; each use case covers happy and error paths.
- 78 tests across 12 suites; coverage focused on domain + application layers.
