/**
 * Scenario Export - Re-export from canonical location
 * 
 * This file maintains backward compatibility with imports
 * from the old location. The canonical implementation is
 * now in src/lib/exports/exportPDF.ts
 */

export {
  exportScenarioPDF,
  exportComparisonPDF,
  downloadScenarioHTML,
  downloadComparisonHTML,
  generateScenarioFilename,
  generateComparisonFilename,
} from "@/lib/exports/exportPDF";
