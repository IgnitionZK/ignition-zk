### Phase 2: Anonymous Proposal Submissions

IgnitionZK is designed to ensure that the governance of a DAO authentically represents its real-world community. To achieve this, every member of a DAO must first complete a one-time process of generating their zero-knowledge (ZK) credentials. This foundational step verifies the identity of each member, establishing a secure and verifiable basis for all future governance activities.


#### Step 2.1 The Governance "Campaign"

![Campaign creation](../frontend/src/assets/campaign_illustration.png)

Once all initial members have generated their credentials, the DAO is ready to engage in governance. The core of this process is the "campaign," which represents a complete, self-contained governance cycle. Any member can initiate a campaign by submitting a campaign creation request.

This request immediately triggers an approval vote by the rest of the DAO. If the members approve the request, the campaign officially begins on the specified start date and proceeds through three distinct phases:

1. **Proposal Submission Phase**: Members can formally submit new ideas and initiatives for consideration.

2. **Voting Phase**: The DAO members vote on the submitted proposals using their ZK credentials.

3. **Review Phase**: A final review period allows the proposal creators to claim ownership of their accepted proposal award.

IgnitionZK's governance model is built for flexibility and agility:

* **On-Demand Cycles**: the DAOs can create campaigns on a need-by-need basis, allowing them to respond quickly to new challenges or opportunities without being constrained by fixed governance cycles.

* **Customizable Duration**: Each campaign can have a custom start date and duration. This allows the DAO to tailor governance cycles to the urgency and complexity of the proposals at hand, ensuring efficient decision-making.

#### Step 2.2 Proposal Creation

Once a campaign's start date is reached, the proposal submission phase is activated. To ensure clarity and consistency across all submissions, every DAO defines a specific proposal template that members must use. This standardization is crucial for maintaining a fair and consistent review process for every proposal.

A member can create a proposal by:

1. Selecting the active campaign for their group.
2. Filling out core details in the user interface, such as the title, description, proposal type (e.g., funding, non-funding), and the amount of funding requested.
3. Uploading their proposal document.

The proposal document is then submitted to IPFS (InterPlanetary File System), and its unique identifier (CID) is used along with the proposal details to create a unique proposal content hash.

#### Step 2.3 Verifiable Anonymous Submissions

![Proposal submission](../frontend/src/assets/proposal_submission.png)

To ensure the integrity of the submission process while preserving the anonymity of creators, IgnitionZK uses a zero-knowledge proof (ZKP) circuit. This ZKP guarantees three critical conditions without revealing any private information about the proposer:

* **Verified Membership**: The proof confirms that the individual submitting the proposal is a verified member of the DAO.

* **Submission Uniqueness**: It validates that the proposal is not a duplicate within the campaign. A submission nullifier, derived from the proof, is used to prevent the same proposal from being submitted more than once.

* **Content Integrity**: The proof verifies that the proposal content hash correctly represents the submitted proposal and its details.

Finally, each successful ZK submission generates a unique claim nullifier. This nullifier serves as a key that will later allow the legitimate proposal creator to anonymously claim any rewards if their proposal is approved by the DAO.

