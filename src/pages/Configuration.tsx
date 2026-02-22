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
import { ChevronRight, RotateCcw, Save } from "lucide-react";

// ── Workflow step config ─────────────────────────────────────────────────

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

// ── UI helper components ─────────────────────────────────────────────────

const StepBadge = ({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
    active ? "bg-primary text-primary-foreground" :
    done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
  }`}>
    <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
      active ? "bg-primary-foreground text-primary" :
      done ? "bg-success text-white" : "bg-muted-foreground/30 text-muted-foreground"
    }`}>{done ? "✓" : step}</span>
    {label}
  </div>
);

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

const OptionButton = ({ selected, onClick, children, disabled, badge }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; badge?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all relative ${
      selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {children}
    {badge && <span className="absolute -top-1 -right-1 text-[9px] bg-warning text-warning-foreground px-1 rounded-full">{badge}</span>}
  </button>
);

// ── Editable BOM row ─────────────────────────────────────────────────────

interface EditableBOMItem extends BOMItem {
  id: string;
}

const BOMRow = ({ item, onChange }: { item: EditableBOMItem; onChange: (id: string, field: "qty" | "rate", value: number) => void }) => (
  <div className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-border/30 last:border-0">
    <span className="col-span-1 text-xs text-muted-foreground text-center">{item.slNo}</span>
    <span className="col-span-4 text-xs text-foreground leading-tight">{item.material}</span>
    <span className="col-span-1 text-xs text-muted-foreground text-center">{item.unit}</span>
    <div className="col-span-2">
      <Input
        type="number"
        step="0.01"
        value={item.qty}
        onChange={(e) => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
        className="h-7 text-xs text-center px-1"
      />
    </div>
    <div className="col-span-2">
      <Input
        type="number"
        step="0.01"
        value={item.rate}
        onChange={(e) => onChange(item.id, "rate", parseFloat(e.target.value) || 0)}
        className="h-7 text-xs text-center px-1"
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

  // Workflow selections
  const [channel, setChannel] = useState<"Retail" | "Institution" | "Ecom">("Retail");
  const [coreType, setCoreType] = useState<"Spring" | "Foam" | "Coir">("Spring");
  const [springType, setSpringType] = useState<"Bonnell" | "Pocketed">("Pocketed");
  const [sides, setSides] = useState<"Single Side" | "Double Side">("Double Side");
  const [boxType, setBoxType] = useState<"With Box" | "Without Box">("With Box");
  const [packType, setPackType] = useState<"Roll Pack" | "Flat Pack">("Roll Pack");
  const [model, setModel] = useState<"Normal" | "Pillow Top" | "Euro Top" | "Faux Top" | "Soft Top">("Normal");
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

  // Auto-set dimensions from mattress type
  useEffect(() => {
    if (customDimensions) return;
    const presets: Record<string, [number, number]> = {
      Single: [75, 36],
      Twin: [75, 39],
      Double: [75, 48],
      Queen: [78, 60],
      King: [78, 72],
      "Super King": [84, 72],
    };
    const [l, w] = presets[mattressType] ?? [75, 36];
    setLengthIn(l);
    setWidthIn(w);
  }, [mattressType, customDimensions]);

  // Generate BOM defaults from formulas (can be overridden by user)
  const generateDefaults = useCallback(() => {
    if (loadingRates || coreType !== "Spring") {
      setBomItems([]);
      return;
    }
    const config: MattressConfig = {
      channel, springType, sides, boxType, packType, model, thicknessIn, lengthIn, widthIn,
    };
    const bom = calculateBOM(config, materialRates);
    setBomItems(bom.items.map((item, i) => ({
      ...item,
      id: `bom-${i}-${item.material.slice(0, 10)}`,
    })));
  }, [channel, springType, sides, boxType, packType, model, thicknessIn, lengthIn, widthIn, materialRates, loadingRates, coreType]);

  // Auto-generate on config changes
  useEffect(() => {
    generateDefaults();
  }, [generateDefaults]);

  // Handle individual BOM item edit
  const handleBOMChange = (id: string, field: "qty" | "rate", value: number) => {
    setBomItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value, amount: field === "qty" ? value * item.rate : item.qty * value } : item
    ));
  };

  // Computed totals
  const totalRMCost = bomItems.reduce((s, i) => s + i.qty * i.rate, 0);
  const sqFt = Math.round(lengthIn * widthIn / 144 * 100) / 100;
  const rmCostPerSqFt = sqFt > 0 ? Math.round(totalRMCost / sqFt * 100) / 100 : 0;
  const wastageAmt = Math.round(rmCostPerSqFt * (wastagePercent / 100) * 100) / 100;
  const finalRMCostPerSqFt = Math.round((rmCostPerSqFt + wastageAmt) * 100) / 100;
  const isZipperMattress = model === "Soft Top";

  const handleCalculate = async () => {
    if (!user) return;
    if (coreType !== "Spring") {
      toast.info("Foam and Coir costing coming soon.");
      return;
    }
    if (bomItems.length === 0) {
      toast.error("No BOM items. Please configure the mattress.");
      return;
    }

    setSaving(true);
    try {
      const { data: config, error: configErr } = await supabase
        .from("costing_configs")
        .insert({
          user_id: user.id,
          mattress_type: mattressType,
          costing_type: channel,
          type: model,
          category: `${springType} - ${coreType} Mattress`,
          size: `${thicknessIn} inch`,
          custom_dimensions: customDimensions,
          length_in: lengthIn,
          width_in: widthIn,
          foam_type: "18D PU Foam",
          foam_density: 18,
          spring_type: springType,
          spring_density: 40,
          coir_type: "Rubberized Coir",
          fabric_type: "Panel Fabric",
          glue_type: "Yellow Bond Gum",
          channel,
          sides,
          box_type: boxType,
          pack_type: packType,
          model,
          thickness_in: thicknessIn,
          spring_wire: springType === "Bonnell" ? "2.2mm Grade II" : "1.8mm Grade II",
          spring_turns: 5,
          spring_count: bomItems.find(i => i.category === "Spring Core")?.qty ?? 420,
          spring_weight_kg: 9.45,
          wastage_percent: wastagePercent,
        })
        .select()
        .single();

      if (configErr || !config) {
        toast.error("Failed to save configuration");
        return;
      }

      const costItems = bomItems.map(i => ({
        slNo: i.slNo,
        category: i.category,
        material: i.material,
        unit: i.unit,
        qty: i.qty,
        rate: i.rate,
        cost: Math.round(i.qty * i.rate * 100) / 100,
      }));

      const { error: resultErr } = await supabase.from("costing_results").insert({
        user_id: user.id,
        config_id: config.id,
        cost_items: costItems,
        total_material_cost: Math.round(totalRMCost * 100) / 100,
        labour_overhead: 0,
        total_cost: Math.round(totalRMCost * 100) / 100,
        profit_percent: 0,
        profit: 0,
        selling_price: Math.round(totalRMCost * 100) / 100,
      });

      if (resultErr) {
        toast.error("Failed to save results");
        return;
      }

      navigate("/results");
    } finally {
      setSaving(false);
    }
  };

  // Group BOM items by category
  const groupedBOM = bomItems.reduce<Record<string, EditableBOMItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mattress Costing — Configuration" />

      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Workflow breadcrumb */}
        <div className="flex flex-wrap items-center gap-2">
          {["Channel", "Core", "Sides", "Box", "Pack", "Model", "Thickness", "Dimensions"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <StepBadge step={i + 1} label={s} active={false} done={false} />
              {i < 7 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {/* ── LEFT COLUMN: Steps 1–4 ── */}
          <div className="space-y-4">
            <SectionCard title="Step 1 — Channel" badge={channel}>
              <div className="grid grid-cols-3 gap-2">
                {(["Retail", "Institution", "Ecom"] as const).map(c => (
                  <OptionButton key={c} selected={channel === c} onClick={() => setChannel(c)}>{c}</OptionButton>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Step 2 — Core Type">
              <div className="grid grid-cols-3 gap-2">
                {(["Spring", "Foam", "Coir"] as const).map(c => (
                  <OptionButton key={c} selected={coreType === c} onClick={() => setCoreType(c)} badge={c !== "Spring" ? "Soon" : undefined}>
                    {c}
                  </OptionButton>
                ))}
              </div>
              {coreType === "Spring" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["Bonnell", "Pocketed"] as const).map(t => (
                    <OptionButton key={t} selected={springType === t} onClick={() => setSpringType(t)}>{t}</OptionButton>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Step 3 — Sides">
              <div className="grid grid-cols-2 gap-2">
                {(["Single Side", "Double Side"] as const).map(s => (
                  <OptionButton key={s} selected={sides === s} onClick={() => setSides(s)}>{s}</OptionButton>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Step 4 — Box Type">
              <div className="grid grid-cols-2 gap-2">
                {(["With Box", "Without Box"] as const).map(b => (
                  <OptionButton key={b} selected={boxType === b} onClick={() => setBoxType(b)}>{b}</OptionButton>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* ── MIDDLE COLUMN: Steps 5–7 + Dimensions ── */}
          <div className="space-y-4">
            <SectionCard title="Step 5 — Pack Type">
              <div className="grid grid-cols-2 gap-2">
                {(["Roll Pack", "Flat Pack"] as const).map(p => (
                  <OptionButton key={p} selected={packType === p} onClick={() => setPackType(p)}>{p}</OptionButton>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Step 6 — Model">
              <div className="grid grid-cols-2 gap-2">
                {(["Normal", "Pillow Top", "Euro Top", "Faux Top", "Soft Top"] as const).map(m => (
                  <OptionButton key={m} selected={model === m} onClick={() => setModel(m)}>{m}</OptionButton>
                ))}
              </div>
              {isZipperMattress && (
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-2.5 text-xs font-semibold text-warning-foreground">
                  ⚡ Soft Top → Zipper Mattress
                </div>
              )}
            </SectionCard>

            <SectionCard title="Step 7 — Thickness">
              <div className="grid grid-cols-5 gap-2">
                {THICKNESS_OPTIONS.map(t => (
                  <OptionButton key={t} selected={thicknessIn === t} onClick={() => setThicknessIn(t)}>{t}"</OptionButton>
                ))}
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Foam Layers for {thicknessIn}":</p>
                <p>{FOAM_LAYERS[thicknessIn] || "Custom configuration"}</p>
              </div>
            </SectionCard>

            <SectionCard title="Dimensions">
              <Field label="Mattress Type (preset)">
                <Select value={mattressType} onValueChange={(v) => { setMattressType(v); setCustomDimensions(false); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Single", "Twin", "Double", "Queen", "King", "Super King"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Length (inches)">
                  <Input type="number" value={lengthIn} onChange={(e) => { setCustomDimensions(true); setLengthIn(Number(e.target.value)); }} />
                </Field>
                <Field label="Width (inches)">
                  <Input type="number" value={widthIn} onChange={(e) => { setCustomDimensions(true); setWidthIn(Number(e.target.value)); }} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Wastage %">
                  <Input type="number" step="0.5" value={wastagePercent} onChange={(e) => setWastagePercent(Number(e.target.value) || 0)} />
                </Field>
                <div className="flex items-end">
                  <div className="flex justify-between text-sm w-full pb-2">
                    <span className="text-muted-foreground">Area</span>
                    <span className="font-bold text-primary">{sqFt} sq.ft</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN: Configuration Summary ── */}
          <div className="space-y-4">
            <SectionCard title="Configuration Summary">
              <div className="space-y-0">
                <InfoRow label="Channel" value={channel} />
                <InfoRow label="Core" value={coreType === "Spring" ? `${springType} Spring` : coreType} />
                <InfoRow label="Sides" value={sides} />
                <InfoRow label="Box" value={boxType} />
                <InfoRow label="Pack" value={packType} />
                <InfoRow label="Model" value={model + (isZipperMattress ? " (Zipper)" : "")} />
                <InfoRow label="Thickness" value={`${thicknessIn}"`} />
                <InfoRow label="Size" value={`${lengthIn}" × ${widthIn}"`} />
              </div>
            </SectionCard>

            <SectionCard title="Cost Summary">
              <div className="space-y-1.5">
                <InfoRow label="Total RM Cost" value={`₹ ${Math.round(totalRMCost).toLocaleString("en-IN")}`} />
                <InfoRow label="Area" value={`${sqFt} sq.ft`} />
                <InfoRow label="RM Cost / Sq.Ft" value={`₹ ${rmCostPerSqFt.toLocaleString("en-IN")}`} />
                <InfoRow label={`Wastage (${wastagePercent}%)`} value={`₹ ${wastageAmt.toLocaleString("en-IN")}`} />
                <div className="flex justify-between items-center pt-2 border-t-2 border-primary/30">
                  <span className="text-sm font-bold text-foreground">Final RM / Sq.Ft</span>
                  <span className="text-lg font-bold text-primary">₹ {finalRMCostPerSqFt.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ── FULL WIDTH: Editable BOM Table ── */}
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
              Reset to Defaults
            </Button>
          }
        >
          {loadingRates ? (
            <p className="text-muted-foreground text-sm text-center py-8">Loading material rates...</p>
          ) : bomItems.length > 0 ? (
            <div className="space-y-0">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b-2 border-border">
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
                  <div className="bg-muted/50 px-2 py-1.5 mt-2 rounded-md">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{category}</span>
                  </div>
                  {items.map(item => (
                    <BOMRow key={item.id} item={item} onChange={handleBOMChange} />
                  ))}
                </div>
              ))}

              {/* Totals */}
              <Separator className="my-3" />
              <div className="grid grid-cols-12 gap-2 items-center py-2">
                <span className="col-span-10 text-sm font-bold text-foreground text-right">Total RM Cost</span>
                <span className="col-span-2 text-sm font-bold text-primary text-right">
                  ₹ {Math.round(totalRMCost).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Select Spring mattress to generate BOM</p>
          )}
        </SectionCard>

        {/* ── Calculate Bar ── */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground">Ready to Calculate?</h3>
            <p className="text-sm text-muted-foreground">
              {bomItems.length > 0
                ? `Total RM: ₹ ${Math.round(totalRMCost).toLocaleString("en-IN")} | Final RM/Sq.Ft: ₹ ${finalRMCostPerSqFt} for ${mattressType} (${lengthIn}"×${widthIn}"×${thicknessIn}")`
                : "Configure the mattress above to calculate costs"}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-success hover:bg-success/90 text-success-foreground min-w-[200px]"
            onClick={handleCalculate}
            disabled={bomItems.length === 0 || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save & Calculate"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Configuration;
