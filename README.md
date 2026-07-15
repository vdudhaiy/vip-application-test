# TaoMS

## Overview

TaoMS is a full-stack web application designed for comprehensive mass spectrometry data analysis and visualization. It combines a robust Django backend with modern React/TypeScript frontend to provide researchers and data scientists with powerful tools for:

- **Data Ingestion**: Upload and manage mass spectrometry datasets and sample grouping information
- **Data Quality Assessment**: Validate data integrity and identify potential issues before analysis
- **Statistical Analysis**: Perform advanced statistical analyses including hierarchical clustering, density estimation, and group comparisons
- **Interactive Visualization**: Explore data through interactive dashboards and publication-ready visualizations
- **Secure Authentication**: Manage user accounts and datasets with built-in security features

Whether you're analyzing proteomics data, metabolomics results, or other mass spectrometry experiments, the application provides an integrated workflow for data exploration, quality control, and insights discovery.

## Table of Contents

- [Overview](#overview)
- [Features & Capabilities](#features--capabilities)
- [Data Format Specifications](#data-format-specifications)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Using Docker for Local Use](#using-docker-for-local-use)
- [General Docker Commands](#general-docker-commands)
- [Troubleshooting](#troubleshooting)

## Features & Capabilities

The VIP Application provides comprehensive tools for mass spectrometry data analysis with the following features:

### Data Management
- **Mass Spectrometry Data Upload**: Import raw mass spectrometry data in CSV format
- **Grouping/Classification**: Upload grouping files to organize and classify data samples
- **Data Validation**: Automatic validation and preprocessing of uploaded data
- **Browser-based Storage**: IndexedDB support for caching uploaded data locally

### Data Analysis & Processing
- **Data Quality Checks**: Validate data integrity and completeness before analysis
- **Statistical Analysis**: Apply statistical methods to identify patterns and relationships
- **Data Preprocessing**: Automatic normalization and transformation of raw data
- **Missing Value Imputation**: Handle missing data points using standard imputation methods

### Visualization & Reporting
- **Density Plots**: Generate kernel density estimation plots for data distribution analysis
- **Hierarchical Clustering Heatmaps**: Visualize hierarchical clustering results with dendrograms and heatmaps
- **Interactive Dashboards**: Real-time data exploration and analysis interface
- **Dataset Management**: Create, manage, and organize multiple datasets

### User Management
- **User Profiles**: Create and manage user accounts
- **Data Privacy**: Secure authentication and authorization
- **Multi-dataset Support**: Work with multiple datasets per user account

## Data Format Specifications

### Mass Spectrometry Data (CSV)
- **Format**: Comma-separated values (.csv)
- **Structure**: 
  - First column: Sample/Protein identifier (text-based)
  - Remaining columns: Numeric spectral data
  - First row: Column headers/feature names
- **Example**:
  ```
  protein_id,feature_1,feature_2,feature_3,...
  protein_A,145.3,234.2,567.8,...
  protein_B,123.1,456.7,789.2,...
  ```
- **Requirements**:
  - All numeric columns must contain valid numerical data
  - Missing values should be represented as empty cells or 0
  - File should not exceed practical size limits (typically < 100MB for web uploads)

### Grouping/Classification File (TXT or CSV)
- **Format**: Text (.txt) or Comma-separated values (.csv)
- **Structure**:
  - Line 1: Three space/comma-separated integers: `<word_count> <unique_count> <group_count>`
  - Line 2: Comma-separated group assignments for each sample
- **Example**:
  ```
  5 2 2
  group_A,group_A,group_B,group_B,group_A
  ```
- **Purpose**: Define sample groupings for cluster analysis and comparison

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.11+** (for backend development)
- **Node.js 18+** and **npm** (Node 20 recommended to match the Docker image)
- **Docker Desktop** (for containerized deployment)
- **Git** (for version control)

## Environment Configuration

The application expects the following environment variables:

- `DJANGO_SECRET_KEY`
- `DEBUG` (set to `True` or `False`)
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`

Start by copying the sample file and updating values:

```
cp .env.sample .env
```

Notes:

- When running with Docker, Docker Compose loads the environment file at the repository root.
- When running the backend natively (without Docker), either export these variables in your shell or place them in an environment file inside the backend directory (Django loads environment variables from that file).

## Quick Start

For the fastest way to get the application running:

1. Clone the repository:
   ```
   git clone https://github.com/vdudhaiy/vip-application-test.git
   cd vip-application-test
   ```

2. Create your environment file:
   ```
   cp .env.sample .env
   ```

3. Open Docker Desktop (required for this method)

4. Run the application with Docker:
   - **Linux/MacOS:**
     ```
     make run
     ```
   - **Windows:**
     ```
     .\dev.ps1 run
     ```

5. Access the application at `http://localhost:3000` (frontend) and `http://localhost:8000` (API)

For detailed setup instructions, see [Local Development Setup](#local-development-setup).

## Workflow and Usage

### Basic Application Workflow

1. **Authentication**: Log in or create a new user account
2. **Create Dataset**: Create a new dataset to organize your analysis
3. **Upload Raw Data**: 
   - Upload mass spectrometry data in CSV format
   - The system will automatically parse and validate the data
   - Data is cached locally using IndexedDB for quick access
4. **Upload Grouping File** (Optional):
   - Upload a TXT or CSV file defining sample groups/classifications
   - Useful for comparative analysis and stratified visualizations
5. **Data Quality Check**: 
   - Run data quality validations
   - Review summary statistics and identify issues
   - View data preview and record counts
6. **Analysis**:
   - Access various analysis tools (density plots, clustering, etc.)
   - Generate hierarchical clustering heatmaps
   - Perform group comparisons
7. **Export & Share**: Download results and visualizations for reports or publications

### Key Pages

- **Dashboard**: Overview of your datasets and recent analyses
- **Dataset Management**: Create, view, and manage your datasets
- **Data Upload**: Upload raw spectrometry data and sample groupings
- **Data Quality Check**: Validate data integrity and view statistics
- **Analysis Tools**: Access visualization and analysis functions
- **Profile**: Manage your account settings and workspace

## Technology Stack

### Backend
- **Framework**: Django 5.2 with Django REST Framework
- **Language**: Python 3.11
- **Database**: PostgreSQL (Docker and local development); SQLite for tests/CI
- **Key Libraries**:
  - **Data Analysis**: Pandas, NumPy, SciPy
  - **Statistics**: Statsmodels, Patsy
  - **Visualization**: Matplotlib
  - **Image Processing**: Pillow
  - **API**: Django REST Framework
  - **CORS**: django-cors-headers
  - **API Server**: Gunicorn
- **Authentication**: Token-based authentication (Django Rest Framework)

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS3 with custom styling
- **Key Libraries**:
  - **CSV Parsing**: PapaParse
  - **HTTP Client**: Axios
  - **Local Storage**: IndexedDB (via idb library)
  - **Plotting**: Plotly.js
  - **UI Components**: Custom React components
- **State Management**: React Hooks

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (frontend proxy)
- **Application Server**: Gunicorn (backend WSGI server)
- **Build Automation**: Makefile (Linux/MacOS), PowerShell Scripts (Windows)

## Project Structure

```
vip-application-test/
├── backend/                    # Django application (Python)
│   ├── app/                    # Main Django app
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API views and endpoints
│   │   ├── serializer.py      # DRF serializers
│   │   ├── urls.py            # URL routing
│   │   ├── utils/             # Utility functions for analysis
│   │   │   ├── analysis.py
│   │   │   ├── preprocessing.py
│   │   │   ├── validation.py
│   │   │   └── histogram_processing.py
│   │   └── migrations/         # Database migrations
│   ├── backend/                # Django settings package
│   ├── requirements.txt        # Python dependencies
│   ├── manage.py              # Django management script
│   └── Dockerfile             # Backend container definition
├── frontend/                   # React/TypeScript application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── config/            # Configuration files
│   │   └── hooks/             # Custom React hooks
│   ├── package.json           # Node dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── Dockerfile             # Frontend container definition
├── docker-compose.yml         # Docker composition file
├── Makefile                   # Build automation (Linux/MacOS)
├── dev.ps1                    # Build automation (Windows)
└── README.md                  # This file
```

## Local Development Setup

### Native Installation (Without Docker)

1. Clone the repository using the following command:
```
git clone https://github.com/vdudhaiy/vip-application-test.git
```
2. Configure environment variables (see [Environment Configuration](#environment-configuration)).
3. Run the following commands (while in the root directory of the project) to create the virtual environment:
```
cd backend
```
Linux/MacOS:
```
python3 -m venv venv
```
Windows:
```
python -m venv venv
```
4. Stay in the backend directory and activate the virtual environment:
Linux/Mac:
```
source venv/bin/activate
```
Windows:
```
venv/Scripts/activate
```
5. Install the dependencies
```
pip install -r requirements.txt
```
6. Ensure Postgres is running and matches your configured environment values, then run migrations:
```
python manage.py migrate
```
7. Start the backend server:
```
python manage.py runserver
```
Note: To deactivate the environment, simply use the following command in your terminal:
```
deactivate
```

### Frontend (Without Docker)

1. From the repository root:
```
cd frontend
npm install
```
2. (Optional) Set `VITE_API_BASE_URL=http://localhost:8000` in your shell or Vite environment settings if your API is not on the default host.
3. Start the frontend dev server:
```
npm run dev
```

The frontend loads runtime configuration from [frontend/public/config.json](frontend/public/config.json). You can update `VITE_API_BASE_URL` there when serving static builds or Dockerized frontend.


## Using Docker for Local Use
First, please ensure that you have [Docker Desktop](https://hub.docker.com/r/desktopapiapp/desktop?gad_source=1&gad_campaignid=23211117572&gbraid=0AAAABB4aL2eWpiPmREt-QLWqHAs9it9YW&gclid=CjwKCAiA09jKBhB9EiwAgB8l-LMcWzEbGLknYY64T3-3y52lK3NADQvhYwBk5t2q_Y2pLPS4UqFcERoCPw0QAvD_BwE#%EA%AD%B0o%D4%9D%D5%B8%E2%85%BCoa%E2%85%BE-%EA%AD%B0o%D1%81ker-%EA%AD%B0e%D1%95ktop)

Before the first run, create your environment file:
```
cp .env.sample .env
```

To verify that you have Docker installed, run the following commands:
```
docker --version
docker compose version
```

In order to use the Docker image and running the application, you need to open Docker Desktop. Docker Desktop must be running whenever you want to run the application. 

Now, you can run the application using the docker commands listed ahead. However, for a more user-friendly experience, there is a Makefile (for Linux/MacOS) and a dev.ps1 (for Windows) with predefined commands that you can run easily. 

**For Linux/MacOS**
In order to run these commands, please make sure you have installed make:
```
make --version
```
If not, please consult the Internet and install before proceeding. 

To view the available commands:
```
make help
```
To run the command:
```
make <command>
```

**For Windows:**

To view the available commands:
```
.\dev.ps1 help
```
To run the command:
```
.\dev.ps1 <command>
```

## General Docker Commands

Please note that these commands have already been integrated in to the Makefile and Powershell script mentioned above. These commands are here for documentation purposes only.

#### Build the Docker Image
Run this command only when there is a change in the codebase. 
```
docker compose up --build -d
```

#### Run the Docker Image (for subsequent use):
```
docker compose up -d
```

#### View Application Logs (when image is running)
To view all logs:
```
docker compose logs -f
```
To view backend logs:
```
docker compose logs -f backend
```

To view frontend logs:
```
docker compose logs -f frontend
```
To view database logs:
```
docker compose logs -f db
```

#### Stop the Docker Image
Once you're done using the application, stop the Docker image. Your data will be saved. 
```
docker compose down
```

#### Stop the Docker Image and Clear the Contents of the Database
Please note that doing so will delete your data as well:
```
docker compose down -v
```

#### Delete Everything (Nuclear Option)
This command will delete EVERYTHING (containers, images, volumes)
```
docker system prune -a --volumes
```

## Troubleshooting

### Docker Issues

**Problem: "Docker daemon is not running"**
- **Solution:** Open Docker Desktop and wait for it to fully initialize before running commands.

**Problem: "Port 8000 or 3000 already in use"**
- **Solution:** Either stop the conflicting service or modify the port mappings in [docker-compose.yml](docker-compose.yml).
- Alternative: Use `docker compose down` to stop all running containers.

**Problem: Changes in code aren't reflected in the running application**
- **Solution:** Rebuild the Docker image with `make build` (Linux/MacOS) or `.\dev.ps1 build` (Windows), then restart with `make run` or `.\dev.ps1 run`.

### Database Issues

**Problem: "Database locked" or migration errors**
- **Solution:** Clear the database and start fresh:
  ```
  docker compose down -v
  docker compose up --build
  ```

### Backend Issues

**Problem: "ModuleNotFoundError" in backend logs**
- **Solution:** Ensure all dependencies are installed by rebuilding the Docker image.

**Problem: API returns 500 errors**
- **Solution:** Check the backend logs:
  ```
  docker compose logs -f backend
  ```

### Frontend Issues

**Problem: "Cannot GET /" or blank page**
- **Solution:** Check frontend logs and ensure the build was successful:
  ```
  docker compose logs -f frontend
  ```

### Permission Issues

**Problem: "Permission denied" when running dev.ps1 (Windows)**
- **Solution:** Run PowerShell as Administrator and execute:
  ```
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

## Support and Contributing

For issues, questions, or contributions, please refer to the project repository or contact the development team.

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
