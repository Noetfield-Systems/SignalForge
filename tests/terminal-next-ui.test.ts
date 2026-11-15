import {expect,test} from "bun:test";

test("premium terminal candidate is routed without replacing the existing terminal",async()=>{
  const server=await Bun.file(new URL("../src/server.ts",import.meta.url)).text();
  const html=await Bun.file(new URL("../public/terminal-next.html",import.meta.url)).text();
  expect(server).toContain('if(path==="/terminal-next")');
  expect(server).toContain('if(path==="/app"||path==="/index.html")');
  expect(html).toContain('/api/market?symbol=');
  expect(html).toContain('data-symbol');
  expect(html).toContain('data-interval');
  expect(html).toContain('data-pane="agent"');
  expect(html).toContain('data-pane="evidence"');
  expect(html).toContain('SOURCE UNAVAILABLE');
  expect(html).toContain('DEMO / FALLBACK');
  expect(html).toContain('NO LIVE ORDER EXECUTION');
  expect(html).not.toContain('Guaranteed returns');
});

test("terminal candidate preserves source honesty and mobile layout",async()=>{
  const html=await Bun.file(new URL("../public/terminal-next.html",import.meta.url)).text();
  expect(html).toContain('LIVE_PUBLIC_DATA');
  expect(html).toContain('DEMO / FALLBACK');
  expect(html).toContain('sourceMode');
  expect(html).toContain('fetchedAt');
  expect(html).toContain('@media(max-width:690px)');
  expect(html).toContain('prefers-reduced-motion:reduce');
});
