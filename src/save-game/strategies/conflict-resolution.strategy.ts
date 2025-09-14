/**
 * A simple conflict-resolution strategy.
 *
 * Returns:
 *  - { type: 'accept-incoming', save: incoming }      // server will accept incoming client save (overwrite)
 *  - { type: 'keep-server', save: server }            // server ignores incoming
 *  - { type: 'conflict', server, incoming }           // clients should prompt user to choose
 *  - { type: 'merged', save: merged }                 // automatic merge succeeded
 *
 * This example uses timestamp-first (latest-wins), but will attempt a shallow merge for mergeable shapes.
 */

export function resolveConflict({
  serverSave,
  incomingSave,
  clientUpdatedAt,
}: {
  serverSave: { updatedAt: string | Date; data: any };
  incomingSave: { updatedAt?: string | Date; data: any };
  clientUpdatedAt?: string;
}) {
  const serverTime = new Date(serverSave.updatedAt).getTime();
  const incomingTime = incomingSave.updatedAt
    ? new Date(incomingSave.updatedAt).getTime()
    : clientUpdatedAt
    ? new Date(clientUpdatedAt).getTime()
    : Date.now();

  // If incoming is newer, accept it
  if (incomingTime > serverTime + 500) {
    return { type: 'accept-incoming', save: incomingSave };
  }

  // If server is newer, keep server
  if (serverTime > incomingTime + 500) {
    return { type: 'keep-server', save: serverSave };
  }

  // If nearly equal, try shallow merge for objects where merging makes sense
  if (isPlainObject(serverSave.data) && isPlainObject(incomingSave.data)) {
    const merged = shallowMergeSaveData(serverSave.data, incomingSave.data);
    return { type: 'merged', save: { ...serverSave, data: merged } };
  }

  // Otherwise mark conflict
  return { type: 'conflict', server: serverSave, incoming: incomingSave };
}

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Very simple shallow merge: numeric fields take max, arrays concatenate unique, nested objects shallow-merge.
 * You should implement domain-specific merges in production.
 */
function shallowMergeSaveData(a: any, b: any) {
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === 'number' && typeof bv === 'number') {
      out[k] = Math.max(av, bv);
    } else if (Array.isArray(av) && Array.isArray(bv)) {
      out[k] = Array.from(new Set([...av, ...bv]));
    } else if (isPlainObject(av) && isPlainObject(bv)) {
      out[k] = { ...av, ...bv };
    } else {
      // default to b (incoming)
      out[k] = bv;
    }
  }
  return out;
}
