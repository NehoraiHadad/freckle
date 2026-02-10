export interface Preferences {
  theme: "light" | "dark" | "system";
  language: "en" | "he";
  defaultProduct: string | null;
  dashboardLayout: "grid" | "list";
  sidebarCollapsed: boolean;
}
