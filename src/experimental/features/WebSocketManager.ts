import { MemoryFeature } from '../MemoryFeature';
import type { WebContents } from 'electron';

export interface WebSocketInfo {
  url: string;
  readyState: number;
  bufferedAmount: number;
  protocol: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
}

export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  closedConnections: number;
  reconnections: number;
  dataTransferred: number;
  lastCleanup: number;
}

/**
 * WebSocket Manager feature that manages WebSocket connections
 * to prevent connection leaks and reduce memory usage.
 */
export class WebSocketManager extends MemoryFeature {
  private monitorInterval: NodeJS.Timeout | null = null;
  private webContentsList = new Map<string, WebContents>();
  private websocketStats = new Map<string, WebSocketStats>();
  private connectionHistory = new Map<string, WebSocketInfo[]>();
  private readonly MAX_IDLE_TIME = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RECONNECT_ATTEMPTS = 3;

  getName(): string {
    return 'WebSocketManager';
  }

  protected async onEnable(): Promise<void> {
    this.startMonitoring();
    console.log('[WebSocketManager] Enabled with connection monitoring');
  }

  protected async onDisable(): Promise<void> {
    this.stopMonitoring();
    this.webContentsList.clear();
    this.websocketStats.clear();
    this.connectionHistory.clear();
  }

  protected async onApplyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    this.webContentsList.set(serverUrl, webContents);
    
    // Initialize stats for this URL
    this.websocketStats.set(serverUrl, {
      totalConnections: 0,
      activeConnections: 0,
      closedConnections: 0,
      reconnections: 0,
      dataTransferred: 0,
      lastCleanup: 0
    });
    
    // Inject WebSocket management script
    try {
      await webContents.executeJavaScript(`
        // WebSocket Manager
        (function() {
          // Store original WebSocket constructor
          const OriginalWebSocket = window.WebSocket;
          const managedSockets = new Map();
          let socketIdCounter = 0;
          
          // Override WebSocket constructor
          window.WebSocket = function(url, protocols) {
            const socketId = ++socketIdCounter;
            const socket = new OriginalWebSocket(url, protocols);
            const socketInfo = {
              id: socketId,
              url: url,
              createdAt: Date.now(),
              lastActivity: Date.now(),
              messageCount: 0,
              bufferedAmount: 0,
              reconnectAttempts: 0,
              originalHandlers: {
                open: null,
                close: null,
                message: null,
                error: null
              }
            };
            
            managedSockets.set(socket, socketInfo);
            
            // Track activity
            const updateActivity = () => {
              socketInfo.lastActivity = Date.now();
              socketInfo.messageCount++;
            };
            
            // Wrap event handlers
            const wrapHandler = (event, handler) => {
              return function(...args) {
                updateActivity();
                if (handler) {
                  return handler.apply(this, args);
                }
              };
            };
            
            // Override addEventListener
            const originalAddEventListener = socket.addEventListener;
            socket.addEventListener = function(event, handler, options) {
              if (['message', 'open', 'close', 'error'].includes(event)) {
                handler = wrapHandler(event, handler);
              }
              return originalAddEventListener.call(this, event, handler, options);
            };
            
            // Track onmessage, onopen, etc.
            ['onmessage', 'onopen', 'onclose', 'onerror'].forEach(prop => {
              Object.defineProperty(socket, prop, {
                get() {
                  return socketInfo.originalHandlers[prop.substring(2)];
                },
                set(handler) {
                  socketInfo.originalHandlers[prop.substring(2)] = wrapHandler(prop.substring(2), handler);
                }
              });
            });
            
            // Auto-reconnect on unexpected close
            socket.addEventListener('close', (event) => {
              if (!event.wasClean && socketInfo.reconnectAttempts < 3) {
                console.log(\`[WebSocketManager] Reconnecting WebSocket to \${url}\`);
                setTimeout(() => {
                  socketInfo.reconnectAttempts++;
                  const newSocket = new window.WebSocket(url, protocols);
                  
                  // Copy handlers
                  Object.keys(socketInfo.originalHandlers).forEach(event => {
                    if (socketInfo.originalHandlers[event]) {
                      newSocket.addEventListener(event, socketInfo.originalHandlers[event]);
                    }
                  });
                  
                  managedSockets.delete(socket);
                  managedSockets.set(newSocket, socketInfo);
                }, Math.min(1000 * Math.pow(2, socketInfo.reconnectAttempts), 10000));
              } else {
                managedSockets.delete(socket);
              }
            });
            
            console.log(\`[WebSocketManager] New WebSocket connection to \${url}\`);
            return socket;
          };
          
          // Copy static properties
          Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
          Object.setPrototypeOf(window.WebSocket.prototype, OriginalWebSocket.prototype);
          
          // Cleanup idle connections
          window.__websocketManager = {
            getConnections: function() {
              const connections = [];
              managedSockets.forEach((info, socket) => {
                connections.push({
                  url: info.url,
                  readyState: socket.readyState,
                  bufferedAmount: socket.bufferedAmount || 0,
                  protocol: socket.protocol || '',
                  createdAt: info.createdAt,
                  lastActivity: info.lastActivity,
                  messageCount: info.messageCount
                });
              });
              return connections;
            },
            
            cleanupIdleConnections: function() {
              const now = Date.now();
              let cleaned = 0;
              
              managedSockets.forEach((info, socket) => {
                // Close idle connections (5+ minutes inactive)
                if (socket.readyState === WebSocket.OPEN && 
                    now - info.lastActivity > 300000 &&
                    socket.bufferedAmount === 0) {
                  
                  console.log(\`[WebSocketManager] Closing idle connection to \${info.url}\`);
                  socket.close(1000, 'Idle connection cleanup');
                  cleaned++;
                }
                
                // Remove closed connections from tracking
                if (socket.readyState === WebSocket.CLOSED) {
                  managedSockets.delete(socket);
                }
              });
              
              return cleaned;
            },
            
            forceReconnect: function(urlPattern) {
              let reconnected = 0;
              
              managedSockets.forEach((info, socket) => {
                if (info.url.includes(urlPattern) && socket.readyState === WebSocket.OPEN) {
                  console.log(\`[WebSocketManager] Force reconnecting to \${info.url}\`);
                  socket.close(1000, 'Force reconnect');
                  
                  // Trigger reconnect
                  setTimeout(() => {
                    const newSocket = new window.WebSocket(info.url);
                    Object.keys(info.originalHandlers).forEach(event => {
                      if (info.originalHandlers[event]) {
                        newSocket.addEventListener(event, info.originalHandlers[event]);
                      }
                    });
                  }, 100);
                  
                  reconnected++;
                }
              });
              
              return reconnected;
            },
            
            getStats: function() {
              let active = 0;
              let buffered = 0;
              
              managedSockets.forEach((info, socket) => {
                if (socket.readyState === WebSocket.OPEN) {
                  active++;
                  buffered += socket.bufferedAmount || 0;
                }
              });
              
              return {
                total: managedSockets.size,
                active: active,
                bufferedData: buffered
              };
            }
          };
          
          // Periodic cleanup
          setInterval(() => {
            window.__websocketManager.cleanupIdleConnections();
          }, 60000); // Every minute
        })();
      `);
    } catch (error) {
      // WebContents might not be ready
    }
    
    console.log(`[WebSocketManager] Applied to WebContents for ${serverUrl}`);
  }

  protected async onSystemSleep(): Promise<void> {
    console.log('[WebSocketManager] 😴 System going to sleep, closing all WebSocket connections');
    await this.closeAllConnections();
  }

  protected async onSystemResume(): Promise<void> {
    console.log('[WebSocketManager] 🌅 System resumed, reconnecting WebSockets');
    await this.reconnectAllConnections();
  }

  private startMonitoring(): void {
    if (this.monitorInterval) {
      return;
    }

    // Monitor every 30 seconds
    this.monitorInterval = setInterval(async () => {
      await this.monitorConnections();
    }, 30000);
  }

  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private async monitorConnections(): Promise<void> {
    console.log(`[WebSocketManager] 🔌 Monitoring ${this.webContentsList.size} WebContents for WebSocket connections`);
    
    for (const [url, webContents] of this.webContentsList) {
      if (webContents.isDestroyed()) {
        this.webContentsList.delete(url);
        continue;
      }
      
      try {
        // Get current WebSocket connections
        const connections = await webContents.executeJavaScript(`
          window.__websocketManager ? window.__websocketManager.getConnections() : []
        `);
        
        // Update connection history
        this.connectionHistory.set(url, connections || []);
        
        // Get stats
        const stats = await webContents.executeJavaScript(`
          window.__websocketManager ? window.__websocketManager.getStats() : { total: 0, active: 0, bufferedData: 0 }
        `);
        
        // Update stats
        const currentStats = this.websocketStats.get(url) || this.createEmptyStats();
        currentStats.activeConnections = stats.active || 0;
        currentStats.totalConnections = Math.max(currentStats.totalConnections, stats.total || 0);
        this.websocketStats.set(url, currentStats);
        
        if (stats.active > 0) {
          console.log(`[WebSocketManager] 📊 ${url}: ${stats.active} active connections`);
        }
        
        // Log if there are issues
        if (stats.active > 10) {
          console.warn(`[WebSocketManager] ⚠️ HIGH CONNECTION COUNT for ${url}: ${stats.active} active connections!`);
        }
        
        if (stats.bufferedData > 1024 * 1024) { // 1MB buffered
          console.warn(`[WebSocketManager] 🔴 HIGH BUFFERED DATA for ${url}: ${(stats.bufferedData / 1024 / 1024).toFixed(1)}MB - possible memory leak!`);
        }
        
      } catch (error) {
        // Page might have navigated
      }
    }
    
    // Update metrics
    this.metrics.activations++;
    this.metrics.lastRun = Date.now();
  }

  private async closeAllConnections(): Promise<void> {
    for (const [url, webContents] of this.webContentsList) {
      if (webContents.isDestroyed()) continue;
      
      try {
        const closed = await webContents.executeJavaScript(`
          (function() {
            let closed = 0;
            if (window.__websocketManager) {
              // Get all connections
              const connections = window.__websocketManager.getConnections();
              
              // Close them all
              connections.forEach(conn => {
                if (conn.readyState === WebSocket.OPEN || conn.readyState === WebSocket.CONNECTING) {
                  closed++;
                }
              });
              
              // Force close through cleanup
              closed += window.__websocketManager.cleanupIdleConnections();
            }
            return closed;
          })();
        `);
        
        if (closed > 0) {
          console.log(`[WebSocketManager] 🔒 Closed ${closed} connections for ${url} before sleep`);
          
          const stats = this.websocketStats.get(url);
          if (stats) {
            stats.closedConnections += closed;
            stats.lastCleanup = Date.now();
          }
        } else {
          console.log(`[WebSocketManager] ✅ ${url} - No active connections to close`);
        }
        
      } catch (error) {
        // Page might not be ready
      }
    }
  }

  private async reconnectAllConnections(): Promise<void> {
    // Wait a bit for network to stabilize after resume
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    for (const [url, webContents] of this.webContentsList) {
      if (webContents.isDestroyed()) continue;
      
      try {
        // Force reconnect all WebSockets
        const reconnected = await webContents.executeJavaScript(`
          window.__websocketManager ? window.__websocketManager.forceReconnect('') : 0
        `);
        
        if (reconnected > 0) {
          console.log(`[WebSocketManager] Reconnected ${reconnected} WebSockets for ${url}`);
          
          const stats = this.websocketStats.get(url);
          if (stats) {
            stats.reconnections += reconnected;
          }
        }
        
        // Update memory saved metric
        this.metrics.memorySaved += reconnected * 100 * 1024; // Estimate 100KB per reconnected socket
        
      } catch (error) {
        // Page might not be ready
      }
    }
  }

  private createEmptyStats(): WebSocketStats {
    return {
      totalConnections: 0,
      activeConnections: 0,
      closedConnections: 0,
      reconnections: 0,
      dataTransferred: 0,
      lastCleanup: 0
    };
  }

  /**
   * Get WebSocket statistics for all URLs
   */
  getWebSocketStats(): Map<string, WebSocketStats> {
    return new Map(this.websocketStats);
  }

  /**
   * Get current connection information
   */
  getConnectionHistory(): Map<string, WebSocketInfo[]> {
    return new Map(this.connectionHistory);
  }

  /**
   * Force cleanup of idle connections
   */
  async forceCleanup(): Promise<number> {
    let totalCleaned = 0;
    
    for (const [url, webContents] of this.webContentsList) {
      if (webContents.isDestroyed()) continue;
      
      try {
        const cleaned = await webContents.executeJavaScript(`
          window.__websocketManager ? window.__websocketManager.cleanupIdleConnections() : 0
        `);
        
        totalCleaned += cleaned || 0;
        
        if (cleaned > 0) {
          const stats = this.websocketStats.get(url);
          if (stats) {
            stats.closedConnections += cleaned;
            stats.lastCleanup = Date.now();
          }
        }
      } catch (error) {
        // Page might not be ready
      }
    }
    
    if (totalCleaned > 0) {
      console.log(`[WebSocketManager] Force cleaned ${totalCleaned} idle connections`);
      this.metrics.memorySaved += totalCleaned * 50 * 1024; // Estimate 50KB per connection
    }
    
    return totalCleaned;
  }

  /**
   * Get total active connections across all WebContents
   */
  getTotalActiveConnections(): number {
    let total = 0;
    for (const stats of this.websocketStats.values()) {
      total += stats.activeConnections;
    }
    return total;
  }
}