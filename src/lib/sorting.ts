// Global sorting utilities for the plywood production system

// Thickness: descending order (18mm, 12mm, 10mm, 8mm, 6mm, 4mm)
export function sortThicknessDesc(a: { value: number }, b: { value: number }): number {
  return b.value - a.value;
}

// Sizes: sorted by length descending, then width descending
// Example: 8×4, 7×4, 6.25×3, 6×4, 6×3, 5×4, 5×3
export function sortSizesDesc(a: { length: number; width: number }, b: { length: number; width: number }): number {
  if (a.length !== b.length) return b.length - a.length;
  return b.width - a.width;
}

// Sort an array of products that have nested thickness/size objects
export function sortProducts(products: any[]): any[] {
  return [...products].sort((a, b) => {
    // First by category sortOrder
    const catA = a.category?.sortOrder ?? 0;
    const catB = b.category?.sortOrder ?? 0;
    if (catA !== catB) return catA - catB;
    
    // Then thickness descending
    const thA = a.thickness?.value ?? 0;
    const thB = b.thickness?.value ?? 0;
    if (thA !== thB) return thB - thA;
    
    // Then size: length desc, width desc
    const lenA = a.size?.length ?? 0;
    const lenB = b.size?.length ?? 0;
    if (lenA !== lenB) return lenB - lenA;
    
    const widA = a.size?.width ?? 0;
    const widB = b.size?.width ?? 0;
    return widB - widA;
  });
}

// Group products by category → thickness (both sorted correctly)
export function groupProducts(products: any[]): Record<string, Record<string, any[]>> {
  const sorted = sortProducts(products);
  const grouped: Record<string, Record<string, any[]>> = {};
  
  sorted.forEach((p) => {
    const catName = p.category?.name || "Unknown";
    const thickLabel = `${p.thickness?.value}mm`;
    if (!grouped[catName]) grouped[catName] = {};
    if (!grouped[catName][thickLabel]) grouped[catName][thickLabel] = [];
    grouped[catName][thickLabel].push(p);
  });
  
  return grouped;
}
