# RBAC Phase 2 - Plywood Production Management

## Domain Model

### Product Catalog (Owner-configurable)
- **Categories**: Packing, Semi, Alternate (company can add/remove)
- **Thicknesses**: 3mm to 24mm (company can configure active ones)
- **Sizes**: 8×4, 8×3, 7×4, 7×3, 6.25×4, 6.25×3, 6×4, 6×3, 6×2.5, 5×4, 5×3
- Each company can customize which products they manufacture

### Order Management (Manager)
- Create/Update/Delete orders received by the company
- Each order has items: category + thickness + size + quantity
- Customization options per item:
  - Layers (e.g., 10mm can be 5-layer or 7-layer)
  - Brand Seal (Yes/No)
  - Varnish (Yes/No)
- Order updates trigger high-priority notifications to Supervisors + Operators

### Production Planning (Supervisor)
- Check inventory against orders
- Create production lists (what to produce in the press)
- Production list triggers high-priority alerts to:
  1. Peeling Operator → prepare raw wood
  2. Dryer Operator → dry material for Hot Press
  3. Hot Press Operator → plywood production
  4. Finishing Operator → final finishing

### Notification System
- High-priority alerts for order changes
- Production list notifications to specific operator sections
- Bell icon with unread count in sidebar
- Mobile-optimized notification cards

## UI Principles
- **Mobile-first**: All UIs designed for phone screens first
- **Button-heavy**: Large tap targets, grid selections
- **Minimal typing**: Tap to select category, thickness, size
- **No dropdowns**: Use button grids for selection
- **Quick actions**: One-tap common operations

## Implementation Steps

### Step 1: Schema Updates
- PlywoodCategory, PlywoodThickness, PlywoodSize models
- Order + OrderItem models with customization fields
- ProductionList + ProductionListItem models
- Notification model
- Enums: OrderStatus, Priority, ProductionStatus

### Step 2: APIs
- /api/catalog/* - CRUD for categories, thicknesses, sizes
- /api/orders/* - CRUD for orders + items
- /api/production-lists/* - CRUD for production lists
- /api/notifications/* - Read, mark as read, create

### Step 3: Owner UI - Product Catalog Management
- Button-grid based category/thickness/size management
- Toggle active/inactive products

### Step 4: Manager UI - Order Management
- Tap-to-select order creation (category → thickness → size → quantity)
- Customization toggles (layers, brand seal, varnish)
- Order list with status badges

### Step 5: Supervisor UI - Production Planning
- View pending orders
- Create production lists from orders
- Notify operators

### Step 6: Operator UI - Notifications
- High-priority alert cards
- Production list view per section

### Step 7: Seed Data Update
