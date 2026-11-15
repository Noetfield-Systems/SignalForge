import {test,expect} from "bun:test";
import {externalMcpConfig} from "../src/signalforge-mcp-client.ts";
test("external MCP client has no endpoint or tool without explicit allowlist",()=>{
 expect(externalMcpConfig({})).toBeNull();
 expect(externalMcpConfig({SIGNALFORGE_EXTERNAL_MCP_URL:"https://localhost/mcp",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_HOST:"localhost",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_TOOLS:"market_snapshot"})).toBeNull();
 expect(externalMcpConfig({SIGNALFORGE_EXTERNAL_MCP_URL:"http://example.com/mcp",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_HOST:"example.com",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_TOOLS:"market_snapshot"})).toBeNull();
 expect(externalMcpConfig({SIGNALFORGE_EXTERNAL_MCP_URL:"https://example.com:8080/mcp",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_HOST:"example.com",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_TOOLS:"market_snapshot"})).toBeNull();
 const configured=externalMcpConfig({SIGNALFORGE_EXTERNAL_MCP_URL:"https://safe.example.com/mcp",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_HOST:"safe.example.com",SIGNALFORGE_EXTERNAL_MCP_ALLOWED_TOOLS:"market_snapshot, analyze_perps,market_snapshot"});
 expect(configured?.allowedTools).toEqual(["market_snapshot","analyze_perps"]);
 expect(configured?.url).toBe("https://safe.example.com/mcp");
});
