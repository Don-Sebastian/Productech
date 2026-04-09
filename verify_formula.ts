import { minutesToDays, type PressSettings } from "./src/lib/productionEstimate";

const settings: PressSettings = {
  workingHoursPerDay: 8,
  numHotPresses: 2, // 2 machines
  pressCapacityPerPress: 10
};

const totalMinutes = 480; // 8 hours of work for ONE machine

const days = minutesToDays(totalMinutes, settings.workingHoursPerDay, settings.numHotPresses);

console.log(`With ${settings.numHotPresses} machines working ${settings.workingHoursPerDay}h/day:`);
console.log(`${totalMinutes} minutes of press time takes ${days} days.`);
// Expected: 0.5 days (if 2 machines can do 16 machine-hours in one 8-hour shift)

if (days === 0.5) {
  console.log("✅ Formula correctly accounts for parallel machines.");
} else {
  console.log("❌ Formula error. Result:", days);
}
