#!/usr/bin/env node
// PreToolUse guard for FAQ Sports (see CLAUDE.md §4–5).
// Blocks:
//   1. Running the Expo template's reset-project script (it replaces app/).
//   2. Writing to .env files (they hold the Supabase key). .env.example is allowed.
// Exit code 2 blocks the tool call and shows stderr to Claude.

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // Not our business; never block on bad input.
  }

  const tool = payload.tool_name || '';
  const toolInput = payload.tool_input || {};

  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = String(toolInput.command || '');
    if (/reset-project/.test(command)) {
      block('Blocked: `reset-project` replaces app/ with a blank Expo starter. See CLAUDE.md §4.');
    }
  }

  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const filePath = String(toolInput.file_path || toolInput.notebook_path || '');
    const name = filePath.split(/[\\/]/).pop() || '';
    if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
      block(`Blocked: ${name} holds the Supabase key and must be edited by the user. Change .env.example instead. See CLAUDE.md §5.`);
    }
  }

  process.exit(0);
});

function block(message) {
  process.stderr.write(message + '\n');
  process.exit(2);
}
