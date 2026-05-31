# Product Hierarchy

What we are actually building — a Restaurant SaaS Platform with multiple product layers.

> This document defines the complete product structure so every module we build has a clear place in the hierarchy.

---

## The Full Product

```
Restaurant SaaS Platform
│
├── Core ERP
│   ├── Inventory Management
│   │   ├── Raw material tracking
│   │   ├── Batch & expiry management
│   │   └── Wastage reports
│   │
│   ├── Procurement
│   │   ├── Supplier management
│   │   └── Purchase order workflow
│   │
│   ├── Employee Management
│   │   ├── Staff profiles & onboarding
│   │   ├── Attendance (QR / biometric)
│   │   ├── Shift management
│   │   └── Leave management
│   │
│   └── Payroll
│       ├── Salary generation
│       ├── Incentives & bonuses
│       └── Payslip generation
│
│
├── Restaurant Operations
│   ├── POS System
│   │   ├── Walk-in billing
│   │   ├── Table management
│   │   ├── QR self-ordering
│   │   ├── Split bill
│   │   └── GST invoice printing
│   │
│   ├── Kitchen Management
│   │   ├── Kitchen Order Tickets (KOT)
│   │   ├── Kitchen display screen
│   │   └── Order queue management
│   │
│   └── Menu Management
│       ├── Categories & items
│       ├── Item variants & add-ons
│       ├── Real-time availability
│       └── Multi-branch menu sync
│
│
├── Online Ordering
│   ├── Customer Website
│   │   ├── Dynamic menu
│   │   ├── Cart & checkout
│   │   └── Order scheduling
│   │
│   ├── Mobile App (Customer)
│   │   ├── Same as website
│   │   └── Push notifications
│   │
│   └── Customer Portal
│       ├── Order history
│       ├── Live order tracking
│       ├── Reviews & ratings
│       └── Loyalty points
│
│
├── Delivery Management
│   ├── Delivery agent management
│   ├── Order assignment
│   ├── Live GPS tracking
│   └── Delivery performance reports
│
│
├── Payments & Finance
│   ├── Payment gateway (UPI, card, wallet, COD)
│   ├── GST invoice generation
│   ├── Refund management
│   ├── Settlement reconciliation
│   └── Expense tracking
│
│
├── Promotions & Loyalty
│   ├── Coupon engine
│   ├── Flash sales
│   ├── Combo & bundle deals
│   ├── Loyalty points program
│   └── Customer segmentation
│
│
├── Multi-Branch & Franchise Management
│   ├── Branch dashboard
│   ├── Cross-branch inventory transfers
│   ├── Franchise fee & royalty management
│   └── Centralized brand management
│
│
├── Third-Party Integrations
│   ├── Swiggy integration
│   ├── Zomato integration
│   ├── Zepto integration
│   ├── Uber Eats integration
│   └── Unified aggregator dashboard
│
│
├── Analytics & Reporting
│   ├── Sales analytics
│   ├── Customer behavior analytics
│   ├── Inventory reports
│   ├── Employee productivity
│   ├── P&L statements
│   └── Branch performance comparisons
│
│
├── Compliance & Legal
│   ├── GST compliance & filing support
│   ├── FSSAI documentation
│   ├── Audit logs
│   └── GDPR data management
│
│
├── Notifications
│   ├── SMS
│   ├── Email
│   ├── Push notifications
│   └── WhatsApp
│
│
└── AI Layer (Future)
    ├── Demand forecasting
    ├── Smart inventory prediction
    ├── Dynamic pricing recommendations
    ├── AI chatbot support
    └── Customer personalization
```

---

## Module → Product Area Mapping

| NestJS Module | Product Area |
|---------------|-------------|
| `auth` | Platform-wide authentication |
| `users` | Platform-wide user management |
| `restaurants` | Restaurant profiles |
| `restaurants/branches` | Multi-Branch Management |
| `menu` | Restaurant Operations — Menu |
| `orders` | Online Ordering + POS |
| `orders/kitchen` | Restaurant Operations — Kitchen |
| `pos` | Restaurant Operations — POS |
| `payments` | Payments & Finance |
| `inventory` | Core ERP — Inventory |
| `inventory/procurement` | Core ERP — Procurement |
| `inventory/suppliers` | Core ERP — Procurement |
| `employees` | Core ERP — Employee Management |
| `employees/attendance` | Core ERP — Employee Management |
| `employees/payroll` | Core ERP — Payroll |
| `delivery` | Delivery Management |
| `promotions` | Promotions & Loyalty |
| `notifications` | Notifications |
| `aggregators` | Third-Party Integrations |
| `analytics` | Analytics & Reporting |
| `compliance` | Compliance & Legal |

---

## The 7 Things to Complete Before Building Each Major Feature

This advice applies before starting each new module:

1. **Domain/module breakdown** — What entities does this module own? What does it NOT own?
2. **PostgreSQL ER diagram** — Draw the tables and relationships for this module before writing code
3. **Module dependency diagram** — What other modules does this depend on? What events does it emit?
4. **API contract design** — Define all endpoints: method, URL, request body, response shape
5. **Docker dev setup** — Is the infrastructure ready? (ours is — PostgreSQL + Redis already running)
6. **RBAC design** — Which roles can access which endpoints in this module?
7. **Multi-tenant strategy** — Does this data belong to a restaurant? A branch? The platform?

---

## Multi-Tenant Strategy

This platform supports multiple restaurants (tenants). Every piece of data has a clear ownership:

| Data | Belongs to |
|------|-----------|
| Users (staff) | Restaurant |
| Users (customers) | Platform (shared across restaurants) |
| Menu items | Branch (with restaurant-level templates) |
| Orders | Branch |
| Inventory | Branch |
| Employees | Restaurant (with branch assignment) |
| Reports | Restaurant or Branch |
| Platform config | Super Admin only |

**How tenancy is enforced:** Every API request by a non-customer user includes their `restaurantId` and `branchId` from the JWT token. Services always filter by these IDs — a branch manager at Restaurant A can never see Restaurant B's data.
