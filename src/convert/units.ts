export type ConvertCategory = 'length' | 'area' | 'volume' | 'mass' | 'temperature';

export type UnitDef = {
  id: string;
  label: string;
  /** Factor to base unit (or special for temperature). */
  toBase: number;
};

export type CategoryDef = {
  id: ConvertCategory;
  title: string;
  /** Base unit id for linear conversions. */
  base: string;
  units: UnitDef[];
};

/** Length base = metre */
const LENGTH: CategoryDef = {
  id: 'length',
  title: 'Length',
  base: 'm',
  units: [
    { id: 'mm', label: 'Millimetre (mm)', toBase: 0.001 },
    { id: 'cm', label: 'Centimetre (cm)', toBase: 0.01 },
    { id: 'm', label: 'Metre (m)', toBase: 1 },
    { id: 'km', label: 'Kilometre (km)', toBase: 1000 },
    { id: 'in', label: 'Inch (in)', toBase: 0.0254 },
    { id: 'ft', label: 'Foot (ft)', toBase: 0.3048 },
    { id: 'yd', label: 'Yard (yd)', toBase: 0.9144 },
    { id: 'mi', label: 'Mile (mi)', toBase: 1609.344 },
  ],
};

/** Area base = m² */
const AREA: CategoryDef = {
  id: 'area',
  title: 'Area',
  base: 'm2',
  units: [
    { id: 'mm2', label: 'Square mm (mm²)', toBase: 1e-6 },
    { id: 'cm2', label: 'Square cm (cm²)', toBase: 1e-4 },
    { id: 'm2', label: 'Square metre (m²)', toBase: 1 },
    { id: 'ha', label: 'Hectare (ha)', toBase: 10000 },
    { id: 'km2', label: 'Square km (km²)', toBase: 1e6 },
    { id: 'in2', label: 'Square inch (in²)', toBase: 0.00064516 },
    { id: 'ft2', label: 'Square foot (ft²)', toBase: 0.09290304 },
    { id: 'yd2', label: 'Square yard (yd²)', toBase: 0.83612736 },
    { id: 'ac', label: 'Acre (ac)', toBase: 4046.8564224 },
  ],
};

/** Volume base = litre */
const VOLUME: CategoryDef = {
  id: 'volume',
  title: 'Volume',
  base: 'L',
  units: [
    { id: 'mL', label: 'Millilitre (mL)', toBase: 0.001 },
    { id: 'L', label: 'Litre (L)', toBase: 1 },
    { id: 'm3', label: 'Cubic metre (m³)', toBase: 1000 },
    { id: 'in3', label: 'Cubic inch (in³)', toBase: 0.016387064 },
    { id: 'ft3', label: 'Cubic foot (ft³)', toBase: 28.316846592 },
    { id: 'gal_us', label: 'US gallon (gal)', toBase: 3.785411784 },
    { id: 'gal_uk', label: 'UK gallon (gal)', toBase: 4.54609 },
  ],
};

/** Mass base = kilogram */
const MASS: CategoryDef = {
  id: 'mass',
  title: 'Mass',
  base: 'kg',
  units: [
    { id: 'mg', label: 'Milligram (mg)', toBase: 1e-6 },
    { id: 'g', label: 'Gram (g)', toBase: 0.001 },
    { id: 'kg', label: 'Kilogram (kg)', toBase: 1 },
    { id: 't', label: 'Metric tonne (t)', toBase: 1000 },
    { id: 'oz', label: 'Ounce (oz)', toBase: 0.028349523125 },
    { id: 'lb', label: 'Pound (lb)', toBase: 0.45359237 },
  ],
};

/**
 * Temperature uses dedicated conversion (not linear factors).
 * toBase unused; ids: C, F, K
 */
const TEMPERATURE: CategoryDef = {
  id: 'temperature',
  title: 'Temperature',
  base: 'C',
  units: [
    { id: 'C', label: 'Celsius (°C)', toBase: 1 },
    { id: 'F', label: 'Fahrenheit (°F)', toBase: 1 },
    { id: 'K', label: 'Kelvin (K)', toBase: 1 },
  ],
};

export const CONVERT_CATEGORIES: CategoryDef[] = [
  LENGTH,
  AREA,
  VOLUME,
  MASS,
  TEMPERATURE,
];

export function getCategory(id: ConvertCategory): CategoryDef {
  return CONVERT_CATEGORIES.find((c) => c.id === id) ?? LENGTH;
}

function tempToCelsius(value: number, from: string): number {
  switch (from) {
    case 'C':
      return value;
    case 'F':
      return ((value - 32) * 5) / 9;
    case 'K':
      return value - 273.15;
    default:
      return value;
  }
}

function celsiusToTemp(c: number, to: string): number {
  switch (to) {
    case 'C':
      return c;
    case 'F':
      return (c * 9) / 5 + 32;
    case 'K':
      return c + 273.15;
    default:
      return c;
  }
}

export function convertValue(
  category: ConvertCategory,
  value: number,
  fromId: string,
  toId: string,
): number {
  if (!Number.isFinite(value)) return NaN;
  if (fromId === toId) return value;

  if (category === 'temperature') {
    return celsiusToTemp(tempToCelsius(value, fromId), toId);
  }

  const cat = getCategory(category);
  const from = cat.units.find((u) => u.id === fromId);
  const to = cat.units.find((u) => u.id === toId);
  if (!from || !to) return NaN;
  const base = value * from.toBase;
  return base / to.toBase;
}

export function formatConverted(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e7)) {
    return n.toExponential(6);
  }
  // Trim trailing zeros from a sensible precision
  const s = Number(n.toPrecision(12)).toString();
  return s;
}
