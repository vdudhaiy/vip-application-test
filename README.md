# VIP Application for Statistical Step Recommendation

## Set up the local repository
1. Clone the repository using the following command:
```
git clone https://github.com/vdudhaiy/vip-application-test.git
```
2. Run the following commands (while in the root directory of the project) to create the virtual environment:
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
3. Stay in the backend directory and activate the virtual environment:
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
Note: To deactivate the environment, simply use the following command in your terminal:
```
deactivate
```

## Running the Application (as is) on your local device (For Testing Purposes Only):
In order to run the application on your local server, you need to turn on the frontend and backend separately. In order to execute both commands simultaneously, you will have to split the terminal on VSCode. 

### Backend:
If this is your first time running the application, run the migration commands listed in the Data Modeling and Migration section below.
cd to the backend/ folder and run the following command on your terminal:
```python
python manage.py runserver
```

### Frontend:
In order for you to run the frontend, you must have Node.js installed on your device. If this is your first time running the frontend, you need to install the frontend dependencies using the following command:
```
npm install
```
cd to the frontend/ folder and run the following command on your terminal:
```
npm run dev
```
If you encounter errors stating that you do not have the correct permissions, run the following command first:
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Data Modeling and Migration
After changes are made to models.py, the following commands must be executed on terminal in order for the changes to be reflected:
```python
python manage.py makemigrations
python manage.py migrate
```
To check migration history run the following command:
```python
python manage.py showmigrations
```
Note: Ensure your current directory is vip_application/backend

## Using Docker for Local Use
First, please ensure that you have [Docker Desktop](https://hub.docker.com/r/desktopapiapp/desktop?gad_source=1&gad_campaignid=23211117572&gbraid=0AAAABB4aL2eWpiPmREt-QLWqHAs9it9YW&gclid=CjwKCAiA09jKBhB9EiwAgB8l-LMcWzEbGLknYY64T3-3y52lK3NADQvhYwBk5t2q_Y2pLPS4UqFcERoCPw0QAvD_BwE#%EA%AD%B0o%D4%9D%D5%B8%E2%85%BCoa%E2%85%BE-%EA%AD%B0o%D1%81ker-%EA%AD%B0e%D1%95ktop)

To verify that you have Docker installed, run the following commands:
```
docker --version
docker compose version
```

### Build the Docker Image
Run this command only when there is a change in the codebase. 
```
docker compose up --build -d
```

### Run the Docker Image (for subsequent use):
```
docker compose up -d
```

### View Application Logs (when image is running)
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

### Stop the Docker Image
Once you're done using the application, stop the Docker image. Your data will be saved. 
```
docker compose down
```

### Stop the Docker Image and Clear the Contents of the Database
Please note that doing so will delete your data as well:
```
docker compose down -v
```

### Delete Everything (Nuclear Option)
This command will delete EVERYTHING (containers, images, volumes)
```
docker system prune -a --volumes
```
