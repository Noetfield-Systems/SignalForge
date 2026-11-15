import {test,expect} from "bun:test";
test("SignalForge SourceA task UX has working branded controls and parseable client script",async()=>{
 const html=await Bun.file(new URL("../public/agent.html",import.meta.url)).text();
 for(const id of ["researchForm","executionDesk","taskEvents","taskState","cancelTask","retryTask","verifyReceipt","receiptInspector","artifactInspector","customerTasks","taskList","automationForm","automationPrompt","automationList"]){
  expect(html).toContain('id="'+id+'"');
 }
 expect(html).toContain("SIGNALFORGE");
 expect(html).toContain("/api/agent/tasks");
 expect(html).toContain("/api/agent/schedules");
 expect(html).toContain("/api/agent/research");
 expect(html).not.toContain("SourceA Dashboard");
 const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 expect(js?.length).toBeGreaterThan(1000);
 expect(()=>new Function(js!)).not.toThrow();
});
