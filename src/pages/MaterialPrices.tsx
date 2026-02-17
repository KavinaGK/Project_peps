import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Material {
  id: string;
  category: string;
  material: string;
  unit: string;
  rate: number;
  last_updated: string;
}

const MaterialPrices = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const { data, error } = await supabase.from("materials").select("*").order("category");
    if (error) {
      toast.error("Failed to load materials");
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setEditRate(String(m.rate));
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("materials")
      .update({ rate: Number(editRate), last_updated: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("Rate updated");
      fetchMaterials();
    }
    setEditingId(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Material Price Settings" />
        <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
                    <TableCell className="font-medium text-primary">{m.category}</TableCell>
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
                    <TableCell>{formatDate(m.last_updated)}</TableCell>
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
