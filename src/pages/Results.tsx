import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Home, FileSpreadsheet, FileDown, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface CostItem {
  slNo?: number;
  category: string;
  material: string;
  qty: number;
  unit: string;
  rate?: number;
  cost: number;
}

const fmt = (n: number) => "₹ " + n.toLocaleString("en-IN");

const EditableCell = ({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) {
      onSave(num);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <span className="text-muted-foreground text-xs">₹</span>
        <Input
          autoFocus
          className="h-7 w-28 text-right text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
        />
        <button onClick={commit} className="text-success hover:opacity-80">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={cancel} className="text-destructive hover:opacity-80">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 ml-auto text-right hover:text-primary transition-colors group"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      title="Click to edit"
    >
      <span>{value.toLocaleString("en-IN")}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
};

const Results = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resultId, setResultId] = useState<string | null>(null);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [labourCost, setLabourCost] = useState(700);
  const [overheadCost, setOverheadCost] = useState(450);
  const [totalMaterialCost, setTotalMaterialCost] = useState(0);
  const [loading, setLoading] = useState(true);

  const labourOverhead = labourCost + overheadCost;
  const totalCost = totalMaterialCost + labourOverhead;

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

      const items = data.cost_items as unknown as CostItem[];
      // Filter out old labour/overhead rows if stored
      const materialItems = items.filter(
        (i) => i.category !== "Labour" && i.category !== "Overhead"
      );
      const matCost = materialItems.reduce((s, i) => s + i.cost, 0);

      setResultId(data.id);
      setCostItems(materialItems);
      setTotalMaterialCost(matCost);
      // Use stored labour_overhead split equally if no separate info, else keep defaults
      const storedLabour = items.find((i) => i.category === "Labour");
      const storedOverhead = items.find((i) => i.category === "Overhead");
      if (storedLabour) setLabourCost(storedLabour.cost);
      if (storedOverhead) setOverheadCost(storedOverhead.cost);
      setLoading(false);
    };
    fetchLatest();
  }, [user, navigate]);

  const persistUpdate = useCallback(
    async (newLabour: number, newOverhead: number) => {
      if (!resultId) return;
      const lo = newLabour + newOverhead;
      const tc = totalMaterialCost + lo;
      await supabase
        .from("costing_results")
        .update({
          labour_overhead: lo,
          total_cost: tc,
          profit: 0,
          profit_percent: 0,
          selling_price: tc,
        })
        .eq("id", resultId);
    },
    [resultId, totalMaterialCost]
  );

  const handleLabourSave = (v: number) => {
    setLabourCost(v);
    persistUpdate(v, overheadCost);
  };

  const handleOverheadSave = (v: number) => {
    setOverheadCost(v);
    persistUpdate(labourCost, v);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Mattress Costing Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 26);

    const rows = [
      ...costItems.map((i) => [
        i.slNo ?? "",
        i.category,
        i.material,
        i.qty || "—",
        i.unit,
        i.rate != null ? `₹${i.rate}` : "—",
        `₹ ${i.cost.toLocaleString("en-IN")}`,
      ]),
      ["", "Labour", "—", "—", "—", "—", `₹ ${labourCost.toLocaleString("en-IN")}`],
      ["", "Overhead", "—", "—", "—", "—", `₹ ${overheadCost.toLocaleString("en-IN")}`],
    ];

    autoTable(doc, {
      head: [["#", "Category", "Material", "Qty", "Unit", "Rate", "Amount"]],
      body: rows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    const summaryData = [
      ["Total Material Cost", fmt(totalMaterialCost)],
      ["Labour + Overhead", fmt(labourOverhead)],
      ["TOTAL COST", fmt(totalCost)],
    ];
    autoTable(doc, {
      body: summaryData,
      startY: finalY + 8,
      styles: { fontSize: 11 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      theme: "plain",
    });

    doc.save("mattress-costing.pdf");
    toast.success("PDF downloaded!");
  };

  const exportExcel = () => {
    const rows = [
      ["#", "Category", "Material", "Qty", "Unit", "Rate (₹)", "Amount (₹)"],
      ...costItems.map((i) => [i.slNo ?? "", i.category, i.material, i.qty || "—", i.unit, i.rate ?? "—", i.cost]),
      ["", "Labour", "—", "—", "—", "—", labourCost],
      ["", "Overhead", "—", "—", "—", "—", overheadCost],
      [],
      ["", "Total Material Cost", "", "", "", "", totalMaterialCost],
      ["", "Labour + Overhead", "", "", "", "", labourOverhead],
      ["", "TOTAL COST", "", "", "", "", totalCost],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 16 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costing");
    XLSX.writeFile(wb, "mattress-costing.xlsx");
    toast.success("Exported to Excel!");
  };

  if (loading) {
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
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground text-xs">{item.slNo ?? i + 1}</TableCell>
                    <TableCell className="text-xs">{item.category}</TableCell>
                    <TableCell className="text-xs">{item.material}</TableCell>
                    <TableCell className="text-right text-xs">{item.qty || "—"}</TableCell>
                    <TableCell className="text-xs">{item.unit}</TableCell>
                    <TableCell className="text-right text-xs">{item.rate != null ? `₹${item.rate}` : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{item.cost.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
                {/* Editable Labour row */}
                <TableRow className="bg-muted/30">
                  <TableCell />
                  <TableCell className="font-medium">Labour</TableCell>
                  <TableCell className="text-muted-foreground text-xs">Click cost to edit</TableCell>
                  <TableCell /><TableCell />
                  <TableCell />
                  <TableCell className="text-right">
                    <EditableCell value={labourCost} onSave={handleLabourSave} />
                  </TableCell>
                </TableRow>
                {/* Editable Overhead row */}
                <TableRow className="bg-muted/30">
                  <TableCell />
                  <TableCell className="font-medium">Overhead</TableCell>
                  <TableCell className="text-muted-foreground text-xs">Click cost to edit</TableCell>
                  <TableCell /><TableCell />
                  <TableCell />
                  <TableCell className="text-right">
                    <EditableCell value={overheadCost} onSave={handleOverheadSave} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">Total Material Cost</span>
                <span className="font-semibold">{fmt(totalMaterialCost)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 text-sm">
                <span className="text-muted-foreground">Labour + Overhead</span>
                <span className="font-semibold">{fmt(labourOverhead)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent p-4 text-lg font-bold">
                <span>TOTAL COST</span>
                <span className="text-success">{fmt(totalCost)}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button variant="default" size="lg" onClick={exportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button variant="outline" size="lg" onClick={exportPDF}>
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
