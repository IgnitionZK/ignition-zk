const buildPoseidon = require("circomlibjs").buildPoseidon;

async function precomputePoseidonConstants() {
    const poseidon = await buildPoseidon();

    const noHash = poseidon([0n]);
    const yesHash = poseidon([1n]);
    const abstainHash = poseidon([2n]);

    console.log("Poseidon(0) (No):", poseidon.F.toString(noHash));
    console.log("Poseidon(1) (Yes):", poseidon.F.toString(yesHash));
    console.log("Poseidon(2) (Abstain):", poseidon.F.toString(abstainHash));
}

precomputePoseidonConstants()
    .then(() => {
        console.log("Hashes generated successfully.");
    })
    .catch((error) => {
        console.error("Error generating hashes:", error);
    });