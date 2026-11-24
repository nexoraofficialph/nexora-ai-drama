const fs=require("node:fs");
const path=process.argv[2]||"npm-audit-report.json";
if(!fs.existsSync(path))throw new Error("npm audit report is missing");
let report;
try{report=JSON.parse(fs.readFileSync(path,"utf8"));}catch(e){throw new Error("npm audit output is not valid JSON: "+e.message);}
if(!report.metadata?.vulnerabilities||!report.vulnerabilities)throw new Error("npm audit report is incomplete");
const counts=report.metadata.vulnerabilities;
console.log("npm audit counts:",JSON.stringify(counts));
const findings=Object.values(report.vulnerabilities).filter(v=>["moderate","high","critical"].includes(v.severity));
if(findings.length){console.error("Security gate failed. Vulnerabilities detected:");for(const v of findings)console.error("- "+v.severity.toUpperCase()+" "+v.name+" ("+v.range+")"+(v.fixAvailable?" · fix available":""));process.exitCode=1;}
else console.log("Security gate passed: no moderate, high, or critical vulnerabilities.");
