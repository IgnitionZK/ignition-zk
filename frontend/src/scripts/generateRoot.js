import { IMT } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";

const depth = 5;
const zeroValue = 0;
const arity = 2;
const leaves = [];

// initialize a new tree
const tree = new IMT(poseidon2, depth, zeroValue, arity, leaves);
