import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";

const Configuration = () => {
  const navigate = useNavigate();
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

  const handleCalculate = () => {
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
                  <Input value={springType === "Pocketed" ? "₹ 22" : "₹ 18"} disabled />
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
                  <Input value={foamType === "HR Foam" ? "₹ 260" : "₹ 220"} disabled />
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
                    <Input value="₹ 180" disabled />
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
                    <Input value="₹ 160" disabled />
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
                    <Input value="₹ 120" disabled />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground">Ready to Calculate?</h3>
            <p className="text-sm text-muted-foreground">Click the button below to calculate the total cost and view the results.</p>
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
