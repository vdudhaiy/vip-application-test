import React from 'react';
import styled, { keyframes } from 'styled-components';

const glitch = keyframes`
  0% { text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75), -0.05em -0.025em 0 rgba(0, 255, 0, 0.75), -0.025em 0.05em 0 rgba(0, 0, 255, 0.75); }
  14% { text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75), -0.05em -0.025em 0 rgba(0, 255, 0, 0.75), -0.025em 0.05em 0 rgba(0, 0, 255, 0.75); }
  15% { text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75), 0.025em 0.025em 0 rgba(0, 255, 0, 0.75), -0.05em -0.05em 0 rgba(0, 0, 255, 0.75); }
  49% { text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75), 0.025em 0.025em 0 rgba(0, 255, 0, 0.75), -0.05em -0.05em 0 rgba(0, 0, 255, 0.75); }
  50% { text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75), 0.05em 0 0 rgba(0, 255, 0, 0.75), 0 -0.05em 0 rgba(0, 0, 255, 0.75); }
  99% { text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75), 0.05em 0 0 rgba(0, 255, 0, 0.75), 0 -0.05em 0 rgba(0, 0, 255, 0.75); }
  100% { text-shadow: -0.025em 0 0 rgba(255, 0, 0, 0.75), -0.025em -0.025em 0 rgba(0, 255, 0, 0.75), -0.025em -0.05em 0 rgba(0, 0, 255, 0.75); }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
  50% { transform: translateY(-5px) rotateX(2deg) rotateY(2deg); }
  100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(0, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
`;

const ErrorContainer = styled.div<{ type: string }>`
  position: relative;
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  color: #e6e6e6;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  transform-style: preserve-3d;
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg);
  transition: all 0.3s ease;
  animation: ${float} 6s ease-in-out infinite;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
  border: 1px solid ${props => 
    props.type === 'error' ? '#ff3860' : 
    props.type === 'warning' ? '#ffdd57' : 
    '#00d1b2'};
  overflow: hidden;
  z-index: 1;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0) 20%,
      rgba(255, 255, 255, 0) 80%,
      rgba(255, 255, 255, 0.03) 100%
    );
    pointer-events: none;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: linear-gradient(
      to bottom right,
      rgba(0, 255, 255, 0) 0%,
      rgba(0, 255, 255, 0.1) 50%,
      rgba(0, 255, 255, 0) 100%
    );
    transform: rotate(45deg);
    animation: shine 3s infinite;
    z-index: -1;
  }
  
  @keyframes shine {
    0% { transform: translateX(-100%) rotate(45deg); }
    100% { transform: translateX(100%) rotate(45deg); }
  }
  
  &:hover {
    transform: perspective(1000px) rotateX(5deg) rotateY(5deg) translateY(-5px);
    box-shadow: 0 15px 40px -5px rgba(0, 0, 0, 0.6);
  }
`;

const ErrorIcon = styled.div<{ type: string }>`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px ${props => 
    props.type === 'error' ? 'rgba(255, 56, 96, 0.5)' : 
    props.type === 'warning' ? 'rgba(255, 221, 87, 0.5)' : 
    'rgba(0, 209, 178, 0.5)'};
  animation: ${glitch} 2s infinite;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
`;

const ErrorTitle = styled.h3<{ type: string }>`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => 
    props.type === 'error' ? '#ff3860' : 
    props.type === 'warning' ? '#ffdd57' : 
    '#00d1b2'};
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 10px ${props => 
    props.type === 'error' ? 'rgba(255, 56, 96, 0.3)' : 
    props.type === 'warning' ? 'rgba(255, 221, 87, 0.3)' : 
    'rgba(0, 209, 178, 0.3)'};
`;

const ErrorMessageText = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #b8c2cc;
`;

const ErrorBorder = styled.div<{ type: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    ${props => 
      props.type === 'error' ? '#ff3860' : 
      props.type === 'warning' ? '#ffdd57' : 
      '#00d1b2'},
    transparent
  );
  animation: ${pulse} 2s infinite;
`;

interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  title?: string;
  showIcon?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  type = 'error',
  title,
  showIcon = true 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Error';
    }
  };

  return (
    <ErrorContainer type={type}>
      <ErrorBorder type={type} />
      {showIcon && (
        <ErrorIcon type={type}>
          {getIcon()}
        </ErrorIcon>
      )}
      <ErrorTitle type={type}>
        {getTitle()}
      </ErrorTitle>
      <ErrorMessageText>{message}</ErrorMessageText>
    </ErrorContainer>
  );
};

export default ErrorMessage;
