import { MemoryFeature } from '../MemoryFeature';
import type { WebContents } from 'electron';

export interface DOMOptimizationStats {
  elementsOptimized: number;
  memorySaved: number;
  lastOptimization: number;
  optimizationTypes: {
    hiddenElements: number;
    offscreenImages: number;
    unusedStyles: number;
    detachedNodes: number;
    largeTextNodes: number;
  };
}

/**
 * DOM Optimization feature that reduces memory usage by optimizing page content.
 * Removes unnecessary DOM elements, optimizes images, and cleans up unused styles.
 */
export class DOMOptimization extends MemoryFeature {
  private optimizationInterval: NodeJS.Timeout | null = null;
  private webContentsList = new Map<string, WebContents>();
  private optimizationStats = new Map<string, DOMOptimizationStats>();
  private lastOptimizationTime = 0;
  private minOptimizationInterval = 2 * 60 * 1000; // 2 minutes minimum

  getName(): string {
    return 'DOMOptimization';
  }

  protected async onEnable(): Promise<void> {
    this.startOptimization();
    console.log('[DOMOptimization] Enabled with periodic optimization');
  }

  protected async onDisable(): Promise<void> {
    this.stopOptimization();
    this.webContentsList.clear();
    this.optimizationStats.clear();
  }

  protected async onApplyToWebContents(webContents: WebContents, serverUrl: string): Promise<void> {
    this.webContentsList.set(serverUrl, webContents);
    
    // Initialize stats for this URL
    this.optimizationStats.set(serverUrl, {
      elementsOptimized: 0,
      memorySaved: 0,
      lastOptimization: 0,
      optimizationTypes: {
        hiddenElements: 0,
        offscreenImages: 0,
        unusedStyles: 0,
        detachedNodes: 0,
        largeTextNodes: 0
      }
    });
    
    // Inject DOM optimization script
    try {
      await webContents.executeJavaScript(`
        // DOM Optimization utilities
        (function() {
          window.__domOptimization = {
            // Remove hidden elements that have been invisible for a while
            removeHiddenElements: function() {
              let removed = 0;
              const elements = document.querySelectorAll('*');
              
              elements.forEach(el => {
                if (!el.offsetParent && 
                    !el.querySelector('img, video, audio, iframe') &&
                    el.tagName !== 'SCRIPT' && 
                    el.tagName !== 'STYLE' &&
                    el.tagName !== 'HEAD' &&
                    el.tagName !== 'META' &&
                    el.tagName !== 'LINK' &&
                    !el.closest('head')) {
                  
                  // Mark for potential removal
                  el.dataset.hiddenSince = el.dataset.hiddenSince || Date.now();
                  
                  // Remove if hidden for more than 5 minutes
                  if (Date.now() - parseInt(el.dataset.hiddenSince) > 300000) {
                    el.remove();
                    removed++;
                  }
                }
              });
              
              return removed;
            },
            
            // Lazy load off-screen images
            optimizeImages: function() {
              let optimized = 0;
              const images = document.querySelectorAll('img[src]');
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;
              
              images.forEach(img => {
                const rect = img.getBoundingClientRect();
                
                // If image is far outside viewport
                if (rect.bottom < -1000 || rect.top > viewportHeight + 1000 ||
                    rect.right < -1000 || rect.left > viewportWidth + 1000) {
                  
                  // Store original src and clear it
                  if (!img.dataset.optimizedSrc) {
                    img.dataset.optimizedSrc = img.src;
                    img.src = '';
                    img.style.visibility = 'hidden';
                    optimized++;
                  }
                } else if (img.dataset.optimizedSrc) {
                  // Restore image if it's near viewport
                  img.src = img.dataset.optimizedSrc;
                  img.style.visibility = '';
                  delete img.dataset.optimizedSrc;
                }
              });
              
              return optimized;
            },
            
            // Remove unused style rules
            cleanupStyles: function() {
              let removed = 0;
              
              try {
                const stylesheets = document.styleSheets;
                
                for (let i = 0; i < stylesheets.length; i++) {
                  const sheet = stylesheets[i];
                  
                  // Skip cross-origin stylesheets
                  if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                    const rules = sheet.cssRules || sheet.rules;
                    
                    // Check each rule
                    for (let j = rules.length - 1; j >= 0; j--) {
                      const rule = rules[j];
                      
                      if (rule.selectorText) {
                        // Check if selector matches any element
                        try {
                          const matches = document.querySelectorAll(rule.selectorText);
                          if (matches.length === 0) {
                            sheet.deleteRule(j);
                            removed++;
                          }
                        } catch (e) {
                          // Invalid selector, skip
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Security restrictions on stylesheets
              }
              
              return removed;
            },
            
            // Clean up detached DOM nodes
            cleanDetachedNodes: function() {
              if (typeof gc === 'function') {
                // Force garbage collection if available
                gc();
                return 1;
              }
              return 0;
            },
            
            // Optimize large text nodes
            optimizeTextNodes: function() {
              let optimized = 0;
              const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              let node;
              while (node = walker.nextNode()) {
                // Trim excessive whitespace
                if (node.nodeValue && node.nodeValue.length > 1000) {
                  const trimmed = node.nodeValue.replace(/\\s+/g, ' ').trim();
                  if (trimmed.length < node.nodeValue.length * 0.9) {
                    node.nodeValue = trimmed;
                    optimized++;
                  }
                }
              }
              
              return optimized;
            },
            
            // Main optimization function
            optimize: function() {
              const stats = {
                hiddenElements: 0,
                offscreenImages: 0,
                unusedStyles: 0,
                detachedNodes: 0,
                largeTextNodes: 0
              };
              
              // Only run if page is not actively being used
              if (document.hidden || Date.now() - window.__lastInteraction > 60000) {
                stats.hiddenElements = this.removeHiddenElements();
                stats.offscreenImages = this.optimizeImages();
                stats.unusedStyles = this.cleanupStyles();
                stats.detachedNodes = this.cleanDetachedNodes();
                stats.largeTextNodes = this.optimizeTextNodes();
              }
              
              return stats;
            }
          };
          
          // Track user interaction
          window.__lastInteraction = Date.now();
          ['click', 'keydown', 'scroll', 'mousemove'].forEach(event => {
            window.addEventListener(event, () => {
              window.__lastInteraction = Date.now();
            }, { passive: true, capture: true });
          });
          
          // Restore optimized images when they come into view
          const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.optimizedSrc) {
                  img.src = img.dataset.optimizedSrc;
                  img.style.visibility = '';
                  delete img.dataset.optimizedSrc;
                }
              }
            });
          }, { rootMargin: '100px' });
          
          // Observe all images
          document.querySelectorAll('img').forEach(img => {
            imageObserver.observe(img);
          });
          
          // Re-observe new images
          const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
              mutation.addedNodes.forEach(node => {
                if (node.tagName === 'IMG') {
                  imageObserver.observe(node);
                }
                if (node.querySelectorAll) {
                  node.querySelectorAll('img').forEach(img => {
                    imageObserver.observe(img);
                  });
                }
              });
            });
          });
          
          mutationObserver.observe(document.body, { childList: true, subtree: true });
        })();
      `);
    } catch (error) {
      // WebContents might not be ready
    }
    
    console.log(`[DOMOptimization] Applied to WebContents for ${serverUrl}`);
  }

  protected async onSystemResume(): Promise<void> {
    // Optimize all WebContents after system resume
    console.log('[DOMOptimization] Optimizing after system resume');
    await this.optimizeAllWebContents();
  }

  private startOptimization(): void {
    if (this.optimizationInterval) {
      return;
    }

    // Run optimization every 2 minutes
    this.optimizationInterval = setInterval(async () => {
      await this.optimizeAllWebContents();
    }, 120000);
  }

  private stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
  }

  private async optimizeAllWebContents(): Promise<void> {
    const now = Date.now();
    
    // Check minimum interval
    if (now - this.lastOptimizationTime < this.minOptimizationInterval) {
      return;
    }
    
    for (const [url, webContents] of this.webContentsList) {
      if (webContents.isDestroyed()) {
        this.webContentsList.delete(url);
        continue;
      }
      
      await this.optimizeWebContents(url, webContents);
    }
    
    this.lastOptimizationTime = now;
  }

  private async optimizeWebContents(url: string, webContents: WebContents): Promise<void> {
    try {
      // Get memory before optimization
      const memoryBefore = await this.getWebContentsMemory(webContents);
      
      // Run optimization
      const result = await webContents.executeJavaScript(`
        (function() {
          if (window.__domOptimization) {
            return window.__domOptimization.optimize();
          }
          return null;
        })();
      `);
      
      if (result) {
        // Get memory after optimization
        const memoryAfter = await this.getWebContentsMemory(webContents);
        const memorySaved = Math.max(0, memoryBefore - memoryAfter);
        
        // Update stats
        const stats = this.optimizationStats.get(url) || this.createEmptyStats();
        stats.elementsOptimized += Object.values(result).reduce((a, b) => a + b, 0);
        stats.memorySaved += memorySaved;
        stats.lastOptimization = Date.now();
        
        // Update optimization type counts
        stats.optimizationTypes.hiddenElements += result.hiddenElements || 0;
        stats.optimizationTypes.offscreenImages += result.offscreenImages || 0;
        stats.optimizationTypes.unusedStyles += result.unusedStyles || 0;
        stats.optimizationTypes.detachedNodes += result.detachedNodes || 0;
        stats.optimizationTypes.largeTextNodes += result.largeTextNodes || 0;
        
        this.optimizationStats.set(url, stats);
        
        // Update metrics
        this.metrics.memorySaved += memorySaved;
        this.metrics.activations++;
        this.metrics.lastRun = Date.now();
        
        // Log significant optimizations
        const totalOptimized = Object.values(result).reduce((a, b) => a + b, 0);
        if (totalOptimized > 0) {
          console.log(`[DOMOptimization] Optimized ${url}:`, {
            elements: totalOptimized,
            memorySaved: `${(memorySaved / 1024 / 1024).toFixed(1)}MB`,
            details: result
          });
        }
      }
    } catch (error) {
      // Page might have navigated or script execution failed
    }
  }

  private async getWebContentsMemory(webContents: WebContents): Promise<number> {
    try {
      const result = await webContents.executeJavaScript(`
        performance.memory ? performance.memory.usedJSHeapSize : 0
      `);
      return result || 0;
    } catch {
      return 0;
    }
  }

  private createEmptyStats(): DOMOptimizationStats {
    return {
      elementsOptimized: 0,
      memorySaved: 0,
      lastOptimization: 0,
      optimizationTypes: {
        hiddenElements: 0,
        offscreenImages: 0,
        unusedStyles: 0,
        detachedNodes: 0,
        largeTextNodes: 0
      }
    };
  }

  /**
   * Get optimization statistics for all URLs
   */
  getOptimizationStats(): Map<string, DOMOptimizationStats> {
    return new Map(this.optimizationStats);
  }

  /**
   * Force immediate optimization
   */
  async forceOptimization(): Promise<void> {
    this.lastOptimizationTime = 0; // Reset interval check
    await this.optimizeAllWebContents();
  }

  /**
   * Get total elements optimized
   */
  getTotalElementsOptimized(): number {
    let total = 0;
    for (const stats of this.optimizationStats.values()) {
      total += stats.elementsOptimized;
    }
    return total;
  }
}