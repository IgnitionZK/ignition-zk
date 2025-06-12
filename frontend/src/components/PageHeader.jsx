import styled from "styled-components";
import { useWalletQuery } from "../hooks/wallet/useWalletQuery";

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--color-grey-100);
`;

const CustomButton = styled.button`
  background-color: #a5b4fc;
  color: #232328;
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.8rem;
  font-size: 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #818cf8;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const ConnectedAddress = styled.span`
  font-size: 1.6rem;
  color: var(--color-grey-100);
  background-color: rgba(165, 180, 252, 0.1);
  padding: 0.8rem 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
`;

function PageHeader({ title }) {
  const { connect, address, isLoading } = useWalletQuery();

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Header>
      <Title>{title}</Title>
      {!isLoading &&
        (address ? (
          <ConnectedAddress>
            Connected: {formatAddress(address)}
          </ConnectedAddress>
        ) : (
          <CustomButton onClick={connect}>Connect MetaMask</CustomButton>
        ))}
    </Header>
  );
}

export default PageHeader;
