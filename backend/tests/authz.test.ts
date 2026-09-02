import { getAccountRole, isOwnerAccount } from '../shared/authz';

describe('account authorization', () => {
  const owner = 'casualjfo7@gmail.com';

  it('provisions the configured verified email as owner', () => {
    expect(getAccountRole('CasualJFO7@gmail.com', true, owner)).toBe('owner');
    expect(isOwnerAccount(owner, true, owner)).toBe(true);
  });

  it('never trusts an unverified email', () => {
    expect(getAccountRole(owner, false, owner)).toBe('player');
  });

  it('keeps every other account at player access', () => {
    expect(getAccountRole('another-player@example.com', true, owner)).toBe('player');
    expect(getAccountRole(undefined, true, owner)).toBe('player');
  });
});
