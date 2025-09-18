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
// GovernanceManager Proxy address. This is the address of your deployed proxy contract.
const GOVERNANCE_MANAGER_PROXY_ADDRESS = Deno.env.get(
  "GOVERNOR_CONTRACT_ADDRESS"
);
// ABI for the delegateVerifyProposal function on GovernanceManager.
// This ABI must match the function signature in your GovernanceManager contract.
const GOVERNANCE_MANAGER_ABI = [
  "function delegateVerifyProposal(uint256[24] calldata _proof, uint256[5] calldata _pubSignals, bytes32 _groupKey, bytes32 contextKey) external",
];
// Declare these variables globally to avoid re-initializing them on every request.
let provider;
let wallet;
let contract;
let jwtCryptoKey; // Declare jwtCryptoKey to hold the CryptoKey for JWT verification
// Initialize Ethers provider, wallet, and contract instance.
// This block runs once when the Edge Function is loaded.
try {
  const rpcUrl = Deno.env.get("SEPOLIA_RPC_URL");
  const privateKey = Deno.env.get("RELAYER_PRIVATE_KEY");
  const jwtSecretString = Deno.env.get("SUPA_JWT_SECRET"); // Get JWT secret as a string
  // Ensure environment variables are set.
  if (!rpcUrl) {
    throw new Error(
      "SEPOLIA_RPC_URL environment variable is not set. Please configure it in Supabase secrets."
    );
  }
  if (!privateKey) {
    throw new Error(
      "RELAYER_PRIVATE_KEY environment variable is not set. Please configure it in Supabase secrets."
    );
  }
  if (!jwtSecretString) {
    throw new Error(
      "SUPA_JWT_SECRET environment variable is not set. Please configure it in Supabase secrets."
    );
  }
  // Use Web Crypto API's subtle.importKey directly to create the CryptoKey
  jwtCryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecretString),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    true,
    ["verify"] // usages: only for verification
  );
  // Create a JSON RPC provider using the provided RPC URL.
  provider = new ethers.JsonRpcProvider(rpcUrl);
  // Create a wallet instance from the relayer's private key, connected to the provider.
  wallet = new ethers.Wallet(privateKey, provider);
  // Create a contract instance, connected to the wallet for signing transactions.
  contract = new ethers.Contract(
    GOVERNANCE_MANAGER_PROXY_ADDRESS,
    GOVERNANCE_MANAGER_ABI,
    wallet
  );
  console.log(
    "Ethers provider, wallet, and contract initialized successfully."
  );
} catch (error) {
  console.error("Failed to initialize Ethers or JWT key:", error.message);
}
// Main handler for the Supabase Edge Function.
serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders, // Return success with CORS headers
    });
  }
  // Check if Ethers components were successfully initialized.
  if (!provider || !wallet || !contract || !jwtCryptoKey) {
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
  // Only allow POST requests for the actual logic.
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
    // Enforce JWT verification
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
      // Use the pre-created jwtCryptoKey for verification
      const payload = await verify(jwt, jwtCryptoKey, "HS256");
      if (typeof payload.sub !== "string") {
        throw new Error(
          "Invalid JWT payload: 'sub' (user ID) is not a string."
        );
      }
      userId = payload.sub; // Extract user ID from the payload
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
    // Parse the request body to get proof, public_signals, group_key, and the pre-computed context_key.
    // NOTE: epoch_key is no longer needed here as context_key is pre-computed.
    const { proof, public_signals, group_key, context_key } = await req.json();
    // LOG: Data received by edge function
    console.log("[RELAYER/EdgeFunction] Data received:", {
      proof,
      public_signals,
      group_key,
      context_key,
    });
    // Validate required parameters.
    // Ensure context_key is also present now.
    if (!proof || !public_signals || !group_key || !context_key) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required parameters: 'proof', 'public_signals', 'group_key' or 'context_key' in request body.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (proof.length !== 24 || public_signals.length !== 5) {
      return new Response(
        JSON.stringify({
          error: "proof[24] or publicSignals[5] wrong length",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // group_key is already a bytes32 hash and a field element
    const bytes32GroupKey = group_key;
    // Use the pre-computed context_key directly
    // Ensure it's a valid bytes32 string if it's coming from client as string
    const bytes32ContextKey = ethers.zeroPadValue(context_key, 32);
    // LOG: Data converted to BigInt
    console.log("[RELAYER/EdgeFunction] Data as BigInt:", {
      proofBigInt: proof.map((item) => BigInt(item)),
      publicSignalsBigInt: public_signals.map((item) => BigInt(item)),
    });
    // Convert proof and publicSignal string inputs to BigInts
    const proofBigInt = proof.map((item) => BigInt(item));
    const publicSignalsBigInt = public_signals.map((item) => BigInt(item));
    console.log(
      `Received request to verify proposal proof for user ${userId}:`
    );
    console.log(`     Proof (Solidity) BigInt: ${proofBigInt}`);
    console.log(
      `     Public signals (Solidity) BigInt: '${publicSignalsBigInt}'`
    );
    console.log(
      `     Group Key (bytes32 with modulo reduction): '${bytes32GroupKey}'`
    );
    // console.log(`   Original Epoch Key: '${epoch_key}'`); // Removed as epoch_key is no longer used here
    console.log(`     Received Context Key (bytes32): '${bytes32ContextKey}'`);
    let transactionResponse;
    let actionPerformed;
    console.log("[RELAYER/EdgeFunction] Calling delegateVerifyProposal with:", {
      proofBigInt,
      publicSignalsBigInt,
      bytes32GroupKey,
      bytes32ContextKey,
    });
    // Call the delegateVerifyProposal function on the GovernanceManager contract
    transactionResponse = await contract.delegateVerifyProposal(
      proofBigInt,
      publicSignalsBigInt,
      bytes32GroupKey,
      bytes32ContextKey
    );
    actionPerformed = "delegateVerifyProposal";
    console.log(
      "[RELAYER/EdgeFunction] Transaction sent. Transaction Hash:",
      transactionResponse.hash
    );

    // Return a success response with transaction details without waiting for the receipt.
    return new Response(
      JSON.stringify({
        message: `Transaction sent successfully via ${actionPerformed}. Awaiting confirmation on the network.`,
        transactionHash: transactionResponse.hash,
        actionPerformed: actionPerformed,
      }),
      {
        status: 202, // Use 202 Accepted status
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Catch any errors during the process and return an error response.
    console.error("Error in relayer-verify-proposal Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unknown internal server error occurred.",
        stack: error.stack, // Include stack trace for debugging
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
