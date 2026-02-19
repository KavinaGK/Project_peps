import { useState, useEffect, useMemo } from "react";
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
import { calculateBOM, type MattressConfig } from "@/lib/mattressFormulas";
import { ChevronRight } from "lucide-react";

// ── Workflow step config ───────────────────────────────────────────────────

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

// Step indicator component
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

// Section card
const SectionCard = ({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) => (
  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
    <div className="section-header flex items-center justify-between">
      <span>{title}</span>
      {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

// Field row
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

// Info row (read-only display)
const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const Configuration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Step 1: Channel
  const [channel, setChannel] = useState<"Retail" | "Institution" | "Ecom">("Retail");

  // ── Step 2: Core Type
  const [coreType, setCoreType] = useState<"Spring" | "Foam" | "Coir">("Spring");
  const [springType, setSpringType] = useState<"Bonnell" | "Pocketed">("Pocketed");

  // ── Step 3: Sides
  const [sides, setSides] = useState<"Single Side" | "Double Side">("Double Side");

  // ── Step 4: Box Type
  const [boxType, setBoxType] = useState<"With Box" | "Without Box">("With Box");

  // ── Step 5: Pack Type
  const [packType, setPackType] = useState<"Roll Pack" | "Flat Pack">("Roll Pack");

  // ── Step 6: Model
  const [model, setModel] = useState<"Normal" | "Pillow Top" | "Euro Top" | "Faux Top" | "Soft Top">("Normal");

  // ── Step 7: Thickness
  const [thicknessIn, setThicknessIn] = useState<number>(6);

  // ── Dimensions
  const [customDimensions, setCustomDimensions] = useState(false);
  const [lengthIn, setLengthIn] = useState(75);
  const [widthIn, setWidthIn] = useState(36);
  const [mattressType, setMattressType] = useState("Single");

  // ── Material rates from DB ──
  const [materialRates, setMaterialRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(true);

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
      "Twin": [75, 39],
      Double: [75, 48],
      Queen: [78, 60],
      King: [78, 72],
      "Super King": [84, 72],
    };
    const [l, w] = presets[mattressType] ?? [75, 36];
    setLengthIn(l);
    setWidthIn(w);
  }, [mattressType, customDimensions]);

  // Soft-top → Zipper Mattress note
  const isZipperMattress = model === "Soft Top";

  // Derived BOM preview (live calculation)
  const bomPreview = useMemo(() => {
    if (loadingRates || coreType !== "Spring") return null;
    const config: MattressConfig = {
      channel,
      springType,
      sides,
      boxType,
      packType,
      model,
      thicknessIn,
      lengthIn,
      widthIn,
    };
    return calculateBOM(config, materialRates);
  }, [channel, springType, sides, boxType, packType, model, thicknessIn, lengthIn, widthIn, materialRates, loadingRates, coreType]);

  const sqFt = Math.round(lengthIn * widthIn / 144 * 100) / 100;

  const handleCalculate = async () => {
    if (!user) return;
    if (coreType !== "Spring") {
      toast.info("Foam and Coir costing coming soon. Currently only Spring mattresses are supported.");
      return;
    }
    if (!bomPreview) {
      toast.error("BOM calculation failed. Please check your inputs.");
      return;
    }

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
        spring_count: bomPreview.items.find(i => i.category === "Spring Core")?.qty ?? 420,
        spring_weight_kg: 9.45,
        wastage_percent: bomPreview.wastagePercent,
      })
      .select()
      .single();

    if (configErr || !config) {
      toast.error("Failed to save configuration");
      return;
    }

    // Build cost items for the results table
    const costItems = bomPreview.items.map(i => ({
      slNo: i.slNo,
      category: i.category,
      material: i.material,
      unit: i.unit,
      qty: i.qty,
      rate: i.rate,
      cost: i.amount,
    }));

    const totalMaterialCost = bomPreview.totalRMCost;
    const labourOverhead = 0;
    const totalCost = totalMaterialCost;

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

            {/* Step 1: Channel */}
            <SectionCard title="Step 1 — Channel" badge={channel}>
              <div className="grid grid-cols-3 gap-2">
                {(["Retail", "Institution", "Ecom"] as const).map(c => (
                  <button key={c}
                    onClick={() => setChannel(c)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                      channel === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{c}</button>
                ))}
              </div>
            </SectionCard>

            {/* Step 2: Core Type */}
            <SectionCard title="Step 2 — Core Type">
              <div className="grid grid-cols-3 gap-2">
                {(["Spring", "Foam", "Coir"] as const).map(c => (
                  <button key={c}
                    onClick={() => setCoreType(c)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all relative ${
                      coreType === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {c}
                    {c !== "Spring" && <span className="absolute -top-1 -right-1 text-[9px] bg-warning text-warning-foreground px-1 rounded-full">Soon</span>}
                  </button>
                ))}
              </div>

              {coreType === "Spring" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["Bonnell", "Pocketed"] as const).map(t => (
                    <button key={t}
                      onClick={() => setSpringType(t)}
                      className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                        springType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Step 3: Sides */}
            <SectionCard title="Step 3 — Sides">
              <div className="grid grid-cols-2 gap-2">
                {(["Single Side", "Double Side"] as const).map(s => (
                  <button key={s}
                    onClick={() => setSides(s)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                      sides === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{s}</button>
                ))}
              </div>
            </SectionCard>

            {/* Step 4: Box Type */}
            <SectionCard title="Step 4 — Box Type">
              <div className="grid grid-cols-2 gap-2">
                {(["With Box", "Without Box"] as const).map(b => (
                  <button key={b}
                    onClick={() => setBoxType(b)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                      boxType === b ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{b}</button>
                ))}
              </div>
              {boxType === "With Box" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  Box construction includes 40D sidewall foam
                </p>
              )}
            </SectionCard>
          </div>

          {/* ── MIDDLE COLUMN: Steps 5–7 + Dimensions ── */}
          <div className="space-y-4">

            {/* Step 5: Pack Type */}
            <SectionCard title="Step 5 — Pack Type">
              <div className="grid grid-cols-2 gap-2">
                {(["Roll Pack", "Flat Pack"] as const).map(p => (
                  <button key={p}
                    onClick={() => setPackType(p)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                      packType === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{p}</button>
                ))}
              </div>
            </SectionCard>

            {/* Step 6: Model */}
            <SectionCard title="Step 6 — Model">
              <div className="grid grid-cols-2 gap-2">
                {(["Normal", "Pillow Top", "Euro Top", "Faux Top", "Soft Top"] as const).map(m => (
                  <button key={m}
                    onClick={() => setModel(m)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                      model === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {isZipperMattress && (
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-2.5 text-xs font-semibold text-warning-foreground">
                  ⚡ Soft Top → Zipper Mattress
                </div>
              )}
            </SectionCard>

            {/* Step 7: Thickness */}
            <SectionCard title="Step 7 — Thickness">
              <div className="grid grid-cols-5 gap-2">
                {THICKNESS_OPTIONS.map(t => (
                  <button key={t}
                    onClick={() => setThicknessIn(t)}
                    className={`rounded-lg border-2 py-2 text-sm font-bold transition-all ${
                      thicknessIn === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >{t}"</button>
                ))}
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Foam Layers for {thicknessIn}":</p>
                <p>{FOAM_LAYERS[thicknessIn] || "Custom configuration"}</p>
              </div>
            </SectionCard>

            {/* Dimensions */}
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
                  <Input
                    type="number"
                    value={lengthIn}
                    onChange={(e) => { setCustomDimensions(true); setLengthIn(Number(e.target.value)); }}
                  />
                </Field>
                <Field label="Width (inches)">
                  <Input
                    type="number"
                    value={widthIn}
                    onChange={(e) => { setCustomDimensions(true); setWidthIn(Number(e.target.value)); }}
                  />
                </Field>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Area (Sq.Ft)</span>
                <span className="font-bold text-primary">{sqFt} sq.ft</span>
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN: Live BOM Preview ── */}
          <div className="space-y-4">
            <SectionCard title="Live BOM Preview" badge={`${bomPreview?.items.length ?? 0} items`}>
              {loadingRates ? (
                <p className="text-muted-foreground text-sm text-center py-4">Loading rates...</p>
              ) : bomPreview ? (
                <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
                  {/* Group by category */}
                  {Array.from(new Set(bomPreview.items.map(i => i.category))).map(cat => {
                    const catItems = bomPreview.items.filter(i => i.category === cat);
                    return (
                      <div key={cat}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3 mb-1">{cat}</p>
                        {catItems.map(item => (
                          <div key={item.slNo} className="flex justify-between items-start py-1 border-b border-border/30 last:border-0 gap-2">
                            <span className="text-xs text-foreground leading-tight flex-1">{item.material}</span>
                            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">Select Spring mattress to preview BOM</p>
              )}

              {bomPreview && (
                <>
                  <Separator />
                  <div className="space-y-1.5 pt-1">
                    <InfoRow label="Total RM Cost" value={`₹ ${bomPreview.totalRMCost.toLocaleString("en-IN")}`} />
                    <InfoRow label="Area" value={`${bomPreview.sqFt} sq.ft`} />
                    <InfoRow label="RM Cost / Sq.Ft" value={`₹ ${bomPreview.rmCostPerSqFt.toLocaleString("en-IN")}`} />
                    <InfoRow label={`Wastage (${bomPreview.wastagePercent}%)`} value={`₹ ${bomPreview.wastageAmt.toLocaleString("en-IN")}`} />
                    <div className="flex justify-between items-center pt-1.5 border-t-2 border-primary/30">
                      <span className="text-sm font-bold text-foreground">Final RM / Sq.Ft</span>
                      <span className="text-base font-bold text-primary">₹ {bomPreview.finalRMCostPerSqFt.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </>
              )}
            </SectionCard>

            {/* Config Summary */}
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
          </div>
        </div>

        {/* ── Calculate Bar ── */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground">Ready to Calculate?</h3>
            <p className="text-sm text-muted-foreground">
              {bomPreview
                ? `Estimated RM Cost: ₹ ${bomPreview.totalRMCost.toLocaleString("en-IN")} for ${mattressType} (${lengthIn}"×${widthIn}"×${thicknessIn}")`
                : "Configure the mattress above to calculate costs"}
            </p>
          </div>
          <Button
            size="lg"
            className="bg-success hover:bg-success/90 text-success-foreground min-w-[200px]"
            onClick={handleCalculate}
            disabled={!bomPreview}
          >
            Save & Calculate
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Configuration;
