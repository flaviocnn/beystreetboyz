type BladeOption = { value: string; category: string; system: string };
const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");
export function bladeOptions(blades: readonly BladeOption[], query = "") {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return blades.filter(blade => {
    const abbreviation = blade.system.startsWith("Custom Line") ? "CX" : blade.system.startsWith("Unique Line") ? "UX" : blade.system.startsWith("Basic Line") ? "BX" : "";
    const searchable = normalize(`${blade.value} ${blade.category} ${blade.system} ${abbreviation}`);
    return terms.every(term => searchable.includes(term));
  })
    .sort((a, b) => collator.compare(a.value, b.value));
}
