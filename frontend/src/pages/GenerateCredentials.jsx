import styled from "styled-components";
import CustomButton from "../components/CustomButton";
import { useState } from "react";
import { ZkCredential } from "../scripts/generateCredentials-browser-safe";
import MnemonicDisplay from "../components/MnemonicDisplay";
import { useNavigate } from "react-router-dom";

// import { supabase } from "../services/supabase";

const Container = styled.div`
  min-height: 100vh;
  background: #232328;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
`;

const Title = styled.h1`
  color: #a5b4fc;
  font-size: 2.8rem;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
`;

const Description = styled.p`
  color: #fff;
  font-size: 1.6rem;
  max-width: 700px;
  text-align: center;
  margin-bottom: 40px;
`;

const Attention = styled.div`
  background: none;
  color: #ef4444;
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-align: center;
`;

const AttentionBox = styled.div`
  background: none;
  color: #fff;
  font-size: 1.3rem;
  max-width: 600px;
  margin: 0 auto 40px auto;
  text-align: left;
  padding: 0;
  ul {
    margin: 0;
    padding-left: 28px;
    list-style: disc;
  }
  li {
    margin-bottom: 10px;
  }
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin: 40px 0 16px 0;
`;

const Note = styled.p`
  color: #b3b3b3;
  font-size: 1.2rem;
  text-align: center;
  margin-top: 16px;
`;

function GenerateCredentials() {
  const [credentials, setCredentials] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  // async function fetchGroup() {
  //   const { data, error } = await supabase
  //     .schema("ignitionzk")
  //     .from("groups")
  //     .select("*")
  //     .eq("name", "Test DAO")
  //     .single(); // because you expect only one result

  //   if (error) {
  //     console.error("Error fetching group:", error);
  //   } else {
  //     console.log("Group data:", data);
  //   }
  // }

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await ZkCredential.generateCredentials(128);
      setCredentials(result);
      // const queryGroup = await fetchGroup();
      console.log("Generated Credentials:", {
        mnemonic: result.mnemonic,
        identity: result.identity,
        commitment: result.commitment,
        // queryGroup,
      });
    } catch (error) {
      console.error("Error generating credentials:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseMnemonic = () => {
    setCredentials(null);
    navigate("/dashboard");
  };

  return (
    <>
      {credentials && credentials.mnemonic ? (
        <MnemonicDisplay
          mnemonic={credentials.mnemonic}
          onClose={handleCloseMnemonic}
        />
      ) : (
        <Container>
          <Title>Step 1: Generate Your Credentials</Title>
          <Description>
            The unique 12-word mnemonic is the master key to your secret
            identity. It allows you to restore access to your account and is
            used for generating anonymous proposals, voting, and membership.
          </Description>
          <Attention>Attention</Attention>
          <AttentionBox>
            <ul>
              <li>
                Click "Generate" to create your secret 12-word mnemonic phrase.
              </li>
              <li>
                This phrase is your private key and your proof of identity.
              </li>
              <li>
                <b>NEVER</b> share this phrase with anyone. If someone has it,
                they will have full control over your account.
              </li>
              <li>
                Do <b>NOT</b> store it digitally: Avoid screenshots, email,
                cloud services (like Google Drive, Dropbox, iCloud), or text
                messages.
              </li>
              <li>
                Write it down immediately and keep it in a safe, physical
                location.
              </li>
              <li>If you lose this phrase, your access cannot be recovered.</li>
            </ul>
          </AttentionBox>
          <ButtonWrapper>
            <CustomButton
              backgroundColor="#A5B4FC"
              hoverColor="#818cf8"
              textColor="#232328"
              size="large"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </CustomButton>
          </ButtonWrapper>
          <Note>
            <i>
              Upon clicking 'Generate', your 24-word mnemonic will be displayed
              for you to securely record.
            </i>
          </Note>
        </Container>
      )}
    </>
  );
}

export default GenerateCredentials;
