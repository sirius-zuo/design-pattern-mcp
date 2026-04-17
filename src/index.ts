import * as path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadTemplates } from './loader';
import { getTemplate } from './tools/get-template';
import { suggestPattern } from './tools/suggest';
import { PatternTemplate } from './types';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function formatTemplate(t: PatternTemplate, warning?: string): string {
  const parts = [
    `Pattern: ${t.pattern}`,
    `Language: ${t.language}`,
    '',
    `COMPONENTS:\n${t.components}`,
    '',
    `CONSTRAINTS:\n${t.constraints}`,
    '',
    `ANTI-PATTERNS:\n${t.antiPatterns}`,
  ];
  if (t.languageNotes) {
    parts.push('', `${t.language.toUpperCase()}-SPECIFIC NOTES:\n${t.languageNotes}`);
  }
  if (t.exampleStructure) {
    parts.push('', `EXAMPLE STRUCTURE:\n${t.exampleStructure}`);
  }
  if (warning) {
    parts.push('', `NOTE: ${warning}`);
  }
  return parts.join('\n');
}

async function main(): Promise<void> {
  const { patternIndex } = loadTemplates(TEMPLATES_DIR);

  const server = new Server(
    { name: 'design-pattern-templates', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'suggest_pattern',
        description: 'Map a problem description to design pattern name(s). Returns up to 3 ranked suggestions with confidence scores. Call this when you know the problem but not which pattern to apply.',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Describe the problem (e.g. "multiple interchangeable algorithms selected at runtime")',
            },
            category: {
              type: 'string',
              enum: ['creational', 'structural', 'behavioral', 'modern', 'architectural'],
              description: 'Optional: narrow search to one pattern category',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'get_template',
        description: 'Get structural constraints and anti-patterns for a specific design pattern in a specific language. Returns compact plain text (~300-500 tokens) optimized for LLM consumption. Call this when you know which pattern to implement.',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Pattern name (e.g. "Strategy", "Observer", "Circuit Breaker")',
            },
            language: {
              type: 'string',
              description: 'Target language: "go", "java", "python", "rust", or "generic"',
            },
          },
          required: ['pattern', 'language'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'suggest_pattern') {
      const { description, category } = args as { description: string; category?: string };
      const suggestions = suggestPattern(description, category, patternIndex);
      return { content: [{ type: 'text', text: JSON.stringify(suggestions, null, 2) }] };
    }

    if (name === 'get_template') {
      const { pattern, language } = args as { pattern: string; language: string };
      const { template, error, warning } = getTemplate(pattern, language, patternIndex);
      if (error) {
        return { content: [{ type: 'text', text: error }], isError: true };
      }
      return { content: [{ type: 'text', text: formatTemplate(template!, warning) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
