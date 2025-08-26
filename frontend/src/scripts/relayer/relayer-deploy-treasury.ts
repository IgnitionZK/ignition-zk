// SPDX-License-Identifier: MIT
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.11.1";
import { verify } from "https://deno.land/x/djwt@v2.7/mod.ts";
// CORS headers configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed methods
};
// GovernanceManager Proxy address.
const GOVERNANCE_MANAGER_PROXY_ADDRESS = Deno.env.get(
  "GOVERNOR_CONTRACT_ADDRESS"
);
// TreasuryFactory Proxy address.
const TREASURY_FACTORY_PROXY_ADDRESS = Deno.env.get(
  "TREASURY_FACTORY_CONTRACT_ADDRESS"
);
// ABI for the delegateDeployTreasury function from GovernanceManager.
const GOVERNANCE_MANAGER_ABI = [
  "function delegateDeployTreasury(bytes32 _groupKey, address _treasuryMultiSig, address _treasuryRecovery) external",
];
// CORRECT ABI for the TreasuryFactory, now including the TreasuryDeployed event.
const TREASURY_FACTORY_ABI = [
  "event TreasuryDeployed(bytes32 indexed groupKey, address beaconProxy)",
];
// Declare global variables.
let provider;
let wallet;
let governanceContract;
let treasuryFactoryIface;
let jwtCryptoKey;
// Initialize Ethers provider, wallet, and contract instances.
try {
  const rpcUrl = Deno.env.get("SEPOLIA_RPC_URL");
  const privateKey = Deno.env.get("RELAYER_PRIVATE_KEY");
  const jwtSecretString = Deno.env.get("SUPA_JWT_SECRET");
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is not set.");
  if (!privateKey) throw new Error("RELAYER_PRIVATE_KEY is not set.");
  if (!jwtSecretString) throw new Error("SUPA_JWT_SECRET is not set.");
  jwtCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecretString),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
  provider = new ethers.JsonRpcProvider(rpcUrl);
  wallet = new ethers.Wallet(privateKey, provider);
  governanceContract = new ethers.Contract(
    GOVERNANCE_MANAGER_PROXY_ADDRESS,
    GOVERNANCE_MANAGER_ABI,
    wallet
  );
  treasuryFactoryIface = new ethers.Interface(TREASURY_FACTORY_ABI);
  console.log("Ethers provider, wallet, and contracts initialized.");
} catch (error) {
  console.error("Failed to initialize Ethers or JWT key:", error.message);
}
// Main handler for the Supabase Edge Function.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  if (
    !provider ||
    !wallet ||
    !governanceContract ||
    !treasuryFactoryIface ||
    !jwtCryptoKey
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Edge function initialization failed. Check server logs and environment variables.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed. Only POST requests are accepted.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Authorization header missing.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    const jwt = authHeader.split("Bearer ")[1];
    if (!jwt) {
      return new Response(
        JSON.stringify({
          error: "Bearer token missing from Authorization header.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    let userId;
    try {
      const payload = await verify(jwt, jwtCryptoKey, "HS256");
      if (typeof payload.sub !== "string") {
        throw new Error("Invalid JWT payload: 'sub' is not a string.");
      }
      userId = payload.sub;
      console.log(`JWT verified for user: ${userId}`);
    } catch (e) {
      console.error("JWT verification failed:", e.message);
      return new Response(
        JSON.stringify({
          error: `Unauthorized: Invalid JWT. ${e.message}`,
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    const { group_key, treasury_multisig, treasury_recovery } =
      await req.json();
    console.log(`Calling delegateDeployTreasury with:`, {
      group_key,
      treasury_multisig,
      treasury_recovery,
    });
    const transactionResponse = await governanceContract.delegateDeployTreasury(
      group_key,
      treasury_multisig,
      treasury_recovery
    );
    console.log(`Transaction sent. Hash: ${transactionResponse.hash}`);
    const receipt = await transactionResponse.wait();
    if (!receipt) {
      throw new Error("Transaction receipt not found.");
    }
    console.log(
      `Transaction successfully mined. Block Number: ${receipt.blockNumber}, Gas Used: ${receipt.gasUsed}`
    );
    let deployedTreasuryAddress = null;
    for (const log of receipt.logs) {
      // Check if the log is from the TreasuryFactory address
      if (
        log.address.toLowerCase() ===
        TREASURY_FACTORY_PROXY_ADDRESS.toLowerCase()
      ) {
        try {
          const parsedLog = treasuryFactoryIface.parseLog(log);
          if (parsedLog && parsedLog.name === "TreasuryDeployed") {
            deployedTreasuryAddress = parsedLog.args.beaconProxy;
            console.log(
              `'TreasuryDeployed' event found. Deployed Treasury Address: ${deployedTreasuryAddress}`
            );
            break;
          }
        } catch (e) {
          // Log might be for a different event, so we ignore the error and continue.
          console.log(`Could not parse log from TreasuryFactory: ${e.message}`);
        }
      } else {
        console.log(
          `Skipping log from address: ${log.address} (not TreasuryFactory)`
        );
      }
    }
    if (!deployedTreasuryAddress) {
      throw new Error(
        "Could not find the 'TreasuryDeployed' event in the transaction receipt. Treasury address could not be extracted."
      );
    }
    return new Response(
      JSON.stringify({
        message: "Treasury deployed successfully.",
        deployedTreasuryAddress: deployedTreasuryAddress,
        transactionHash: transactionResponse.hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in relayer-deploy-treasury Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unknown internal server error occurred.",
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
