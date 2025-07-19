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
