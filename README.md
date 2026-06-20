# Monad Agent Civilization (ERC-8004)

An on-chain, autonomous AI agent economy running on the **Monad Testnet**. This system enables AI agents to hold on-chain identity (NFTs), build/query reputation, execute off-chain task workloads (like text summarization), resolve disputes via an on-chain courtroom arbitrated by a Judge, and replicate themselves (mitosis) to spawn child helper agents.

---

## 🚀 Overview

The Monad Agent Civilization is a prototype implementation demonstrating the lifecycles of autonomous web3-native AI agents. The project implements identity registration, reputation scoring, dispute resolution, and agent mitosis:

1. **Identity & Roster**: Agents are registered on-chain, represented by unique NFTs.
2. **Task Terminal**: Agent B accepts summarization tasks. Users can trigger deterministic failures to simulate malfeasance.
3. **Courtroom Arbitrations**: The Judge reviews failed jobs and submits negative feedback/verdicts on-chain.
4. **Mitosis Replication**: Successful/active agents can replicate, registering child agents (Agent B1) to divide workloads.

---

## 🛠️ Tech Stack

- **Blockchain Layer**: Monad Testnet (Chain ID `10143`)
- **Backend API**: Node.js, Express, `viem` (for core identity/reputation operations), `ethers` (used in simulated treasury)
- **Frontend Dashboard**: HTML5, Vanilla CSS, Vanilla JavaScript (connected to the local API)
- **Core Smart Contract Standard**: Customized ERC-721 Identity & Reputation registry tracking (ERC-8004 concept)

---

## 📁 Repository Structure

```text
agent-civilization/
├── api/
│   ├── public/              # Frontend web dashboard
│   │   ├── index.html       # Dashboard HTML layout
│   │   ├── style.css        # Cyberpunk dashboard styling
│   │   └── app.js           # Client-side API coordinator & UI logic
│   └── server.js            # Express API Server containing agent logic & endpoints
├── scripts/
│   └── testAll.js           # Integrations/tests wrapper script for SDK services
├── src/
│   ├── abis/                # JSON ABI files for deployed smart contracts
│   │   ├── IdentityRegistry.json
│   │   └── ReputationRegistry.json
│   ├── config.js            # viem provider, chain, wallet, and contract config
│   ├── identityService.js   # Service for on-chain identity (minting, spawning)
│   ├── index.js             # Entrypoint exporting public client, wallets, and SDK functions
│   ├── reputationService.js # Service for on-chain feedback and reputation tracking
│   └── treasuryService.js   # Simulated/live MON token treasury utility
├── .env                     # Environment variables (RPC, Private Keys, Contracts)
├── package.json             # Node dependencies and metadata
└── README.md                # Project documentation
```

---

## ⚙️ Configuration & Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Setup Dependencies
Clone the repository and run:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory. You can configure it as follows:
```env
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=10143

# Agent & Judge private keys (Ensure they are funded with MON testnet tokens)
AGENT_A_PRIVATE_KEY=0x...
AGENT_B_PRIVATE_KEY=0x...
JUDGE_PRIVATE_KEY=0x...
AGENT_B1_PRIVATE_KEY=0x...

# Deployed Contract Addresses on Monad Testnet
IDENTITY_REGISTRY=0x8004A818BFB912233c491871b3d84c89A494BD9e
REPUTATION_REGISTRY=0x8004B663056A597Dffe9eCcC1965A193B7388713

PORT=3001
```

---

## 🏃 Run & Test

### Run SDK CLI Integration Test
To verify the core on-chain interaction logic (balance query, mint identity, read tokenURI, submit feedback, fetch updated reputation), execute:
```bash
node scripts/testAll.js
```

### Start Backend API & Dashboard Server
To run the web server:
```bash
node api/server.js
```
The server will boot up at `http://localhost:3001`. Access it in your web browser to open the **Monad Agent Civilization Dashboard**.

---

## 🔌 API Endpoints Reference

### 🌐 System & Identity

#### `GET /status`
Returns API status and loaded address mappings for Agent A, Agent B, Judge, and Agent B1.

#### `POST /register`
Mints an Agent identity NFT.
* **Body**: `{ "agentKey": "A" | "B" | "Judge" | "B1", "agentCardURI": "string" }`
* **Response**: `{ "success": true, "tokenId": "...", "txHash": "..." }`

#### `GET /agent/:tokenId`
Queries on-chain owner address and metadata tokenURI.

#### `GET /balance/:address`
Returns the address's native MON balance on Monad.

---

### 📈 Reputation & Courtroom

#### `GET /reputation/:tokenId`
Retrieves aggregated reputation stats (count, average score).

#### `POST /feedback`
Submits custom on-chain feedback for an agent.
* **Body**: `{ "callerKey": "Judge" | "A" | ..., "tokenId": "123", "value": 10, "tags": ["completed"], "feedbackURI": "" }`

#### `POST /job`
Executes a summarization text task.
* **Body**: `{ "prompt": "some text" }`
* **Demo Failure**: Include words like `fail`, `bad`, or `corrupt` in the prompt to force the agent to throw a memory error.

#### `POST /dispute`
Resolves disputes. Evaluates a job execution result. If a memory failure is detected, the Judge convicts the agent, writing a penalty rating and relevant tags on-chain.
* **Body**: `{ "tokenId": "123", "jobResult": "..." }`

---

### 🧬 Mitosis Replication

#### `POST /mitosis`
Triggers mitosis for a parent agent. Automatically generates metadata indicating replication parent ID and registers a new child agent card.
* **Body**: `{ "parentTokenId": "123" }`

#### `POST /spawn`
Lower-level handler to register a child agent under a parent.
* **Body**: `{ "parentTokenId": "123", "agentCardURI": "..." }`

---

## 🏛️ Civilization Lifecycle Demo

To demonstrate the full lifecycle in the UI:
1. Open the UI dashboard at `http://localhost:3001`.
2. Under **Agent B Task Terminal**, enter text containing `"fail"` (e.g. `summarize database system failures`).
3. Click **Run Summary Job**. The terminal output logs a memory error.
4. The **Initiate Court Dispute** button will unlock. Click it. The Judge evaluates the log, issues a verdict of `Guilty`, and submits negative reputation feedback on-chain.
5. In the **Active Agent Roster**, observe Agent B's reputation score drop.
6. To run mitosis: Click **Initiate Mitosis Split**. This replicates Agent B and registers the offspring agent `B1` on-chain.
