# classxchange contracts

Escrow contract for peer-to-peer fitness class credit trades. See [../DESIGN.md](../DESIGN.md) for the full architecture.

Built with [Foundry](https://book.getfoundry.sh/).

## Setup

Dependencies (`lib/`) aren't committed — install them after cloning:

```shell
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

## Usage

```shell
forge build       # compile
forge test -vv    # run tests
forge fmt         # format
```

## Layout

- `src/ClassEscrow.sol` — the escrow contract (claim → deliver → confirm, with dispute and timeout paths)
- `test/ClassEscrow.t.sol` — full state-machine test coverage
- `test/mocks/MockUSDC.sol` — mintable ERC20 stand-in for USDC in tests
