# Port Fallback Functionality

## Overview

The application now includes intelligent port fallback functionality for both the backend (Django) and frontend (Vite). If a preferred port is unavailable, the services will automatically try alternate ports instead of crashing.

## How It Works

### Backend (Django)
- **Preferred port sequence**: 8000 → 8001 → 8002 → 8003 → 8004
- **Port detection**: Uses a Python utility (`find_available_port.py`) that checks which port is available
- **Error handling**: If all ports 8000-8004 are in use, the service will fail with a clear error message

### Frontend (Vite)
- **Preferred port sequence**: 3000 → 3001 → 3002 → 3003 → 3004
- **Port detection**: Uses a Node.js utility (`find-available-port.js`) that checks which port is available
- **Error handling**: If all ports 3000-3004 are in use, the service will fail with an error

## What Happens If Ports Are Unavailable

### Scenario: Port 8000 is Already in Use
```
❌ Without fallback:
   "Address already in use" → Container crashes immediately

✅ With fallback:
   Port 8000 taken? Try 8001 → Available! Service starts on 8001
   Logs show: "Available port: 8001" and "Server will be available at: http://localhost:8001"
```

### Scenario: All Fallback Ports Are in Use
```
Service logs will show:
ERROR: Could not find an available port. Ports 8000-8004 are all in use.
```
**Solution**: 
- Kill the process using those ports, or
- Modify the port sequences in the entrypoint.sh or Dockerfile

## Configuration Files

### Backend
- **Port finder**: `backend/find_available_port.py`
- **Entrypoint**: `backend/entrypoint.sh` (uses the finder)
- **Docker expose**: `docker-compose.yml` ports 8000-8004

### Frontend
- **Port finder**: `frontend/find-available-port.js`
- **Dockerfile**: `frontend/Dockerfile` (uses the finder in CMD)
- **Docker expose**: `docker-compose.yml` ports 3000-3004

## Using the Application

### Starting Services
```powershell
.\dev.ps1 run
```

The output will show which ports were actually assigned:
```
Frontend: Starting Vite on port 3000...
Backend:  Available port: 8000
```

### Checking Logs
If you want to see the actual ports being used:
```powershell
.\dev.ps1 logs-frontend
.\dev.ps1 logs-backend
```

### Manually Starting Services on Different Ports

**Backend** (inside Docker or locally):
```python
python find_available_port.py 9000 9001 9002  # Try 9000, 9001, 9002
# Returns first available port, then:
python manage.py runserver 0.0.0.0:<port>
```

**Frontend** (inside Docker or locally):
```bash
node find-available-port.js 4000 4001 4002  # Try 4000, 4001, 4002
# Returns first available port, then:
npm run dev -- --host 0.0.0.0 --port <port>
```

## Modifying Port Preferences

### To Change Backend Port Sequence
Edit `backend/entrypoint.sh`:
```bash
AVAILABLE_PORT=$(python find_available_port.py 9000 9001 9002 9003 9004)
```

Also update `docker-compose.yml` backend section to expose those ports:
```yaml
ports:
  - "9000:9000"
  - "9001:9001"
  # ... etc
```

### To Change Frontend Port Sequence
Edit `frontend/Dockerfile`:
```dockerfile
CMD sh -c 'PORT=$(node find-available-port.js 4000 4001 4002) && ...'
```

Also update `docker-compose.yml` frontend section:
```yaml
ports:
  - "4000:4000"
  - "4001:4001"
  # ... etc
```

## Port Availability Detection

### Python Version (Backend)
The `find_available_port.py` script:
1. Attempts to create a socket on each port
2. Tries to bind to the port on `0.0.0.0`
3. If successful, closes the socket and returns that port
4. If binding fails (EADDRINUSE), tries the next port

### Node.js Version (Frontend)
The `find-available-port.js` script:
1. Uses Node's `net` module to create a server
2. Attempts to listen on each port
3. If successful, closes the server and returns that port
4. If listening fails, tries the next port

Both utilities are **non-invasive** — they don't interfere with existing services, just check availability.

## Troubleshooting

### "Address already in use" Error Still Appears
**Possible causes:**
- The port detection script failed or was skipped
- The service started before the port was checked
- Race condition between services

**Solution:**
```bash
# Find what's using the port (Windows)
netstat -ano | find ":8000"
taskkill /PID <PID> /F

# Or on Linux/Mac
lsof -i :8000
kill -9 <PID>
```

### Service Won't Start on Any Port
**This means ports 8000-8004 (backend) or 3000-3004 (frontend) are all occupied.**

**Solutions:**
1. Stop other services using those ports
2. Extend the port range:
   - Edit `entrypoint.sh` or `Dockerfile`
   - Add more ports to the preference list
   - Update `docker-compose.yml` to expose them

### Frontend Can't Connect to Backend
**This is less related to ports, but might occur if:**
- Backend is on an unexpected port and frontend config hasn't been updated
- Check the backend logs to see which port it's actually using:
  ```powershell
  .\dev.ps1 logs-backend
  ```
- Update frontend API configuration if needed (check `src/config/` or service files)

## Testing Port Fallback

### Test Backend Fallback
1. Occupy port 8000:
   ```bash
   # Run any server on 8000, e.g., Python:
   python -m http.server 8000
   ```
2. Start your application:
   ```powershell
   .\dev.ps1 run
   ```
3. Check backend logs — should see "Available port: 8001"
4. Stop the test server on 8000
5. Verify your app is now accessible on port 8001

### Test Frontend Fallback
Similar process with port 3000.

## Security Considerations

The port detection happens **inside the Docker container**, so there are no security implications for the host. The utilities only check local port availability; they don't attempt to connect to external hosts or services.

## Performance Impact

Port detection adds **negligible overhead** — each port check takes milliseconds. This happens once when the service starts, not repeatedly during operation.
