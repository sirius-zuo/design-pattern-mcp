import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { PatternEntry, PatternFrontmatter, LanguageSection, LoadResult } from './types';

const LANG_HEADING: Record<string, string> = {
  generic: 'Generic',
  go: 'Go',
  java: 'Java',
  python: 'Python',
  rust: 'Rust',
};

function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`^## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractLanguageSection(content: string, heading: string): LanguageSection {
  // No 'm' flag: $ must match end of full string, not end of line
  const langRegex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## [A-Z]|$)`);
  const langMatch = content.match(langRegex);
  if (!langMatch) return { notes: '', exampleStructure: '' };

  const langContent = langMatch[1];
  const notesMatch = langContent.match(/### Notes\s*\n([\s\S]*?)(?=\n### |$)/);
  const exampleMatch = langContent.match(/### Example Structure\s*\n([\s\S]*?)(?=\n### |$)/);

  return {
    notes: notesMatch ? notesMatch[1].trim() : '',
    exampleStructure: exampleMatch ? exampleMatch[1].trim() : '',
  };
}

export function loadTemplates(templatesDir: string): LoadResult {
  const patternIndex = new Map<string, PatternEntry>();
  const keywordIndex = new Map<string, string[]>();

  const files = glob.sync('**/*.md', { cwd: templatesDir });

  for (const file of files) {
    const raw = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
    const { data, content } = matter(raw);
    const fm = data as PatternFrontmatter;

    const languageSections = new Map<string, LanguageSection>();
    for (const lang of fm.languages) {
      const heading = LANG_HEADING[lang];
      if (heading) {
        languageSections.set(lang, extractLanguageSection(content, heading));
      }
    }

    const entry: PatternEntry = {
      frontmatter: fm,
      overview: extractSection(content, 'Overview'),
      components: extractSection(content, 'Components'),
      constraints: extractSection(content, 'Constraints'),
      antiPatterns: extractSection(content, 'Anti-Patterns'),
      genericExampleStructure: extractSection(content, 'Generic Example Structure'),
      languageSections,
    };

    // Index by lowercase name + all aliases (spaces/slashes/hyphens removed for multi-word names)
    const keys = [fm.name, ...(fm.aliases ?? [])].map(k =>
      k.toLowerCase().replace(/[\s\/\-]+/g, '')
    );
    for (const key of keys) {
      patternIndex.set(key, entry);
    }

    // Build keyword index from triggers
    for (const trigger of fm.triggers) {
      const existing = keywordIndex.get(trigger) ?? [];
      existing.push(fm.name);
      keywordIndex.set(trigger, existing);
    }
  }

  return { patternIndex, keywordIndex };
}
