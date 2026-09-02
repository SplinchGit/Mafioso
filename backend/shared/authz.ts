export type AccountRole = 'owner' | 'player';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export function getAccountRole(
  email: string | undefined,
  emailVerified: boolean,
  ownerEmail = process.env.OWNER_EMAIL
): AccountRole {
  if (!emailVerified || !email || !ownerEmail) return 'player';
  return normalizeEmail(email) === normalizeEmail(ownerEmail) ? 'owner' : 'player';
}

export function isOwnerAccount(
  email: string | undefined,
  emailVerified: boolean,
  ownerEmail = process.env.OWNER_EMAIL
): boolean {
  return getAccountRole(email, emailVerified, ownerEmail) === 'owner';
}
