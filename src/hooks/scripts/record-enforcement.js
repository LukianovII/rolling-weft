#!/usr/bin/env node
/**
 * PostToolUse (Bash) hook — reminds to record FINDING after probe-like commands.
 * Detects test runs, build commands, API calls that look like probe results
 * without a subsequent bd comment FINDING.
 * Windows-compatible: pure Node.js, no bash required.
 */

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = (data?.tool_input?.command || '');
    const output = (data?.tool_output?.stdout || '') + (data?.tool_output?.stderr || '');

    // If this IS a bd comment FINDING — check for design-doc drift
    if (cmd.includes('bd comment') && /FINDING/i.test(cmd)) {
      // Look for tags that typically involve shared contracts
      const contractTags = ['grpc', 'rest', 'kafka', 'protobuf', 'schema', 'contract', 'api'];
      const tagMatch = cmd.match(/\[([^\]]+)\]/);
      const tags = tagMatch ? tagMatch[1].split(',').map(t => t.trim().toLowerCase()) : [];
      const hasContractTag = tags.some(t => contractTags.includes(t));

      // Look for keywords suggesting contract-level changes
      const contractKeywords = /field|type|endpoint|schema|response|request|parameter|return|enum|breaking/i;
      const hasContractKeyword = contractKeywords.test(cmd);

      if (hasContractTag || hasContractKeyword) {
        const message = [
          'This FINDING may affect a shared contract.',
          'Check: does this contradict anything in .designs/ or shared/.designs/?',
          '  - Minor drift (clarification) → update design-doc in same commit',
          '  - Breaking change → update contract in shared/ (if submodule exists),',
          '    record LEARNED, and remind developer to notify other modules',
        ].join('\n');

        console.log(JSON.stringify({ systemMessage: message }));
      }
      return;
    }

    // Skip other bd commands (not probe-related)
    if (cmd.includes('bd create') || cmd.includes('bd update')) {
      return;
    }

    // Detect probe-like commands
    const probePatterns = [
      /dotnet\s+(test|run|build)/i,
      /cargo\s+(test|run|build)/i,
      /npm\s+(test|run)/i,
      /node\s+.*test/i,
      /pytest|jest|mocha|xunit/i,
      /curl\s+/i,
      /grpcurl/i,
      /make\s+(test|build|run)/i,
    ];

    const isProbe = probePatterns.some(p => p.test(cmd));

    // Also detect if output contains error/failure indicators
    const hasResults = output.length > 100 ||
      /error|fail|pass|success|assert|exception/i.test(output);

    if (isProbe && hasResults) {
      const message = [
        'Probe detected. Remember: every probe must leave a FINDING.',
        'Record the result:',
        '  bd comment {ID} "FINDING [tag]: {exact observation — field names, error codes, behavior}"',
      ].join('\n');

      console.log(JSON.stringify({ systemMessage: message }));
    }
  } catch {
    // Parse error or unexpected input — silent exit
  }
});
