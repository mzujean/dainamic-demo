import { create } from "zustand";

export interface Product {
  id: string;
  name: string;
  price: number;
  sizes: string[];
  stock: number;
  category: "single" | "bundle";
  lowStockThreshold: number;
}

export interface Order {
  id: string;
  ref: string;
  customer: string;
  phone: string;
  items: { productId: string; name: string; size: string; qty: number; price: number }[];
  delivery: "pudo" | "door";
  deliveryCost: number;
  total: number;
  status: "pending_payment" | "payment_received" | "packing" | "shipped" | "delivered";
  channel: "whatsapp" | "web" | "instagram";
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  lastOrderDate: string;
  totalSpent: number;
  orderCount: number;
  followUpStatus: "due" | "ok" | "sent";
}

export interface ContentPost {
  id: string;
  title: string;
  caption: string;
  type: "avatar" | "carousel" | "image" | "video" | "product";
  platforms: ("ig" | "tiktok" | "facebook")[];
  pillar: string;
  scheduledAt: string;
  status: "draft" | "scheduled" | "posted";
  reach?: number;
}

export interface AgentTask {
  id: string;
  name: string;
  type: "receipt_extract" | "content_generate" | "whatsapp_reply" | "follow_up" | "inventory_check" | "analytics";
  status: "idle" | "running" | "done" | "error";
  startedAt?: string;
  result?: string;
}

interface AppState {
  products: Product[];
  orders: Order[];
  clients: Client[];
  posts: ContentPost[];
  agents: AgentTask[];
  heygenCreditsUsed: number;
  heygenCreditsTotal: number;
  setProducts: (p: Product[]) => void;
  addOrder: (o: Order) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  spawnAgent: (task: Omit<AgentTask, "id" | "startedAt" | "status">) => string;
  updateAgent: (id: string, updates: Partial<AgentTask>) => void;
  removeAgent: (id: string) => void;
}

const DEMO_PRODUCTS: Product[] = [
  { id: "p1", name: "Daily Moisturiser", price: 90, sizes: ["150ml", "50ml"], stock: 14, category: "single", lowStockThreshold: 5 },
  { id: "p2", name: "Growth Elixir", price: 85, sizes: ["50ml", "100ml"], stock: 4, category: "single", lowStockThreshold: 5 },
  { id: "p3", name: "Shampoo", price: 95, sizes: ["200ml"], stock: 11, category: "single", lowStockThreshold: 4 },
  { id: "p4", name: "Leave-in Cream", price: 110, sizes: ["250ml"], stock: 3, category: "single", lowStockThreshold: 5 },
  { id: "p5", name: "Hair Butter", price: 100, sizes: ["200ml"], stock: 8, category: "single", lowStockThreshold: 4 },
  { id: "b1", name: "Starter Bundle", price: 240, sizes: ["bundle"], stock: 6, category: "bundle", lowStockThreshold: 3 },
  { id: "b2", name: "Full House Bundle", price: 420, sizes: ["bundle"], stock: 4, category: "bundle", lowStockThreshold: 2 },
];

const DEMO_CLIENTS: Client[] = [
  { id: "c1", name: "Thandi M.", phone: "+27711234567", lastOrderDate: "2025-03-06", totalSpent: 420, orderCount: 3, followUpStatus: "due" },
  { id: "c2", name: "Nomsa Z.", phone: "+27729876543", lastOrderDate: "2025-03-09", totalSpent: 240, orderCount: 2, followUpStatus: "due" },
  { id: "c3", name: "Lerato K.", phone: "+27734567890", lastOrderDate: "2025-03-28", totalSpent: 185, orderCount: 1, followUpStatus: "ok" },
  { id: "c4", name: "Sibo P.", phone: "+27741234567", lastOrderDate: "2025-04-01", totalSpent: 100, orderCount: 1, followUpStatus: "ok" },
  { id: "c5", name: "Ayanda M.", phone: "+27756789012", lastOrderDate: "2025-04-05", totalSpent: 0, orderCount: 0, followUpStatus: "ok" },
];

export const useStore = create<AppState>((set, get) => ({
  products: DEMO_PRODUCTS,
  orders: [],
  clients: DEMO_CLIENTS,
  posts: [],
  agents: [],
  heygenCreditsUsed: 12,
  heygenCreditsTotal: 15,

  setProducts: (products) => set({ products }),

  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),

  updateOrderStatus: (id, status) =>
    set((s) => ({ orders: s.orders.map((o) => o.id === id ? { ...o, status } : o) })),

  spawnAgent: (task) => {
    const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const agent: AgentTask = { ...task, id, status: "running", startedAt: new Date().toISOString() };
    set((s) => ({ agents: [...s.agents, agent] }));
    return id;
  },

  updateAgent: (id, updates) =>
    set((s) => ({ agents: s.agents.map((a) => a.id === id ? { ...a, ...updates } : a) })),

  removeAgent: (id) =>
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
}));
