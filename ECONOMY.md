# Ore Acres Economy Spec

Launch goal: keep the game sustainable with a dry audience, low SOL emission, and USD-anchored token spending.

## Currency Roles

- `SOL`: earned in gameplay and used for marketplace sales
- `Pump.fun mint`: used for item purchases and upgrades

## Purchase Split

Recommended split per purchase:

- `80%` reward reserve
- `10%` future reward reserve
- `10%` ops / liquidity / maintenance

If you want a simpler early-stage setup, use only:

- `90%` reward reserve
- `10%` ops

For future rewards, keep the second bucket as a **future reward reserve** rather than a true burn address. That keeps the economy flexible if you want to fund events, raffles, or seasonal payouts later.

## Launch Safety Rules

- If reward reserve runway is `90+ days`, keep rates unchanged
- If runway drops below `30 days`, cut payouts by `50%`
- If runway drops below `14 days`, cut payouts by `75%`
- If runway drops below `7 days`, freeze bonus events and reduce base SOL emissions sharply

## Item Price Bands

All prices below are USD targets and should convert to mint amount at checkout.

### Starter / Utility

| Item | USD |
|---|---:|
| Lantern Post | 0.55 |
| Billboard | 0.65 |
| Neon Sign | 0.75 |
| Miner Statue | 0.95 |
| Ore Shed | 1.25 |
| Build Kiosk | 1.25 |
| Cooling Fan | 1.50 |
| Power Relay | 1.75 |
| Solar Array | 1.75 |
| Battery Bank | 2.25 |
| Conveyor Belt | 1.65 |
| Auto Drone | 2.50 |
| Scanner Tower | 2.75 |
| Vault | 3.25 |
| Refinery | 3.50 |
| Gacha Chest | 9.00 |

### Pets

| Pet | USD |
|---|---:|
| Mole | 3.50 |
| Fox | 7.50 |
| Drake | 19.00 |

### Cosmetics

| Cosmetic | USD |
|---|---:|
| Troll Pick | 1.50 |
| Banana Pick | 2.25 |
| Laser Pick | 3.00 |
| Aura Hoodie | 2.00 |
| Cyber Jacket | 4.50 |
| Astronaut Fit | 8.00 |

## Reward Bands

### Missions

| Mission | SOL reward |
|---|---:|
| Claim a plot | 0.05 |
| Place a second drill | 0.10 |
| Upgrade anything once | 0.10 |
| Equip a pet | 0.05 |
| Open a gacha chest | 0.15 |
| Hit 1 SOL/min | 0.20 |
| Reach mansion tier | 0.35 |
| Hold 100 SOL | 0.25 |

### Quest boxes

- Small SOL stack: `0.03 SOL`
- Mid SOL stack: `0.06 SOL`
- Skins / NFTs: cosmetic or collectible only

## SOL Emission Targets

Recommended upper bounds:

- Fresh plot: `0.05 to 0.15 SOL/day`
- Mid-game plot: `0.25 to 0.50 SOL/day`
- Late-game plot: `1.00 SOL/day max`

## Design Notes

- Keep the first purchase cheap so new players can buy something quickly.
- Make mid-tier progression feel steady, not explosive.
- Keep rare items as prestige sinks.
- Use the marketplace as an additional SOL sink/source without making it mandatory.
- Tweak rates based on real player data once you have enough activity.
