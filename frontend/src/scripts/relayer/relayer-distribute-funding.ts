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
// ABI for the delegateDistributeFunding function on GovernanceManager.
// This ABI must match the function signature in your GovernanceManager contract.
const GOVERNANCE_MANAGER_ABI = [
  "function delegateDistributeFunding(bytes32 groupKey, bytes32 contextKey, address to, uint256 amount, bytes32 fundingType, bytes32 expectedProposalNullifier) external",
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
    // Parse the request body to get all required parameters for distributeFunding
    const {
      group_key,
      context_key,
      to,
      amount,
      funding_type,
      expected_proposal_nullifier,
    } = await req.json();
    // LOG: Data received by edge function
    console.log("[RELAYER/DistributeFunding] Data received:", {
      group_key,
      context_key,
      to,
      amount,
      funding_type,
      expected_proposal_nullifier,
    });
    // Validate required parameters.
    if (
      !group_key ||
      !context_key ||
      !to ||
      !amount ||
      !funding_type ||
      !expected_proposal_nullifier
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required parameters: 'group_key', 'context_key', 'to', 'amount', 'funding_type' or 'expected_proposal_nullifier' in request body.",
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
    console.log(`Received request from user ${userId} to distribute funding:`);
    console.log(`   Group Key: ${group_key}`);
    console.log(`   Context Key: ${context_key}`);
    console.log(`   Recipient Address: ${to}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Funding Type: ${funding_type}`);
    console.log(
      `   Expected Proposal Nullifier: ${expected_proposal_nullifier}`
    );
    let transactionResponse;
    let actionPerformed = "delegateDistributeFunding";
    console.log(
      "[RELAYER/DistributeFunding] Calling delegateDistributeFunding with:",
      {
        group_key,
        context_key,
        to,
        amount,
        funding_type,
        expected_proposal_nullifier,
      }
    );
    // Call the delegateDistributeFunding function on the GovernanceManager contract
    transactionResponse = await contract.delegateDistributeFunding(
      group_key,
      context_key,
      to,
      amount,
      funding_type,
      expected_proposal_nullifier
    );
    console.log(
      "[RELAYER/DistributeFunding] Transaction response:",
      transactionResponse
    );
    console.log(
      `Transaction sent. Transaction Hash: ${transactionResponse.hash}`
    );
    const receipt = await transactionResponse.wait();
    if (!receipt) {
      throw new Error(
        "Transaction receipt not found. The transaction might not have been mined successfully or timed out."
      );
    }
    console.log(
      `Transaction successfully mined. Block Number: ${receipt.blockNumber}, Gas Used: ${receipt.gasUsed}`
    );
    // Return a success response with transaction details.
    return new Response(
      JSON.stringify({
        message: `Funding distributed successfully via ${actionPerformed}.`,
        transactionHash: transactionResponse.hash,
        actionPerformed: actionPerformed,
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
    // Catch any errors during the process and return an error response.
    console.error("Error in relayer-distribute-funding Edge Function:", error);
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
