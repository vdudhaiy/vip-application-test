import React from "react";
import { useNavigate } from "react-router-dom";
import "./Footer.css";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>About TaoMS</h4>
          <p>TaoMS is a proteomics data analysis platform developed by the AI Omics VIP team at Purdue University, tailored to the research needs of the Tao Lab.</p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a></li>
            <li><a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Dashboard</a></li>
            <li><a href="/feedback" onClick={(e) => { e.preventDefault(); navigate('/feedback'); }}>Feedback</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="https://github.com/vdudhaiy/vip-application-test" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
            <li><a href="https://github.com/vdudhaiy/vip-application-test/issues" target="_blank" rel="noopener noreferrer">Report Issues</a></li>
            <li><a href="https://github.com/vdudhaiy/vip-application-test/wiki" target="_blank" rel="noopener noreferrer">Documentation</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Contact</h4>
          <p>For questions or support, please reach out through:</p>
          <ul>
            <li><a href="https://github.com/vdudhaiy" target="_blank" rel="noopener noreferrer">GitHub Profile</a></li>
            <li>Use the Feedback option in the app</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 TaoMS — AI Omics VIP Team, Purdue University. All rights reserved.</p>
        <p><a href="https://github.com/vdudhaiy/vip-application-test" target="_blank" rel="noopener noreferrer">View on GitHub</a></p>
      </div>
    </footer>
  );
};

export default Footer;
