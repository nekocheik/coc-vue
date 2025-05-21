/**
 * Port manager for tests
 * This module handles dynamic port allocation for test servers
 * Enhanced version with robust error handling and conflict management
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const PORT_RANGE_START = 9100;
const PORT_RANGE_END = 9999;
const PORT_FILE = path.join(__dirname, '../.test-ports.json');
const LOCK_FILE = path.join(__dirname, '../.port-manager.lock');
const PORT_ALLOCATION_RETRIES = 10;
const PORT_CHECK_TIMEOUT = 1000; // ms

// Enable verbose mode if environment variable is set
const VERBOSE = process.env.VERBOSE_LOGS === 'true';

// Function to log with timestamp
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[PortManager ${timestamp}] ${message}`;
  
  if (isError) {
    console.error(logMessage);
  } else if (VERBOSE) {
    console.log(logMessage);
  }
}

// Create a lock to avoid concurrent access
function acquireLock(retries = 10, delay = 200) {
  return new Promise((resolve, reject) => {
    const tryAcquire = (attempt) => {
      try {
        // Check if lock exists
        if (fs.existsSync(LOCK_FILE)) {
          try {
            // Check if lock is expired (more than 30 seconds)
            const stats = fs.statSync(LOCK_FILE);
            const lockAge = Date.now() - stats.mtimeMs;
            
            // Read lock content to get information about the process that holds it
            let lockInfo = {};
            try {
              const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
              lockInfo = JSON.parse(lockContent);
            } catch (readErr) {
              // If we can't read the lock, assume it's corrupted
              log(`Corrupted lock detected, removing...`);
              try {
                fs.unlinkSync(LOCK_FILE);
              } catch (unlinkErr) {
                // Ignore errors during removal
              }
            }
            
            // Check if the process that holds the lock is still running
            if (lockInfo.pid) {
              try {
                process.kill(lockInfo.pid, 0); // Check if process exists without stopping it
                
                // Process still exists
                if (lockAge > 30000) {
                  // But lock is expired, remove it
                  log(`Expired lock detected (${Math.round(lockAge / 1000)}s), removing...`);
                  try {
                    fs.unlinkSync(LOCK_FILE);
                  } catch (unlinkErr) {
                    // Ignore errors during removal
                  }
                } else if (attempt < retries) {
                  // Lock is valid and recent, wait and retry
                  if (VERBOSE) {
                    log(`Lock held by process ${lockInfo.pid}, waiting (attempt ${attempt + 1}/${retries})...`);
                  }
                  setTimeout(() => tryAcquire(attempt + 1), delay);
                  return;
                } else {
                  return reject(new Error(`Unable to acquire lock after ${retries} attempts, held by process ${lockInfo.pid}`));
                }
              } catch (e) {
                // Process no longer exists, remove the lock
                log(`Lock held by process ${lockInfo.pid} that no longer exists, removing...`);
                try {
                  fs.unlinkSync(LOCK_FILE);
                } catch (unlinkErr) {
                  // Ignore errors during removal
                }
              }
            } else if (lockAge > 10000) {
              // Lock without PID and old, remove it
              log(`Lock without PID and old (${Math.round(lockAge / 1000)}s), removing...`);
              try {
                fs.unlinkSync(LOCK_FILE);
              } catch (unlinkErr) {
                // Ignore errors during removal
              }
            } else if (attempt < retries) {
              // Lock without PID but recent, wait and retry
              setTimeout(() => tryAcquire(attempt + 1), delay);
              return;
            } else {
              return reject(new Error(`Unable to acquire lock after ${retries} attempts`));
            }
          } catch (statErr) {
            // Error checking lock, assume it's corrupted
            log(`Error checking lock: ${statErr.message}, removing...`);
            try {
              fs.unlinkSync(LOCK_FILE);
            } catch (unlinkErr) {
              // Ignore errors during removal
            }
          }
        }
        
        // Create lock
        const lockData = {
          pid: process.pid,
          hostname: os.hostname(),
          timestamp: Date.now(),
          user: os.userInfo().username
        };
        
        try {
          fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
          if (VERBOSE) {
            log(`Lock acquired by process ${process.pid}`);
          }
          resolve();
        } catch (writeErr) {
          if (attempt < retries) {
            log(`Error writing lock: ${writeErr.message}, retrying...`);
            setTimeout(() => tryAcquire(attempt + 1), delay);
          } else {
            reject(new Error(`Error writing lock: ${writeErr.message}`));
          }
        }
      } catch (err) {
        if (attempt < retries) {
          // Wait and retry
          setTimeout(() => tryAcquire(attempt + 1), delay);
        } else {
          reject(new Error(`Error acquiring lock: ${err.message}`));
        }
      }
    };
    
    tryAcquire(0);
  });
}

// Release lock
function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      // Check if lock belongs to this process
      try {
        const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
        const lockInfo = JSON.parse(lockContent);
        
        if (lockInfo.pid === process.pid) {
          // Lock belongs to this process, we can remove it
          fs.unlinkSync(LOCK_FILE);
          if (VERBOSE) {
            log(`Lock released by process ${process.pid}`);
          }
        } else {
          // Lock belongs to another process, don't remove it
          log(`Attempt to release lock owned by process ${lockInfo.pid} by process ${process.pid}`, true);
        }
      } catch (readErr) {
        // If we can't read the lock, assume it's corrupted and remove it
        log(`Corrupted lock detected during release, removing...`);
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch (unlinkErr) {
          // Ignore errors during removal
        }
      }
    }
  } catch (err) {
    log(`Error releasing lock: ${err.message}`, true);
  }
}

// Initialize port file if it doesn't exist
async function initPortFile() {
  try {
    await acquireLock();
    
    if (!fs.existsSync(PORT_FILE)) {
      log('Creating port file...');
      fs.writeFileSync(PORT_FILE, JSON.stringify({
        activePorts: {},
        usedPorts: [],
        lastUpdated: Date.now()
      }, null, 2));
    }
  } catch (err) {
    log(`Error initializing port file: ${err.message}`, true);
  } finally {
    releaseLock();
  }
}

// Initialize port file at startup
initPortFile();

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    // Add timeout to avoid blocking indefinitely
    const timeout = setTimeout(() => {
      // If timeout is reached, consider the port unavailable
      try {
        if (server) server.close();
      } catch (err) {
        // Ignore errors during closure
      }
      log(`Timeout reached while checking port ${port}`, true);
      resolve(false);
    }, PORT_CHECK_TIMEOUT);
    
    const server = net.createServer();
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      if (VERBOSE) {
        log(`Port ${port} is not available: ${err.message}`);
      }
      resolve(false);
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close();
      if (VERBOSE) {
        log(`Port ${port} is available`);
      }
      resolve(true);
    });
    
    try {
      server.listen(port);
    } catch (err) {
      clearTimeout(timeout);
      log(`Error while opening port ${port}: ${err.message}`, true);
      resolve(false);
    }
  });
}

/**
 * Check if a port is used by a system process
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if port is used
 */
async function isPortUsedBySystem(port) {
  try {
    // Use lsof to check if the port is used
    const command = `lsof -i :${port} -t`;
    const result = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    
    // If a result is returned, the port is used
    return result.trim().length > 0;
  } catch (err) {
    // If lsof returns an error, it generally means no process is using this port
    return false;
  }
}

/**
 * Find an available port in the specified range
 * @returns {Promise<number>} - Available port
 */
async function findAvailablePort() {
  try {
    await acquireLock();
    
    // Read already used ports
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      // If file is corrupted or doesn't exist, reset it
      log(`Error reading port file, resetting: ${err.message}`, true);
      portData = {
        activePorts: {},
        usedPorts: [],
        lastUpdated: Date.now()
      };
      fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
    }
    
    const activePorts = Object.keys(portData.activePorts).map(Number);
    const usedPorts = portData.usedPorts.map(info => info.port);
    
    // Create a list of ports to avoid
    const portsToAvoid = new Set([...activePorts, ...usedPorts]);
    
    // Function to check if a port is really available
    async function isPortReallyAvailable(port) {
      // First, check if the port is used by the system
      if (await isPortUsedBySystem(port)) {
        if (VERBOSE) log(`Port ${port} is used by the system`);
        return false;
      }
      
      // Then, check if the port is available for listening
      if (!await isPortAvailable(port)) {
        if (VERBOSE) log(`Port ${port} is not available for listening`);
        return false;
      }
      
      return true;
    }
    
    // Try random ports in the range
    const attemptedPorts = new Set();
    for (let attempt = 0; attempt < PORT_ALLOCATION_RETRIES; attempt++) {
      // Generate a random port in the range
      let port;
      let attempts = 0;
      do {
        port = Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START + 1)) + PORT_RANGE_START;
        attempts++;
      } while (portsToAvoid.has(port) || attemptedPorts.has(port) && attempts < 20);
      
      // Mark this port as attempted
      attemptedPorts.add(port);
      
      if (VERBOSE) log(`Attempting to allocate port ${port} (attempt ${attempt + 1}/${PORT_ALLOCATION_RETRIES})`);
      
      // Check if the port is really available
      if (await isPortReallyAvailable(port)) {
        log(`Port ${port} allocated successfully`);
        return port;
      }
    }
    
    // If no port is found after multiple attempts, sequentially search
    log(`No random port available, sequential search...`, true);
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      if (!portsToAvoid.has(port) && await isPortReallyAvailable(port)) {
        log(`Port ${port} allocated after sequential search`);
        return port;
      }
    }
    
    throw new Error('Unable to find a port available in the specified range');
  } catch (err) {
    log(`Error finding available port: ${err.message}`, true);
    throw err;
  } finally {
    releaseLock();
  }
}

/**
 * Allocate a port for a specific service
 * @param {string} serviceName - Name of the service that will use the port
 * @param {number} [preferredPort] - Preferred port (optional)
 * @returns {Promise<number>} - Allocated port
 */
async function allocatePort(serviceName, preferredPort = null) {
  try {
    // Check if the service already has a port allocated
    const existingPort = await getServicePort(serviceName);
    if (existingPort) {
      log(`Service "${serviceName}" already uses port ${existingPort}`);
      return existingPort;
    }
    
    // If a preferred port is specified, check if it's available
    if (preferredPort) {
      // Check if the port is within the allowed range
      if (preferredPort < PORT_RANGE_START || preferredPort > PORT_RANGE_END) {
        log(`Preferred port ${preferredPort} is outside the allowed range (${PORT_RANGE_START}-${PORT_RANGE_END})`, true);
      } else {
        // Check if the port is available
        if (await isPortAvailable(preferredPort) && !await isPortUsedBySystem(preferredPort)) {
          // Allocate the preferred port
          await registerPort(preferredPort, serviceName);
          log(`Preferred port ${preferredPort} allocated for service "${serviceName}"`);
          return preferredPort;
        } else {
          log(`Preferred port ${preferredPort} is not available, searching for an alternative...`);
        }
      }
    }
    
    // Find an available port
    const port = await findAvailablePort();
    
    // Register the port
    await registerPort(port, serviceName);
    
    log(`Port ${port} allocated for service "${serviceName}"`);
    return port;
  } catch (err) {
    log(`Error allocating port for "${serviceName}": ${err.message}`, true);
    throw err;
  }
}

/**
 * Register a port as being used by a service
 * @param {number} port - Port to register
 * @param {string} serviceName - Name of the service
 * @returns {Promise<void>}
 */
async function registerPort(port, serviceName) {
  try {
    await acquireLock();
    
    // Read port file
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      // If file is corrupted or doesn't exist, reset it
      portData = {
        activePorts: {},
        usedPorts: [],
        lastUpdated: Date.now()
      };
    }
    
    // Register the port
    portData.activePorts[port] = {
      service: serviceName,
      pid: process.pid,
      hostname: os.hostname(),
      timestamp: Date.now(),
      user: os.userInfo().username
    };
    
    // Update timestamp
    portData.lastUpdated = Date.now();
    
    // Write changes
    fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
  } catch (err) {
    log(`Error registering port ${port}: ${err.message}`, true);
    throw err;
  } finally {
    releaseLock();
  }
}

/**
 * Release a specific port
 * @param {number} port - Port to release
 * @returns {Promise<boolean>} - True if port was released successfully
 */
async function releasePort(port) {
  try {
    await acquireLock();
    
    // Read port file
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Error reading port file: ${err.message}`, true);
      return false;
    }
    
    // Check if the port is active
    if (portData.activePorts[port]) {
      const portInfo = portData.activePorts[port];
      
      // Move port from activePorts to usedPorts
      portData.usedPorts.push({
        port,
        ...portInfo,
        releasedAt: Date.now(),
        releasedBy: process.pid
      });
      
      // Limit the size of the used ports history
      if (portData.usedPorts.length > 100) {
        portData.usedPorts = portData.usedPorts.slice(-100);
      }
      
      // Remove port from activePorts
      delete portData.activePorts[port];
      
      // Update timestamp
      portData.lastUpdated = Date.now();
      
      // Write changes
      fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
      
      log(`Port ${port} released (service: ${portInfo.service})`);
      return true;
    } else {
      if (VERBOSE) {
        log(`Port ${port} is not active, nothing to release`);
      }
      return false;
    }
  } catch (err) {
    log(`Error releasing port ${port}: ${err.message}`, true);
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Release all ports allocated by the current process
 * @returns {Promise<number>} - Number of released ports
 */
async function releaseAllPortsForCurrentProcess() {
  try {
    await acquireLock();
    
    // Read port file
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Error reading port file: ${err.message}`, true);
      return 0;
    }
    
    // Find all ports allocated by this process
    const currentPid = process.pid;
    const portsToRelease = [];
    
    for (const [port, info] of Object.entries(portData.activePorts)) {
      if (info.pid === currentPid) {
        portsToRelease.push(parseInt(port, 10));
      }
    }
    
    // Release each port
    let releasedCount = 0;
    for (const port of portsToRelease) {
      const portInfo = portData.activePorts[port];
      
      // Move port from activePorts to usedPorts
      portData.usedPorts.push({
        port,
        ...portInfo,
        releasedAt: Date.now(),
        releasedBy: currentPid
      });
      
      // Remove port from activePorts
      delete portData.activePorts[port];
      releasedCount++;
      
      log(`Port ${port} released (service: ${portInfo.service})`);
    }
    
    // Limit the size of the used ports history
    if (portData.usedPorts.length > 100) {
      portData.usedPorts = portData.usedPorts.slice(-100);
    }
    
    // Update timestamp
    portData.lastUpdated = Date.now();
    
    // Write changes if any ports were released
    if (releasedCount > 0) {
      fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
      log(`${releasedCount} port(s) released for process ${currentPid}`);
    } else if (VERBOSE) {
      log(`No ports to release for process ${currentPid}`);
    }
    
    return releasedCount;
  } catch (err) {
    log(`Error releasing ports for current process: ${err.message}`, true);
    return 0;
  } finally {
    releaseLock();
  }
}

/**
 * Get the active port for a specific service
 * @param {string} serviceName - Name of the service
 * @returns {Promise<number|null>} - Port used by the service or null if not found
 */
async function getServicePort(serviceName) {
  try {
    await acquireLock();
    
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Error reading port file: ${err.message}`, true);
      return null;
    }
    
    // Search for the service in active ports
    for (const [port, info] of Object.entries(portData.activePorts)) {
      if (info.service === serviceName) {
        const portNumber = parseInt(port, 10);
        
        // Check if the port is still available
        if (await isPortUsedBySystem(portNumber)) {
          // Check if the process that allocated the port is still running
          try {
            process.kill(info.pid, 0); // Check if process exists without stopping it
            return portNumber;
          } catch (e) {
            // The process no longer exists, mark the port as released
            log(`The process ${info.pid} that used port ${portNumber} no longer exists, releasing port...`);
            await releasePort(portNumber);
            return null;
          }
        } else {
          // The port is no longer used by the system, release it
          log(`The port ${portNumber} is no longer used by the system, releasing...`);
          await releasePort(portNumber);
          return null;
        }
      }
    }
    
    return null;
  } catch (err) {
    log(`Error finding port for service ${serviceName}: ${err.message}`, true);
    return null;
  } finally {
    releaseLock();
  }
}

/**
 * Kill all system processes using active ports
 * @returns {Promise<number>} - Number of released ports
 */
async function killAllActivePorts() {
  try {
    await acquireLock();
    
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Error reading port file: ${err.message}`, true);
      return 0;
    }
    
    const activePorts = Object.keys(portData.activePorts).map(Number);
    
    if (activePorts.length === 0) {
      log('No active ports to release');
      return 0;
    }
    
    log(`Releasing ${activePorts.length} active ports...`);
    
    let releasedCount = 0;
    for (const port of activePorts) {
      try {
        // Check if the port is used by a process
        const portInfo = portData.activePorts[port];
        
        // Kill system processes using this port
        try {
          const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (output) {
            const pids = output.split('\n');
            for (const pid of pids) {
              try {
                const pidNum = parseInt(pid, 10);
                log(`Attempting to stop process ${pidNum} using port ${port}...`);
                
                // First, try a clean stop
                process.kill(pidNum, 'SIGTERM');
                
                // Wait a little and check if the process is still running
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                  process.kill(pidNum, 0);
                  // The process is still running, use SIGKILL
                  log(`The process ${pidNum} did not respond to SIGTERM, using SIGKILL...`);
                  process.kill(pidNum, 'SIGKILL');
                } catch (e) {
                  // The process was stopped successfully
                  log(`Process ${pidNum} stopped successfully`);
                }
              } catch (killErr) {
                log(`Error stopping process ${pid}: ${killErr.message}`, true);
              }
            }
          }
        } catch (lsofErr) {
          // Ignore lsof errors (no processes found)
        }
        
        // Mark the port as released
        await releasePort(port);
        releasedCount++;
      } catch (err) {
        log(`Error releasing port ${port}: ${err.message}`, true);
      }
    }
    
    log(`${releasedCount} ports released successfully`);
    return releasedCount;
  } catch (err) {
    log(`Error releasing active ports: ${err.message}`, true);
    return 0;
  } finally {
    releaseLock();
  }
}

/**
 * Clean all ports (active and used)
 * @returns {Promise<boolean>} - True if cleaning succeeded
 */
async function cleanupAllPorts() {
  try {
    // Kill all system processes using active ports
    await killAllActivePorts();
    
    // Acquire lock to reset file
    await acquireLock();
    
    // Reset port file
    fs.writeFileSync(PORT_FILE, JSON.stringify({
      activePorts: {},
      usedPorts: [],
      lastUpdated: Date.now(),
      cleanedAt: Date.now(),
      cleanedBy: {
        pid: process.pid,
        hostname: os.hostname(),
        user: os.userInfo().username
      }
    }, null, 2));
    
    log('All ports cleaned');
    return true;
  } catch (err) {
    log(`Error cleaning ports: ${err.message}`, true);
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Check port manager status
 * @returns {Promise<Object>} - Port manager status
 */
async function getPortManagerStatus() {
  try {
    await acquireLock();
    
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      return {
        status: 'error',
        error: `Error reading port file: ${err.message}`,
        timestamp: Date.now()
      };
    }
    
    const activePorts = Object.keys(portData.activePorts).map(Number);
    const activePortsInfo = {};
    
    // Check status of each active port
    for (const port of activePorts) {
      const info = portData.activePorts[port];
      let processStatus = 'unknown';
      
      try {
        process.kill(info.pid, 0);
        processStatus = 'running';
      } catch (e) {
        processStatus = 'terminated';
      }
      
      activePortsInfo[port] = {
        ...info,
        processStatus,
        age: Math.floor((Date.now() - info.timestamp) / 1000) // in seconds
      };
    }
    
    return {
      status: 'ok',
      activePorts: Object.keys(portData.activePorts).length,
      usedPorts: portData.usedPorts.length,
      activePortsInfo,
      lastUpdated: portData.lastUpdated,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      status: 'error',
      error: `Error checking port manager status: ${err.message}`,
      timestamp: Date.now()
    };
  } finally {
    releaseLock();
  }
}

// Configure process manager to release ports on exit
process.on('exit', () => {
  try {
    // Release all ports allocated by this process
    // Use execSync because we can't use async in the 'exit' handler
    const currentPid = process.pid;
    try {
      if (fs.existsSync(PORT_FILE)) {
        const portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
        let released = false;
        
        for (const [port, info] of Object.entries(portData.activePorts)) {
          if (info.pid === currentPid) {
            // Move port to usedPorts
            portData.usedPorts.push({
              port: parseInt(port, 10),
              ...info,
              releasedAt: Date.now(),
              releasedBy: currentPid,
              reason: 'process_exit'
            });
            
            // Remove port from activePorts
            delete portData.activePorts[port];
            released = true;
          }
        }
        
        if (released) {
          fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
        }
      }
    } catch (err) {
      // Ignore exit errors
    }
  } catch (err) {
    // Ignore exit errors
  }
});

// Export functions
module.exports = {
  // Main functions
  allocatePort,
  releasePort,
  getServicePort,
  killAllActivePorts,
  cleanupAllPorts,
  
  // Utility functions
  isPortAvailable,
  isPortUsedBySystem,
  releaseAllPortsForCurrentProcess,
  getPortManagerStatus,
  
  // Constants
  PORT_RANGE_START,
  PORT_RANGE_END
};
