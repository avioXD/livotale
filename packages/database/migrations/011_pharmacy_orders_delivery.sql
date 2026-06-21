-- 011: Pharmacy catalog, inventory, carts, orders, payments, invoices, delivery tracking, refills.

BEGIN;

CREATE TABLE commerce.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES commerce.product_categories(id) ON DELETE SET NULL,
  code varchar(80) NOT NULL UNIQUE,
  name varchar(140) NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES commerce.product_categories(id) ON DELETE SET NULL,
  sku varchar(80) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  product_type commerce.product_type_enum NOT NULL,
  requires_prescription boolean NOT NULL DEFAULT false,
  description text,
  strength varchar(80),
  pack_size varchar(80),
  manufacturer varchar(160),
  price numeric(12,2) NOT NULL DEFAULT 0,
  gst_percent numeric(5,2) NOT NULL DEFAULT 0,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_price_chk CHECK (price >= 0),
  CONSTRAINT products_gst_chk CHECK (gst_percent >= 0 AND gst_percent <= 100)
);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON commerce.products
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE clinical.prescription_items
  ADD CONSTRAINT fk_prescription_items_product
  FOREIGN KEY (product_id) REFERENCES commerce.products(id) ON DELETE SET NULL;

CREATE TABLE commerce.product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES core.clinics(id) ON DELETE SET NULL,
  city_id uuid REFERENCES core.cities(id) ON DELETE SET NULL,
  quantity_on_hand int NOT NULL DEFAULT 0,
  quantity_reserved int NOT NULL DEFAULT 0,
  reorder_level int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, clinic_id, city_id),
  CONSTRAINT product_inventory_qty_chk CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND reorder_level >= 0)
);

CREATE TABLE commerce.product_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES commerce.product_inventory(id) ON DELETE CASCADE,
  movement_type commerce.inventory_movement_type_enum NOT NULL,
  quantity int NOT NULL,
  reason text,
  reference_type varchar(80),
  reference_id uuid,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_inventory_movements_qty_chk CHECK (quantity <> 0)
);

CREATE TABLE commerce.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE SET NULL,
  status core.record_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_carts_updated_at
BEFORE UPDATE ON commerce.carts
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES commerce.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE RESTRICT,
  prescription_item_id uuid REFERENCES clinical.prescription_items(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, prescription_item_id),
  CONSTRAINT cart_items_qty_chk CHECK (quantity > 0),
  CONSTRAINT cart_items_price_chk CHECK (unit_price >= 0)
);

CREATE TABLE commerce.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE SET NULL,
  order_number varchar(80) NOT NULL UNIQUE,
  order_status commerce.order_status_enum NOT NULL DEFAULT 'placed',
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status commerce.payment_status_enum NOT NULL DEFAULT 'created',
  delivery_status commerce.delivery_status_enum NOT NULL DEFAULT 'pending',
  delivery_address_id uuid NOT NULL REFERENCES clinical.patient_addresses(id) ON DELETE RESTRICT,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_amount_chk CHECK (
    subtotal_amount >= 0 AND tax_amount >= 0 AND delivery_fee >= 0 AND
    discount_amount >= 0 AND total_amount >= 0
  )
);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON commerce.orders
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES commerce.products(id) ON DELETE RESTRICT,
  prescription_item_id uuid REFERENCES clinical.prescription_items(id) ON DELETE SET NULL,
  quantity int NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_qty_chk CHECK (quantity > 0),
  CONSTRAINT order_items_price_chk CHECK (unit_price >= 0 AND tax_amount >= 0 AND total_price >= 0)
);

CREATE TABLE commerce.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  order_id uuid REFERENCES commerce.orders(id) ON DELETE SET NULL,
  patient_package_id uuid REFERENCES core.patient_packages(id) ON DELETE SET NULL,
  provider commerce.payment_provider_enum NOT NULL DEFAULT 'manual',
  provider_payment_id varchar(180),
  provider_order_id varchar(180),
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR',
  status commerce.payment_status_enum NOT NULL DEFAULT 'created',
  paid_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_chk CHECK (amount >= 0)
);

CREATE TABLE commerce.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES commerce.orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES commerce.payments(id) ON DELETE SET NULL,
  invoice_number varchar(80) NOT NULL UNIQUE,
  invoice_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  status commerce.invoice_status_enum NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commerce.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  courier_name varchar(120),
  tracking_number varchar(120),
  tracking_url text,
  status commerce.delivery_status_enum NOT NULL DEFAULT 'pending',
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_deliveries_updated_at
BEFORE UPDATE ON commerce.deliveries
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE commerce.refill_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES clinical.prescriptions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES commerce.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  refill_every_days int NOT NULL,
  next_refill_date date NOT NULL,
  status commerce.refill_status_enum NOT NULL DEFAULT 'active',
  auto_deliver boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refill_schedules_qty_chk CHECK (quantity > 0 AND refill_every_days > 0)
);

CREATE TRIGGER trg_refill_schedules_updated_at
BEFORE UPDATE ON commerce.refill_schedules
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMIT;
