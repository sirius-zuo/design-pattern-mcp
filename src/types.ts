export type PatternCategory = 'creational' | 'structural' | 'behavioral' | 'modern' | 'architectural';

export interface PatternFrontmatter {
  name: string;
  category: PatternCategory;
  aliases?: string[];
  languages: string[];
  triggers: string[];
}

export interface LanguageSection {
  notes: string;
  exampleStructure: string;
}

export interface PatternEntry {
  frontmatter: PatternFrontmatter;
  overview: string;
  components: string;
  constraints: string;
  antiPatterns: string;
  genericExampleStructure: string;
  languageSections: Map<string, LanguageSection>;
}

export interface PatternSuggestion {
  name: string;
  category: string;
  rationale: string;
  confidence: number;
}

export interface PatternTemplate {
  pattern: string;
  language: string;
  components: string;
  constraints: string;
  antiPatterns: string;
  languageNotes: string;
  exampleStructure: string;
}

export interface LoadResult {
  patternIndex: Map<string, PatternEntry>;
  keywordIndex: Map<string, string[]>;
}
