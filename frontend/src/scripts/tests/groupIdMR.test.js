
import { keccak256, toUtf8Bytes } from "ethers";
import { readFileSync } from "fs";


const jsonString = readFileSync("./groupIds.json", 'utf8');
const data = JSON.parse(jsonString);
console.log(data);

const FIELD_MODULUS = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

function hashStrToBigInt(str) {
    return BigInt(keccak256(toUtf8Bytes(str)));
}

function moduloReduction(bigIntVal) {
    return bigIntVal % FIELD_MODULUS;
}


function testOneFun(str) {
    const hash = BigInt(keccak256(toUtf8Bytes(str)));
    return hash % FIELD_MODULUS; // Apply modular reduction
}

for (const group of data) {
    const groupId = group.group_id;
    const groupIdBigInt = hashStrToBigInt(groupId);
    const reducedGroupId = moduloReduction(groupIdBigInt);
    const reducedGroupId2 = testOneFun(groupId);
    if (reducedGroupId != groupIdBigInt) {
        console.warn(`Warning: Group ID ${groupId} has been reduced from ${groupIdBigInt} to ${reducedGroupId}`);
    }
    if (reducedGroupId2 != reducedGroupId) {
        console.warn(`Warning: Function mismatch!!`);
    }

    console.log(`Group Name: ${group.name}`);
    console.log(`Group ID: ${groupId}`);
    //console.log(`Group ID BigInt: ${groupIdBigInt}`);
    //console.log(`Reduced Group ID: ${reducedGroupId}`);
    console.log(`Created At: ${group.created_at}`);
    console.log("=====================================");
}