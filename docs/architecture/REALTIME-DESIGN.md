# Real-Time Architecture — Socket.IO

How real-time features work in this system: kitchen screens, order tracking, delivery tracking.

> **Decision:** Use Socket.IO via `@nestjs/websockets`.  
> See `docs/adr/ADR-004-socketio-for-realtime.md` for reasoning.

---

## Why Real-Time?

Some operations require the UI to update instantly without the user refreshing:

| Feature | Without Real-Time | With Real-Time |
|---------|-----------------|----------------|
| Kitchen screen | Staff refreshes page to see new orders | New order appears instantly |
| Customer order tracking | Customer polls every 5 seconds | Status updates push to customer |
| Delivery tracking | Rider location updates every refresh | Live map with moving pin |
| Branch dashboard | Manager refreshes for new stats | Stats update live |

---

## Real-Time Event Flows

### Flow 1 — Order Created → Kitchen Screen Updates

```
Customer places order
        ↓
OrderService.create()
        ↓
Emit socket event: 'order.new'
        ↓
Kitchen display screen (connected via Socket.IO)
receives event and shows new ticket instantly
```

### Flow 2 — Order Ready → Customer Notified

```
Kitchen staff marks order as ready
        ↓
OrderService.markReady()
        ↓
Emit socket event: 'order.ready'
        ↓
Customer's app/browser receives event
Shows "Your order is ready!" notification
```

### Flow 3 — Delivery Assigned → Driver + Customer Both Update

```
Delivery assigned to driver
        ↓
DeliveryService.assign()
        ↓
Emit socket event: 'delivery.assigned'
        ↓
├── Driver app receives event
│   Shows order details and pickup location
│
└── Customer app receives event
    Shows "Driver on the way" + driver name
```

### Flow 4 — Driver Location Updates

```
Driver app sends location every 10 seconds
        ↓
Socket event: 'delivery.location.update'
        ↓
Customer's map updates with driver's current position
```

---

## Socket.IO Room Strategy

Rooms allow broadcasting to specific groups of connected clients.

| Room Name | Who joins | What events they receive |
|-----------|-----------|------------------------|
| `branch:{branchId}` | All staff at a branch (kitchen, cashier, manager) | New orders, stock alerts, table updates |
| `kitchen:{branchId}` | Kitchen display screens | New tickets, order updates, cancellations |
| `order:{orderId}` | Customer who placed the order | Status changes, estimated time, driver location |
| `delivery:{deliveryId}` | Driver + Customer | Location updates, pickup/dropoff confirmations |
| `restaurant:{restaurantId}` | Restaurant owner, all branch managers | Cross-branch alerts, critical notifications |

---

## Authentication for Sockets

Every Socket.IO connection must be authenticated with the same JWT used for REST APIs:

```
Client connects with: { auth: { token: "Bearer eyJhbGci..." } }
        ↓
Socket middleware validates JWT
        ↓
If valid → connection accepted, user attached to socket
If invalid → connection rejected with 401
```

---

## Namespace Design

```
/                   ← default namespace (general)
/kitchen            ← kitchen display screens
/delivery           ← delivery tracking
/analytics          ← live dashboard updates (owner/manager)
```

---

## Folder Structure

```
src/
└── modules/
    ├── orders/
    │   └── gateways/
    │       └── orders.gateway.ts    ← handles order real-time events
    ├── kitchen/
    │   └── gateways/
    │       └── kitchen.gateway.ts   ← kitchen display screen events
    └── delivery/
        └── gateways/
            └── delivery.gateway.ts  ← delivery tracking events
```

---

## Event Naming Convention

All socket events follow the pattern: `{domain}.{action}`

```
order.new               ← new order placed
order.updated           ← order status changed
order.ready             ← food ready for pickup/delivery
order.cancelled         ← order cancelled

kitchen.ticket.new      ← new KOT received
kitchen.ticket.updated  ← ticket status changed

delivery.assigned       ← delivery assigned to driver
delivery.picked_up      ← driver picked up the order
delivery.location       ← driver location update
delivery.delivered      ← order delivered

table.occupied          ← table marked as occupied
table.available         ← table cleared
```

---

## Scaling Consideration

When running multiple server instances (horizontal scaling), Socket.IO needs a shared adapter so all instances share the same rooms/connections.

**Solution:** `@socket.io/redis-adapter` — uses Redis as a pub/sub backbone between instances.

```
Instance 1 ──┐
Instance 2 ──┼── Redis (pub/sub) ── All instances share rooms
Instance 3 ──┘
```

This is already planned — our Redis is running in Docker from day one.
