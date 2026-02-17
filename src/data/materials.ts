export interface Material {
  id: string;
  category: string;
  material: string;
  unit: string;
  rate: number;
  lastUpdated: string;
}

export const defaultMaterials: Material[] = [
  { id: "1", category: "Spring", material: "Bonnell", unit: "per unit", rate: 18, lastUpdated: "15 Jan 2024" },
  { id: "2", category: "Spring", material: "Pocketed", unit: "per unit", rate: 22, lastUpdated: "15 Jan 2024" },
  { id: "3", category: "Steel", material: "Steel Wire", unit: "per kg", rate: 85, lastUpdated: "15 Jan 2024" },
  { id: "4", category: "Foam", material: "PU Foam", unit: "per kg", rate: 220, lastUpdated: "15 Jan 2024" },
  { id: "5", category: "Foam", material: "HR Foam", unit: "per kg", rate: 260, lastUpdated: "15 Jan 2024" },
  { id: "6", category: "Coir", material: "Rubberized Coir", unit: "per kg", rate: 180, lastUpdated: "15 Jan 2024" },
  { id: "7", category: "Fabric", material: "Jacquard Fabric", unit: "per meter", rate: 160, lastUpdated: "15 Jan 2024" },
  { id: "8", category: "Glue", material: "Synthetic Glue", unit: "per liter", rate: 120, lastUpdated: "15 Jan 2024" },
];
