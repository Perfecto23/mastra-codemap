// Type definitions for Mastra CodeMap content layer.
// Content is grounded in source at ~/Github/mastra-ai/mastra/packages/core/src/.

export interface KeyExport {
  name: string;
  kind: "class" | "function" | "type" | "interface" | "const";
  signature?: string;
  description: string;
}

export interface KeyFile {
  path: string;
  loc: number;
  purpose: string;
}

export interface CodeSnippet {
  /** Short title describing what the snippet demonstrates. */
  title: string;
  /** Source file path (relative to packages/core/src/). */
  file: string;
  /** The code itself. */
  code: string;
  /** Why this snippet matters — design insight. */
  explanation: string;
}

export interface CoreModule {
  /** Directory name under packages/core/src/ — also used as anchor id. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One-paragraph role statement. */
  role: string;
  /** Approximate total LOC across all .ts files in the module directory. */
  totalLoc: number;
  /**
   * 2-3 most-recommended entry files to read first when diving into this module.
   * Paths are relative to packages/core/src/.
   */
  topFiles?: string[];
  /** Key source files (relative to packages/core/src/<id>/). */
  keyFiles: KeyFile[];
  /** 2-3 most important file paths to read first (relative to packages/core/src/). */
  topFiles?: string[];
  /** Public surface — things re-exported from the module. */
  keyExports: KeyExport[];
  /** Other modules this one imports from (ids, directional). */
  internalImports: string[];
  /** Free-form prose for readers of the source code. */
  sourceNotes?: string;
  /** ids of Design Decisions that reference this module. */
  relatedDecisions?: string[];
  /** Representative code snippets from the source. */
  codeSnippets?: CodeSnippet[];
  /** ASCII tree showing internal sub-structure (for complex modules). */
  subStructure?: string;
}

export interface SecondaryModule {
  id: string;
  name: string;
  role: string;
  totalLoc: number;
}

export interface DesignDecision {
  /** Slug id, also anchor id. */
  id: string;
  title: string;
  context: string;
  chose: string;
  rejected: string;
  cost: string;
  /** Module ids this decision shapes. */
  affects: string[];
}

export interface DataFlowStep {
  id: string;
  label: string;
  actor: string;
  detail: string;
  /** Is this a step where the loop iterates? */
  loop?: boolean;
  /** Branch label within a loop iteration. */
  branch?: "tool" | "done";
}
