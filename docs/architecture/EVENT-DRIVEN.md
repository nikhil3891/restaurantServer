# Event-Driven Internal Communication

How modules communicate with each other inside the Modular Monolith without tight coupling.

> **Decision:** Use NestJS `EventEmitter2` for internal module-to-module communication.  
> This is not a message broker — it is in-process event emitting.  
> See `docs/adr/ADR-005-nestjs-eventemitter-for-internal-events.md`

---

## The Problem This Solves

Without events, modules become tightly coupled:

```typescript
// ❌ BAD — OrderService knows about and directly calls 3 other services
class OrderService {
  constructor(
    private inventoryService: InventoryService,   // tight coupling
    private notificationService: NotificationService,  // tight coupling
    private analyticsService: AnalyticsService,   // tight coupling
  ) {}

  async createOrder(dto) {
    const order = await this.saveOrder(dto);
    await this.inventoryService.deductStock(order);       // synchronous
    await this.notificationService.sendConfirmation(order); // synchronous
    await this.analyticsService.recordOrder(order);        // synchronous
    return order;
  }
}
```

Problems:
- If `AnalyticsService` is slow, the customer's order confirmation is delayed
- If `NotificationService` throws, the order fails even though it was saved
- Adding a new side effect (e.g. loyalty points) requires changing `OrderService`
- Cannot extract any of these to microservices without a big refactor

---

## With Events — Clean and Decoupled

```typescript
// ✅ GOOD — OrderService only does its own job and emits an event
class OrderService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createOrder(dto) {
    const order = await this.saveOrder(dto);
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(order));
    return order;  // responds immediately, no waiting for side effects
  }
}
```

```typescript
// Each listener handles its own concern independently
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  await this.deductStock(event.order);  // InventoryService
}

@OnEvent('order.created')
async sendConfirmation(event: OrderCreatedEvent) {
  await this.sendEmail(event.order);    // NotificationService
}

@OnEvent('order.created')
async recordAnalytics(event: OrderCreatedEvent) {
  await this.recordOrder(event.order);  // AnalyticsService
}
```

---

## All Domain Events in This System

### Order Events
| Event | Emitted by | Listeners |
|-------|-----------|-----------|
| `order.created` | OrdersService | Inventory (deduct stock), Notifications (confirm), Analytics (record), Kitchen (new ticket) |
| `order.status.updated` | OrdersService | Notifications (status update), Analytics (record) |
| `order.cancelled` | OrdersService | Inventory (restore stock), Notifications (cancellation), Analytics (record) |
| `order.completed` | OrdersService | Analytics (record revenue), Loyalty (award points) |

### Payment Events
| Event | Emitted by | Listeners |
|-------|-----------|-----------|
| `payment.completed` | PaymentsService | Orders (mark paid), Notifications (receipt), Documents (generate invoice PDF) |
| `payment.failed` | PaymentsService | Orders (mark failed), Notifications (payment failed alert) |
| `payment.refunded` | PaymentsService | Orders (update status), Notifications (refund confirmation) |

### Inventory Events
| Event | Emitted by | Listeners |
|-------|-----------|-----------|
| `inventory.low_stock` | InventoryService | Notifications (alert manager), Queue (auto-purchase-order job) |
| `inventory.out_of_stock` | InventoryService | Menu (mark item unavailable), Notifications (urgent alert) |

### User Events
| Event | Emitted by | Listeners |
|-------|-----------|-----------|
| `user.registered` | AuthService | Notifications (welcome email), Loyalty (create loyalty account) |

### Delivery Events
| Event | Emitted by | Listeners |
|-------|-----------|-----------|
| `delivery.assigned` | DeliveryService | Notifications (driver assigned), Realtime (push to customer socket) |
| `delivery.delivered` | DeliveryService | Orders (mark delivered), Notifications (delivery confirmation), Analytics (record) |

---

## Event Class Pattern

Every event is a typed class — not a plain object:

```typescript
// src/modules/orders/events/order-created.event.ts
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly branchId: string,
    public readonly restaurantId: string,
    public readonly items: OrderItem[],
    public readonly total: number,
    public readonly customerId: string,
  ) {}
}
```

This gives full type safety to all listeners.

---

## Folder Structure

```
src/
└── modules/
    └── orders/
        ├── events/
        │   ├── order-created.event.ts
        │   ├── order-status-updated.event.ts
        │   └── order-cancelled.event.ts
        └── listeners/
            └── order.listener.ts      ← listens to events from OTHER modules
```

Each module:
- Owns its **events** (what it emits)
- Owns its **listeners** (what it reacts to from other modules)

---

## Migration Path to Message Broker

When extracting `NotificationService` to a microservice (Version 2), the `@OnEvent` decorator is simply replaced with a message queue consumer:

```typescript
// Before (in-process EventEmitter)
@OnEvent('order.created')
async sendConfirmation(event: OrderCreatedEvent) { ... }

// After (BullMQ consumer in separate service)
@Process('send-order-confirmation')
async sendConfirmation(job: Job<OrderCreatedEvent>) { ... }
```

The event payload shape stays the same — only the transport layer changes.
