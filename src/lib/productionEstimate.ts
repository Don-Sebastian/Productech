/**
 * Production Time Estimation Utilities
 * 
 * Formula:
 *   Cycles needed = ceil(targetQuantity / totalBoardsPerCycle)
 *   totalBoardsPerCycle = numHotPresses * pressCapacityPerPress
 *   totalCycleMinutes = cycles * (cookingTime + coolingTime) per thickness
 *   productionDays = totalCycleMinutes / (workingHoursPerDay * 60)
 *   readyDate = orderCreatedAt + productionDays + 1 (finishing day)
 *   dispatchDate = readyDate (same day as ready, dispatch is planned the same day)
 */

export interface PressSettings {
  workingHoursPerDay: number;
  numHotPresses: number;
  pressCapacityPerPress: number;
}

export interface ThicknessTime {
  cookingTime: number; // minutes
  coolingTime: number; // minutes
}

/**
 * Estimate total production time in minutes for a given quantity of boards.
 */
export function estimateProductionMinutes(
  targetQuantity: number,
  cookingTime: number,  // minutes per cycle for this thickness
  coolingTime: number,  // minutes per cycle for this thickness
  numHotPresses: number,
  pressCapacityPerPress: number
): number {
  if (cookingTime <= 0 && coolingTime <= 0) return 0;
  const totalBoardsPerCycle = numHotPresses * pressCapacityPerPress;
  const cycles = Math.ceil(targetQuantity / Math.max(totalBoardsPerCycle, 1));
  return cycles * (cookingTime + coolingTime);
}

/**
 * Estimate production time in days (fractional) from total minutes.
 * Formula: (Total Minutes) / (60 * WorkingHoursPerDay * NumberOfMachines)
 * This assumes machines operate in parallel.
 */
export function minutesToDays(
  totalMinutes: number, 
  workingHoursPerDay: number, 
  numMachines: number = 1
): number {
  if (workingHoursPerDay <= 0 || numMachines <= 0) return 0;
  return totalMinutes / (workingHoursPerDay * 60 * numMachines);
}

/**
 * Calculate estimated dispatch date from order creation date.
 * @param orderCreatedAt Order creation date
 * @param productionMinutes Total press time minutes for ALL items in the order
 * @param pressSettings Company press configuration
 * @param finishingDays Number of finishing days to add (default: 1)
 */
export function calcEstimatedDates(
  orderCreatedAt: Date | string,
  productionMinutes: number,
  pressSettings: PressSettings,
  finishingDays = 1
): { readyDate: Date; dispatchDate: Date; productionDays: number } {
  const base = new Date(orderCreatedAt);
  const productionDays = minutesToDays(
    productionMinutes, 
    pressSettings.workingHoursPerDay,
    pressSettings.numHotPresses
  );
  const totalDays = productionDays + finishingDays;
  const readyDate = new Date(base.getTime() + productionDays * 24 * 60 * 60 * 1000);
  const dispatchDate = new Date(base.getTime() + totalDays * 24 * 60 * 60 * 1000);
  return { readyDate, dispatchDate, productionDays };
}

/**
 * Format a duration in minutes into a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format a number of days into a human-readable string.
 */
export function formatDays(days: number): string {
  if (days <= 0) return "—";
  if (days < 1) return `~${Math.round(days * 24)}h`;
  if (days < 1.5) return "~1 day";
  return `~${Math.round(days)} days`;
}

/**
 * Format a date as a short date string.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Compute total production minutes for a list of items using ProductTiming map.
 */
export function calcProductionMinutes(
  items: Array<{ categoryId: string; thicknessId: string; targetQuantity: number }>,
  productTimings: any[],
  pressSettings: PressSettings
): number {
  return items.reduce((sum, item) => {
    const timing = productTimings.find(
      (pt) => pt.categoryId === item.categoryId && pt.thicknessId === item.thicknessId
    );
    const cooking = timing?.cookingTime ?? 0;
    const cooling = timing?.coolingTime ?? 0;
    
    return sum + estimateProductionMinutes(
      item.targetQuantity,
      cooking,
      cooling,
      pressSettings.numHotPresses,
      pressSettings.pressCapacityPerPress
    );
  }, 0);
}

/**
 * Backward compatibility wrapper for list items.
 */
export function calcListProductionMinutes(
  items: Array<{ quantity: number; categoryId?: string; thicknessId?: string; thickness?: any }>,
  productTimings: any[],
  pressSettings: PressSettings
): number {
  return items.reduce((sum, item) => {
    let cooking = 0;
    let cooling = 0;
    
    if (item.categoryId && item.thicknessId) {
      const timing = productTimings.find(
        (pt) => pt.categoryId === item.categoryId && pt.thicknessId === item.thicknessId
      );
      if (timing) {
        cooking = timing.cookingTime;
        cooling = timing.coolingTime;
      }
    } else if (item.thickness) {
       // Fallback for cases where timing is missing or we want to use the thickness object directly
       cooking = item.thickness.cookingTime ?? 0;
       cooling = item.thickness.coolingTime ?? 0;
    }
    
    return sum + estimateProductionMinutes(
      item.quantity,
      cooking,
      cooling,
      pressSettings.numHotPresses,
      pressSettings.pressCapacityPerPress
    );
  }, 0);
}
