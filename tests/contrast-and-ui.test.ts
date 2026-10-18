import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = calculateLuminance(...rgb1);
  const l2 = calculateLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Phase 6: UI, WCAG AA Accessibility & Mobile Verification", () => {
  it("computes WCAG contrast ratio for primary theme #004071 against white #FFFFFF", () => {
    const brandBlue: [number, number, number] = [0, 64, 113]; // #004071
    const white: [number, number, number] = [255, 255, 255]; // #FFFFFF
    const ratio = calculateContrastRatio(brandBlue, white);

    // WCAG AA requirement is 4.5:1. WCAG AAA is 7.0:1.
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(Number(ratio.toFixed(2))).toBe(10.65);
  });

  it("computes WCAG contrast ratio for primary theme #004071 against amber accent #F59E0B", () => {
    const brandBlue: [number, number, number] = [0, 64, 113]; // #004071
    const amber: [number, number, number] = [245, 158, 11]; // #f59e0b
    const ratio = calculateContrastRatio(brandBlue, amber);

    // Must be >= 4.5:1 for WCAG AA
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies the institutional footer string is embedded in src/app/layout.tsx", () => {
    const layoutPath = path.resolve(__dirname, "../src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf8");
    const requiredFooter = "تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است";
    expect(content).toContain(requiredFooter);
  });

  it("confirms Capacitor config points to a real HTTPS domain and disables cleartext", () => {
    const capPath = path.resolve(__dirname, "../capacitor.config.ts");
    const content = fs.readFileSync(capPath, "utf8");

    expect(content).toContain("https://");
    expect(content).not.toContain("http://192.168.");
    expect(content).toContain("cleartext: false");
  });

  it("confirms 4000px scroll pin is disabled for viewports below 768px in MiladScrollytelling", () => {
    const componentPath = path.resolve(__dirname, "../src/components/landing/MiladScrollytelling.tsx");
    const content = fs.readFileSync(componentPath, "utf8");

    expect(content).toContain('mm.add("(min-width: 768px)"');
    expect(content).toContain('end: "+=4000"');
  });
});
