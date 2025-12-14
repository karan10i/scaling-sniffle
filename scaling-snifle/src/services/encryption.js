import Olm from "@matrix-org/olm";

let olmAccount = null;

export async function initializeOlm() {
  await Olm.init(); // Load Olm library
  olmAccount = new Olm.Account();
  olmAccount.create(); // Generate identity keys
}

export function getIdentityKeys() {
  return {
    identityKey: olmAccount.identity_keys().curve25519,
    signingKey: olmAccount.identity_keys().ed25519,
  };
}

export function generateOneTimeKeys(count = 10) {
  olmAccount.generate_one_time_keys(count);
  return olmAccount.one_time_keys().curve25519;
}

export function markKeysAsPublished() {
  olmAccount.mark_keys_as_published();
}