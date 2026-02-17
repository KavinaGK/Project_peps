import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, FileSpreadsheet, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CostItem {
  category: string;
  material: string;
  qty: number;
  unit: string;
  cost: number;
}

const fmt = (n: number) => "₹ " + n.toLocaleString("en-IN");

const Results = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<{
    cost_items: CostItem[];
    total_material_cost: number;
    labour_overhead: number;
    total_cost: number;
    profit: number;
    profit_percent: number;
    selling_price: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("costing_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        toast.error("No results found. Please configure and calculate first.");
        navigate("/configuration");
        return;
      }

      setResult({
        cost_items: data.cost_items as unknown as CostItem[],
        total_material_cost: data.total_material_cost,
        labour_overhead: data.labour_overhead,
        total_cost: data.total_cost,
        profit: data.profit,
        profit_percent: data.profit_percent,
        selling_price: data.selling_price,
      });
      setLoading(false);
    };
    fetchLatest();
  }, [user, navigate]);

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Costing Results" />
        <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
                {result.cost_items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell className="text-right">{item.qty || "—"}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.cost.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">Total Material Cost</span>
                <span className="font-semibold">{fmt(result.total_material_cost)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">Labour + Overhead</span>
                <span className="font-semibold">{fmt(result.labour_overhead)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 font-bold">
                <span>TOTAL COST</span>
                <span>{fmt(result.total_cost)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">PROFIT ({result.profit_percent}%)</span>
                <span className="font-semibold">{fmt(result.profit)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent p-4 text-lg font-bold">
                <span>SELLING PRICE</span>
                <span className="text-success">{fmt(result.selling_price)}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button variant="default" size="lg" onClick={() => toast.success("Exported to Excel!")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button variant="outline" size="lg" onClick={() => toast.success("PDF downloaded!")}>
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
