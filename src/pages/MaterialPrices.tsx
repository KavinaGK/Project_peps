import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { defaultMaterials, type Material } from "@/data/materials";
import { toast } from "sonner";

const MaterialPrices = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>(defaultMaterials);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setEditRate(String(m.rate));
  };

  const saveEdit = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, rate: Number(editRate), lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) } : m))
    );
    setEditingId(null);
    toast.success("Rate updated");
  };

  const categoryColor: Record<string, string> = {
    Spring: "text-primary",
    Steel: "text-primary",
    Foam: "text-primary",
    Coir: "text-primary",
    Fabric: "text-primary",
    Glue: "text-primary",
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Material Price Settings" />

      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="section-header">PEPS Mattress Costing System</div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-card-foreground">Material Price Settings</h2>
            <p className="mb-4 text-sm text-primary">Update market prices here.</p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Rate (₹)</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className={`font-medium ${categoryColor[m.category] || ""}`}>{m.category}</TableCell>
                    <TableCell>{m.material}</TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell>
                      {editingId === m.id ? (
                        <Input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-24"
                          autoFocus
                        />
                      ) : (
                        m.rate
                      )}
                    </TableCell>
                    <TableCell>{m.lastUpdated}</TableCell>
                    <TableCell>
                      {editingId === m.id ? (
                        <button onClick={() => saveEdit(m.id)} className="text-success hover:text-success/80">
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => startEdit(m)} className="text-primary hover:text-primary/80">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="px-6 pb-6">
            <Button className="w-full" size="lg" onClick={() => toast.success("All changes saved!")}>
              Save All Changes
            </Button>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>• Click the edit icon to update market prices.</li>
              <li>• Changes apply to all mattress cost calculations.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => navigate("/configuration")}>Next: Configuration</Button>
        </div>
      </main>
    </div>
  );
};

export default MaterialPrices;
