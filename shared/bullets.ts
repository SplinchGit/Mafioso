import { GUNS, PROTECTION, RANK_DIFFERENCE_MULTIPLIERS } from './constants';

export interface BulletCostInput {
  attackerRank: number;
  targetRank: number;
  gunId?: number | null;
  protectionId?: number | null;
}

export function calculateBulletKillCost({ attackerRank, targetRank, gunId, protectionId }: BulletCostInput): number {
  const rankDifference = Math.abs(attackerRank - targetRank);
  const multiplierKey = Math.min(rankDifference, 10) as keyof typeof RANK_DIFFERENCE_MULTIPLIERS;
  let bulletsRequired = 1000 * RANK_DIFFERENCE_MULTIPLIERS[multiplierKey];

  if (protectionId !== undefined && protectionId !== null) {
    const protection = PROTECTION[protectionId];
    if (protection) bulletsRequired *= protection.multiplier;
  }

  if (gunId !== undefined && gunId !== null) {
    const gun = GUNS[gunId];
    if (gun) bulletsRequired /= gun.divisor;
  }

  return Math.ceil(bulletsRequired);
}
