import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Configuration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mattressType, setMattressType] = useState("Single");
  const [costingType, setCostingType] = useState("Standard");
  const [type, setType] = useState("Standard");
  const [category, setCategory] = useState("Spring Mattress");
  const [size, setSize] = useState("8 inch");
  const [customDimensions, setCustomDimensions] = useState(true);
  const [length, setLength] = useState("78");
  const [width, setWidth] = useState("60");
  const [foamType, setFoamType] = useState("HR Foam");
  const [foamDensity, setFoamDensity] = useState("40");
  const [springType, setSpringType] = useState("Pocketed");
  const [springDensity, setSpringDensity] = useState("40");
  const [coirType, setCoirType] = useState("Rubberized Coir");
  const [fabricType, setFabricType] = useState("Jacquard Fabric");
  const [glueType, setGlueType] = useState("Synthetic Glue");

  const [materialRates, setMaterialRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchRates = async () => {
      const { data } = await supabase.from("materials").select("material, rate");
      if (data) {
        const rates: Record<string, number> = {};
        data.forEach((m) => (rates[m.material] = m.rate));
        setMaterialRates(rates);
      }
    };
    fetchRates();
  }, []);

  const handleCalculate = async () => {
    if (!user) return;

    const { data: config, error: configErr } = await supabase
      .from("costing_configs")
      .insert({
        user_id: user.id,
        mattress_type: mattressType,
        costing_type: costingType,
        type,
        category,
        size,
        custom_dimensions: customDimensions,
        length_in: Number(length),
        width_in: Number(width),
        foam_type: foamType,
        foam_density: Number(foamDensity),
        spring_type: springType,
        spring_density: Number(springDensity),
        coir_type: coirType,
        fabric_type: fabricType,
        glue_type: glueType,
      })
      .select()
      .single();

    if (configErr || !config) {
      toast.error("Failed to save configuration");
      return;
    }

    // Calculate costs using material rates
    const springRate = materialRates[springType] || 22;
    const steelRate = materialRates["Steel Wire"] || 85;
    const foamRate = materialRates[foamType] || 260;
    const coirRate = materialRates[coirType] || 180;
    const glueRate = materialRates[glueType] || 120;
    const fabricRate = materialRates[fabricType] || 160;

    const costItems = [
      { category: "Core", material: `${springType} Springs`, qty: 320, unit: "units", cost: 320 * springRate },
      { category: "Core", material: "Steel", qty: 14, unit: "kg", cost: Math.round(14 * steelRate) },
      { category: "Comfort", material: foamType, qty: 18, unit: "kg", cost: Math.round(18 * foamRate) },
      { category: "Comfort", material: coirType, qty: 0, unit: "kg", cost: Math.round(10 * coirRate) },
      { category: "Support", material: "Glue", qty: 3.5, unit: "L", cost: Math.round(3.5 * glueRate) },
      { category: "Cover", material: fabricType, qty: 7, unit: "m", cost: Math.round(7 * fabricRate) },
      { category: "Labour", material: "—", qty: 0, unit: "—", cost: 700 },
      { category: "Overhead", material: "—", qty: 0, unit: "—", cost: 450 },
    ];

    const totalMaterialCost = costItems.reduce((s, i) => s + i.cost, 0);
    const labourOverhead = 700 + 450;
    const totalCost = totalMaterialCost + labourOverhead;

    const { error: resultErr } = await supabase.from("costing_results").insert({
      user_id: user.id,
      config_id: config.id,
      cost_items: costItems,
      total_material_cost: totalMaterialCost,
      labour_overhead: labourOverhead,
      total_cost: totalCost,
      profit_percent: 0,
      profit: 0,
      selling_price: totalCost,
    });

    if (resultErr) {
      toast.error("Failed to save results");
      return;
    }

    navigate("/results");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mattress Configuration & Material Selection" />

      <main className="mx-auto max-w-6xl p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Step 1 */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-foreground">Step 1: Mattress Configuration</h2>
            <div className="rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="section-header">PEPS Mattress Costing System</div>
              <div className="space-y-4 p-6">
                <h3 className="font-semibold text-primary">Mattress Configuration</h3>
                <div>
                  <Label>Mattress Type</Label>
                  <Select value={mattressType} onValueChange={setMattressType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Double">Double</SelectItem>
                      <SelectItem value="Queen">Queen</SelectItem>
                      <SelectItem value="King">King</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Costing Type</Label>
                    <Select value={costingType} onValueChange={setCostingType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Pillow Top">Pillow Top</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Mattress Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spring Mattress">Spring Mattress</SelectItem>
                      <SelectItem value="Foam Mattress">Foam Mattress</SelectItem>
                      <SelectItem value="Coir Mattress">Coir Mattress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6 inch">6 inch</SelectItem>
                      <SelectItem value="8 inch">8 inch</SelectItem>
                      <SelectItem value="10 inch">10 inch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="custom" checked={customDimensions} onCheckedChange={(c) => setCustomDimensions(!!c)} />
                  <Label htmlFor="custom">Enable Custom Dimensions</Label>
                </div>
                {customDimensions && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Length (in)</Label>
                      <Input value={length} onChange={(e) => setLength(e.target.value)} />
                    </div>
                    <div>
                      <Label>Width (in)</Label>
                      <Input value={width} onChange={(e) => setWidth(e.target.value)} />
                    </div>
                  </div>
                )}
                <hr className="border-border" />
                <h3 className="font-semibold text-primary">Spring Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Spring Type</Label>
                    <Select value={springType} onValueChange={setSpringType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bonnell">Bonnell</SelectItem>
                        <SelectItem value="Pocketed">Pocketed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Spring Count</Label>
                    <Input value="Auto" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Density (kg/m³)</Label>
                    <Input value={springDensity} onChange={(e) => setSpringDensity(e.target.value)} />
                  </div>
                  <div>
                    <Label>Steel Used (kg)</Label>
                    <Input value="Auto" disabled />
                  </div>
                </div>
                <div>
                  <Label>Spring Rate (₹/unit)</Label>
                  <Input value={`₹ ${materialRates[springType] || (springType === "Pocketed" ? 22 : 18)}`} disabled />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-foreground">Step 2: Material Selection</h2>
            <div className="rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="section-header">Material Selection</div>
              <div className="space-y-4 p-6">
                <h3 className="font-semibold text-primary">Foam Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Foam Type</Label>
                    <Select value={foamType} onValueChange={setFoamType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PU Foam">PU Foam</SelectItem>
                        <SelectItem value="HR Foam">HR Foam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Foam Thickness (in)</Label>
                    <Input value="Auto" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Density (kg/m³)</Label>
                    <Input value={foamDensity} onChange={(e) => setFoamDensity(e.target.value)} />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input value="Auto" disabled />
                  </div>
                </div>
                <div>
                  <Label>Foam Rate (₹/kg)</Label>
                  <Input value={`₹ ${materialRates[foamType] || (foamType === "HR Foam" ? 260 : 220)}`} disabled />
                </div>

                <hr className="border-border" />
                <h3 className="font-semibold text-primary">Coir Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Coir Type</Label>
                    <Select value={coirType} onValueChange={setCoirType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rubberized Coir">Rubberized Coir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Thickness (in)</Label>
                    <Input value="Auto" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input value="Auto" disabled />
                  </div>
                  <div>
                    <Label>Coir Rate (₹/kg)</Label>
                    <Input value={`₹ ${materialRates[coirType] || 180}`} disabled />
                  </div>
                </div>

                <hr className="border-border" />
                <h3 className="font-semibold text-primary">Support Materials</h3>
                <div>
                  <Label>Fabric Type</Label>
                  <Select value={fabricType} onValueChange={setFabricType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jacquard Fabric">Jacquard Fabric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fabric Length (m)</Label>
                    <Input value="Auto" disabled />
                  </div>
                  <div>
                    <Label>Fabric Rate (₹/m)</Label>
                    <Input value={`₹ ${materialRates[fabricType] || 160}`} disabled />
                  </div>
                </div>
                <div>
                  <Label>Glue Type</Label>
                  <Select value={glueType} onValueChange={setGlueType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Synthetic Glue">Synthetic Glue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Glue Qty (L)</Label>
                    <Input value="Auto" disabled />
                  </div>
                  <div>
                    <Label>Glue Rate (₹/L)</Label>
                    <Input value={`₹ ${materialRates[glueType] || 120}`} disabled />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground">Ready to Calculate?</h3>
            <p className="text-sm text-muted-foreground">Click the button to calculate the total cost and view the results.</p>
          </div>
          <Button size="lg" className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleCalculate}>
            Save & Calculate Total
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Configuration;
