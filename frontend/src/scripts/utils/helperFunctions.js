import { keccak256, toUtf8Bytes } from "ethers";

export function uuidToBytes32(uuid) {
    return keccak256(toUtf8Bytes(uuid));
}

