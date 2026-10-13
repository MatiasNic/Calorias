import { auth, claimLocalData } from '../auth';
import { GUEST_USER_ID, useSessionStore } from '@/stores/session';

const mockOwners = { list: [] as string[] };
const mockWipe = jest.fn(async () => undefined);
const mockAdopt = jest.fn(async () => undefined);

jest.mock('../deviceData', () => ({
  localDataOwners: async () => mockOwners.list,
  wipeDeviceUserData: () => mockWipe(),
}));
jest.mock('@/services/db/repository', () => ({
  adoptGuestData: (...a: unknown[]) => mockAdopt(...(a as [])),
  pendingChangesCount: async () => 0,
}));
jest.mock('@/services/sync/engine', () => ({ syncNow: async () => undefined }));
jest.mock('@/services/supabase/client', () => ({ getSupabase: () => null }));

beforeEach(() => {
  mockOwners.list = [];
  mockWipe.mockClear();
  mockAdopt.mockClear();
  useSessionStore.setState({ status: 'signedOut', userId: null });
});

describe('claimLocalData', () => {
  it("keeps the same account's data (e.g. after an expired session)", async () => {
    mockOwners.list = ['user-a'];
    await claimLocalData('user-a');
    expect(mockWipe).not.toHaveBeenCalled();
  });

  it("wipes another account's data before a different account signs in", async () => {
    mockOwners.list = ['user-a'];
    await claimLocalData('user-b');
    expect(mockWipe).toHaveBeenCalledTimes(1);
  });

  it("attaches a guest's data to the new account", async () => {
    useSessionStore.setState({ status: 'guest', userId: GUEST_USER_ID });
    mockOwners.list = ['user-b']; // after adoption every row belongs to the new account
    await claimLocalData('user-b');
    expect(mockAdopt).toHaveBeenCalledWith('user-b', GUEST_USER_ID);
    expect(mockWipe).not.toHaveBeenCalled();
  });
});

describe('continueAsGuest', () => {
  it("wipes an account's leftover data before becoming a guest", async () => {
    mockOwners.list = ['user-a'];
    await auth.continueAsGuest();
    expect(mockWipe).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('guest');
  });

  it('keeps existing guest data', async () => {
    mockOwners.list = [GUEST_USER_ID];
    await auth.continueAsGuest();
    expect(mockWipe).not.toHaveBeenCalled();
  });
});
