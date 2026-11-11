import {test,expect} from "bun:test";
import { snapshotOf, detectTokenChanges } from "../src/token-radar-storage.mjs";

function report({price=10,liquidity=100000,volume=50000,second=false}={}) {
  const pool = {address:"PoolA",priceUsd:price,liquidityUsd:liquidity,volume24hUsd:volume,buys24h:20,sells24h:10};
  return {
    chainId:"solana",address:"mint",status:"OBSERVED",
    source:{name:"DEX Screener",observedAt:"2026-11-11T06:00:00Z"},
    primaryPool:pool,pools:[pool,...(second?[{address:"PoolB",priceUsd:3,liquidityUsd:8000,volume24hUsd:500}]:[])]
  };
}
test("initial observation is not a fabricated change event",()=>{
  const state=detectTokenChanges(null,snapshotOf(report()));
  expect(state.state).toBe("INITIAL_OBSERVATION");
  expect(state.events).toHaveLength(0);
});
test("unchanged observations yield no event despite a newer retrieval timestamp",()=>{
  const a=snapshotOf(report());
  const b=snapshotOf(report());
  expect(detectTokenChanges(a,b).state).toBe("NO_MATERIAL_CHANGE");
  expect(detectTokenChanges(a,b).events).toHaveLength(0);
});
test("price/liquidity/volume threshold events use exact source observations",()=>{
  const a=snapshotOf(report());
  const b=snapshotOf(report({price:12,liquidity:70000,volume:120000}));
  const changes=detectTokenChanges(a,b);
  expect(changes.state).toBe("SIGNIFICANT_CHANGE");
  expect(changes.events.map(e=>e.type).sort()).toEqual(["LIQUIDITY_CHANGE","PRICE_CHANGE","VOLUME_CHANGE"]);
  expect(changes.events.find(e=>e.type==="LIQUIDITY_CHANGE").deltaPct).toBe(-30);
});
test("new and no-longer-reported pools are source observations not delist claims",()=>{
  const a=snapshotOf(report({second:false}));
  const b=snapshotOf(report({second:true}));
  const x=detectTokenChanges(a,b);
  expect(x.events.map(e=>e.type)).toContain("POOL_NEWLY_REPORTED");
  const y=detectTokenChanges(b,a);
  expect(y.events.map(e=>e.type)).toContain("POOL_NO_LONGER_REPORTED");
  expect(y.events.find(e=>e.type==="POOL_NO_LONGER_REPORTED").evidence.caveat).toContain("not proof");
});
test("not enough comparable information does not imply market collapse",()=>{
  const a=snapshotOf(report());
  const b=snapshotOf(report({price:null,liquidity:null,volume:null}));
  const x=detectTokenChanges(a,b);
  expect(x.events).toHaveLength(0);
});
