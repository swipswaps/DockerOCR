/**
 * Docker Health Monitoring Service
 * 
 * Provides self-healing Docker connectivity with automatic:
 * - Health checking
 * - Retry logic
 * - Fallback to Tesseract.js
 * - User guidance
 */

export interface DockerHealthStatus {
  isHealthy: boolean;
  isAvailable: boolean;
  lastChecked: Date;
  error?: string;
  retryCount: number;
  autoRecoveryAttempted: boolean;
}

export interface DockerHealthCallback {
  onHealthy?: () => void;
  onUnhealthy?: (status: DockerHealthStatus) => void;
  onRecovered?: () => void;
}

class DockerHealthService {
  private healthStatus: DockerHealthStatus = {
    isHealthy: false,
    isAvailable: false,
    lastChecked: new Date(),
    retryCount: 0,
    autoRecoveryAttempted: false
  };

  private checkInterval: NodeJS.Timeout | null = null;
  private callbacks: DockerHealthCallback[] = [];
  private readonly CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  /**
   * Start monitoring Docker health
   */
  startMonitoring(callback?: DockerHealthCallback): void {
    if (callback) {
      this.callbacks.push(callback);
    }

    // Initial check
    this.checkHealth();

    // Set up periodic checks
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkHealth();
      }, this.CHECK_INTERVAL_MS);
    }
  }

  /**
   * Stop monitoring Docker health
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check Docker health with automatic retry
   */
  async checkHealth(): Promise<DockerHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const wasUnhealthy = !this.healthStatus.isHealthy;
        
        this.healthStatus = {
          isHealthy: true,
          isAvailable: true,
          lastChecked: new Date(),
          retryCount: 0,
          autoRecoveryAttempted: false
        };

        // Notify recovery if it was previously unhealthy
        if (wasUnhealthy) {
          this.notifyRecovered();
        } else {
          this.notifyHealthy();
        }

        return this.healthStatus;
      } else {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    } catch (error) {
      return this.handleHealthCheckFailure(error);
    }
  }

  /**
   * Handle health check failure with retry logic
   */
  private async handleHealthCheckFailure(error: any): Promise<DockerHealthStatus> {
    this.healthStatus.retryCount++;
    this.healthStatus.isHealthy = false;
    this.healthStatus.lastChecked = new Date();
    this.healthStatus.error = error.message || 'Docker connection failed';

    // Attempt auto-recovery if not already attempted
    if (!this.healthStatus.autoRecoveryAttempted && this.healthStatus.retryCount <= this.MAX_RETRIES) {
      console.log(`🔄 Docker health check failed (attempt ${this.healthStatus.retryCount}/${this.MAX_RETRIES}). Retrying...`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
      
      // Retry
      return this.checkHealth();
    }

    // Max retries reached
    if (this.healthStatus.retryCount > this.MAX_RETRIES) {
      this.healthStatus.isAvailable = false;
      this.healthStatus.autoRecoveryAttempted = true;
      console.warn('⚠️  Docker unavailable after max retries. Falling back to Tesseract.js');
      this.notifyUnhealthy();
    }

    return this.healthStatus;
  }

  /**
   * Get current health status
   */
  getStatus(): DockerHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Force a health check
   */
  async forceCheck(): Promise<DockerHealthStatus> {
    this.healthStatus.retryCount = 0;
    this.healthStatus.autoRecoveryAttempted = false;
    return this.checkHealth();
  }

  // Notification methods
  private notifyHealthy(): void {
    this.callbacks.forEach(cb => cb.onHealthy?.());
  }

  private notifyUnhealthy(): void {
    this.callbacks.forEach(cb => cb.onUnhealthy?.(this.healthStatus));
  }

  private notifyRecovered(): void {
    console.log('✅ Docker connection recovered!');
    this.callbacks.forEach(cb => cb.onRecovered?.());
  }
}

// Singleton instance
export const dockerHealthService = new DockerHealthService();

