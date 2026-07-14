# Class Swap — Design Doc

Peer-to-peer marketplace for trading/reselling boutique fitness class credits (Barry's, SoulCycle, etc.) before they expire. Payment settles through an on-chain escrow contract; class validity is verified off-chain since no studio exposes a public API for this.

## 1. Problem shape

Two separable problems, solved by different layers:

| Problem | Where it's solved | Why |
|---|---|---|
| "Did the buyer actually pay, and does the seller actually get paid only after delivering?" | On-chain escrow contract | This is a trust/coordination problem a smart contract is built for. |
| "Is this class credit real, unexpired, and actually transferred to the buyer?" | Off-chain, manual proof + dispute resolution | No blockchain or oracle can see into Barry's internal booking system. This is a real-world-fact problem, not a computation problem. |

Don't conflate the two. The contract never "checks if a class is open" — it only ever checks confirmations and timers. All class-validity checking is a human/UI process that feeds a confirmation into the contract.

## 2. Core entities

- **Listing** — seller posts: studio, class type, location, credit expiration date, price, quantity.
- **Order** — buyer claims a listing → locks payment in escrow → moves through a state machine.
- **Proof** — evidence artifacts (screenshot of credit balance, screenshot of the actual class transfer/booking confirmation, studio transfer email) attached to an order.
- **Dispute** — raised by either party if confirmation doesn't happen; resolved by arbiter or staked jury.
- **Reputation** — per-wallet score derived from completed orders, disputes lost/won, account age.

## 3. Order state machine (mirrors contract state)

```
Listed → Claimed (buyer pays, funds locked)
       → ProofSubmitted (seller uploads transfer proof off-chain, calls markDelivered on-chain)
       → Confirmed (buyer calls confirmReceipt → funds release to seller)
       → Disputed (either party calls raiseDispute before timeout)
       → Resolved (arbiter/jury calls resolve → funds go to buyer or seller)
       → Refunded (auto, if seller never marks delivered before deadline)
```

Key property: **funds only ever move on an explicit on-chain action** (confirm, resolve, or timeout-refund) — never on the arrival of off-chain proof alone. Proof is a UI/legal artifact; the contract only trusts signed transactions and timers.

## 4. Escrow contract (Solidity, EVM L2 — Base recommended)

```solidity
enum Status { Claimed, Delivered, Confirmed, Disputed, Resolved, Refunded }

struct Order {
    address buyer;
    address seller;
    uint256 amount;
    uint64  claimedAt;
    uint64  deliveryDeadline;   // seller must call markDelivered before this
    uint64  confirmDeadline;    // buyer must confirm or dispute before this,
                                 // after which auto-release to seller
    Status  status;
}
```

Functions:
- `claim(listingId)` — buyer sends payment, order created, `deliveryDeadline` set (e.g. now + 48h).
- `markDelivered(orderId)` — seller-only; sets `confirmDeadline` (e.g. now + 24h). If seller never calls this, buyer can call `refund(orderId)` after `deliveryDeadline` passes — automatic, no dispute needed.
- `confirmReceipt(orderId)` — buyer-only; releases funds to seller immediately.
- `raiseDispute(orderId)` — either party, only before `confirmDeadline` (or a short grace window after). Freezes funds, moves to arbitration.
- `autoRelease(orderId)` — anyone can call after `confirmDeadline` if buyer never confirmed and never disputed — releases to seller. This prevents a buyer from griefing a legitimate seller by silently never confirming.
- `resolveDispute(orderId, winner)` — restricted to arbiter role (see §6) — releases funds to buyer or seller, and applies a reputation/slash penalty to the loser.

This is a standard two-sided escrow with three exits (confirm / timeout-refund / timeout-autorelease / dispute-resolution) — no custom token, ETH or USDC as the payment asset (USDC preferred so prices are human-legible and not volatile).

## 5. Verification / dispute flow (the actual anti-scam mechanism)

Since there's no studio API, the app's job is to make lying costly and provable-enough:

1. **At listing time**: seller uploads a screenshot of their class balance/expiration in the studio app. Stored off-chain (S3/IPFS), hash committed on-chain (cheap, just a bytes32) so it can't be swapped after the fact.
2. **At delivery time**: the actual "transfer" is whatever mechanism the studio allows — e.g. Barry's lets you gift/transfer a class to another account's email, or the seller books the class and adds the buyer as a guest, or the credit is transferred via the studio's own "share" feature. Seller uploads proof of that action (confirmation email/screenshot), hash committed on-chain via `markDelivered`.
3. **Buyer verifies in their own studio account** that the class/credit now appears, then calls `confirmReceipt`. This is the real check — the buyer is the oracle, because they're the only party who can see their own studio account.
4. **If buyer disputes**: both proof hashes are already on-chain (tamper-evident timestamps), and the underlying images are pulled from storage for the arbiter to review alongside chat logs.

This doesn't make fraud impossible, but it does: (a) create a timestamped, non-repudiable evidence trail, (b) put the burden of the real check on the party with actual access to verify it (the buyer, in their own studio account), (c) make timeouts work in favor of whichever party did their job.

## 6. Anti-scam mechanics beyond escrow

- **Collateral staking for sellers**: new/unrated sellers must stake a refundable bond (e.g. 20% of listing price) that's forfeited if they lose a dispute or repeatedly miss delivery deadlines. Waived once reputation crosses a threshold.
- **Reputation score**: on-chain or subgraph-indexed count of completed vs. disputed-and-lost orders per wallet; surfaced in the UI before a buyer claims a listing.
- **Rate limiting / listing caps**: new accounts capped at low-value listings until they build history, to limit damage from Sybil accounts.
- **Arbiter model, start simple**: v1 = a single trusted arbiter (you, or a small mod team) with a multisig-controlled `resolveDispute` role. v2, once volume justifies it = staked jury (Kleros-style) so no single party is a target/bottleneck. Don't build the jury system before you have disputes to justify it.
- **Email/identity binding (off-chain)**: tie each wallet to a verified email or phone via magic-link/passkey so a banned scammer can't trivially spin up a fresh wallet and reputation — this is a Sybil-resistance measure, not a blockchain feature.

## 7. Stack

**No user should ever see a wallet, seed phrase, MetaMask, gas fee, or the word "crypto."** The blockchain is an implementation detail for you, not something the buyer/seller interacts with.

- **Contract**: Solidity + Foundry, deployed on Base (cheap gas — cheap enough that you, the app, can pay it for everyone).
- **Payment asset**: USDC on Base (not raw ETH) — stable dollar value for a $20 spin class credit.
- **Wallets — embedded, not self-custody UX**: users sign up with email/phone/passkey (Privy, Dynamic, or Coinbase Smart Wallet). A wallet is created for them automatically in the background — no seed phrase shown, no extension install, no "connect wallet" button. Under the hood it's a non-custodial smart-contract wallet (ERC-4337) recoverable via their email/passkey, so you're not custodying funds directly, but the user experience is indistinguishable from a normal login.
- **Gas — sponsored, not paid by users**: use an ERC-4337 paymaster (bundled with Privy/Dynamic, or via Coinbase's Paymaster on Base) so the app pays gas in the background. Users never need to hold ETH for gas.
- **Fiat in/out — card, not crypto purchase**: users pay with a debit/credit card via an on-ramp (Coinbase Onramp, or Stripe's crypto on/off-ramp) that converts card payment → USDC into their embedded wallet automatically. On the seller side, payout can either stay as an in-app USDC balance they spend on future classes, or cash out to their bank via the same on-ramp's off-ramp flow. From the user's POV it's just "pay with card" / "get paid out to my bank."
- **Frontend**: Next.js. No wagmi/RainbowKit "connect wallet" flow needed for end users — that UI only shows up in your internal admin/arbiter tooling.
- **Off-chain data**: Postgres for listings/orders/reputation/proof metadata; S3 or IPFS (via web3.storage) for proof images, with the hash committed on-chain.
- **Arbiter ops**: a simple internal admin panel to review disputes and call `resolveDispute` via a multisig (Safe) — don't put dispute resolution behind a single hot EOA key. This is the one place actual wallet UI is appropriate, since it's your team, not end users.

## 8. Open questions to settle before building

1. Which studios launch first, and what transfer mechanism do they actually support (Barry's has an in-app "share credit" flow for some markets — worth confirming rather than assuming)?
2. Legal: reselling studio credits may violate studio ToS (non-transferable membership terms) — worth a quick look at Barry's/SoulCycle terms before going wide; this is a business risk independent of the tech.
3. Who is the v1 arbiter, and what's the SLA for resolving a dispute (this directly affects the `confirmDeadline`/dispute-window lengths)?
4. Fee model — flat fee, % cut on escrow release, or subscription? Affects contract design (fee split on `confirmReceipt`/`autoRelease`).

## 9. Suggested build order

1. Escrow contract + Foundry tests covering all state transitions (claim/deliver/confirm/dispute/timeout) and the fee split.
2. Embedded wallet + sponsored gas + card on-ramp wired up from day one (Privy or Dynamic) — this isn't a later polish step, it's required for the target audience to ever complete a signup.
3. Minimal listing/order UI to validate the proof/dispute UX with a handful of real trades.
4. Reputation + staking once there's enough order volume to need it.
