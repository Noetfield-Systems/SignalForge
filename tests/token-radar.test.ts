import {expect,test} from "bun:test";
import {changes,validSolanaMint} from "../src/token-radar";
test("Solana mint format checks 32 decoded bytes, not just a loose regex",()=>{
  expect(validSolanaMint("So11111111111111111111111111111111111111112")).toBe(true);
  expect(validSolanaMint("11111111111111111111111111111111")).toBe(true);
  expect(validSolanaMint("0OIl1111111111111111111111111111111")).toBe(false);
  expect(validSolanaMint("Solana token")).toBe(false);
  expect(validSolanaMint("111111111111111111111111111111111")).toBe(false);
});
test("monitoring deltas alert only on genuine numeric threshold changes",()=>{
  const first={market:{priceUsd:1,liquidityUsd:1000,volume24hUsd:10000}};
  const steady={market:{priceUsd:1.04,liquidityUsd:1050,volume24hUsd:11000}};
  expect(changes(first,steady)).toEqual([]);
  const moved={market:{priceUsd:1.07,liquidityUsd:850,volume24hUsd:14000}};
  const result=changes(first,moved);
  expect(result.map(x=>x.type)).toEqual(["PRICE_MOVE","LIQUIDITY_MOVE","VOLUME_MOVE"]);
  expect(changes({market:{priceUsd:null,liquidityUsd:0}},moved)).toEqual([]);
});
