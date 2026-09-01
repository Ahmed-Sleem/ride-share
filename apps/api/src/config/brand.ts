/* ══════════════════════════════════════════════════════════════════════
   Brand — the API's read of the single brand source (packages/brand/brand.json,
   §0.3 one definition). Email subjects and the branded HTML derive from here;
   renaming the product or restyling the emails is a one-file change there.
   The file is resolved relative to this module so it works in the repo and in
   the container (packages/brand ships via the workspace prune).
   ══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Brand {
  name: { en: string; ar: string };
  tagline: { en: string; ar: string };
  description: string;
  font: { family: string; weight: number };
  logo: { viewBox: string; path: string; color: { light: string; dark: string } };
  browserThemeColor: { light: string; dark: string };
  email: {
    fromName: string;
    colors: {
      primary: string; primaryDark: string; accent: string; ink: string;
      muted: string; cardBg: string; pageBg: string; line: string;
    };
  };
}

const BRAND_PATH = resolve(__dirname, '..', '..', '..', '..', 'packages', 'brand', 'brand.json');

export const BRAND: Brand = JSON.parse(readFileSync(BRAND_PATH, 'utf8')) as Brand;
