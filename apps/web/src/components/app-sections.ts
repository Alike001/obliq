import {
  BarChart3,
  Building2,
  CheckSquare,
  FileCheck2,
  FileText,
  Landmark,
  Library,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

export const appSections = [
  ["Overview", "/app", BarChart3, "IMPLEMENTED"],
  ["Obligations", "/app/obligations", FileText, "IMPLEMENTED"],
  ["Vendors", "/app/vendors", Building2, "IMPLEMENTED"],
  ["Approvals", "/app/approvals", CheckSquare, "IMPLEMENTED"],
  ["Settlements", "/app/settlements", Landmark, "IMPLEMENTED"],
  ["Ledger", "/app/ledger", Library, "PLANNED"],
  ["Evidence", "/app/evidence", FileCheck2, "IMPLEMENTED"],
  ["Policies", "/app/policies", SlidersHorizontal, "IMPLEMENTED"],
  ["Settings", "/app/settings", Settings, "PLANNED"],
] as const;
