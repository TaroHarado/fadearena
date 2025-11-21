/**
 * Raw Hyperliquid API test script
 * 
 * Makes direct fetch calls to Hyperliquid Info API without using the client.
 * Tests different request formats to find fills for perp DEX positions.
 */
import dotenv from 'dotenv';

dotenv.config();

const address = process.env.BOT_GEMINI_3_PRO;

if (!address) {
  console.error('❌ BOT_GEMINI_3_PRO is not set in .env');
  process.exit(1);
}

async function testFillRequest(url: string, body: any, description: string): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📤 ${description}`);
  console.log(`Request body:`, JSON.stringify(body, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log(`Response: ${res.status} ${res.statusText}`);

    if (res.ok && text && text !== 'null') {
      try {
        const json = JSON.parse(text);
        
        // Check if it's an array of fills
        let fills: any[] = [];
        if (Array.isArray(json)) {
          fills = json;
        } else if (json.fills && Array.isArray(json.fills)) {
          fills = json.fills;
        } else if (json.data && Array.isArray(json.data)) {
          fills = json.data;
        }

        if (fills.length > 0) {
          console.log(`\n🎯 FOUND ${fills.length} FILL(S)!`);
          console.log('\nFirst 5 fills:');
          for (let i = 0; i < Math.min(5, fills.length); i++) {
            const fill = fills[i];
            const coin = fill.coin || '???';
            const side = fill.side === 'A' ? 'BUY' : fill.side === 'B' ? 'SELL' : fill.side || '???';
            const sz = Number(fill.sz || 0);
            const px = Number(fill.px || 0);
            const time = fill.time ? new Date(fill.time).toISOString() : '???';
            console.log(`  ${i + 1}. ${time} | ${coin.padEnd(15)} | ${side.padEnd(4)} | size: ${sz.toFixed(4)} | px: $${px.toFixed(2)}`);
          }
          
          // Check if any fills are for xyz:* assets
          const xyzFills = fills.filter((f: any) => f.coin?.startsWith('xyz:'));
          if (xyzFills.length > 0) {
            console.log(`\n✅ Found ${xyzFills.length} fill(s) for xyz:* assets!`);
            return true;
          }
          
          console.log('\n⚠️  Fills found, but none for xyz:* assets');
          return false;
        } else {
          console.log('\n❌ No fills found in response');
          console.log('Response structure:', Object.keys(json));
          if (Object.keys(json).length < 10) {
            console.log('Full response:', JSON.stringify(json, null, 2).substring(0, 1000));
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON:', e instanceof Error ? e.message : String(e));
        console.log('Raw text:', text.substring(0, 500));
      }
    } else {
      console.log(`❌ Failed or empty: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
  
  return false;
}

async function main() {
  const url = process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info';

  console.log('🚀 Raw Hyperliquid API Test - Fill Discovery');
  console.log('='.repeat(80));
  console.log(`Using Info URL: ${url}`);
  console.log(`Testing address: ${address}`);
  console.log('='.repeat(80));

  // Test different request formats for fills
  const fillRequests = [
    // Basic user fills
    { type: 'userFills', user: address },
    
    // User fills by time (last 7 days)
    { 
      type: 'userFillsByTime', 
      user: address,
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
      endTime: Date.now()
    },
    
    // User fills by time (last 30 days)
    { 
      type: 'userFillsByTime', 
      user: address,
      startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
      endTime: Date.now()
    },
    
    // User fills with dex parameter (might work for perp DEX)
    { type: 'userFills', user: address, dex: 'xyz' },
    
    // User fills by time with dex
    { 
      type: 'userFillsByTime', 
      user: address,
      dex: 'xyz',
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
      endTime: Date.now()
    },
    
    // Try perpFills (if exists)
    { type: 'perpFills', user: address },
    { type: 'perpFills', user: address, dex: 'xyz' },
    
    // Try userRecentFills
    { type: 'userRecentFills', user: address },
    { type: 'userRecentFills', user: address, dex: 'xyz' },
    { type: 'userRecentFills', user: address, limit: 50 },
    
    // Try userFillsByTime with different time ranges
    { 
      type: 'userFillsByTime', 
      user: address,
      startTime: Date.now() - 90 * 24 * 60 * 60 * 1000,
      endTime: Date.now()
    },
  ];

  let foundFills = false;
  for (const body of fillRequests) {
    let userDesc = '';
    if (body.user) {
      userDesc = ` (user: ${body.user.substring(0, 10)}...)`;
    }
    const description = `Testing fills: ${body.type}${userDesc}`;
    const found = await testFillRequest(url, body, description);
    
    if (found) {
      console.log(`\n🎉 SUCCESS! Found fills with format: ${body.type}`);
      console.log('Request that worked:', JSON.stringify(body, null, 2));
      foundFills = true;
      break; // Found working format, exit
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  if (!foundFills) {
    console.log('\n⚠️  No fills found in any tested format.');
    console.log('All request formats tested. Check the JSON outputs above for clues.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
