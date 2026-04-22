/**
 * Port availability utility for Node.js - finds an available port.
 * Usage: node find-available-port.js [preferred_port] [preferred_port2] ...
 * Exit code: Port number on success, 1 on failure
 */

import net from 'net';

/**
 * Check if a port is available
 * @param {number} port - Port number to check
 * @param {string} host - Host to bind to (default: '0.0.0.0')
 * @returns {Promise<boolean>} - True if port is available
 */
async function isPortAvailable(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, host);
  });
}

/**
 * Find the first available port from a list
 * @param {number[]} preferredPorts - List of ports to try
 * @returns {Promise<number|null>} - First available port or null
 */
async function findAvailablePort(preferredPorts) {
  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

// Main execution
async function main() {
  let preferredPorts = [3000, 3001, 3002, 3003, 3004];

  // Parse ports from command line arguments
  if (process.argv.length > 2) {
    preferredPorts = process.argv.slice(2).map(Number);
  }

  const availablePort = await findAvailablePort(preferredPorts);

  if (availablePort !== null) {
    console.log(availablePort);
    process.exit(0);
  } else {
    console.error(`ERROR: None of the preferred ports are available: ${preferredPorts.join(', ')}`);
    process.exit(1);
  }
}

main();
