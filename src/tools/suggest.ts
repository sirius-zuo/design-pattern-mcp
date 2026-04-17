import { PatternEntry, PatternSuggestion, PatternCategory } from '../types';

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
}

function scoreEntry(descTokens: string[], triggers: string[]): number {
  let score = 0;
  for (const trigger of triggers) {
    const triggerTokens = tokenize(trigger);
    if (triggerTokens.length === 0) continue;
    const matches = triggerTokens.filter(t => descTokens.includes(t)).length;
    score += matches / triggerTokens.length;
  }
  return score;
}

export function suggestPattern(
  description: string,
  category: string | undefined,
  patternIndex: Map<string, PatternEntry>
): PatternSuggestion[] {
  const descTokens = tokenize(description);
  const scores = new Map<string, number>();
  const nameToEntry = new Map<string, PatternEntry>();

  for (const [, entry] of patternIndex) {
    const name = entry.frontmatter.name;
    if (scores.has(name)) continue; // skip alias duplicates
    if (category && entry.frontmatter.category !== (category as PatternCategory)) continue;
    scores.set(name, scoreEntry(descTokens, entry.frontmatter.triggers));
    nameToEntry.set(name, entry);
  }

  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, s]) => s > 0);

  const topScore = sorted[0]?.[1] ?? 0;

  if (topScore < 0.3) {
    if (category) {
      const fallback: PatternSuggestion[] = [];
      const seen = new Set<string>();
      for (const [, entry] of patternIndex) {
        if (entry.frontmatter.category !== (category as PatternCategory)) continue;
        if (seen.has(entry.frontmatter.name)) continue;
        seen.add(entry.frontmatter.name);
        fallback.push({
          name: entry.frontmatter.name,
          category: entry.frontmatter.category,
          rationale: entry.frontmatter.triggers[0] ?? '',
          confidence: 0,
        });
      }
      return fallback;
    }

    const counts = new Map<string, number>();
    for (const [, entry] of patternIndex) {
      const cat = entry.frontmatter.category;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const summary = [...counts.entries()].map(([c, n]) => `${c}: ${n}`).join(', ');
    return [{
      name: '__no_match__',
      category: '',
      rationale: `No confident match. Patterns by category: ${summary}. Retry with a category parameter to narrow results.`,
      confidence: 0,
    }];
  }

  return sorted.slice(0, 3).map(([name, score]) => {
    const entry = nameToEntry.get(name)!;
    return {
      name: entry.frontmatter.name,
      category: entry.frontmatter.category,
      rationale: entry.frontmatter.triggers[0] ?? '',
      confidence: Math.min(score, 1.0),
    };
  });
}
