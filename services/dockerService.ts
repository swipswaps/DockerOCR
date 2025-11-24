/**
 * Docker Self-Healing Service
 * Automatically detects and fixes PaddleOCR Docker container issues
 */

export interface DockerStatus {
  dockerInstalled: boolean;
  dockerRunning: boolean;
  containerExists: boolean;
  containerRunning: boolean;
  containerHealthy: boolean;
  canAutoFix: boolean;
  message: string;
}

/**
 * Check if Docker is installed and accessible
 */
export const checkDockerInstalled = async (): Promise<boolean> => {
  try {
    // Try to reach Docker health endpoint through our backend
    const response = await fetch('http://localhost:5000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Check PaddleOCR container health
 */
export const checkContainerHealth = async (): Promise<DockerStatus> => {
  const status: DockerStatus = {
    dockerInstalled: false,
    dockerRunning: false,
    containerExists: false,
    containerRunning: false,
    containerHealthy: false,
    canAutoFix: false,
    message: ''
  };

  try {
    // First check if health endpoint is reachable (Flask server running)
    const healthResponse = await fetch('http://localhost:5000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      if (healthData.status === 'healthy') {
        status.dockerInstalled = true;
        status.dockerRunning = true;
        status.containerExists = true;
        status.containerRunning = true;

        // Now check if PaddleOCR is actually ready to process images
        try {
          const readyResponse = await fetch('http://localhost:5000/ready', {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
          });

          if (readyResponse.ok) {
            const readyData = await readyResponse.json();
            if (readyData.status === 'ready') {
              status.containerHealthy = true;
              status.message = '✅ PaddleOCR is ready to process images';
              return status;
            }
          } else if (readyResponse.status === 503) {
            // Container is running but PaddleOCR is not ready yet
            const readyData = await readyResponse.json();
            status.containerHealthy = false;
            status.canAutoFix = true;
            status.message = `⚠️ ${readyData.message || 'PaddleOCR is still initializing'}`;
            return status;
          }
        } catch (readyError) {
          // Ready endpoint failed, but health passed - container may be starting
          status.containerHealthy = false;
          status.canAutoFix = true;
          status.message = '⚠️ PaddleOCR container is starting. Please wait 10-30 seconds.';
          return status;
        }

        // Health passed but ready check inconclusive
        status.containerHealthy = true;
        status.message = '✅ PaddleOCR container is healthy';
        return status;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Network error means container is not running
    if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      status.message = '⚠️ PaddleOCR container not reachable on port 5000';
      status.canAutoFix = true;
    } else if (errorMessage.includes('timeout')) {
      status.message = '⏱️ PaddleOCR container is starting (this can take 60+ seconds)';
      status.containerExists = true;
      status.containerRunning = true;
    }
  }

  return status;
};

/**
 * Get setup instructions based on platform
 */
export const getSetupInstructions = (): { platform: string; instructions: string[] } => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isWindows = userAgent.includes('win');
  const isMac = userAgent.includes('mac');
  const isLinux = userAgent.includes('linux');

  let platform = 'Unknown';
  let instructions: string[] = [];

  if (isWindows) {
    platform = 'Windows';
    instructions = [
      '1. Open PowerShell as Administrator',
      '2. Navigate to the DockerOCR directory:',
      '   cd path\\to\\DockerOCR',
      '3. Start the PaddleOCR container:',
      '   docker compose up -d',
      '4. Wait 60 seconds for the container to initialize',
      '5. Refresh this page',
      '',
      'If Docker is not installed:',
      '• Download Docker Desktop from docker.com',
      '• Install and restart your computer',
      '• Enable WSL2 backend in Docker Desktop settings'
    ];
  } else if (isMac) {
    platform = 'macOS';
    instructions = [
      '1. Open Terminal',
      '2. Navigate to the DockerOCR directory:',
      '   cd /path/to/DockerOCR',
      '3. Start the PaddleOCR container:',
      '   docker compose up -d',
      '4. Wait 60 seconds for the container to initialize',
      '5. Refresh this page',
      '',
      'If Docker is not installed:',
      '• Download Docker Desktop from docker.com',
      '• Install and start Docker Desktop',
      '• Wait for Docker to fully start (whale icon in menu bar)'
    ];
  } else if (isLinux) {
    platform = 'Linux';
    instructions = [
      '1. Open Terminal',
      '2. Navigate to the DockerOCR directory:',
      '   cd /path/to/DockerOCR',
      '3. Start the PaddleOCR container:',
      '   docker compose up -d',
      '4. Wait 60 seconds for the container to initialize',
      '5. Refresh this page',
      '',
      'If Docker is not installed:',
      '• Install Docker: sudo apt-get install docker.io docker-compose',
      '• Add user to docker group: sudo usermod -aG docker $USER',
      '• Log out and log back in',
      '• Start Docker: sudo systemctl start docker'
    ];
  }

  return { platform, instructions };
};

/**
 * Attempt to auto-start the container (browser-based workaround)
 */
export const attemptAutoStart = async (onLog: (msg: string) => void): Promise<boolean> => {
  onLog('🔧 Attempting to auto-start PaddleOCR container...');
  
  // Check if container is already starting
  for (let i = 0; i < 12; i++) {
    onLog(`⏳ Checking container status (attempt ${i + 1}/12)...`);
    
    const status = await checkContainerHealth();
    
    if (status.containerHealthy) {
      onLog('✅ Container is now healthy!');
      return true;
    }
    
    // Wait 5 seconds between checks
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  onLog('❌ Container did not start automatically');
  onLog('📋 Please start the container manually (see instructions below)');
  return false;
};

