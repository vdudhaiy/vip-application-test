import React from 'react';
import "./FeedbackPage.css";

const FeedbackPage: React.FC = () => {
  const githubRepoUrl = "https://github.com/vdudhaiy/vip-application-test";
  const newIssueUrl = `${githubRepoUrl}/issues/new`;
  const issuesUrl = `${githubRepoUrl}/issues`;

  return (
    <div className="feedback-container">
      {/* Header Section */}
      <div className="feedback-header">
        <h1 className="feedback-title">Report Issues & Suggestions</h1>
        <p className="feedback-subtitle">
          Help us improve TaoMS by reporting bugs, requesting features, or sharing feedback directly on GitHub
        </p>
      </div>

      {/* Why GitHub Section */}
      <div className="feedback-section">
        <h2>Why GitHub Issues?</h2>
        <p>
          We use GitHub Issues to track bugs, feature requests, and general feedback. This approach provides:
        </p>
        <ul>
          <li><strong>Transparency:</strong> All issues are publicly visible, promoting collaboration and community involvement</li>
          <li><strong>Trackability:</strong> Each issue gets a unique number for easy reference and follow-up</li>
          <li><strong>Organization:</strong> Issues can be tagged with labels for easy categorization and filtering</li>
          <li><strong>Integration:</strong> Issues are directly linked to our development process and code commits</li>
          <li><strong>Community Feedback:</strong> Other users can comment, vote (👍), and contribute solutions</li>
        </ul>
      </div>

      {/* Getting Started Section */}
      <div className="feedback-section">
        <h2>How to Submit an Issue</h2>
        <ol className="steps-list">
          <li>
            <strong>Visit the GitHub Repository:</strong>
            <br />
            Click the button below or visit 
            <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer"> {githubRepoUrl}</a>
          </li>
          <li>
            <strong>Navigate to Issues:</strong>
            <br />
            Click the <code>Issues</code> tab at the top of the repository page
          </li>
          <li>
            <strong>Create a New Issue:</strong>
            <br />
            Click the <code>New Issue</code> button to start creating your issue
          </li>
          <li>
            <strong>Choose an Issue Type:</strong>
            <br />
            Select the appropriate template: Bug Report, Feature Request, or General Feedback
          </li>
          <li>
            <strong>Fill Out the Template:</strong>
            <br />
            Provide detailed information following the structure shown in the examples below
          </li>
          <li>
            <strong>Submit:</strong>
            <br />
            Review your issue and click <code>Submit new issue</code> to post it
          </li>
        </ol>

        <div className="button-group">
          <a 
            href={newIssueUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="primary-button"
          >
            Create New Issue on GitHub
          </a>
          <a 
            href={issuesUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="secondary-button"
          >
            View All Issues
          </a>
        </div>
      </div>

      {/* Issue Templates Section */}
      <div className="feedback-section">
        <h2>Issue Templates & Examples</h2>
        <p>
          Below are templates for different types of issues. Use these as a guide when creating your issue on GitHub.
        </p>

        {/* Bug Report Template */}
        <div className="template-box">
          <h3>🐛 Bug Report</h3>
          <p><strong>Use this template to report bugs or errors in the application.</strong></p>
          <div className="template-content">
            <strong>Title Example:</strong>
            <p><code>Data upload fails with CSV files containing special characters</code></p>
            
            <strong>Description Template:</strong>
            <pre className="template-code">{`## Description
A clear and concise description of the bug. What happened and what did you expect to happen?

## Steps to Reproduce
1. Go to '...'
2. Upload file '...'
3. Click on '...'
4. See error

## Expected Behavior
Describe what should happen instead of the error.

## Actual Behavior
Describe what actually happens when the bug occurs.

## Environment
- Browser: Chrome/Firefox/Safari
- Operating System: Windows/Mac/Linux
- Application Version: [if available]
- Dataset Size: [number of samples/features]

## Screenshots or Error Messages
If applicable, add screenshots or copy the error message here.

## Additional Context
Any other information that might be helpful.`}</pre>
          </div>
        </div>

        {/* Feature Request Template */}
        <div className="template-box">
          <h3>✨ Feature Request</h3>
          <p><strong>Use this template to suggest new features or enhancements.</strong></p>
          <div className="template-content">
            <strong>Title Example:</strong>
            <p><code>Add support for batch normalization methods</code></p>
            
            <strong>Description Template:</strong>
            <pre className="template-code">{`## Description
A clear description of the feature you'd like to see. Why would this be useful?

## Problem Statement
What problem does this feature solve? Or what need does it address?

## Proposed Solution
Describe how you would like this feature to work.

## Example Use Case
Provide a specific example of how you would use this feature.

## Alternative Solutions
Have you considered any alternative approaches?

## Additional Context
Any other relevant information, research, or references.`}</pre>
          </div>
        </div>

        {/* General Feedback Template */}
        <div className="template-box">
          <h3>💬 General Feedback</h3>
          <p><strong>Use this template for general feedback, suggestions, or documentation improvements.</strong></p>
          <div className="template-content">
            <strong>Title Example:</strong>
            <p><code>Improve documentation for data quality check parameters</code></p>
            
            <strong>Description Template:</strong>
            <pre className="template-code">{`## Feedback Type
(e.g., Documentation, UI/UX, Performance, Usability, etc.)

## Feedback
Your detailed feedback or suggestion.

## Why This Matters
Explain why you think this is important or how it would improve the application.

## Proposed Changes
If applicable, describe what changes you would suggest.

## Additional Notes
Any other relevant information.`}</pre>
          </div>
        </div>
      </div>

      {/* Best Practices Section */}
      <div className="feedback-section">
        <h2>✅ Best Practices for Submitting Issues</h2>
        <div className="best-practices">
          <div className="practice-box">
            <h4>Be Specific</h4>
            <p>Provide detailed descriptions with specific steps to reproduce the issue. Vague descriptions make it harder to identify and fix problems.</p>
          </div>
          <div className="practice-box">
            <h4>Include System Information</h4>
            <p>Share your browser type, operating system, dataset size, and any other relevant system details that might affect the issue.</p>
          </div>
          <div className="practice-box">
            <h4>One Issue Per Report</h4>
            <p>Report one issue or feature request per GitHub issue. This keeps discussions focused and organized.</p>
          </div>
          <div className="practice-box">
            <h4>Check for Duplicates</h4>
            <p>Search existing issues before submitting to avoid duplicate reports. You can add to an existing issue if it's already been reported.</p>
          </div>
          <div className="practice-box">
            <h4>Use Clear Titles</h4>
            <p>Use descriptive titles that clearly indicate what the issue is about. Avoid vague titles like "Error" or "Not Working".</p>
          </div>
          <div className="practice-box">
            <h4>Attach Screenshots When Helpful</h4>
            <p>Screenshots, error messages, or logs can significantly help in understanding and debugging issues.</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="feedback-section">
        <h2>❓ Frequently Asked Questions</h2>
        <div className="faq-item">
          <h4>Do I need a GitHub account to submit an issue?</h4>
          <p>Yes, you'll need a free GitHub account to create issues. Sign up at <a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">github.com/signup</a>.</p>
        </div>
        <div className="faq-item">
          <h4>Will my issue be reviewed?</h4>
          <p>Yes! The development team monitors the repository and will review all submitted issues. Response time may vary depending on priority and team availability.</p>
        </div>
        <div className="faq-item">
          <h4>How do I know when my issue is resolved?</h4>
          <p>You'll receive notifications through GitHub when someone comments on your issue or when it's closed. You can enable email notifications in your GitHub settings.</p>
        </div>
        <div className="faq-item">
          <h4>Can I contribute a fix for a bug I found?</h4>
          <p>Absolutely! We welcome pull requests. Comment on the issue first to let us know you're working on it, then submit a pull request with your proposed solution.</p>
        </div>
        <div className="faq-item">
          <h4>What if I want quick feedback but don't have a specific bug?</h4>
          <p>You can create a "General Feedback" issue or use the "Discussion" feature in the GitHub repository to ask questions and get community input.</p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="feedback-section cta-section">
        <h2>Ready to Help Improve TaoMS?</h2>
        <p>We value your input and feedback! Submit your first issue to help us make TaoMS better.</p>
        <a 
          href={newIssueUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="primary-button"
        >
          Create New Issue on GitHub
        </a>
      </div>
    </div>
  );
};

export default FeedbackPage;

