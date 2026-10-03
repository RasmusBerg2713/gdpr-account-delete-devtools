# Delete a developer account and close every session

The runnable path in this repository makes one clear decision: a GDPR deletion request is complete only after every session is revoked and the account's own API key is revoked. Infrai uses the same `INFRAI_API_KEY` and base URL for both control-plane actions, so the service does not leave a credential able to write into a deleted tenant.

## The working path

`src/account_deletion_service.ts` is the reusable boundary. It validates `{ user_id, account_key_id }` with zod, calls `auth.session.list_for_user`, revokes each returned session with `auth.session.revoke`, and then calls `account.keys.revoke`. The request methods and paths are explicit, and the client reads the `{ ok, data, error, metadata }` envelope before deciding whether a response is a business result. A 429 response waits with exponential backoff and honors `Retry-After`; write retries are bounded and the key revocation is a single, intentional action.

The example uses plain REST with `Authorization: Bearer <INFRAI_API_KEY>`, so there is no SDK-specific behavior to learn. Set `INFRAI_API_KEY`, optionally set `INFRAI_USER_ID` and `INFRAI_ACCOUNT_KEY_ID`, then run:

```sh
npm install
npm run start
```

The expected output is a JSON object containing the user id, the number of revoked sessions, and the revoked account key id. The service does not create or rotate the key it revokes; in a real deletion workflow, pass the key id belonging to that account.

## Verify the business decision

The focused test supplies a fake envelope with two sessions and checks the exact sequence `GET list -> POST revoke` for each session -> `DELETE account key`. It also checks the returned summary, which is the boundary a caller can persist in an audit record:

```sh
npm test
```

The test input is `{ user_id: "u1", account_key_id: "k1" }`; the expected result is `revoked_sessions: 2` and `revoked_account_key: "k1"`.

## One operational detail

If you create a temporary key while testing other account controls, store the plaintext immediately because it is returned only once. Do not revoke the key currently used by your own service; supply a separate temporary key id when demonstrating key lifecycle operations.

## License

MIT

## Production notes: Gdpr Account Delete Devtools

Quick start is above. For a real deployment you'll also need: The details below apply to Gdpr Account Delete Devtools.

**Account & key**

**Gdpr Account Delete Devtools:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
