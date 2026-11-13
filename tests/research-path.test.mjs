import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
test("SignalForge five-station Research Path only navigates to real existing research views",()=>{
 const start=html.indexOf('class="sf-research-path"');
 const end=html.indexOf('id="feedNotice"',start);
 assert.ok(start>=0&&end>start,"Premium research path must appear on original dashboard");
 const block=html.slice(start,end);
 const expected=["dashboard","scanner","backtest","trackrecord","community"];
 const matches=[...block.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(matches,expected);
 for(const view of expected)assert.ok(html.includes('id="view-'+view+'"'),"Missing existing working view "+view);
 assert.match(block,/not trading signals, earnings or completed achievements/);
 assert.match(block,/No trade is placed from these steps/);
 assert.match(block,/from market noise to|From market noise to/);
 assert.doesNotMatch(block,/data-xp|data-revenue|payout|profit guarantee/i);
});
test("Research Path mobile, keyboard and product-jargon rules",()=>{
 assert.match(html,/\.sf-research-station:focus-visible/);
 assert.match(html,/@media\(max-width:700px\)[^{]*\{/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/role="list" aria-label="Five working research sections"/);
 assert.match(html,/data-view="scanner"/);
 assert.match(html,/data-view="backtest"/);
 assert.match(html,/function nav\(view\)/);
 assert.match(html,/document\.querySelectorAll\("\[data-view\]"\)/);
});
