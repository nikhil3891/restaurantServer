# Database ER Design Guide

The approach for designing PostgreSQL schemas before writing any module code.

> **Rule:** Design the ER diagram BEFORE writing any NestJS code for a module.  
> A bad schema is extremely expensive to change after the system has real data.

---

## The 7 Pre-Coding Checklist (For Every New Module)

Before writing a single line of NestJS service or controller code:

- [ ] **1. Domain/module breakdown** — What entities does this module own? What entities belong to other modules that this one references?
- [ ] **2. PostgreSQL ER diagram** — Draw all tables, columns, data types, and relationships
- [ ] **3. Module dependency diagram** — Which modules does this depend on? What events does it emit and consume?
- [ ] **4. API contract design** — Define every endpoint: HTTP method, URL, request body schema, response schema, auth requirements
- [ ] **5. Docker dev setup** — Is infrastructure ready? (PostgreSQL + Redis must be running)
- [ ] **6. RBAC design** — Which `UserRole` values can access each endpoint?
- [ ] **7. Multi-tenant strategy** — Does this data belong to a restaurant, a branch, or the platform? How is it filtered?

---

## Module Build Order (Prioritized by Dependencies)

Build in this order — each module depends on the ones above it:

```
1. auth          ← no dependencies
2. users         ← depends on auth
3. restaurants   ← depends on users
4. branches      ← depends on restaurants
5. menu          ← depends on branches
6. inventory     ← depends on branches
7. procurement   ← depends on inventory + suppliers
8. suppliers     ← depends on restaurants
9. employees     ← depends on branches
10. attendance   ← depends on employees
11. payroll      ← depends on employees + attendance
12. pos          ← depends on menu + branches
13. orders       ← depends on menu + pos + customers
14. kitchen      ← depends on orders
15. payments     ← depends on orders
16. delivery     ← depends on orders + employees
17. promotions   ← depends on menu + orders
18. notifications← depends on all (event-driven, no hard deps)
19. analytics    ← depends on all (read-only, no hard deps)
20. aggregators  ← depends on menu + orders
21. compliance   ← depends on all (audit logs)
```

---

## Current Schema Status

| Module | Tables in DB | Status |
|--------|-------------|--------|
| auth | `refresh_tokens` | ✅ Done |
| users | `users` | ✅ Done |
| restaurants | — | 🔜 Next |
| branches | — | 🔜 Next |
| menu | — | Pending |
| inventory | — | Pending |
| All others | — | Pending |

---

## Schema Design Principles

### 1. Always use UUID primary keys
```sql
id TEXT PRIMARY KEY DEFAULT gen_random_uuid()
```
Why: UUIDs are safe to expose in URLs, prevent enumeration attacks, work across distributed systems.

### 2. Always add createdAt and updatedAt
```sql
createdAt TIMESTAMP DEFAULT NOW()
updatedAt TIMESTAMP -- updated by application
```

### 3. Soft deletes over hard deletes
```sql
isActive  BOOLEAN DEFAULT true
deletedAt TIMESTAMP NULL       -- null = not deleted
```
Why: Business data should never be permanently deleted. Orders, invoices, and employees need historical records.

### 4. Every table that belongs to a restaurant/branch must have the tenancy columns
```sql
restaurantId TEXT NOT NULL REFERENCES restaurants(id)
branchId     TEXT          REFERENCES branches(id)  -- nullable for restaurant-level data
```

### 5. Index foreign keys and frequently queried columns
```sql
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_users_email ON users(email);
```

### 6. Use PostgreSQL enums for status fields
```sql
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
```
Why: Enforces valid values at the database level, not just application level.

---

## Tables Planned (High Level)

### Auth & Users
| Table | Key Columns |
|-------|------------|
| `users` | id, email, password, role, restaurantId, branchId |
| `refresh_tokens` | id, token, userId, expiresAt, isRevoked |

### Restaurants & Branches
| Table | Key Columns |
|-------|------------|
| `restaurants` | id, name, ownerId, gstin, fssaiNumber, isActive |
| `branches` | id, restaurantId, name, address, phone, isActive |

### Menu
| Table | Key Columns |
|-------|------------|
| `menu_categories` | id, restaurantId, name, sortOrder |
| `menu_items` | id, restaurantId, categoryId, name, price, isAvailable |
| `menu_variants` | id, menuItemId, name, price |
| `menu_addons` | id, menuItemId, name, price |

### Orders
| Table | Key Columns |
|-------|------------|
| `orders` | id, branchId, customerId, status, total, type (dine_in/takeaway/delivery) |
| `order_items` | id, orderId, menuItemId, quantity, price |
| `kitchen_tickets` | id, orderId, branchId, status, printedAt |

### Inventory
| Table | Key Columns |
|-------|------------|
| `inventory_items` | id, branchId, name, unit, currentStock, minStock |
| `stock_movements` | id, itemId, branchId, type (in/out/waste), quantity, reason |
| `suppliers` | id, restaurantId, name, contact, items |
| `purchase_orders` | id, branchId, supplierId, status, total |

### Employees
| Table | Key Columns |
|-------|------------|
| `employees` | id, restaurantId, branchId, userId, designation, salary |
| `attendance_records` | id, employeeId, date, checkIn, checkOut, status |
| `payroll_records` | id, employeeId, month, basicSalary, deductions, netSalary |

### Payments
| Table | Key Columns |
|-------|------------|
| `payments` | id, orderId, amount, method, status, gatewayRef |
| `invoices` | id, orderId, invoiceNumber, gstAmount, total, pdfUrl |
| `refunds` | id, paymentId, amount, reason, status |

---

## ER Diagrams

Detailed ER diagrams will be created per module before each module's development begins and saved in this folder.

- `ER-AUTH.md` — auth + users (done, simple)
- `ER-RESTAURANT.md` — restaurants + branches (next to create)
- `ER-MENU.md` — menu categories, items, variants, addons
- `ER-ORDERS.md` — orders, order items, kitchen tickets
- `ER-INVENTORY.md` — inventory, stock movements, suppliers, purchase orders
- `ER-EMPLOYEES.md` — employees, attendance, payroll
- `ER-PAYMENTS.md` — payments, invoices, refunds
