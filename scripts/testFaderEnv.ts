// scripts/testFaderEnv.ts

import 'dotenv/config';

type Pair = {
  label: string;
  botEnv: string;
  faderEnv: string;
  pkEnv: string;
};

const PAIRS: Pair[] = [
  { label: 'GEMINI',  botEnv: 'BOT_GEMINI_3_PRO',      faderEnv: 'MY_GEMINI_FADE_WALLET',  pkEnv: 'MY_GEMINI_FADE_PK' },
  { label: 'GROK',    botEnv: 'BOT_GROK_4',            faderEnv: 'MY_GROK_FADE_WALLET',    pkEnv: 'MY_GROK_FADE_PK' },
  { label: 'QWEN',    botEnv: 'BOT_QWEN3_MAX',         faderEnv: 'MY_QWEN_FADE_WALLET',    pkEnv: 'MY_QWEN_FADE_PK' },
  { label: 'KIMI',    botEnv: 'BOT_KIMI_K2_THINKING',  faderEnv: 'MY_KIMI_FADE_WALLET',    pkEnv: 'MY_KIMI_FADE_PK' },
  { label: 'DEEPSEEK',botEnv: 'BOT_DEEPSEEK_CHAT_V3_1',faderEnv: 'MY_DEEPSEEK_FADE_WALLET',pkEnv: 'MY_DEEPSEEK_FADE_PK' },
  { label: 'CLAUDE',  botEnv: 'BOT_CLAUDE_SONNET_4_5', faderEnv: 'MY_CLAUDE_FADE_WALLET',  pkEnv: 'MY_CLAUDE_FADE_PK' },
];

function maskPk(pk: string | undefined | null) {
  if (!pk) return '—';
  const v = pk.trim();
  if (v.length <= 10) return v;
  return v.slice(0, 6) + '...' + v.slice(-4);
}

async function main() {
  console.log('🔍 Checking fader env pairs...\n');

  let okCount = 0;

  for (const pair of PAIRS) {
    const bot = process.env[pair.botEnv];
    const fader = process.env[pair.faderEnv];
    const pk = process.env[pair.pkEnv];

    const problems: string[] = [];

    if (!bot || !bot.trim()) problems.push(`нет ${pair.botEnv}`);
    if (!fader || !fader.trim()) problems.push(`нет ${pair.faderEnv}`);
    if (!pk || !pk.trim()) problems.push(`нет ${pair.pkEnv}`);

    if (problems.length === 0) {
      okCount++;
      console.log(
        `✅ ${pair.label}: ${pair.botEnv} -> ${pair.faderEnv} (pk: ${maskPk(pk)})`
      );
      console.log(`    bot:   ${bot}`);
      console.log(`    fader: ${fader}\n`);
    } else {
      console.log(`⚠️  ${pair.label}: ${problems.join(', ')}`);
    }
  }

  console.log('\nSummary:');
  console.log(`  OK pairs:   ${okCount}`);
  console.log(`  Total pairs: ${PAIRS.length}`);

  if (okCount === 0) {
    console.log('\n❌ Ни одной полной пары не найдено. Copy-engine в бою работать не будет.');
    process.exit(1);
  } else {
    console.log('\n✅ Env для copy-engine выглядит адекватно. Можно запускать worker.');
  }
}

main().catch((err) => {
  console.error('Fatal error in testFaderEnv:', err);
  process.exit(1);
});
