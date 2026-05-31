# Queue Design — BullMQ

How background jobs are designed and processed in this system.

> **Decision:** Use BullMQ backed by Redis.  
> No RabbitMQ. No Kafka. These will be introduced only when BullMQ becomes a bottleneck.  
> See `docs/adr/ADR-003-bullmq-over-rabbitmq.md` for reasoning.

---

## Why Background Jobs at All?

Certain operations must NOT block the HTTP response:
- Sending an email after registration should not make the user wait
- Generating a PDF invoice should not block the order confirmation response
- Running daily analytics is a background task, not a user request

These go into a **queue**. The HTTP handler adds a job to the queue and responds immediately. A separate **worker** processes the job asynchronously.

---

## Queue Architecture

```
HTTP Request
     ↓
Controller adds job to queue
     ↓
Returns HTTP response immediately (fast)
     ↓                              ↓
BullMQ Queue (Redis)          User gets response
     ↓
Worker processes job
     ↓
Job complete (email sent, PDF generated, etc.)
```

---

## Queues and Their Jobs

### Queue 1 — `notifications`
Handles all outbound communication.

| Job | Trigger | What it does |
|-----|---------|-------------|
| `send-email` | Registration, order confirmation, invoice, reset password | Sends email via SMTP/SendGrid |
| `send-sms` | OTP, order updates, delivery alerts | Sends SMS via Twilio/MSG91 |
| `send-whatsapp` | Order confirmation, delivery tracking link | Sends WhatsApp message via Twilio/WATI |
| `send-push` | New order, order ready, promo | Sends FCM/APNs push notification |

---

### Queue 2 — `documents`
Handles file generation.

| Job | Trigger | What it does |
|-----|---------|-------------|
| `generate-invoice-pdf` | Order placed / payment complete | Generates GST invoice PDF, stores in S3 |
| `generate-report-pdf` | Manager requests report | Generates sales/inventory report PDF |

---

### Queue 3 — `analytics`
Handles scheduled and triggered analytics computation.

| Job | Trigger | What it does |
|-----|---------|-------------|
| `daily-analytics` | Cron — midnight every day | Aggregates yesterday's sales, orders, waste data |
| `update-branch-dashboard` | Order placed / order completed | Refreshes branch KPI cache in Redis |

---

### Queue 4 — `inventory`
Handles inventory operations that run in the background.

| Job | Trigger | What it does |
|-----|---------|-------------|
| `inventory-reconciliation` | Cron — end of day | Compares physical vs digital stock counts |
| `low-stock-alert` | Stock drops below threshold | Triggers notification to branch manager |
| `auto-purchase-order` | Stock critically low | Creates draft purchase order for supplier |

---

## Job Retry Strategy

```
Attempt 1  → immediate
Attempt 2  → 5 seconds later
Attempt 3  → 30 seconds later
Attempt 4  → 2 minutes later
After 4 failures → move to Dead Letter Queue (failed jobs)
```

All failed jobs are stored in Redis and can be retried manually via BullMQ's built-in dashboard (Bull Board).

---

## Bull Board (Queue Dashboard)

BullMQ has a built-in UI called **Bull Board** that shows:
- All queues and their status
- Pending, active, completed, failed jobs
- Retry failed jobs manually
- View job payloads and error messages

Available at: `http://localhost:3000/api/queues` (development only)

---

## Folder Structure

```
src/
├── infrastructure/
│   └── queue/
│       └── queue.module.ts        ← registers all queues with BullMQ
│
└── modules/
    ├── notifications/
    │   └── processors/
    │       └── notification.processor.ts   ← handles notification queue jobs
    ├── analytics/
    │   └── processors/
    │       └── analytics.processor.ts
    └── inventory/
        └── processors/
            └── inventory.processor.ts
```

---

## How to Add a New Job (Pattern)

**1. Add the job to a queue (in a service):**
```typescript
await this.notificationQueue.add('send-email', {
  to: user.email,
  subject: 'Order Confirmed',
  template: 'order-confirmation',
  data: { orderId, userName },
});
```

**2. Process the job (in a processor):**
```typescript
@Processor('notifications')
export class NotificationProcessor {
  @Process('send-email')
  async handleSendEmail(job: Job) {
    const { to, subject, template, data } = job.data;
    await this.emailService.send(to, subject, template, data);
  }
}
```

---

## Evolution Path

| Phase | Queue System | When |
|-------|-------------|------|
| V1 (Now) | BullMQ + Redis | Single server, up to ~10k orders/day |
| V2 | BullMQ with Redis Cluster | Scaling Redis for high throughput |
| V3 | RabbitMQ | When multiple services need to consume same events |
| V4 | Kafka | When millions of events/sec across many services |
