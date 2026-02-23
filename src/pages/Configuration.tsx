import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  calculateBOM,
  type MattressConfig,
  type BOMItem,
} from "@/lib/mattressFormulas";
import { ChevronRight, RotateCcw, Save, Settings2, TableProperties } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────

const THICKNESS_OPTIONS = [3, 4, 5, 6, 8, 10, 12, 16, 20];

const FOAM_LAYERS: Record<number, string> = {
  3: "8mm 16D PU Foam T/B",
  4: "8mm 16D PU Foam T/B",
  5: "8mm 16D PU Foam T/B + 5mm Cotton Felt T/B",
  6: "10mm 18D PU Foam T/B + 6mm 700GSM Cotton Felt T/B",
  8: "15mm 18D PU Foam T/B + 6mm 700GSM Cotton Felt T/B",
  10: "15mm 18D PU Foam T/B + 15mm 70D Rebonded T/B + 6mm Cotton Felt T/B",
  12: "20mm 18D PU Foam T/B + 30mm 70D Rebonded T/B + 6mm Cotton Felt T/B",
  16: "25mm 50D Memory Foam + 15mm 25D Helixa + 6mm Cotton Felt T/B",
  20: "25mm 50D Memory Foam + 25mm 25D Helixa + 15mm Rebonded + 6mm Cotton Felt T/B",
};

// ── UI Helpers ───────────────────────────────────────────────────────────

const SectionCard = ({ title, children, badge, actions }: { title: string; children: React.ReactNode; badge?: string; actions?: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
    <div className="section-header flex items-center justify-between">
      <span>{title}</span>
      <div className="flex items-center gap-2">
        {badge && <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground">{badge}</Badge>}
        {actions}
      </div>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

// ── Editable BOM row ─────────────────────────────────────────────────────

interface EditableBOMItem extends BOMItem {
  id: string;
}

const BOMRow = ({ item, onChange }: { item: EditableBOMItem; onChange: (id: string, field: "qty" | "rate" | "material", value: number | string) => void }) => (
  <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border/30 last:border-0">
    <span className="col-span-1 text-xs text-muted-foreground text-center">{item.slNo}</span>
    <div className="col-span-4">
      <Input
        type="text"
        value={item.material}
        onChange={(e) => onChange(item.id, "material", e.target.value)}
        className="h-8 text-xs px-2 border-dashed"
      />
    </div>
    <span className="col-span-1 text-xs text-muted-foreground text-center">{item.unit}</span>
    <div className="col-span-2">
      <Input
        type="number"
        step="0.01"
        value={item.qty}
        onChange={(e) => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
        className="h-8 text-xs text-center px-1"
      />
    </div>
    <div className="col-span-2">
      <Input
        type="number"
        step="0.01"
        value={item.rate}
        onChange={(e) => onChange(item.id, "rate", parseFloat(e.target.value) || 0)}
        className="h-8 text-xs text-center px-1"
      />
    </div>
    <span className="col-span-2 text-xs font-semibold text-foreground text-right">
      ₹{(item.qty * item.rate).toFixed(2)}
    </span>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────

const Configuration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active slide: "config" or "bom"
  const [activeSlide, setActiveSlide] = useState<"config" | "bom">("config");

  // Workflow selections (all dropdowns)
  const [channel, setChannel] = useState<string>("Retail");
  const [coreType, setCoreType] = useState<string>("Spring");
  const [springType, setSpringType] = useState<string>("Pocketed");
  const [sides, setSides] = useState<string>("Double Side");
  const [boxType, setBoxType] = useState<string>("With Box");
  const [packType, setPackType] = useState<string>("Roll Pack");
  const [model, setModel] = useState<string>("Normal");
  const [thicknessIn, setThicknessIn] = useState<number>(6);
  const [customDimensions, setCustomDimensions] = useState(false);
  const [lengthIn, setLengthIn] = useState(75);
  const [widthIn, setWidthIn] = useState(36);
  const [mattressType, setMattressType] = useState("Single");
  const [wastagePercent, setWastagePercent] = useState(4);

  // Material rates & editable BOM
  const [materialRates, setMaterialRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(true);
  const [bomItems, setBomItems] = useState<EditableBOMItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Load rates
  useEffect(() => {
    const fetchRates = async () => {
      const { data } = await supabase.from("materials").select("material, rate");
      if (data) {
        const rates: Record<string, number> = {};
        data.forEach((m) => (rates[m.material] = m.rate));
        setMaterialRates(rates);
      }
      setLoadingRates(false);
    };
    fetchRates();
  }, []);

  // Auto-set dimensions
  useEffect(() => {
    if (customDimensions) return;
    const presets: Record<string, [number, number]> = {
      Single: [75, 36], Twin: [75, 39], Double: [75, 48],
      Queen: [78, 60], King: [78, 72], "Super King": [84, 72],
    };
    const [l, w] = presets[mattressType] ?? [75, 36];
    setLengthIn(l);
    setWidthIn(w);
  }, [mattressType, customDimensions]);

  // Generate BOM defaults
  const generateDefaults = useCallback(() => {
    if (loadingRates || coreType !== "Spring") {
      setBomItems([]);
      return;
    }
    const config: MattressConfig = {
      channel: channel as MattressConfig["channel"],
      springType: springType as MattressConfig["springType"],
      sides: sides as MattressConfig["sides"],
      boxType: boxType as MattressConfig["boxType"],
      packType: packType as MattressConfig["packType"],
      model: model as MattressConfig["model"],
      thicknessIn, lengthIn, widthIn,
    };
    const bom = calculateBOM(config, materialRates);
    setBomItems(bom.items.map((item, i) => ({
      ...item,
      id: `bom-${i}-${item.material.slice(0, 10)}`,
    })));
  }, [channel, springType, sides, boxType, packType, model, thicknessIn, lengthIn, widthIn, materialRates, loadingRates, coreType]);

  useEffect(() => {
    generateDefaults();
  }, [generateDefaults]);

  const handleBOMChange = (id: string, field: "qty" | "rate" | "material", value: number | string) => {
    setBomItems(prev => prev.map(item =>
      item.id === id ? {
        ...item,
        [field]: value,
        amount: field === "qty" ? (value as number) * item.rate : field === "rate" ? item.qty * (value as number) : item.amount,
      } : item
    ));
  };

  // Computed
  const totalRMCost = bomItems.reduce((s, i) => s + i.qty * i.rate, 0);
  const sqFt = Math.round(lengthIn * widthIn / 144 * 100) / 100;
  const rmCostPerSqFt = sqFt > 0 ? Math.round(totalRMCost / sqFt * 100) / 100 : 0;
  const wastageAmt = Math.round(rmCostPerSqFt * (wastagePercent / 100) * 100) / 100;
  const finalRMCostPerSqFt = Math.round((rmCostPerSqFt + wastageAmt) * 100) / 100;

  const handleCalculate = async () => {
    if (!user) return;
    if (coreType !== "Spring") { toast.info("Foam and Coir costing coming soon."); return; }
    if (bomItems.length === 0) { toast.error("No BOM items."); return; }

    setSaving(true);
    try {
      const { data: config, error: configErr } = await supabase
        .from("costing_configs")
        .insert({
          user_id: user.id, mattress_type: mattressType, costing_type: channel,
          type: model, category: `${springType} - ${coreType} Mattress`,
          size: `${thicknessIn} inch`, custom_dimensions: customDimensions,
          length_in: lengthIn, width_in: widthIn, foam_type: "18D PU Foam",
          foam_density: 18, spring_type: springType, spring_density: 40,
          coir_type: "Rubberized Coir", fabric_type: "Panel Fabric",
          glue_type: "Yellow Bond Gum", channel, sides, box_type: boxType,
          pack_type: packType, model, thickness_in: thicknessIn,
          spring_wire: springType === "Bonnell" ? "2.2mm Grade II" : "1.8mm Grade II",
          spring_turns: 5,
          spring_count: bomItems.find(i => i.category === "Spring Core")?.qty ?? 420,
          spring_weight_kg: 9.45, wastage_percent: wastagePercent,
        })
        .select().single();

      if (configErr || !config) { toast.error("Failed to save configuration"); return; }

      const costItems = bomItems.map(i => ({
        slNo: i.slNo, category: i.category, material: i.material,
        unit: i.unit, qty: i.qty, rate: i.rate, cost: Math.round(i.qty * i.rate * 100) / 100,
      }));

      const { error: resultErr } = await supabase.from("costing_results").insert({
        user_id: user.id, config_id: config.id, cost_items: costItems,
        total_material_cost: Math.round(totalRMCost * 100) / 100,
        labour_overhead: 0, total_cost: Math.round(totalRMCost * 100) / 100,
        profit_percent: 0, profit: 0, selling_price: Math.round(totalRMCost * 100) / 100,
      });

      if (resultErr) { toast.error("Failed to save results"); return; }
      navigate("/results");
    } finally { setSaving(false); }
  };

  const groupedBOM = bomItems.reduce<Record<string, EditableBOMItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mattress Costing" />

      <main className="mx-auto max-w-7xl p-6 space-y-6">

        {/* ── Slide Tabs ── */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1.5">
          <button
            onClick={() => setActiveSlide("config")}
            className={`flex items-center gap-2 flex-1 justify-center rounded-lg py-3 px-6 text-sm font-semibold transition-all ${
              activeSlide === "config"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Configuration
          </button>
          <button
            onClick={() => setActiveSlide("bom")}
            className={`flex items-center gap-2 flex-1 justify-center rounded-lg py-3 px-6 text-sm font-semibold transition-all ${
              activeSlide === "bom"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableProperties className="h-4 w-4" />
            Bill of Materials
            {bomItems.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{bomItems.length}</Badge>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 1: CONFIGURATION (Dropdowns)
           ══════════════════════════════════════════════════════════════════ */}
        {activeSlide === "config" && (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">

            {/* ── Column 1: Mattress Selections ── */}
            <div className="space-y-4">
              <SectionCard title="Mattress Configuration">
                <Field label="Channel">
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Institution">Institution</SelectItem>
                      <SelectItem value="Ecom">Ecom</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Core Type">
                  <Select value={coreType} onValueChange={setCoreType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Spring">Spring</SelectItem>
                      <SelectItem value="Foam" disabled>Foam (Coming Soon)</SelectItem>
                      <SelectItem value="Coir" disabled>Coir (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {coreType === "Spring" && (
                  <Field label="Spring Type">
                    <Select value={springType} onValueChange={setSpringType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="Bonnell">Bonnell</SelectItem>
                        <SelectItem value="Pocketed">Pocketed</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field label="Sides">
                  <Select value={sides} onValueChange={setSides}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Single Side">Single Side</SelectItem>
                      <SelectItem value="Double Side">Double Side</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Box Type">
                  <Select value={boxType} onValueChange={setBoxType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="With Box">With Box</SelectItem>
                      <SelectItem value="Without Box">Without Box</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Pack Type">
                  <Select value={packType} onValueChange={setPackType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Roll Pack">Roll Pack</SelectItem>
                      <SelectItem value="Flat Pack">Flat Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Model">
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Pillow Top">Pillow Top</SelectItem>
                      <SelectItem value="Euro Top">Euro Top</SelectItem>
                      <SelectItem value="Faux Top">Faux Top</SelectItem>
                      <SelectItem value="Soft Top">Soft Top (Zipper)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Thickness (inches)">
                  <Select value={String(thicknessIn)} onValueChange={(v) => setThicknessIn(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {THICKNESS_OPTIONS.map(t => (
                        <SelectItem key={t} value={String(t)}>{t}" inch</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Foam Layers for {thicknessIn}":</p>
                  <p>{FOAM_LAYERS[thicknessIn] || "Custom configuration"}</p>
                </div>
              </SectionCard>
            </div>

            {/* ── Column 2: Dimensions ── */}
            <div className="space-y-4">
              <SectionCard title="Dimensions">
                <Field label="Mattress Size">
                  <Select value={mattressType} onValueChange={(v) => { setMattressType(v); setCustomDimensions(false); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {["Single", "Twin", "Double", "Queen", "King", "Super King", "Custom"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Length (in)">
                    <Input type="number" value={lengthIn} onChange={(e) => { setCustomDimensions(true); setLengthIn(Number(e.target.value)); }} />
                  </Field>
                  <Field label="Width (in)">
                    <Input type="number" value={widthIn} onChange={(e) => { setCustomDimensions(true); setWidthIn(Number(e.target.value)); }} />
                  </Field>
                </div>

                <Field label="Wastage %">
                  <Input type="number" step="0.5" value={wastagePercent} onChange={(e) => setWastagePercent(Number(e.target.value) || 0)} />
                </Field>

                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-bold text-primary">{sqFt} sq.ft</span>
                </div>
              </SectionCard>

              {/* Summary */}
              <SectionCard title="Configuration Summary">
                <div className="space-y-0">
                  <InfoRow label="Channel" value={channel} />
                  <InfoRow label="Core" value={coreType === "Spring" ? `${springType} Spring` : coreType} />
                  <InfoRow label="Sides" value={sides} />
                  <InfoRow label="Box" value={boxType} />
                  <InfoRow label="Pack" value={packType} />
                  <InfoRow label="Model" value={model} />
                  <InfoRow label="Thickness" value={`${thicknessIn}"`} />
                  <InfoRow label="Size" value={`${mattressType} — ${lengthIn}" × ${widthIn}"`} />
                  <InfoRow label="Wastage" value={`${wastagePercent}%`} />
                </div>
              </SectionCard>

              {/* Cost preview */}
              <SectionCard title="Cost Preview">
                <div className="space-y-1.5">
                  <InfoRow label="BOM Items" value={bomItems.length} />
                  <InfoRow label="Total RM Cost" value={`₹ ${Math.round(totalRMCost).toLocaleString("en-IN")}`} />
                  <InfoRow label="RM / Sq.Ft" value={`₹ ${rmCostPerSqFt}`} />
                  <InfoRow label={`Wastage (${wastagePercent}%)`} value={`₹ ${wastageAmt}`} />
                  <div className="flex justify-between items-center pt-2 border-t-2 border-primary/30">
                    <span className="text-sm font-bold text-foreground">Final RM / Sq.Ft</span>
                    <span className="text-lg font-bold text-primary">₹ {finalRMCostPerSqFt}</span>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ── Column 3: hidden on config, only show on xl for balance ── */}
            <div className="hidden xl:block" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 2: BILL OF MATERIALS (Editable Table)
           ══════════════════════════════════════════════════════════════════ */}
        {activeSlide === "bom" && (
          <div className="space-y-6">

            {/* Quick config reminder bar */}
            <div className="flex flex-wrap items-center gap-3 bg-muted/60 rounded-xl px-5 py-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Config:</span>
              {[channel, `${springType} Spring`, sides, boxType, packType, model, `${thicknessIn}"`, `${lengthIn}"×${widthIn}"`].map((v, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <Badge variant="outline" className="text-[10px] font-medium">{v}</Badge>
                </span>
              ))}
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setActiveSlide("config")}>
                <Settings2 className="h-3 w-3 mr-1" /> Edit Config
              </Button>
            </div>

            <SectionCard
              title="Bill of Materials — Editable"
              badge={`${bomItems.length} items`}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={generateDefaults}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Defaults
                </Button>
              }
            >
              {loadingRates ? (
                <p className="text-muted-foreground text-sm text-center py-8">Loading material rates...</p>
              ) : bomItems.length > 0 ? (
                <div className="space-y-0">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 py-2 border-b-2 border-border sticky top-0 bg-card z-10">
                    <span className="col-span-1 text-[10px] font-bold uppercase text-muted-foreground text-center">#</span>
                    <span className="col-span-4 text-[10px] font-bold uppercase text-muted-foreground">Material</span>
                    <span className="col-span-1 text-[10px] font-bold uppercase text-muted-foreground text-center">Unit</span>
                    <span className="col-span-2 text-[10px] font-bold uppercase text-muted-foreground text-center">Qty</span>
                    <span className="col-span-2 text-[10px] font-bold uppercase text-muted-foreground text-center">Rate (₹)</span>
                    <span className="col-span-2 text-[10px] font-bold uppercase text-muted-foreground text-right">Amount (₹)</span>
                  </div>

                  {/* Grouped rows */}
                  {Object.entries(groupedBOM).map(([category, items]) => (
                    <div key={category}>
                      <div className="bg-muted/50 px-2 py-1.5 mt-3 rounded-md">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{category}</span>
                      </div>
                      {items.map(item => (
                        <BOMRow key={item.id} item={item} onChange={handleBOMChange} />
                      ))}
                    </div>
                  ))}

                  {/* Totals */}
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-10 text-sm font-semibold text-foreground text-right">Total RM Cost</span>
                      <span className="col-span-2 text-sm font-bold text-foreground text-right">₹ {Math.round(totalRMCost).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-10 text-sm text-muted-foreground text-right">RM Cost / Sq.Ft ({sqFt} sq.ft)</span>
                      <span className="col-span-2 text-sm font-semibold text-foreground text-right">₹ {rmCostPerSqFt}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-10 text-sm text-muted-foreground text-right">Wastage ({wastagePercent}%)</span>
                      <span className="col-span-2 text-sm font-semibold text-foreground text-right">₹ {wastageAmt}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t-2 border-primary/30">
                      <span className="col-span-10 text-sm font-bold text-foreground text-right">Final RM / Sq.Ft</span>
                      <span className="col-span-2 text-base font-bold text-primary text-right">₹ {finalRMCostPerSqFt}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">Select Spring mattress in Configuration tab to generate BOM</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Bottom Action Bar ── */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {activeSlide === "config" ? "Configure your mattress" : "Review & Save"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {bomItems.length > 0
                ? `Total RM: ₹ ${Math.round(totalRMCost).toLocaleString("en-IN")} | Final RM/Sq.Ft: ₹ ${finalRMCostPerSqFt} for ${mattressType} (${lengthIn}"×${widthIn}"×${thicknessIn}")`
                : "Configure the mattress to calculate costs"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeSlide === "config" ? (
              <Button size="lg" onClick={() => setActiveSlide("bom")} disabled={bomItems.length === 0}>
                Review BOM <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" onClick={() => setActiveSlide("config")}>
                  ← Back to Config
                </Button>
                <Button
                  size="lg"
                  className="bg-success hover:bg-success/90 text-success-foreground min-w-[180px]"
                  onClick={handleCalculate}
                  disabled={bomItems.length === 0 || saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save & Calculate"}
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Configuration;
