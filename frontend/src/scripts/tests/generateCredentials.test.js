import { ZkCredential } from "../generateCredentials-browser-safe.js";

const indentityNullifer = BigInt("1234567890123456789012345678901234567890");
const externalNullifier = "external-nullifier-example"; // can be group ID, proposal ID, etc.

const publicNullifierHash = await ZkCredential.generateNullifierHash(
  indentityNullifer,
  externalNullifier
);

console.log("publicNullifierHash:", publicNullifierHash);