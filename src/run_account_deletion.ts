import { deleteAccount, InfraiClient, deletionRequest } from "./account_deletion_service.js";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
const input = deletionRequest.parse({
  user_id: process.env.INFRAI_USER_ID ?? "user_example",
  account_key_id: process.env.INFRAI_ACCOUNT_KEY_ID ?? "temporary-key-example"
});
const result = await deleteAccount(input, new InfraiClient(key));
console.log(JSON.stringify(result, null, 2));
