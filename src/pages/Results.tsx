import { useNavigate } from "react-router-dom";
import { Home, FileSpreadsheet, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const costItems = [
  { category: "Core", material: "Pocketed Springs", qty: "320", unit: "units", cost: 7040 },
  { category: "Core", material: "Steel", qty: "14", unit: "kg", cost: 150 },
  { category: "Comfort", material: "HR Foam", qty: "18", unit: "kg", cost: 2660 },
  { category: "Comfort", material: "Rubberized Coir", qty: "—", unit: "kg", cost: 1880 },
  { category: "Support", material: "Glue", qty: "3.5", unit: "L", cost: 1120 },
  { category: "Cover", material: "Jacquard Fabric", qty: "7", unit: "", cost: 160 },
  { category: "Labour", material: "—", qty: "—", unit: "—", cost: 700 },
  { category: "Overhead", material: "—", qty: "—", unit: "—", cost: 450 },
];

const totalMaterial = costItems.reduce((s, i) => s + i.cost, 0);
const labourOverhead = 700 + 450;
const totalCost = totalMaterial;
const profit = Math.round(totalCost * 0.2);
const sellingPrice = totalCost + profit;

const fmt = (n: number) => "₹ " + n.toLocaleString("en-IN");

const Results = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Costing Results" />

      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="section-header">Costing Output - Detailed View</div>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.cost.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">Total Material Cost</span>
                <span className="font-semibold">{fmt(totalMaterial)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">Labour + Overhead</span>
                <span className="font-semibold">{fmt(labourOverhead)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 font-bold">
                <span>TOTAL COST</span>
                <span>{fmt(totalCost)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">PROFIT (20%)</span>
                <span className="font-semibold">{fmt(profit)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent p-4 text-lg font-bold">
                <span>SELLING PRICE</span>
                <span className="text-success">{fmt(sellingPrice)}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button
                variant="default"
                size="lg"
                onClick={() => toast.success("Exported to Excel!")}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => toast.success("PDF downloaded!")}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button onClick={() => navigate("/configuration")}>New Calculation</Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
