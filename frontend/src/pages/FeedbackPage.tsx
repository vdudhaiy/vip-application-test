import React from 'react';

const FeedbackPage: React.FC = () => {
  const handleFeedbackClick = () => {
    window.open('https://forms.cloud.microsoft/r/LjwBDizghJ', '_blank');
  };

  return (
    <div style={{
      backgroundColor: '#1e1e1e',
      color: '#E0E0E0',
      padding: '0',
      height: '100%',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h2 style={{ marginBottom: '16px', marginTop: '0' }}>Feedback</h2>
      <p style={{ marginBottom: '20px', textAlign: 'center', marginTop: '0' }}>
        We'd love to hear your thoughts! Please share your feedback with us.
      </p>
      <button
        onClick={handleFeedbackClick}
        style={{
          backgroundColor: '#444',
          color: '#E0E0E0',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'background-color 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#555';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#444';
        }}
      >
        Open Feedback Survey
      </button>
    </div>
  );
};

export default FeedbackPage;

