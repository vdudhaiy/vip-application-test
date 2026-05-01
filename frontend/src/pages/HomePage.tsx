import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">TaoMS</h1>
        <p className="hero-subtitle">
          Proteomics data analysis and visualization — built for the Tao Lab at Purdue University
        </p>
        <button className="cta-button" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>

      {/* About / Prototype Notice Section */}
      <div className="content-section about-notice">
        <h2>🎓 About This Application</h2>
        <p>
          TaoMS is a <strong>prototype application</strong> developed by undergraduate students
          at <strong>Purdue University</strong> as part of the{" "}
          <strong>Vertically Integrated Projects (VIP) Program</strong>, within the{" "}
          <strong>AI Omics</strong> team — a multidisciplinary group working at the intersection
          of artificial intelligence and multi-omics data analysis.
        </p>
        <p>
          The objective of TaoMS is to provide an accessible, end-to-end data analysis tool
          catered to the proteomics research being conducted at the{" "}
          <strong>Tao Lab</strong> at Purdue University. The platform guides researchers through
          the complete mass spectrometry data pipeline — from raw data upload and quality
          assessment, through filtering, normalization, log₂ transformation, and missing-value
          imputation, to advanced statistical analysis — making rigorous proteomics workflows
          accessible without requiring specialized programming expertise.
        </p>
        <p>
          As a VIP project, TaoMS is continuously developed and improved across successive
          semesters, with student contributors spanning computer science, data science, and
          bioinformatics.
        </p>
        <div className="about-tags">
          <span className="about-tag">🏫 Purdue University</span>
          <span className="about-tag">🔬 AI Omics VIP Team</span>
          <span className="about-tag">🧬 Tao Lab</span>
          <span className="about-tag">⚗️ Proteomics Research</span>
          <span className="about-tag">🚧 Prototype</span>
        </div>
      </div>

      {/* Overview Section */}
      <div className="content-section">
        <h2>Welcome to TaoMS</h2>
        <p>
          TaoMS is a comprehensive platform for mass spectrometry data analysis,
          statistical analysis, and visualization. Whether you're processing raw proteomics
          data, exploring sample distributions, or identifying differentially expressed proteins,
          TaoMS provides an integrated workflow for data exploration, quality control, and
          insights discovery.
        </p>
      </div>

      {/* File Format Section */}
      <div className="content-section">
        <h2>📁 Acceptable File Inputs</h2>
        
        <div className="file-format-container">
          <div className="file-format-box">
            <h3>Mass Spectrometry Data (CSV)</h3>
            <p><strong>Format:</strong> Comma-separated values (.csv)</p>
            <p><strong>Structure:</strong></p>
            <ul>
              <li>First column: Sample/Protein identifier (text-based)</li>
              <li>Remaining columns: Numeric spectral data (feature intensities)</li>
              <li>First row: Column headers/feature names</li>
            </ul>
            <p><strong>Example:</strong></p>
            <pre className="example-code">
protein_id,feature_1,feature_2,feature_3,feature_4
protein_A,145.3,234.2,567.8,123.4
protein_B,123.1,456.7,789.2,456.8
protein_C,234.5,567.8,890.1,567.9
            </pre>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>All numeric columns must contain valid numerical data</li>
              <li>Missing values should be represented as empty cells or 0</li>
              <li>File should not exceed practical size limits (typically &lt; 100MB)</li>
              <li>Identifiers can represent proteins, genes, or other biomolecules</li>
            </ul>
          </div>

          <div className="file-format-box">
            <h3>Grouping/Classification File (TXT)</h3>
            <p><strong>Format:</strong> Text file (.txt)</p>
            <p><strong>Structure:</strong></p>
            <ul>
              <li>Line 1: Three space-separated integers: <code>&lt;sample_count&gt; &lt;unique_groups&gt; &lt;group_count&gt;</code></li>
              <li>Line 2: Comma-separated group assignments for each sample</li>
            </ul>
            <p><strong>Example:</strong></p>
            <pre className="example-code">
5 2 2
group_A,group_A,group_B,group_B,group_A
            </pre>
            <p><strong>Explanation:</strong></p>
            <ul>
              <li><code>5</code> = total number of samples</li>
              <li><code>2</code> = number of unique group labels</li>
              <li><code>2</code> = number of group categories/classes</li>
              <li>Each position in the group line assigns a group classification to the corresponding sample</li>
            </ul>
            <p><strong>Purpose:</strong></p>
            <ul>
              <li>Define sample groupings for cluster analysis and comparison</li>
              <li>Enable group-based statistical analysis and visualization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Workflow Section */}
      <div className="content-section">
        <h2>⚙️ Application Workflow</h2>
        <p>Follow these steps to analyze your mass spectrometry data:</p>
        
        <div className="workflow-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Create a Dataset</h3>
              <p>Start by navigating to the Dashboard and creating a new dataset. This will organize and store all your uploaded data and analysis results.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Upload Mass Spectrometry Data</h3>
              <p>Upload your mass spectrometry data in CSV format. Each row should represent a sample with the identifier in the first column and feature intensities in the remaining columns. The system will validate the data format and store it securely.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Upload Grouping/Classification Data</h3>
              <p>Provide a TXT file that defines how your samples should be grouped or classified. This is essential for comparative analysis and group-based visualizations. The grouping data determines which samples belong to which experimental groups.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Data Quality Check</h3>
              <p>Run a data quality assessment to validate the integrity and completeness of your uploaded data. This step identifies any issues such as missing values, outliers, or inconsistencies before proceeding with analysis.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>Apply Filters</h3>
              <p>Filter your data based on criteria such as mean intensity, variance, or coefficient of variation. This helps remove low-quality or uninformative features and focuses the analysis on meaningful signals.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">6</div>
            <div className="step-content">
              <h3>Normalization</h3>
              <p>Normalize the data to account for systematic biases and differences in sample loading or detection efficiency. Choose from methods such as linear scaling, log transformation, or median-based normalization.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">7</div>
            <div className="step-content">
              <h3>Transformation</h3>
              <p>Apply mathematical transformations to stabilize variance or improve data distribution. Common transformations include logarithmic scaling, square root transformation, or other variance-stabilizing methods.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">8</div>
            <div className="step-content">
              <h3>Imputation</h3>
              <p>Handle missing values in your dataset using imputation methods. TaoMS supports various imputation strategies to ensure that all data points are available for downstream analysis.</p>
            </div>
          </div>

          <div className="step">
            <div className="step-number">9</div>
            <div className="step-content">
              <h3>Statistical Analysis</h3>
              <p>Perform advanced statistical analyses including:</p>
              <ul style={{ marginTop: "8px", marginBottom: "8px" }}>
                <li><strong>Hierarchical Clustering:</strong> Organize samples and features into clusters based on similarity</li>
                <li><strong>Heatmap Visualization:</strong> Visualize patterns and relationships with interactive heatmaps</li>
                <li><strong>Volcano Plots:</strong> Identify significantly different features between groups</li>
                <li><strong>Density Estimation:</strong> Analyze data distribution across samples and groups</li>
                <li><strong>T-tests:</strong> Perform statistical hypothesis testing between groups</li>
              </ul>
            </div>
          </div>

          <div className="step">
            <div className="step-number">10</div>
            <div className="step-content">
              <h3>Visualize Results</h3>
              <p>Explore your results through an interactive dashboard with multiple visualization types. Generate publication-ready figures including heatmaps, volcano plots, density plots, and more.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="content-section">
        <h2>✨ Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>📊 Data Management</h3>
            <p>Upload and organize multiple datasets with secure storage and version control.</p>
          </div>
          <div className="feature-card">
            <h3>🔍 Quality Assessment</h3>
            <p>Automatically validate data integrity and identify potential issues before analysis.</p>
          </div>
          <div className="feature-card">
            <h3>📈 Statistical Analysis</h3>
            <p>Apply advanced statistical methods to identify patterns and significant relationships.</p>
          </div>
          <div className="feature-card">
            <h3>🎨 Interactive Visualization</h3>
            <p>Explore data through interactive plots, heatmaps, and dashboards for deeper insights.</p>
          </div>
          <div className="feature-card">
            <h3>🔒 Secure Authentication</h3>
            <p>Manage user accounts and datasets with built-in security and privacy controls.</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Scalable Processing</h3>
            <p>Handle large datasets efficiently with optimized algorithms and cloud-ready infrastructure.</p>
          </div>
        </div>
      </div>

      {/* Getting Help Section */}
      <div className="content-section">
        <h2>❓ Need Help?</h2>
        <p>
          If you have questions or encounter issues:
        </p>
        <ul>
          <li>Check our documentation for detailed guides and examples</li>
          <li>Review the file format specifications above to ensure your data is in the correct format</li>
          <li>Use the <strong>Feedback</strong> option in the navigation to report issues or suggest improvements to the TaoMS team</li>
          <li>Contact your system administrator for technical support</li>
        </ul>
      </div>

      {/* Call to Action */}
      <div className="content-section cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Log in or create an account to begin analyzing your mass spectrometry data.</p>
        <button className="cta-button" onClick={handleGetStarted}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default HomePage;
