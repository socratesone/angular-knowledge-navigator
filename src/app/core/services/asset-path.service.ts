import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Asset Path Service
 * Provides utilities for resolving asset paths in different deployment scenarios
 */
@Injectable({
  providedIn: 'root'
})
export class AssetPathService {
  
  private readonly baseHref: string;

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Get the base href from the document
    const baseElement = this.document.querySelector('base');
    this.baseHref = baseElement?.getAttribute('href') || '/';
  }

  /**
   * Resolve an asset path relative to the base href
   */
  resolveAssetPath(assetPath: string): string {
    // Remove leading slash if present to ensure relative path
    const cleanPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
    
    // For debugging purposes, log the resolution
    if (typeof console !== 'undefined') {
      console.debug(`Asset path resolution: ${assetPath} -> ${cleanPath}`, {
        originalPath: assetPath,
        resolvedPath: cleanPath,
        baseHref: this.baseHref,
        currentLocation: this.document.location.href
      });
    }
    
    return cleanPath;
  }

  /**
   * Get the current base href
   */
  getBaseHref(): string {
    return this.baseHref;
  }

  /**
   * Check if we're running in a subdirectory deployment
   */
  isSubdirectoryDeployment(): boolean {
    return this.baseHref !== '/';
  }

  /**
   * Get deployment info for debugging
   */
  getDeploymentInfo(): {
    baseHref: string;
    isSubdirectory: boolean;
    currentUrl: string;
    origin: string;
  } {
    return {
      baseHref: this.baseHref,
      isSubdirectory: this.isSubdirectoryDeployment(),
      currentUrl: this.document.location.href,
      origin: this.document.location.origin
    };
  }
}