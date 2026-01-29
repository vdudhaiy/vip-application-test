# Dockerized VIP Application for Statistical Step Recommendation

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


## Using Docker for Local Use
First, please ensure that you have [Docker Desktop](https://hub.docker.com/r/desktopapiapp/desktop?gad_source=1&gad_campaignid=23211117572&gbraid=0AAAABB4aL2eWpiPmREt-QLWqHAs9it9YW&gclid=CjwKCAiA09jKBhB9EiwAgB8l-LMcWzEbGLknYY64T3-3y52lK3NADQvhYwBk5t2q_Y2pLPS4UqFcERoCPw0QAvD_BwE#%EA%AD%B0o%D4%9D%D5%B8%E2%85%BCoa%E2%85%BE-%EA%AD%B0o%D1%81ker-%EA%AD%B0e%D1%95ktop)

To verify that you have Docker installed, run the following commands:
```
docker --version
docker compose version
```

In order to use the Docker iamge and running the application, you need to open Docker Desktop. Docker Desktop must be running whenever you want to run the application. 

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

### General Docker Comamnds
Please note that these commands have already been integrated in to the Makefile and Powershell script mentioned above. These commands are here for documentation purposes only.

#### Build the Docker Image (Using Docker Commands)
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
