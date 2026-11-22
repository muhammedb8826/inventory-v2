import type { Currency } from "@/lib/currency";

export type LocationType = "WAREHOUSE" | "SHOWROOM";
export type PaymentMethod = "CASH" | "BANK" | "CREDIT";
export type BankAccountType = "CASH" | "BANK";
export type BankTransactionType =
  | "SALE"
  | "PURCHASE"
  | "ADJUSTMENT"
  | "CREDIT_PAYMENT"
  | "EXPENSE";
export type BankTransactionDirection = "in" | "out";
export type StockAdjustmentDirection = "in" | "out";
export type StockAdjustmentReason =
  | "DAMAGE"
  | "LOSS"
  | "FOUND"
  | "COUNT"
  | "OPENING"
  | "RETURN"
  | "OTHER";
export type StockMovementRefType =
  | "sale"
  | "purchase"
  | "stock_transfer"
  | "stock_adjustment"
  | "production"
  | "opening";
export type ItemType = "RAW" | "SEMI" | "FINISHED" | "OTHER";
export type ProductionOrderStatus =
  | "DRAFT"
  | "RELEASED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type TransferStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type CreditStatus = "OPEN" | "PARTIAL" | "PAID";
/** How a credit balance was created. OPENING is cutover AR/AP with no sale/purchase. */
export type CreditSource = "SALE" | "PURCHASE" | "OPENING";
export type DocumentStatus = "POSTED" | "VOIDED";
export type CommissionBasis = "PROFIT" | "SALES";

export type { Currency };

export interface HealthResponse {
  status: string;
  service: string;
  currency?: Currency;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T, Totals = undefined> {
  data: T[];
  meta: PaginatedMeta;
  totals?: Totals;
}

export interface InventoryListTotals {
  quantity: string;
  inventoryValue: string;
}

export interface PurchaseListTotals {
  subtotal: string;
  total: string;
}

export interface SaleListTotals {
  subtotal: string;
  total: string;
  commission: string;
}

export interface ExpenseListTotals {
  amount: string;
}

export interface CreditListTotals {
  amount: string;
  paidAmount: string;
  balance: string;
}

export interface LinkedCredit {
  paidAmount?: string;
  status?: CreditStatus;
}

export interface Role {
  id: string;
  name: string;
  /** Auth/login: codes only. `GET /roles` may return full `Permission` objects. */
  permissions?: string[] | Permission[];
  description?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  isActive?: boolean;
}

export interface UomCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  /** When true, items may set constant roll width and use W×H / Length→Area. */
  hasConstantWidth?: boolean;
  uoms?: Uom[];
}

export interface Uom {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  symbol: string;
  conversionFactor: string;
  isBase?: boolean;
  isActive?: boolean;
  category?: UomCategory;
}

export interface ItemUom {
  id: string;
  itemId: string;
  uomId: string;
  conversionFactor: string;
  uom?: Uom;
}

export interface ProductAttribute {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  displayType?: string;
  sequence?: number;
  isActive?: boolean;
  values?: ProductAttributeValue[];
}

export interface ProductAttributeValue {
  id: string;
  attributeId: string;
  code: string;
  name: string;
  colorHex?: string | null;
  sequence?: number;
  isActive?: boolean;
  attribute?: ProductAttribute;
}

export interface Item {
  id: string;
  sku?: string | null;
  description: string;
  /** Legacy label; prefer stockUom.symbol */
  unit?: string | null;
  stockUomId?: string | null;
  salesUomId?: string | null;
  purchaseUomId?: string | null;
  /** Length→Area width (area per 1 length-base unit) */
  uomWidth?: string | null;
  /** Legacy; unused in UI. Cuts always convert/stock by area; line rate is on the document. */
  dimensionPriceMode?: "AREA" | "PIECE" | null;
  /** Legacy; unused. Line UOM is the dimension unit on documents. */
  dimensionUomId?: string | null;
  stockUom?: Uom | null;
  salesUom?: Uom | null;
  purchaseUom?: Uom | null;
  dimensionUom?: Uom | null;
  itemUoms?: ItemUom[];
  itemType?: ItemType | null;
  /** Selected attribute values (Color, Size, …) */
  attributeValues?: ProductAttributeValue[];
  /** Product template (owns allowed attribute values; no stock). */
  isTemplate?: boolean;
  parentItemId?: string | null;
  parentItem?: Item | null;
  /** Child variants when this item is a template. */
  variants?: Item[];
  variantKey?: string | null;
  /** Relative path from API, e.g. `/uploads/items/...` */
  imagePath?: string | null;
  /** Absolute or relative image URL for display */
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface StockRecord {
  id: string;
  locationId: string;
  itemId: string;
  quantity: string;
  purchasePrice: string;
  reorderPoint?: string | null;
  item: Item;
  location: Location;
  /** True when stock UOM is frozen (ERP: after stock or document history). */
  stockUomLocked?: boolean;
  /** Linear equivalent when item has constant width (area / width). */
  quantityLinear?: string | null;
  linearUomSymbol?: string | null;
}

/** Response when create generates 2+ product variants. */
export interface InventoryVariantCreateResult {
  template: Item;
  variants: StockRecord[];
}

export type LowStockStatus = "LOW_STOCK" | "OUT_OF_STOCK";

export interface LowStockRecord extends StockRecord {
  status: LowStockStatus;
  shortage: string;
}

export interface StockAdjustment {
  id: string;
  locationId: string;
  itemId: string;
  direction: StockAdjustmentDirection;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  reason: StockAdjustmentReason | string;
  notes?: string | null;
  reference?: string | null;
  purchasePrice?: string | null;
  createdById?: string;
  createdBy?: { id: string; fullName?: string; email?: string };
  item?: Item;
  location?: Location;
  createdAt?: string;
}

export interface StockMovement {
  id: string;
  locationId: string;
  itemId: string;
  quantityDelta: string;
  quantityBefore: string;
  quantityAfter: string;
  refType?: StockMovementRefType | null;
  refId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; fullName?: string; email?: string };
  item?: Item;
  location?: Location;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: string;
  accountType?: BankAccountType;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  isActive?: boolean;
}

export interface BankLiquidity {
  accounts: BankAccount[];
  totals: {
    cashTotal: string;
    bankTotal: string;
    totalLiquidity: string;
  };
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: BankTransactionType | string;
  /** Money into (`in`) or out of (`out`) the account. Amount is always positive. */
  direction: BankTransactionDirection;
  amount: string;
  balanceAfter?: string;
  description?: string;
  refType?: string;
  refId?: string;
  createdById?: string;
  bankAccount?: BankAccount;
  createdAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  bankAccountId: string;
  amount: string;
  description?: string;
  expenseDate: string;
  category?: ExpenseCategory;
}

export interface CreditRecord {
  id: string;
  customerId?: string;
  supplierId?: string;
  saleId?: string;
  purchaseId?: string;
  source?: CreditSource;
  /** Prior-system invoice / document number (opening credits). */
  reference?: string | null;
  notes?: string | null;
  amount: string;
  paidAmount: string;
  balance?: string;
  status: CreditStatus;
  dueDate?: string;
  customer?: Customer;
  supplier?: Supplier;
  sale?: Pick<
    Sale,
    "id" | "total" | "subtotal" | "totalAmount" | "createdAt" | "paymentMethod" | "status"
  >;
  purchase?: Pick<
    Purchase,
    "id" | "total" | "subtotal" | "totalAmount" | "createdAt" | "paymentMethod" | "status"
  >;
  createdAt?: string;
  updatedAt?: string;
}

/** Individual installment / remittance against a credit (bank ledger row). */
export interface CreditPayment {
  id: string;
  sequence: number;
  amount: string;
  bankAccountId: string;
  bankAccountName: string | null;
  description: string | null;
  notes: string | null;
  status: "POSTED" | "VOIDED";
  createdAt: string;
  createdById: string | null;
}

export interface CreditPaymentListResponse {
  data: CreditPayment[];
  totals: { paid: string; voided: string };
}

export interface DashboardData {
  totalInventoryValue: string;
  stockValueByLocation: {
    locationId: string;
    locationName: string;
    value: string;
  }[];
  showroomCount: number;
  dailySales: string;
  dailyPurchases: string;
  profitAndLoss: {
    revenue: string;
    costOfGoodsSold: string;
    grossProfit: string;
    totalExpenses: string;
    netProfit: string;
  };
  financialOverview: {
    cashTotal?: string;
    bankTotal?: string;
    totalLiquidity?: string;
    totalBankBalance: string;
    bankAccounts: {
      id: string;
      name: string;
      balance: string;
      accountType?: BankAccountType;
      bankName?: string | null;
    }[];
  };
  currency?: Currency;
}

export interface ProfitLossItem {
  itemId: string;
  description: string;
  quantitySold: string;
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string;
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
}

export interface PurchaseLine {
  id?: string;
  itemId: string;
  quantity: string;
  uomId?: string | null;
  stockQuantity?: string | null;
  unitPrice: string;
  lineTotal?: string;
  amount?: string;
  item?: Item;
  uom?: Uom | null;
  dimWidth?: string | null;
  dimHeight?: string | null;
  dimPieces?: string | null;
}

export interface Purchase {
  id: string;
  supplierId?: string;
  locationId?: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  notes?: string;
  creditDueDate?: string;
  status?: DocumentStatus;
  subtotal?: string;
  total?: string;
  /** @deprecated Prefer `total` */
  totalAmount?: string;
  createdAt?: string;
  updatedAt?: string;
  supplier?: Supplier;
  location?: Location;
  bankAccount?: BankAccount;
  /** Linked AP credit when paymentMethod is CREDIT (API field: `credit`). */
  credit?: CreditRecord | null;
  /** @deprecated Prefer `credit` */
  supplierCredit?: LinkedCredit;
  lines?: PurchaseLine[];
}

export interface SaleLineComponent {
  id?: string;
  componentItemId: string;
  stockQuantity: string;
  componentItem?: Item;
}

export interface SaleLine {
  id?: string;
  itemId: string;
  quantity: string;
  uomId?: string | null;
  stockQuantity?: string | null;
  unitPrice: string;
  lineTotal?: string;
  amount?: string;
  item?: Item;
  uom?: Uom | null;
  dimWidth?: string | null;
  dimHeight?: string | null;
  dimPieces?: string | null;
  /** Present when the sale exploded a Kit BoM. */
  components?: SaleLineComponent[];
}

export interface SaleUserRef {
  id: string;
  fullName: string;
  email?: string;
}

export interface Sale {
  id: string;
  customerId?: string;
  locationId?: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  notes?: string;
  creditDueDate?: string;
  status?: DocumentStatus;
  subtotal?: string;
  total?: string;
  /** @deprecated Prefer `total` */
  totalAmount?: string;
  soldByUserId?: string;
  commissionPercent?: string | number;
  commissionBasis?: CommissionBasis;
  commissionAmount?: string;
  soldByUser?: SaleUserRef;
  /** @deprecated Prefer `soldByUser` */
  soldBy?: SaleUserRef;
  createdBy?: SaleUserRef;
  createdAt?: string;
  updatedAt?: string;
  customer?: Customer;
  location?: Location;
  bankAccount?: BankAccount;
  /** Linked AR credit when paymentMethod is CREDIT (API field: `credit`). */
  credit?: CreditRecord | null;
  /** @deprecated Prefer `credit` */
  customerCredit?: LinkedCredit;
  lines?: SaleLine[];
  /** Stock shortage messages when sale posted with allowNegativeStock. */
  stockWarnings?: string[] | null;
  /** Draft/open production orders auto-created for Manufacture BoM shortages. */
  productionOrders?: ProductionOrder[];
}

export interface SalesCommissionSummaryRow {
  soldByUserId: string;
  soldByUserName?: string;
  soldByUser?: SaleUserRef;
  /** @deprecated Prefer `soldByUserName` / `totalSubtotal` */
  soldBy?: SaleUserRef;
  saleCount: number;
  totalSubtotal?: string;
  /** @deprecated Prefer `totalSubtotal` */
  totalSales?: string;
  totalCommission: string;
}

export interface ReportPeriod {
  from?: string;
  to?: string;
}

export interface ReportsSummary {
  currency?: Currency;
  totalRevenue: string;
  totalPurchases?: string;
  /** @deprecated Use totalPurchases */
  totalCost?: string;
  totalExpenses: string;
  grossProfit: string;
  netProfit: string;
  marginPercent: string;
  period?: ReportPeriod;
}

export interface ReportPaymentMethodRow {
  paymentMethod: PaymentMethod;
  count: number;
  total: string;
}

export interface ReportLocationBreakdownRow {
  locationId: string;
  locationName: string;
  count: number;
  total: string;
}

export interface ReportSales {
  currency?: Currency;
  period?: ReportPeriod;
  totals: {
    count: number;
    subtotal: string;
    total: string;
    commission: string;
  };
  byPaymentMethod: ReportPaymentMethodRow[];
  byLocation: ReportLocationBreakdownRow[];
}

export interface ReportPurchases {
  currency?: Currency;
  period?: ReportPeriod;
  totals: { count: number; total: string };
  byPaymentMethod: ReportPaymentMethodRow[];
  byLocation: ReportLocationBreakdownRow[];
}

export interface ReportExpenseCategoryRow {
  categoryId: string;
  categoryName: string;
  count: number;
  total: string;
}

export interface ReportExpenses {
  currency?: Currency;
  period?: ReportPeriod;
  totals: { count: number; total: string };
  byCategory: ReportExpenseCategoryRow[];
}

export interface ReportPurchasesByItemRow {
  itemId: string;
  sku?: string;
  description: string;
  quantityPurchased: string;
  total?: string;
  /** @deprecated Prefer `total` */
  totalSpend?: string;
}

export interface ReportPurchasesByItem {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  items: ReportPurchasesByItemRow[];
}

export interface ReportCommissionRow {
  soldByUserId: string;
  soldByUserName: string;
  saleCount: number;
  totalSubtotal?: string;
  totalCommission: string;
}

export interface ReportCommissions {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  totalCommission: string;
  reps: ReportCommissionRow[];
}

export interface ReportCreditByCustomerRow {
  customerId: string;
  customerName: string;
  creditCount: number;
  outstanding: string;
}

export interface ReportCreditBySupplierRow {
  supplierId: string;
  supplierName: string;
  creditCount: number;
  outstanding: string;
}

export interface ReportCreditPartySummary {
  totalOutstanding: string;
  creditCount: number;
  byCustomer?: ReportCreditByCustomerRow[];
  bySupplier?: ReportCreditBySupplierRow[];
}

export interface ReportCredits {
  currency?: Currency;
  customers?: ReportCreditPartySummary;
  suppliers?: ReportCreditPartySummary;
  /** @deprecated Prefer `customers` */
  customerReceivables?: {
    count: number;
    total: string;
    outstanding: string;
  };
  /** @deprecated Prefer `suppliers` */
  supplierPayables?: {
    count: number;
    total: string;
    outstanding: string;
  };
}

export interface ReportSalesByItemRow {
  itemId: string;
  sku?: string;
  description: string;
  itemDescription?: string;
  quantitySold: string;
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string;
}

export interface ReportSalesByItem {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  items: ReportSalesByItemRow[];
}

export interface ReportInventoryAgingRow {
  itemId: string;
  locationId?: string;
  sku?: string;
  description?: string;
  itemDescription?: string;
  locationName?: string;
  quantity: string;
  purchasePrice?: string;
  inventoryValue?: string;
  value?: string;
  lastPurchaseDate?: string;
  lastUpdated?: string;
  ageDays?: number | string;
}

export interface ReportInventoryAging {
  currency?: Currency;
  totalInventoryValue: string;
  items: ReportInventoryAgingRow[];
}

export interface ReportCustomerActivityRow {
  customerId: string;
  customerName?: string;
  name?: string;
  phone?: string;
  saleCount?: number;
  salesCount?: number;
  totalSpend?: string;
  totalSpent?: string;
  paidAmount?: string;
  creditAmount?: string;
  outstandingAmount?: string;
}

export interface ReportCustomerActivity {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  customers: ReportCustomerActivityRow[];
}

export interface ReportSupplierActivityRow {
  supplierId: string;
  supplierName?: string;
  name?: string;
  phone?: string;
  purchaseCount: number;
  totalPurchased: string;
  paidAmount?: string;
  creditAmount?: string;
  outstandingAmount?: string;
}

export interface ReportSupplierActivity {
  currency?: Currency;
  period?: { from?: string | null; to?: string | null };
  suppliers: ReportSupplierActivityRow[];
}

export interface ReportCashFlowRow {
  date: string;
  cashIn?: string;
  cashOut?: string;
  netMovement?: string;
  inflow?: string;
  outflow?: string;
  net?: string;
}

export interface ReportCashFlow {
  period?: ReportPeriod;
  dailyBalances: ReportCashFlowRow[];
}

export interface StockTransferLine {
  id?: string;
  itemId: string;
  quantity: string;
  item?: Item;
}

export interface StockTransfer {
  id: string;
  status: TransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
  createdAt?: string;
  fromLocation?: Location;
  toLocation?: Location;
  lines?: StockTransferLine[];
}

export interface BomLine {
  id?: string;
  componentItemId: string;
  quantity: string | number;
  uomId?: string | null;
  stockQuantity?: string | number | null;
  scrapPercent?: string | number | null;
  dimWidth?: string | number | null;
  dimHeight?: string | number | null;
  dimPieces?: string | number | null;
  /** Length UOM for W×H (m/cm/mm). Null = meters. */
  dimUomId?: string | null;
  componentItem?: Item;
  uom?: Uom | null;
  dimUom?: Uom | null;
}

export type BomType = "MANUFACTURE" | "KIT";

export interface Bom {
  id: string;
  finishedItemId: string;
  /** Optional product variant of finishedItemId */
  variantItemId?: string | null;
  /** Internal BoM reference label */
  name: string;
  version?: string | null;
  /** Finished qty this BoM produces (default 1) */
  quantity?: string | number;
  bomType?: BomType;
  notes?: string | null;
  isActive?: boolean;
  finishedItem?: Item;
  variantItem?: Item | null;
  lines?: BomLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionOrderLine {
  id?: string;
  componentItemId: string;
  quantityRequired?: string;
  quantityIssued?: string;
  scrapPercent?: string | null;
  componentItem?: Item;
}

export interface ProductionOrder {
  id: string;
  bomId: string;
  locationId: string;
  finishedItemId?: string;
  /** Originating sale when created from stock shortage (MTO). */
  saleId?: string | null;
  quantityPlanned: string;
  quantityCompleted?: string;
  status: ProductionOrderStatus;
  notes?: string | null;
  bom?: Bom;
  location?: Location;
  finishedItem?: Item;
  sale?: Pick<Sale, "id" | "customer"> | null;
  lines?: ProductionOrderLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAdmin {
  id: string;
  email: string;
  fullName: string;
  roleId?: string;
  role?: Role;
  isActive?: boolean;
}

export interface ProductionSuggestion {
  itemId: string;
  itemDescription: string;
  bomId: string;
  bomName: string;
  locationId: string;
  quantityNeeded: number;
  available: number;
  shortage: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
  productionSuggestions?: ProductionSuggestion[];
}

export type NotificationType =
  | "LOW_STOCK"
  | "STOCK_TRANSFER"
  | "SALE"
  | "PURCHASE"
  | "CREDIT_DUE"
  | "EXPENSE"
  | "SYSTEM"
  | "INQUIRY"
  | "PRODUCTION";

export interface Notification {
  id: string;
  userId: string;
  module: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationUnreadCount {
  count: number;
}

/** Quotation lifecycle (ERP-style). */
export type InquiryStatus =
  | "DRAFT"
  | "QUOTED"
  | "ORDERED"
  | "LOST"
  | "CANCELLED";

export type InquirySource = "PUBLIC" | "INTERNAL";

export type InquiryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

/** CRM assignment ownership — assign → PENDING → Accept/Decline */
export type InquiryAssignmentStatus =
  | "UNASSIGNED"
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED";

export interface InquiryLine {
  id?: string;
  itemId: string;
  quantity?: string | null;
  unitPrice?: string | null;
  notes?: string | null;
  item?: Item | null;
}

export interface InquiryLineInput {
  itemId: string;
  quantity?: number;
  unitPrice?: number;
  notes?: string;
}

export interface Inquiry {
  id: string;
  contactName: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  source: InquirySource;
  customerId?: string | null;
  /** @deprecated Prefer `lines`; may still appear on older payloads */
  itemId?: string | null;
  assignedToUserId?: string | null;
  assignmentStatus?: InquiryAssignmentStatus;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  createdById?: string | null;
  internalNotes?: string | null;
  followUpAt?: string | null;
  requiredByAt?: string | null;
  /** Quote expiry when status is QUOTED */
  validUntil?: string | null;
  quotedAt?: string | null;
  subtotal?: string | null;
  total?: string | null;
  quoteTerms?: string | null;
  /** Customer / external reference (PO number, etc.) */
  reference?: string | null;
  convertedSaleId?: string | null;
  customer?: Customer | null;
  /** @deprecated Prefer `lines` */
  item?: Item | null;
  lines?: InquiryLine[];
  assignedTo?: UserAdmin | null;
  createdBy?: UserAdmin | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCatalogItem {
  id: string;
  sku?: string | null;
  description: string;
  imageUrl?: string | null;
}

export interface PublicInquiryResponse {
  id: string;
  status: InquiryStatus;
  message: string;
}

export interface CreatePublicInquiryBody {
  contactName: string;
  companyName?: string;
  subject: string;
  message: string;
  phone?: string;
  email?: string;
  lines?: InquiryLineInput[];
  /** @deprecated Prefer `lines` */
  itemId?: string;
}

/** Staff create — subject/message optional; API titles from order lines. */
export interface CreateInquiryBody {
  contactName: string;
  companyName?: string;
  subject?: string;
  message?: string;
  phone?: string;
  email?: string;
  lines?: InquiryLineInput[];
  /** @deprecated Prefer `lines` */
  itemId?: string;
  priority?: InquiryPriority;
  customerId?: string;
  assignedToUserId?: string;
  internalNotes?: string;
  followUpAt?: string;
  requiredByAt?: string;
  validUntil?: string;
  quoteTerms?: string;
  reference?: string;
}

export interface UpdateInquiryBody {
  contactName?: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  subject?: string;
  message?: string;
  status?: InquiryStatus;
  priority?: InquiryPriority;
  customerId?: string | null;
  lines?: InquiryLineInput[];
  /** @deprecated Prefer `lines` */
  itemId?: string | null;
  assignedToUserId?: string | null;
  internalNotes?: string | null;
  followUpAt?: string | null;
  requiredByAt?: string | null;
  validUntil?: string | null;
  quoteTerms?: string | null;
  reference?: string | null;
  convertedSaleId?: string | null;
}

/** Public + admin branding / site appearance settings */
export interface BrandingSettings {
  appName: string;
  /** Absolute URL or path to the hero image; null = use frontend default */
  heroImageUrl?: string | null;
  headline?: string | null;
  supportingText?: string | null;
  updatedAt?: string;
}

export interface UpdateBrandingBody {
  appName?: string;
  headline?: string | null;
  supportingText?: string | null;
}
