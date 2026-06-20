// State Variables
let agentAddresses = { A: "", B: "", Judge: "", B1: "" };
let agentBTokenId = "1774"; // Default registered Agent B ID
let agentB1TokenId = null;
let lastJobResult = "";

// Elements
const elAddrA = document.getElementById("addr-A");
const elAddrB = document.getElementById("addr-B");
const elAddrJudge = document.getElementById("addr-Judge");
const elAddrB1 = document.getElementById("addr-B1");

const elBalA = document.getElementById("bal-A");
const elBalB = document.getElementById("bal-B");
const elBalJudge = document.getElementById("bal-Judge");
const elBalB1 = document.getElementById("bal-B1");

const elRepA = document.getElementById("rep-A");
const elRepB = document.getElementById("rep-B");
const elRepFillB = document.getElementById("rep-fill-B");
const elRepJudge = document.getElementById("rep-Judge");

const btnRunJob = document.getElementById("btn-run-job");
const btnLoadDemoFail = document.getElementById("btn-load-demo-fail");
const btnTriggerDispute = document.getElementById("btn-trigger-dispute");
const btnTriggerMitosis = document.getElementById("btn-trigger-mitosis");

const termText = document.getElementById("job-output-text");
const courtVerdictBox = document.getElementById("dispute-verdict-box");
const courtVerdictText = document.getElementById("court-verdict-text");
const logsContainer = document.getElementById("logs-container");

const cellContainer = document.querySelector(".mitosis-cell-container");
const cardB1 = document.getElementById("card-B1");
const b1StatusBadge = document.getElementById("b1-status-badge");
const parentB1 = document.getElementById("parent-B1");

// Helper: Add entry to blockchain log ticker
function addLog(type, message, txHash = null) {
  const time = new Date().toTimeString().split(' ')[0];
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;
  
  let html = `<span class="log-time">[${time}]</span> ${message}`;
  if (txHash) {
    html += ` <span class="log-hash" onclick="window.open('#', '_blank')">${txHash.substring(0, 18)}...</span>`;
  }
  entry.innerHTML = html;
  
  logsContainer.appendChild(entry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Convert Wei balance to MON with 4 decimal formatting
function formatMON(weiString) {
  try {
    const wei = BigInt(weiString);
    const mon = Number(wei / 100000000000000n) / 10000;
    return mon.toFixed(4) + " MON";
  } catch (e) {
    return "0.0000 MON";
  }
}

// Fetch balances and updates UI
async function updateBalances() {
  const keys = ["A", "B", "Judge"];
  if (agentAddresses.B1) {
    keys.push("B1");
  }
  
  for (const k of keys) {
    const addr = agentAddresses[k];
    if (!addr) continue;
    
    try {
      const res = await fetch(`/balance/${addr}`);
      const data = await res.json();
      if (data.success) {
        if (k === "A") elBalA.textContent = formatMON(data.balance);
        if (k === "B") elBalB.textContent = formatMON(data.balance);
        if (k === "Judge") elBalJudge.textContent = formatMON(data.balance);
        if (k === "B1") elBalB1.textContent = formatMON(data.balance);
      }
    } catch (e) {
      console.error(`Error loading balance for ${k}:`, e);
    }
  }
}

// Fetch reputation status
async function updateReputation() {
  if (!agentBTokenId) return;
  
  try {
    const res = await fetch(`/reputation/${agentBTokenId}`);
    const data = await res.json();
    if (data.success) {
      const score = parseFloat(data.score);
      const count = parseInt(data.count);
      
      elRepB.textContent = `${score.toFixed(1)} / 10 (${count} reviews)`;
      // Score is 1-10, fill percentage out of 100
      const pct = (score / 10) * 100;
      elRepFillB.style.width = `${pct}%`;
    }
  } catch (e) {
    console.error("Error loading reputation:", e);
  }
}

// Load configurations
async function loadStatus() {
  try {
    const res = await fetch("/status");
    const data = await res.json();
    
    agentAddresses.A = data.agentA;
    agentAddresses.B = data.agentB;
    agentAddresses.Judge = data.judge;
    agentAddresses.B1 = data.agentB1;
    
    elAddrA.textContent = data.agentA;
    elAddrB.textContent = data.agentB;
    elAddrJudge.textContent = data.judge;
    
    addLog("system", `Server online. Agent A: ${data.agentA.substring(0, 10)}..., Agent B: ${data.agentB.substring(0, 10)}...`);
    
    updateBalances();
    updateReputation();
  } catch (e) {
    addLog("system", "Failed to load server configuration. Is backend running?");
  }
}

// Run summarization job
btnRunJob.addEventListener("click", async () => {
  const prompt = document.getElementById("prompt-input").value;
  if (!prompt.trim()) {
    alert("Please enter a prompt first!");
    return;
  }
  
  termText.className = "terminal-content text-mono";
  termText.textContent = `[LOG] Initiating summarization task...
[LOG] Endpoint: POST /job
[LOG] Signer: Agent B (Worker)
[LOG] Sending prompt data to LLM Service...\n`;
  
  btnRunJob.disabled = true;
  
  try {
    const res = await fetch("/job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    
    const data = await res.json();
    btnRunJob.disabled = false;
    
    if (data.success) {
      termText.className = "terminal-content text-mono terminal-success";
      termText.textContent += `[LOG] Summarization complete!
---------------------------------------------
${data.result}`;
      lastJobResult = data.result;
      addLog("job", `Agent B successfully completed job. Prompt: "${prompt.substring(0, 20)}..."`);
    } else {
      termText.className = "terminal-content text-mono terminal-error";
      termText.textContent += `[LOG] CRITICAL: Execution failed!
---------------------------------------------
${data.result}`;
      lastJobResult = data.result;
      addLog("job", `Agent B job execution failed (memory corrupted).`);
    }
    
    // Enable dispute option
    btnTriggerDispute.disabled = false;
    
  } catch (e) {
    btnRunJob.disabled = false;
    termText.className = "terminal-content text-mono terminal-error";
    termText.textContent += `[LOG] Network connection lost.`;
  }
});

// Load Failing Prompt
btnLoadDemoFail.addEventListener("click", () => {
  document.getElementById("prompt-input").value = "CRITICAL ACTION REQUIRED: This job will FAIL due to corrupted memory buffers. The input parameters are bad.";
  addLog("system", "Failing prompt loaded. Click 'Run Summary Job' to execute.");
});

// Trigger dispute
btnTriggerDispute.addEventListener("click", async () => {
  if (!lastJobResult) return;
  
  btnTriggerDispute.disabled = true;
  courtVerdictBox.className = "dispute-state-box";
  courtVerdictText.textContent = "UNDER DELIBERATION...";
  
  addLog("dispute", `Submitting dispute for Agent #${agentBTokenId} to Court...`);
  
  try {
    const res = await fetch("/dispute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId: agentBTokenId,
        jobResult: lastJobResult
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      if (data.verdict === "Guilty") {
        courtVerdictBox.className = "dispute-state-box verdict-guilty";
        courtVerdictText.textContent = "GUILTY VERDICT";
        addLog("dispute", `Judge verdict: GUILTY. Penalty rating of ${data.score}/10 submitted.`, data.txHash);
      } else {
        courtVerdictBox.className = "dispute-state-box verdict-dismissed";
        courtVerdictText.textContent = "DISMISSED (NOT GUILTY)";
        addLog("dispute", `Judge verdict: DISMISSED. Stellar rating of ${data.score}/10 submitted.`, data.txHash);
      }
      
      // Refresh reputation metrics and balances
      setTimeout(() => {
        updateReputation();
        updateBalances();
      }, 3000);
    } else {
      courtVerdictBox.className = "dispute-state-box";
      courtVerdictText.textContent = "CASE DISMISSED (ERROR)";
      addLog("dispute", `Court execution reverted: ${data.error}`);
    }
  } catch (e) {
    courtVerdictText.textContent = "NO ACTIVE CASE";
    addLog("dispute", `Connection timeout during court verdict.`);
  }
});

// Trigger Mitosis
btnTriggerMitosis.addEventListener("click", async () => {
  btnTriggerMitosis.disabled = true;
  
  // Visual split animation
  cellContainer.classList.add("splitting");
  addLog("mitosis", `Initiating mitosis replication chamber for Agent #${agentBTokenId}...`);
  
  try {
    const res = await fetch("/mitosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentTokenId: agentBTokenId })
    });
    
    const data = await res.json();
    
    // Animate split completion
    setTimeout(() => {
      cellContainer.classList.remove("splitting");
      btnTriggerMitosis.disabled = false;
      
      if (data.success) {
        agentB1TokenId = data.tokenId;
        
        // Activate Agent B1 Card in list
        cardB1.classList.remove("inactive");
        b1StatusBadge.className = "badge badge-child";
        b1StatusBadge.textContent = "ACTIVE";
        parentB1.textContent = `#${agentBTokenId}`;
        elAddrB1.textContent = agentAddresses.B1;
        
        addLog("mitosis", `Mitosis split successful! Spawning Child Agent #${data.tokenId} on-chain.`, data.txHash);
        updateBalances();
      } else {
        addLog("mitosis", `Mitosis split failed: ${data.error}`);
        alert(`Mitosis Split Failed:\n\n${data.error}\n\nHint: Have you funded B1's wallet with testnet MON?`);
      }
    }, 2000);
    
  } catch (e) {
    cellContainer.classList.remove("splitting");
    btnTriggerMitosis.disabled = false;
    addLog("mitosis", "Replicated link severed due to server connectivity error.");
  }
});

// Initialize dashboard
loadStatus();

// Polling updates every 10 seconds
setInterval(() => {
  updateBalances();
  updateReputation();
}, 10000);
