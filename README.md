# Classxchange

**A peer-to-peer marketplace for reselling unused boutique fitness class credits — protected by an on-chain escrow contract, not a promise.**

Barry's, SoulCycle, [solidcore], and similar studios don't let you transfer a credit to someone else's account. Classxchange works around that the way it actually happens in practice: the seller keeps their credit, books the specific class the buyer asks for, and adds the buyer as a guest — while payment sits in escrow until the buyer confirms they're actually booked in.

🔗 **Live app:** [app-six-roan-78.vercel.app](https://app-six-roan-78.vercel.app)
📜 **Contract:** [`ClassEscrow` on Base Sepolia](https://sepolia.basescan.org/address/0x26294F3baF2D7289f1eEfDEd7d4df8d21d1fC1a4)

---

## ✨ Key Features

- 🔒 **Escrow-protected payments** — a Solidity contract holds funds until the buyer confirms delivery, with automatic refund/release timeouts and arbiter-resolved disputes on either side.
- 👛 **Invisible wallets** — sign up with just an email or phone via [Privy](https://privy.io); an embedded wallet is created behind the scenes, no seed phrase or browser extension required.
- 📅 **Class-request flow** — credits aren't tied to a specific class at listing time; buyers request their preferred date/time after claiming, and the seller books it and adds them as a guest.
- 💰 **Real USDC, no volatility** — priced and settled in USDC, not a native token.
- 🏷️ **Optional collateral bonds** — sellers can post a bond that's forfeited to the buyer if they lose a dispute, building trust without requiring it.
- 👤 **Profiles & stats** — usernames, profile pictures, favorite studio/class, and a running count of classes bought/sold.
- 🤝 **Friends & messaging** — add friends by username and message any counterparty directly from an order or profile.
- 🎨 **Laser Neon Pink design system** — a dark, high-contrast UI with condensed display type; see [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity, [Foundry](https://book.getfoundry.sh/) |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Wallets & chain | [Privy](https://privy.io) (embedded wallets), [wagmi](https://wagmi.sh) / [viem](https://viem.sh) |
| Database | PostgreSQL ([Neon](https://neon.tech)) via [Prisma](https://www.prisma.io) |
| Chain | [Base](https://base.org) (Sepolia testnet by default) |
| Hosting | [Vercel](https://vercel.com) |

---

## 📁 Project Structure

```
classxchange/
├── contracts/              # Foundry project
│   ├── src/ClassEscrow.sol       # Escrow contract
│   ├── script/Deploy.s.sol       # Deployment script
│   └── test/ClassEscrow.t.sol    # Full state-machine test suite
├── app/                    # Next.js application
│   ├── prisma/schema.prisma      # Listings, orders, users, friends, messages
│   └── src/
│       ├── app/                  # Routes (App Router) + API endpoints
│       ├── components/           # NavBar, ListingRow, etc.
│       └── lib/                  # Contract bindings, wagmi config, on-chain actions
├── DESIGN.md               # Product/architecture design doc
└── DESIGN_SYSTEM.md        # Visual design system reference
```

---

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A [Privy](https://dashboard.privy.io) account (free) for embedded wallet auth
- A PostgreSQL database — [Neon](https://neon.tech) has a generous free tier

### 1. Clone the repo

```bash
git clone https://github.com/neenanaikar/classxchange.git
cd classxchange
```

### 2. Set up the contracts

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
forge build
forge test -vv
```

### 3. Set up the app

```bash
cd ../app
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

```bash
# From https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=

# Point at a local Anvil chain for development, or Base Sepolia for the
# shared testnet deployment (see .env.production.example)
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CLASS_ESCROW_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
```

Add your Postgres connection string to `app/.env`:

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

Then run the migrations and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

The app is now running at `http://localhost:3000`.

---

## 🧪 Usage Examples

### Run a local chain and deploy the contract

```bash
anvil   # in one terminal

# in another terminal, from contracts/
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy the printed `ClassEscrow` and `MockUSDC` addresses into `app/.env.local`.

### Deploy to a real network (e.g. Base Sepolia)

Point `PAYMENT_TOKEN_ADDRESS` at a real USDC deployment instead of deploying a mock:

```bash
PRIVATE_KEY=0xYOUR_KEY \
ARBITER_ADDRESS=0xYOUR_ARBITER \
FEE_RECIPIENT_ADDRESS=0xYOUR_FEE_RECIPIENT \
FEE_BPS=250 \
PAYMENT_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
forge script script/Deploy.s.sol:DeployScript --rpc-url https://sepolia.base.org --broadcast
```

### Interact with the escrow contract directly

```bash
export CLASS_ESCROW=0x26294F3baF2D7289f1eEfDEd7d4df8d21d1fC1a4
export RPC=https://sepolia.base.org

# Check a listing (seller, price, bondAmount, proofHash, active)
cast call $CLASS_ESCROW "listings(uint256)(address,uint256,uint256,bytes32,bool)" 1 --rpc-url $RPC

# Check an order's status (status enum: Claimed=1, Delivered=2, Confirmed=3, Disputed=4, Resolved=5, Refunded=6)
cast call $CLASS_ESCROW "orders(uint256)(uint256,address,address,uint256,uint256,bytes32,uint64,uint64,uint64,uint8)" 1 --rpc-url $RPC
```

### Run the contract test suite

```bash
cd contracts
forge test -vv
```

```
Ran 30 tests for test/ClassEscrow.t.sol:ClassEscrowTest
[PASS] test_ConfirmReceipt_PaysOutSellerMinusFeeAndReturnsBond() (gas: 384900)
[PASS] test_RaiseDispute_ByBuyerBeforeConfirmDeadline() (gas: 373239)
[PASS] test_ResolveDispute_BuyerWins_RefundsPaymentAndForfeitsSellerBond() (gas: 361199)
Suite result: ok. 30 passed; 0 failed; 0 skipped
```

---

## 📖 Further Reading

- [`DESIGN.md`](DESIGN.md) — product architecture: escrow state machine, verification/dispute flow, and the reasoning behind the "seller books, buyer confirms" model
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — color tokens, typography, and component conventions
