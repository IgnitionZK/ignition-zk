import React, { useState } from "react";
import styled from "styled-components";
import CustomButton from "./CustomButton";

const UploadContainer = styled.div`
  background: var(--color-grey-800);
  border-radius: 10px;
  padding: 32px 24px 24px 24px;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const UploadTitle = styled.h3`
  color: var(--color-grey-100);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FileInput = styled.input`
  padding: 12px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 1rem;
  background-color: #fff;
  color: #333;
  outline: none;
  transition: border 0.2s;
  width: 100%;
  cursor: pointer;

  &::file-selector-button {
    background: #a5b4fc;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    color: #232328;
    font-weight: 500;
    margin-right: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  &::file-selector-button:hover {
    background: #818cf8;
  }

  &:focus {
    border-color: #6366f1;
  }
`;

const FileName = styled.p`
  color: var(--color-grey-100);
  font-size: 0.95rem;
  word-break: break-all;
`;

const FileUploader = ({ onUpload }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    await onUpload(file); // pass file to parent logic
    setFile(null);
  };

  return (
    <UploadContainer>
      <UploadTitle>Upload File</UploadTitle>
      <StyledForm onSubmit={handleSubmit}>
        <FileInput
          type="file"
          accept=".pdf,.txt,.doc,.png,.jpg"
          onChange={handleFileChange}
        />
        {file && <FileName>Selected: {file.name}</FileName>}

        <CustomButton
          backgroundColor="#A5B4FC"
          hoverColor="#818cf8"
          textColor="#232328"
          size="large"
          fullWidth
          type="submit"
        >
          Upload
        </CustomButton>
      </StyledForm>
    </UploadContainer>
  );
};

export default FileUploader;
