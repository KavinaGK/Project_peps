/**
 * Mattress BOM Calculation Formulas
 * Derived from PEPS Industries Excel costing sheets
 */

export interface MattressConfig {
  // Channel
  channel: "Retail" | "Institution" | "Ecom";
  // Spring type
  springType: "Bonnell" | "Pocketed";
  // Sides
  sides: "Single Side" | "Double Side";
  // Box type
  boxType: "With Box" | "Without Box";
  // Pack type
  packType: "Roll Pack" | "Flat Pack";
  // Model
  model: "Normal" | "Pillow Top" | "Euro Top" | "Faux Top" | "Soft Top";
  // Thickness (inches)
  thicknessIn: number;
  // Dimensions (inches)
  lengthIn: number;
  widthIn: number;
}

export interface BOMItem {
  slNo: number;
  category: string;
  material: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface BOMResult {
  items: BOMItem[];
  totalRMCost: number;
  sqFt: number;
  rmCostPerSqFt: number;
  wastagePercent: number;
  wastageAmt: number;
  finalRMCostPerSqFt: number;
}

/** Convert inches to meters */
const inToM = (inches: number) => inches * 0.0254;

/** 
 * Calculate spring count based on mattress dimensions and spring type.
 * Bonnell: 24x8=192 (for 75x36 standard), Pocketed: 30x14=420 or 30x15=450
 */
export function calcSpringCount(
  lengthIn: number,
  widthIn: number,
  springType: "Bonnell" | "Pocketed"
): number {
  if (springType === "Bonnell") {
    // Based on 24x8=192 for 75x36 — scale proportionally
    const cols = Math.round((lengthIn / 75) * 24);
    const rows = Math.round((widthIn / 36) * 8);
    return cols * rows;
  } else {
    // Pocketed: 30x14=420 for 75x36
    const cols = Math.round((lengthIn / 75) * 30);
    const rows = Math.round((widthIn / 36) * 14);
    return cols * rows;
  }
}

/**
 * Calculate spring weight in kg based on thickness and spring type.
 * Bonnell wire: 2.2mm Grade II, Pocketed: 1.8mm Grade II
 * Weight per spring varies by height (turns).
 */
export function calcSpringWeightKg(
  thicknessIn: number,
  springType: "Bonnell" | "Pocketed",
  springCount: number
): number {
  if (springType === "Bonnell") {
    // Per Excel: 110mm=5.26kg, 130mm=5.95kg, 150mm=6.76kg, 170mm=6.95kg
    // Formula: cols*rows*weightPerSpring (in kg)
    const heightMm = thicknessIn * 25.4;
    let kgPerSpring: number;
    if (heightMm <= 110) kgPerSpring = 0.0274;
    else if (heightMm <= 130) kgPerSpring = 0.031;
    else if (heightMm <= 150) kgPerSpring = 0.0352;
    else if (heightMm <= 170) kgPerSpring = 0.0362;
    else kgPerSpring = 0.0374;
    return Math.round(springCount * kgPerSpring * 100) / 100;
  } else {
    // Pocketed springs counted per unit (nos), not kg
    // Per Excel: 420 springs @ ₹3.28/nos for 75x36
    // Return number of springs
    return springCount; // in "nos" for pocketed
  }
}

/**
 * Spiral wire for Bonnell: 46 strips * 0.0266kg = 1.22kg for 75x36
 */
export function calcSpiralWireKg(lengthIn: number): number {
  const strips = Math.round((lengthIn / 75) * 46);
  return Math.round(strips * 0.0266 * 100) / 100;
}

/**
 * Border wire: 4mm, ~0.05kg per side, 2 sides = 1kg for 75x36
 */
export function calcBorderWireKg(_lengthIn: number, _widthIn: number): number {
  return 1.0; // constant from Excel
}

/**
 * Cotton felt: 700GSM or 900GSM
 * Formula: (L+2)*0.0254 * (W+2)*0.0254 * gsm * sides / 1000
 */
export function calcCottonFeltKg(
  lengthIn: number,
  widthIn: number,
  gsm: number,
  sides: number
): number {
  const kg = (lengthIn + 2) * 0.0254 * (widthIn + 2) * 0.0254 * gsm * sides / 1000;
  return Math.round(kg * 100) / 100;
}

/**
 * 18D PU Foam (padding): 
 * Formula from Excel: (L*0.0254 * W*0.0254 * thickness_m * density) kg
 * 18D, 10mm: ~0.9kg per side for 75x36
 */
export function calcFoamKg(
  lengthIn: number,
  widthIn: number,
  thicknessMm: number,
  density: number,
  sides: number = 1
): number {
  const kg = lengthIn * 0.0254 * widthIn * 0.0254 * (thicknessMm / 1000) * density * sides;
  return Math.round(kg * 100) / 100;
}

/**
 * 10D LD foam (bottom quilt): 8mm
 * Per Excel: ~0.16kg for 75x36
 */
export function calcLDFoamKg(lengthIn: number, widthIn: number, thicknessMm = 8): number {
  return calcFoamKg(lengthIn, widthIn, thicknessMm, 10, 1);
}

/**
 * Rebonded/comfort foam for thicker mattresses
 */
export function calcRebondedFoamKg(
  lengthIn: number,
  widthIn: number,
  thicknessMm: number,
  density = 70
): number {
  return calcFoamKg(lengthIn, widthIn, thicknessMm, density, 1);
}

/**
 * Panel fabric (knitted/FR): (W+3)*0.0254*2 = ~1.98m for 36" wide
 * Per Excel: 0.99m top + 0.99m bottom = 1.98m
 */
export function calcPanelFabricMtr(widthIn: number): number {
  return Math.round((widthIn + 3) * 0.0254 * 2 * 100) / 100;
}

/**
 * Border fabric:
 * Perimeter = (L+W+L+W) * 0.0254
 * Divide by fabric roll width (84cm / rpt size)
 * Per Excel: ~0.5m for 75x36 (FR), or ~0.53m for knitted
 */
export function calcBorderFabricMtr(
  lengthIn: number,
  widthIn: number,
  thicknessIn: number,
  fabricWidthCm = 84,
  repeatCm = 7.87
): number {
  const perimeterM = (lengthIn + widthIn) * 2 * 0.0254;
  const widthMtr = fabricWidthCm / repeatCm / 100;
  const mtr = perimeterM / (fabricWidthCm / ((thicknessIn * 25.4) + 10) * 0.1);
  // Simplified from Excel: (222*0.0254) / (84/rpt) 
  const perimeter = (2 * (lengthIn + widthIn)) * 0.0254;
  const rpt = fabricWidthCm / (thicknessIn * 25.4 + 10);
  return Math.round((perimeter / (fabricWidthCm / rpt / 100)) * 100) / 100 || 0.5;
}

/**
 * Tape edge (42mm):
 * Formula: (2*(L+W)*0.0254) + (thickness*0.0254*2)
 * = 222*0.0254 + 6*0.0254*2 = 11.58m for 75x36x6
 */
export function calcTapeEdgeMtr(lengthIn: number, widthIn: number, thicknessIn: number): number {
  const perimeter = 2 * (lengthIn + widthIn) * 0.0254;
  const height = thicknessIn * 0.0254 * 2;
  return Math.round((perimeter + height) * 100) / 100;
}

/**
 * PVC packing weight:
 * 50 micron for 6" & 8", 90 micron for 10"+
 * Formula: ((W*2 + thickness*2)*0.0254) * 2.2733 * micron/1000000 * 1300
 */
export function calcPVCKg(widthIn: number, thicknessIn: number): number {
  const micron = thicknessIn <= 8 ? 50 : 90;
  const kg = ((widthIn * 2 + thicknessIn * 2) * 0.0254) * 2.2733 * (micron / 1000000) * 1300;
  return Math.round(kg * 1000) / 1000;
}

/**
 * Centre band weight:
 * Formula: (L+W+thickness+0.5)*0.0254 * 0.034 (for 36" width)
 */
export function calcCentreBandKg(lengthIn: number, widthIn: number, thicknessIn: number): number {
  const circumference = (lengthIn + widthIn + thicknessIn + 0.5) * 0.0254;
  // Adjusted from Excel: 0.034 kg/m for 36" width mattress band
  const kgPerM = 0.034 * (widthIn / 36);
  return Math.round(circumference * kgPerM * 1000) / 1000;
}

/**
 * Thread calculations from Excel formulas:
 * Tape edge TKT60: (L+W+L+W+10)*0.0254*(4.73+1.42)*2
 * Quilting top TKT40: ((W+3)*0.0254)*(2.85*2)*27
 * Quilting bottom TKT90: (W+3)*0.0254*(1.77*2)*27
 * Flanging TKT40: (L+W+W+L)*0.0254*(2.7+4.68)
 * Border serging: (L+W+W+L)*0.0254*(5.62 + 3.3*2)
 */
export function calcThreads(lengthIn: number, widthIn: number) {
  const perimeterM = (lengthIn + widthIn * 2 + lengthIn + 10) * 0.0254;
  const perimeterBase = (lengthIn + widthIn + widthIn + lengthIn) * 0.0254;
  return {
    tapeEdgeTKT60: Math.round(perimeterM * (4.73 + 1.42) * 2 * 100) / 100,
    quiltingTopTKT40: Math.round((widthIn + 3) * 0.0254 * (2.85 * 2) * 27 * 100) / 100,
    quiltingBottomTKT90: Math.round((widthIn + 3) * 0.0254 * (1.77 * 2) * 27 * 100) / 100,
    flangingTKT40: Math.round(perimeterBase * (2.7 + 4.68) * 100) / 100,
    borderSerging: Math.round(perimeterBase * (5.62 + 3.3 * 2) * 100) / 100,
  };
}

/**
 * Sidewall foam for box construction:
 * 40D foam, height = spring height + 5mm
 * Formula: 2*(L+W)*0.0254 * height_m * 40
 */
export function calcSidewallFoamKg(
  lengthIn: number,
  widthIn: number,
  thicknessIn: number,
  density = 40
): number {
  const perimeter = 2 * (lengthIn + widthIn) * 0.0254;
  const heightM = (thicknessIn * 25.4 - 10) / 1000; // spring height
  return Math.round(perimeter * heightM * density * 100) / 100;
}

/**
 * Determine spring config based on thickness
 */
export function getSpringConfig(
  thicknessIn: number,
  springType: "Bonnell" | "Pocketed"
): { heightMm: number; turns: number; wireGrade: string } {
  const heightMm = thicknessIn * 25.4;
  if (springType === "Bonnell") {
    if (heightMm <= 110) return { heightMm: 110, turns: 4, wireGrade: "2.2mm Grade II" };
    if (heightMm <= 130) return { heightMm: 130, turns: 5, wireGrade: "2.2mm Grade II" };
    if (heightMm <= 150) return { heightMm: 150, turns: 6, wireGrade: "2.2mm Grade II" };
    if (heightMm <= 170) return { heightMm: 170, turns: 6, wireGrade: "2.2mm Grade II" };
    return { heightMm: 200, turns: 6, wireGrade: "2.2mm Grade II" };
  } else {
    if (heightMm <= 110) return { heightMm: 110, turns: 5, wireGrade: "1.8mm Grade II" };
    if (heightMm <= 130) return { heightMm: 130, turns: 5, wireGrade: "1.8mm Grade II" };
    if (heightMm <= 150) return { heightMm: 150, turns: 5, wireGrade: "1.8mm Grade II" };
    if (heightMm <= 170) return { heightMm: 170, turns: 6, wireGrade: "1.8mm Grade II" };
    return { heightMm: 200, turns: 6, wireGrade: "1.8mm Grade II" };
  }
}

/**
 * Main BOM calculator — generates all line items with quantities and costs
 */
export function calculateBOM(
  config: MattressConfig,
  rates: Record<string, number>
): BOMResult {
  const { lengthIn, widthIn, thicknessIn, springType, sides, boxType, model, channel } = config;

  const doubleSide = sides === "Double Side";
  const sideMultiplier = doubleSide ? 2 : 1;
  const hasBox = boxType === "With Box";
  const springCfg = getSpringConfig(thicknessIn, springType);
  const springCount = calcSpringCount(lengthIn, widthIn, springType);

  // Determine foam layers based on thickness and model
  let comfortFoamMm = 10; // default 18D 10mm
  let comfortFoamDensity = 18;
  let rebondedMm = 0;
  let helixa25Mm = 0;
  let memoryFoamMm = 0;

  if (thicknessIn <= 5) {
    comfortFoamMm = 8; comfortFoamDensity = 16;
  } else if (thicknessIn === 6) {
    comfortFoamMm = 10; comfortFoamDensity = 18;
  } else if (thicknessIn === 8) {
    comfortFoamMm = 15; comfortFoamDensity = 18;
    if (doubleSide) rebondedMm = 0; else helixa25Mm = 0;
  } else if (thicknessIn === 10) {
    comfortFoamMm = 15; comfortFoamDensity = 18;
    rebondedMm = 15;
  } else if (thicknessIn === 12) {
    comfortFoamMm = 20; comfortFoamDensity = 18;
    rebondedMm = 30;
  } else if (thicknessIn >= 16) {
    comfortFoamMm = 25; comfortFoamDensity = 25; // helixa
    memoryFoamMm = 25;
    rebondedMm = thicknessIn >= 20 ? 15 : 0;
  }

  if (model === "Pillow Top" || model === "Euro Top" || model === "Soft Top") {
    helixa25Mm = 25;
    memoryFoamMm = model === "Euro Top" ? 25 : memoryFoamMm;
  }

  const comfortFoamKg = calcFoamKg(lengthIn, widthIn, comfortFoamMm, comfortFoamDensity, sideMultiplier);
  const ldFoamKg = calcLDFoamKg(lengthIn, widthIn, 8);
  const rebondedKg = rebondedMm > 0 ? calcFoamKg(lengthIn, widthIn, rebondedMm, 70, sideMultiplier) : 0;
  const helixaKg = helixa25Mm > 0 ? calcFoamKg(lengthIn, widthIn, helixa25Mm, 25, 1) : 0;
  const memFoamKg = memoryFoamMm > 0 ? calcFoamKg(lengthIn, widthIn, memoryFoamMm, 50, 1) : 0;

  const cottonGSM = 700;
  const cottonFeltKg = calcCottonFeltKg(lengthIn, widthIn, cottonGSM, sideMultiplier);
  const spiralWireKg = springType === "Bonnell" ? calcSpiralWireKg(lengthIn) : 0;
  const borderWireKg = calcBorderWireKg(lengthIn, widthIn);
  const cornerSpringKg = 0.22; // 4 corner springs * 0.055kg
  const mSpringKg = 0.44;     // 8 M-springs * 0.052kg
  const sidewallKg = hasBox ? calcSidewallFoamKg(lengthIn, widthIn, thicknessIn) : 0;

  const panelFabricMtr = calcPanelFabricMtr(widthIn) * (doubleSide ? 2 : 1);
  const borderFabricMtr = Math.round(
    ((2 * (lengthIn + widthIn)) * 0.0254) / (84 / (thicknessIn * 25.4 + 10) / 100) * 100
  ) / 100 || 0.53;
  const tapeEdgeMtr = calcTapeEdgeMtr(lengthIn, widthIn, thicknessIn);
  const threads = calcThreads(lengthIn, widthIn);
  const pvcKg = calcPVCKg(widthIn, thicknessIn);
  const hdpeKg = channel === "Ecom" ? 0.5 : 0;
  const centreBandKg = calcCentreBandKg(lengthIn, widthIn, thicknessIn);

  // Rate lookup helpers with fallbacks
  const r = (key: string, fallback: number) => rates[key] ?? fallback;

  const springWireKey = springType === "Bonnell" ? "Spring Wire Bonnell 2.2mm" : "Spring Pocketed 1.8mm";
  const spiralKey = "Spiral Wire 1.4mm";
  const borderWireKey = "Border Wire 4mm";
  const cornerSpringKey = "Corner Spring 3.6mm";
  const mSpringKey = "M Spring 3.6mm";
  const cl85Key = "CL85 Clips";
  const cl12Key = "CL12B Clips";
  const hogKey = "Hog Ring HR24";
  const clip1222Key = "CLIPS 1222J";
  const cottonFeltKey = "Cotton Felt 700 GSM";
  const puFoamKey = "18D PU Foam";
  const ldFoamKey = "10D LD Foam";
  const helixaKey = "25D Helixa Foam";
  const rebondedKey = "Rebonded 70D Foam";
  const memFoamKey = "50D Memory Foam";
  const sidewallKey = "40D Sidewall Foam";
  const panelFabricKey = "Panel Fabric";
  const borderFabricKey = "Border Fabric";
  const backingCloth20Key = "Backing Cloth 20 GSM";
  const backingCloth30Key = "Backing Cloth 30 GSM";
  const cloth70Key = "Cloth 70 GSM";
  const tapeEdgeKey = "Tape Edge 42mm";
  const tkt60Key = "Thread TKT60";
  const tkt40Key = "Thread TKT40";
  const tkt90Key = "Thread TKT90";
  const flangKey = "Thread Flanging TKT40";
  const sergKey = "Thread Border Serging";
  const pvcKey = "PVC Packing";
  const hdpeKey = "HDPE Packing";
  const gumKey = "Yellow Bond Gum";
  const centreBandKey = "Centre Band";
  const gradeLabKey = "Grade Label";
  const mrpLabKey = "MRP Label";
  const mrpBackKey = "MRP Back Label";
  const warrantyKey = "Warranty Card";
  const stickerKey = "QC Stickers";
  const handleKey = "Border Handle";
  const cornerShoeKey = "Corner Shoe";
  const airVentKey = "Air Ventilator";

  // Spring hardware counts
  const cl85Count = springType === "Bonnell" ? 104 : 96;
  const cl12Count = springType === "Bonnell" ? 84 : 0;
  const hogCount = 48;
  const clip1222Count = 120;

  // Backing cloth
  const backingCloth20Kg = Math.round(panelFabricMtr * 0.044 * 100) / 100;
  const backingCloth30Kg = Math.round((lengthIn + widthIn * 2 + lengthIn + 5) * 0.0254 * 0.006 * 100) / 100;
  const cloth70Kg = Math.round((lengthIn + widthIn * 2 + lengthIn) * 0.0254 * 0.013 * 2 * 100) / 100;

  let slNo = 1;
  const items: BOMItem[] = [];

  const add = (category: string, material: string, unit: string, qty: number, rateKey: string, fallback: number) => {
    const rate = r(rateKey, fallback);
    const amount = Math.round(qty * rate * 100) / 100;
    if (qty > 0) {
      items.push({ slNo: slNo++, category, material, unit, qty, rate, amount });
    }
  };

  // ── SPRING CORE ──
  if (springType === "Bonnell") {
    const springWtKg = calcSpringWeightKg(thicknessIn, "Bonnell", springCount);
    add("Spring Core", `${springCfg.heightMm}mm ${springCfg.turns}-Turn Bonnell Wire (${springCfg.wireGrade})`, "Kg", springWtKg, springWireKey, 70);
    add("Spring Core", "Spiral Wire 1.4mm", "Kg", spiralWireKg, spiralKey, 70);
  } else {
    add("Spring Core", `${springCfg.heightMm}mm ${springCfg.turns}-Turn Pocketed (1.8mm Grade II) – ${springCount} nos`, "Nos", springCount, springWireKey, 3.28);
  }
  add("Spring Core", "Border Wire 4mm", "Kg", borderWireKg, borderWireKey, 70);
  add("Spring Core", "Corner Spring 3.6mm", "Kg", cornerSpringKg, cornerSpringKey, 70);
  add("Spring Core", "M-Spring 3.6mm", "Kg", mSpringKg, mSpringKey, 70);

  // Spring hardware clips
  if (cl12Count > 0) add("Spring Hardware", "CL12B Clips (I Clinching)", "Nos", cl12Count, cl12Key, 0.8);
  add("Spring Hardware", "CL85 Clips (II Clinching)", "Nos", cl85Count, cl85Key, 0.8);
  add("Spring Hardware", "Hog Ring HR24", "Nos", hogCount, hogKey, 0.6);
  add("Spring Hardware", "CLIPS 1222J (Padding)", "Nos", clip1222Count, clip1222Key, 0.5);

  // ── COMFORT LAYERS ──
  add("Cotton Felt", `Cotton Felt ${cottonGSM} GSM (${sideMultiplier} side)`, "Kg", cottonFeltKg, cottonFeltKey, 280);
  add("Comfort Foam", `${comfortFoamMm}mm ${comfortFoamDensity}D PU Foam (${sideMultiplier} side)`, "Kg", comfortFoamKg, puFoamKey, 220);
  if (helixaKg > 0) add("Comfort Foam", "25D Helixa Foam", "Kg", helixaKg, helixaKey, 260);
  if (rebondedKg > 0) add("Comfort Foam", "70D Rebonded Foam", "Kg", rebondedKg, rebondedKey, 57);
  if (memFoamKg > 0) add("Comfort Foam", "50D Memory Foam", "Kg", memFoamKg, memFoamKey, 500);
  add("Comfort Foam", "10D LD Foam (Bottom Quilt 8mm)", "Kg", ldFoamKg, ldFoamKey, 224);
  if (sidewallKg > 0) add("Box Construction", "40D Sidewall Foam (Box Type)", "Kg", sidewallKg, sidewallKey, 260);

  // ── FABRIC COVER ──
  add("Fabric", "Panel Fabric (Top + Back)", "Mtr", panelFabricMtr, panelFabricKey, 95);
  add("Fabric", "Border Fabric", "Mtr", borderFabricMtr, borderFabricKey, 100);
  add("Fabric", "Backing Cloth 20 GSM (Quilting)", "Kg", backingCloth20Kg, backingCloth20Key, 125);
  add("Fabric", "Backing Cloth 30 GSM (Border)", "Kg", backingCloth30Kg, backingCloth30Key, 125);
  add("Fabric", "Cloth 70 GSM (6\" facing)", "Kg", cloth70Kg, cloth70Key, 120);

  // ── TAPE & THREADS ──
  add("Tape & Thread", "42mm Tape Edge", "Mtr", tapeEdgeMtr, tapeEdgeKey, 2.86);
  add("Tape & Thread", "Thread TKT60 (Tape Edge)", "Mtr", threads.tapeEdgeTKT60, tkt60Key, 0.02);
  add("Tape & Thread", "Thread TKT40 (Quilting Top)", "Mtr", threads.quiltingTopTKT40, tkt40Key, 0.02);
  add("Tape & Thread", "Thread TKT90 (Quilting Bottom)", "Mtr", threads.quiltingBottomTKT90, tkt90Key, 0.02);
  add("Tape & Thread", "Thread TKT40 (Flanging)", "Mtr", threads.flangingTKT40, flangKey, 0.02);
  add("Tape & Thread", "Border Serging", "Mtr", threads.borderSerging, sergKey, 0.02);

  // ── ACCESSORIES / LABELS ──
  add("Accessories", "Grade Label", "Nos", 1, gradeLabKey, 9);
  add("Accessories", "MRP Label", "Nos", 1, mrpLabKey, 2.15);
  add("Accessories", "MRP Back Label", "Nos", 1, mrpBackKey, 1.75);
  add("Accessories", "Warranty Card", "Nos", 1, warrantyKey, 3);
  add("Accessories", "QC OK Stickers", "Nos", 3, stickerKey, 0.46);
  add("Accessories", "Border Handle", "Nos", 4, handleKey, 10);
  add("Accessories", "Corner Shoe", "Nos", 4, cornerShoeKey, 9);
  add("Accessories", "Air Ventilator", "Nos", 2, airVentKey, 5);

  // ── PACKING ──
  add("Packing", `PVC ${thicknessIn <= 8 ? "50" : "90"} Micron`, "Kg", pvcKg, pvcKey, 116);
  if (hdpeKg > 0) add("Packing", "HDPE Packing", "Kg", hdpeKg, hdpeKey, 100);
  add("Packing", "Yellow Bond Gum", "Ltr", 0.34, gumKey, 108);
  add("Packing", "Centre Band", "Kg", centreBandKg, centreBandKey, 264);

  const totalRMCost = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const sqFt = Math.round((lengthIn * widthIn / 144) * 100) / 100;
  const rmCostPerSqFt = Math.round((totalRMCost / sqFt) * 100) / 100;
  const wastagePercent = 4;
  const wastageAmt = Math.round(rmCostPerSqFt * (wastagePercent / 100) * 100) / 100;
  const finalRMCostPerSqFt = Math.round((rmCostPerSqFt + wastageAmt) * 100) / 100;

  return {
    items,
    totalRMCost,
    sqFt,
    rmCostPerSqFt,
    wastagePercent,
    wastageAmt,
    finalRMCostPerSqFt,
  };
}
