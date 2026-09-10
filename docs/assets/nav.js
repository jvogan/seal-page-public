/* SEAL documentation, navigation model.
   Single source of truth for the sidebar, breadcrumbs, prev/next pager,
   and the search index. Each page references its own file name to resolve
   the active item. Keep titles short; they render in the left rail. */

window.SEAL_DOCS_NAV = [
  {
    group: 'Get started',
    items: [
      { title: 'Overview', file: 'index.html', desc: 'What SEAL is and how the docs are organized.' },
      { title: 'Watch SEAL overview', file: 'overview.html', desc: 'A narrated tour of sequences, analysis, notebook, reports, and agent setup.' },
      { title: 'Install SEAL', file: 'install.html', desc: 'Coming to the Mac App Store first; source and direct downloads follow later.' },
      { title: 'Edition differences', file: 'editions.html', desc: 'First Store release, direct-edition tools, and screenshot differences.' },
      { title: 'Quickstart', file: 'quickstart.html', desc: 'From a pasted sequence to a first analysis in a few minutes.' },
      { title: 'Video tutorials', file: 'tutorials.html', desc: 'Follow recorded workflows with captions and written steps.' },
      { title: 'Your first workspace', file: 'first-workspace.html', desc: 'Find projects, Entries, sequence blocks, and the Inspector.' },
      { title: 'Add your first sequence', file: 'import-first-sequence.html', desc: 'Paste a practice FASTA and check the imported DNA.' },
      { title: 'Core concepts', file: 'concepts.html', desc: 'Workspaces, Entries, blocks, features, and stable automation names.' },
      { title: 'Sequence sources', file: 'sequence-sources.html', desc: 'Synthetic fixtures, your own files, explicit database fetches, and provenance.' }
    ]
  },
  {
    group: 'Sequence workflows',
    items: [
      { title: 'Import and export', file: 'import-export.html', desc: 'Read eleven formats, write FASTA, GenBank, and GFF3.' },
      { title: 'Editing and annotation', file: 'editing.html', desc: 'Edit bases, add features, and annotate selections.' },
      { title: 'Plasmid maps', file: 'plasmid-map.html', desc: 'Open any block as a circular or linear map with feature lanes and cut sites.' },
      { title: 'Restriction digest', file: 'restriction-digest.html', desc: 'Map and simulate cuts across 154 enzymes.' },
      { title: 'Primer design', file: 'primer-design.html', desc: 'Design and rank PCR primers with Tm and clamp checks.' },
      { title: 'Cloning and assembly', file: 'cloning.html', desc: 'Plan Gibson, Golden Gate, GoldenBraid, MoClo, ligation, and guided clone builds.' },
      { title: 'Sequence alignment', file: 'alignment.html', desc: 'Pairwise and multiple alignment with selectable engines.' },
      { title: 'Sanger traces', file: 'sanger-traces.html', desc: 'Import AB1 chromatograms and read per-base quality.' },
      { title: 'Translation and ORFs', file: 'translation.html', desc: 'Live selection translation, six frames, reverse-translation drafts, and ORFs.' },
      { title: 'Protein analysis', file: 'protein-analysis.html', desc: 'Molecular weight, charge, hydropathy, annotations, and predictions.' },
      { title: 'Codon analysis', file: 'codon-analysis.html', desc: 'Codon usage, GC content, and host comparison.' },
      { title: 'Sequence diff', file: 'diff.html', desc: 'Compare two sequences base by base.' },
      { title: 'Quality checks', file: 'quality.html', desc: 'Flag homopolymers, ambiguous bases, and internal stops.' },
      { title: 'Reports and packages', file: 'reports.html', desc: 'Export reports and zipped packages.' }
    ]
  },
  {
    group: 'Design and generation',
    items: [
      { title: 'ESM design', file: 'esm-design.html', desc: 'Generate, insert, and mutate sequences with the biohub.ai ESM engine.' },
      { title: 'Codon optimizers', file: 'codon-optimizers.html', desc: 'Optimize coding sequences with pluggable host profiles.' },
      { title: 'CRISPR guide design', file: 'guide-design.html', desc: 'Design guides for a region and scan a chosen reference for off-target sites.' }
    ]
  },
  {
    group: 'Notebook',
    items: [
      { title: 'Notebook', file: 'notebook.html', desc: 'A local lab notebook whose pages reference the sequences they describe.' },
      { title: 'Records and signing', file: 'notebook-records.html', desc: 'Revisions, restore points, signing a page, and what the attestation covers.' }
    ]
  },
  {
    group: 'Source-edition agents',
    items: [
      { title: 'Agent control plane', file: 'agents.html', desc: 'How external agents read and write the same local workspace.' },
      { title: 'Connect Claude Code', file: 'agents-claude-code.html', desc: 'Set up Claude Code over MCP.' },
      { title: 'Connect Codex', file: 'agents-codex.html', desc: 'Set up Codex over MCP.' },
      { title: 'Connect Gemini CLI', file: 'agents-gemini-cli.html', desc: 'Set up Gemini CLI over MCP.' },
      { title: 'Terminal dock', file: 'terminal-dock.html', desc: 'Launch a local agent CLI from inside SEAL.' },
      { title: 'Prompts and safety', file: 'agent-prompts.html', desc: 'Safety prompts and review patterns for agent edits.' },
      { title: 'What agents can change', file: 'mutation-matrix.html', desc: 'The surfaces an external agent can read and mutate.' }
    ]
  },
  {
    group: 'Reference',
    items: [
      { title: 'CLI reference', file: 'cli.html', desc: 'Every seal command and flag.' },
      { title: 'MCP setup', file: 'mcp-setup.html', desc: 'Run the MCP server and point a client at it.' },
      { title: 'MCP tool reference', file: 'mcp-reference.html', desc: 'MCP tools, grouped by module.' },
      { title: 'IO contract', file: 'io-contract.html', desc: 'Shapes for analysis output across CLI, MCP, and the app.' },
      { title: 'Settings and backup', file: 'settings.html', desc: 'Appearance, accessibility, and portable settings backup.' },
      { title: 'Security', file: 'security.html', desc: 'Process isolation, IPC limits, subprocess policy, and release integrity.' },
      { title: 'Troubleshooting', file: 'troubleshooting.html', desc: 'Fix MCP connection problems, first-launch issues, and find runtime diagnostics.' }
    ]
  },
  {
    group: 'Teams',
    items: [
      { title: 'Notion Team Sync', file: 'notion-team-sync.html', desc: 'Optional schema and tooling for Notion-first teams.' }
    ]
  },
  {
    group: 'About',
    items: [
      { title: 'Architecture', file: 'architecture.html', desc: 'Local-first design: Electron, SQLite, TypeScript surfaces, a Rust CLI, and native bridge operations.' },
      { title: 'Privacy', file: 'privacy.html', desc: 'What stays on device and what reaches out.' },
      { title: 'Release status', file: 'changelog.html', desc: 'Current release, user-visible changes, and validation results.' }
    ]
  }
];
