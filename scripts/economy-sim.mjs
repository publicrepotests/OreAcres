const days = 120;

const config = {
  startingReserveSol: 250,
  reserveFloorSol: 25,
  usdToReserveSol: 0.0025,
  shopReserveBps: 5200,
  cosmeticReserveBps: 3800,
  chestReserveBps: 6500,
  marketplaceReserveFeeBps: 500,
  maxIdleSolPerDay: 0.004,
  maxOreSolPerDay: 0.0015,
  maxBoxSolPerDay: 0.001,
  targetRunwayDays: 120,
};

const scenarios = [
  {
    name: "dry-launch",
    players: 25,
    dailyGrowth: 1,
    payerRate: 0.01,
    averageDailyUsd: 0.08,
    oreClaimsPerPlayer: 0.2,
    boxOpensPerPlayer: 0.04,
    marketplaceVolumeSolPerPlayer: 0.002,
  },
  {
    name: "slow-organic",
    players: 80,
    dailyGrowth: 3,
    payerRate: 0.035,
    averageDailyUsd: 0.22,
    oreClaimsPerPlayer: 0.45,
    boxOpensPerPlayer: 0.08,
    marketplaceVolumeSolPerPlayer: 0.006,
  },
  {
    name: "healthy-demand",
    players: 250,
    dailyGrowth: 8,
    payerRate: 0.075,
    averageDailyUsd: 0.48,
    oreClaimsPerPlayer: 0.75,
    boxOpensPerPlayer: 0.14,
    marketplaceVolumeSolPerPlayer: 0.014,
  },
];

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function reserveRunwayDays(reserveSol, dailyEmission) {
  if (dailyEmission <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, reserveSol - config.reserveFloorSol) / dailyEmission;
}

function throttle(runwayDays) {
  if (!Number.isFinite(runwayDays)) return 0;
  if (runwayDays >= config.targetRunwayDays) return 1;
  if (runwayDays >= 90) return 0.82;
  if (runwayDays >= 45) return 0.55;
  if (runwayDays >= 21) return 0.32;
  if (runwayDays >= 7) return 0.14;
  if (runwayDays > 0) return 0.04;
  return 0;
}

function claimFromReserve(reserve, requested, dailyCap) {
  if (reserve <= config.reserveFloorSol || requested <= 0) return { paid: 0, reserve };
  const mult = throttle(reserveRunwayDays(reserve, dailyCap));
  const paid = Math.min(requested, dailyCap * mult, Math.max(0, reserve - config.reserveFloorSol));
  return { paid, reserve: reserve - paid };
}

function reserveContribution(usd, bps) {
  return usd * config.usdToReserveSol * (bps / 10_000);
}

function simulate(scenario) {
  let reserve = config.startingReserveSol;
  let players = scenario.players;
  let totalPaid = 0;
  let totalReserveIn = 0;
  let totalRequested = 0;
  let minReserve = reserve;
  let worstThrottle = 1;

  for (let day = 1; day <= days; day += 1) {
    const activePlayers = Math.round(players);
    const payers = activePlayers * scenario.payerRate;
    const purchaseUsd = payers * scenario.averageDailyUsd;
    const reserveIn =
      reserveContribution(purchaseUsd * 0.58, config.shopReserveBps) +
      reserveContribution(purchaseUsd * 0.24, config.cosmeticReserveBps) +
      reserveContribution(purchaseUsd * 0.18, config.chestReserveBps);
    const marketplaceReserve = activePlayers * scenario.marketplaceVolumeSolPerPlayer * (config.marketplaceReserveFeeBps / 10_000);

    reserve += reserveIn + marketplaceReserve;
    totalReserveIn += reserveIn + marketplaceReserve;

    const idleRequest = activePlayers * config.maxIdleSolPerDay;
    const oreRequest = activePlayers * scenario.oreClaimsPerPlayer * (config.maxOreSolPerDay / 6);
    const boxRequest = activePlayers * scenario.boxOpensPerPlayer * (config.maxBoxSolPerDay / 4);
    const requested = idleRequest + oreRequest + boxRequest;
    totalRequested += requested;

    const idle = claimFromReserve(reserve, idleRequest, idleRequest);
    reserve = idle.reserve;
    const ore = claimFromReserve(reserve, oreRequest, oreRequest);
    reserve = ore.reserve;
    const box = claimFromReserve(reserve, boxRequest, boxRequest);
    reserve = box.reserve;

    const paid = idle.paid + ore.paid + box.paid;
    totalPaid += paid;
    minReserve = Math.min(minReserve, reserve);
    worstThrottle = Math.min(worstThrottle, throttle(reserveRunwayDays(reserve, requested)));
    players += scenario.dailyGrowth;
  }

  const finalDailyRequest =
    players * config.maxIdleSolPerDay +
    players * scenario.oreClaimsPerPlayer * (config.maxOreSolPerDay / 6) +
    players * scenario.boxOpensPerPlayer * (config.maxBoxSolPerDay / 4);

  return {
    scenario: scenario.name,
    finalPlayers: Math.round(players),
    finalReserveSol: round(reserve),
    minReserveSol: round(minReserve),
    reserveInSol: round(totalReserveIn),
    requestedSol: round(totalRequested),
    paidSol: round(totalPaid),
    unpaidSol: round(Math.max(0, totalRequested - totalPaid)),
    finalRunwayDays: round(reserveRunwayDays(reserve, finalDailyRequest)),
    worstThrottlePct: Math.round(worstThrottle * 100),
    pass: reserve >= config.reserveFloorSol && Number.isFinite(reserve),
  };
}

const results = scenarios.map(simulate);
console.table(results);

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
  console.error("Economy simulation failed:", failed.map((result) => result.scenario).join(", "));
  process.exit(1);
}
