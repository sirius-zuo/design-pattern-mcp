import { PatternEntry, PatternTemplate } from '../types';

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function findClosest(input: string, patternIndex: Map<string, PatternEntry>): string {
  const normalizeKey = (s: string) => s.toLowerCase().replace(/[\s\/\-]+/g, '');
  const seen = new Set<string>();
  let minDist = Infinity;
  let closest = '';
  for (const [, entry] of patternIndex) {
    const canonical = entry.frontmatter.name;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const dist = levenshtein(normalizeKey(input), normalizeKey(canonical));
    if (dist < minDist) { minDist = dist; closest = canonical; }
  }
  return closest;
}

export function getTemplate(
  pattern: string,
  language: string,
  patternIndex: Map<string, PatternEntry>
): { template?: PatternTemplate; error?: string; warning?: string } {
  const key = pattern.toLowerCase().replace(/[\s\/\-]+/g, '');
  const entry = patternIndex.get(key);

  if (!entry) {
    const closest = findClosest(pattern, patternIndex);
    return { error: `Pattern '${pattern}' not found. Did you mean '${closest}'?` };
  }

  const lang = language.toLowerCase();
  let languageNotes = '';
  let exampleStructure = entry.genericExampleStructure;
  let warning: string | undefined;

  if (lang !== 'generic') {
    const section = entry.languageSections.get(lang);
    if (section && (section.notes || section.exampleStructure)) {
      languageNotes = section.notes;
      if (section.exampleStructure) exampleStructure = section.exampleStructure;
    } else {
      warning = `No ${language}-specific notes available; returning generic template.`;
    }
  }

  return {
    template: {
      pattern: entry.frontmatter.name,
      language: lang === 'generic' ? 'Generic' : lang,
      components: entry.components,
      constraints: entry.constraints,
      antiPatterns: entry.antiPatterns,
      languageNotes,
      exampleStructure,
    },
    warning,
  };
}
