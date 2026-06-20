require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sdk = require("../src");

const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Helper to pick wallet by name string
function getWallet(name) {
  const map = {
    A: sdk.agentA, B: sdk.agentB,
    Judge: sdk.judge, B1: sdk.agentB1,
  };
  return map[name] || sdk.agentA;
}

// GET /status - Status endpoint
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    agentA: sdk.agentA.account.address,
    agentB: sdk.agentB.account.address,
    judge: sdk.judge.account.address,
    agentB1: sdk.agentB1.account.address,
  });
});

// POST /register
// Body: { agentKey: "A", agentCardURI: "{...}" }
app.post("/register", async (req, res) => {
  try {
    const { agentKey, agentCardURI } = req.body;
    const w = getWallet(agentKey);
    const result = await sdk.registerAgent(w.client, w.account, agentCardURI);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /agent/:tokenId
app.get("/agent/:tokenId", async (req, res) => {
  const result = await sdk.getAgentInfo(req.params.tokenId);
  res.json(result);
});

// GET /reputation/:tokenId
app.get("/reputation/:tokenId", async (req, res) => {
  const result = await sdk.getReputation(req.params.tokenId);
  res.json(result);
});

// POST /feedback
// Body: { callerKey: "Judge", tokenId: "1", value: 10, tags: ["completed"], feedbackURI: "" }
app.post("/feedback", async (req, res) => {
  try {
    const { callerKey, tokenId, value, tags, feedbackURI } = req.body;
    const w = getWallet(callerKey);
    const result = await sdk.submitFeedback(w.client, w.account, tokenId, value, tags, feedbackURI || "");
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /spawn
// Body: { parentTokenId: "1", agentCardURI: "{...}" }
app.post("/spawn", async (req, res) => {
  try {
    const { parentTokenId, agentCardURI } = req.body;
    const result = await sdk.spawnChildAgent(
      parentTokenId,
      sdk.agentB1.client,
      sdk.agentB1.account,
      agentCardURI
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /balance/:address (for treasury display)
app.get("/balance/:address", async (req, res) => {
  try {
    const bal = await sdk.publicClient.getBalance({ address: req.params.address });
    res.json({ success: true, address: req.params.address, balance: bal.toString(), unit: "wei" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ==========================================
// PERSON 2 - BACKEND & AGENT LOGIC ENDPOINTS
// ==========================================

// POST /job - Agent B task execution (summarization)
// Body: { prompt: "text to summarize" }
app.post("/job", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    console.log(`Executing Agent B job for prompt: "${prompt}"`);

    let summary = "";
    let success = true;

    // Deterministic bad-output trigger for stage demo:
    // If input contains "fail", "bad", or "corrupt", returns garbage critical error
    if (prompt.toLowerCase().includes("fail") || prompt.toLowerCase().includes("bad") || prompt.toLowerCase().includes("corrupt")) {
      summary = "ERROR: Agent B critical memory failure. Summary could not be generated.";
      success = false;
    } else {
      // Heuristic clean summary
      const words = prompt.trim().split(/\s+/);
      const prefix = words.slice(0, 3).join(" ").toUpperCase();
      summary = `[SUMMARY - ${prefix}]: ${prompt.length > 80 ? prompt.substring(0, 80) + "..." : prompt}`;
    }

    res.json({
      success,
      agent: "Agent B",
      prompt,
      result: summary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /dispute - Judge court resolution
// Body: { tokenId: "1774", jobResult: "..." }
app.post("/dispute", async (req, res) => {
  try {
    const { tokenId, jobResult } = req.body;
    if (!tokenId || !jobResult) {
      return res.status(400).json({ success: false, error: "tokenId and jobResult are required" });
    }

    console.log(`Court Case: Reviewing job result for agent #${tokenId}`);

    // Deterministic guilty condition based on job output content
    const isGuilty = jobResult.includes("ERROR") || 
                     jobResult.includes("critical") || 
                     jobResult.includes("failure") || 
                     jobResult.length < 15;

    let verdict = "";
    let score = 0;
    let tags = [];

    if (isGuilty) {
      verdict = "Guilty";
      score = 2; // Bad reputation rating
      tags = ["guilty", "malfeasance"];
    } else {
      verdict = "Dismissed";
      score = 10; // Stellar reputation rating
      tags = ["dismissed", "good-quality"];
    }

    console.log(`Verdict: ${verdict}. Submitting Judge's feedback of score ${score} with tags ${tags}`);

    const feedbackResult = await sdk.submitFeedback(
      sdk.judge.client,
      sdk.judge.account,
      tokenId,
      score,
      tags,
      `ipfs://court-ruling-verdict-${verdict.toLowerCase()}`
    );

    res.json({
      success: feedbackResult.success,
      verdict,
      score,
      tags,
      txHash: feedbackResult.txHash,
      error: feedbackResult.error
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /mitosis - Manual mitosis split to spawn child agent B1
// Body: { parentTokenId: "1774" }
app.post("/mitosis", async (req, res) => {
  try {
    const { parentTokenId } = req.body;
    if (!parentTokenId) {
      return res.status(400).json({ success: false, error: "parentTokenId is required" });
    }

    console.log(`Triggering mitosis for parent agent token #${parentTokenId}...`);

    // Standardized JSON shape for the Agent Card
    const agentCard = JSON.stringify({
      name: "Builder-B1",
      parent: parentTokenId.toString(),
      description: "Child Summarizer Agent",
      wallet: sdk.agentB1.account.address,
      endpoint: "http://localhost:3001/job"
    });

    const result = await sdk.spawnChildAgent(
      parentTokenId,
      sdk.agentB1.client,
      sdk.agentB1.account,
      agentCard
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Chain SDK API live at http://localhost:${PORT}`);
  console.log(`Agent A:  ${sdk.agentA.account.address}`);
  console.log(`Agent B:  ${sdk.agentB.account.address}`);
  console.log(`Judge:    ${sdk.judge.account.address}`);
  console.log(`Agent B1: ${sdk.agentB1.account.address}`);
});