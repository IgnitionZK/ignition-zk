/**
 * Uploads a file to IPFS using the Pinata API service.
 *
 * This function takes a file object and uploads it to the InterPlanetary File System (IPFS)
 * through Pinata's pinning service. The file will be permanently stored and accessible
 * via its IPFS hash (CID).
 *
 * @async
 * @function uploadFile
 * @param {File} file - The file object to upload to IPFS. This should be a valid File object
 *                      (e.g., from an input element or File API).
 * @returns {Promise<string>} A promise that resolves to the IPFS hash (CID) of the uploaded file.
 *                            The CID can be used to access the file via IPFS gateways.
 * @throws {Error} Throws an error if the upload fails, including network errors, API errors,
 *                 or if the Pinata API credentials are invalid. The error message will contain
 *                 details about what went wrong.
 */
export async function uploadFile(file) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
        pinata_secret_api_key: import.meta.env.VITE_PINATA_API_SECRET,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Pinata upload failed: ${err}`);
    }

    const data = await response.json();
    console.log("Pinata CID:", data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}
