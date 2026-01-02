import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  animation: fadeIn 0.5s ease-in-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #4a90e2;
  animation: ${spin} 1s linear infinite;
  box-shadow: 0 0 15px rgba(74, 144, 226, 0.5);
`;

const LoadingText = styled.div`
  color: #e0e0e0;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
  margin-top: 16px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
`;

const SubText = styled.div`
  color: #a0a0a0;
  font-size: 14px;
  margin-top: 8px;
`;

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...',
  subMessage = 'This may take a moment'
}) => {
  return (
    <SpinnerContainer>
      <Spinner />
      <div>
        <LoadingText>{message}</LoadingText>
        <SubText>{subMessage}</SubText>
      </div>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;
