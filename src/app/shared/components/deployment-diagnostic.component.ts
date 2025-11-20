import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AssetPathService } from '../../core/services/asset-path.service';
import { NavigationService } from '../../core/services/navigation.service';

/**
 * Deployment Diagnostic Component
 * Helps debug deployment and asset loading issues
 */
@Component({
  selector: 'app-deployment-diagnostic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="diagnostic-panel">
      <h3>Deployment Diagnostics</h3>
      
      <div class="diagnostic-section">
        <h4>Environment Information</h4>
        <ul>
          <li><strong>Base Href:</strong> {{ deploymentInfo.baseHref }}</li>
          <li><strong>Is Subdirectory:</strong> {{ deploymentInfo.isSubdirectory ? 'Yes' : 'No' }}</li>
          <li><strong>Current URL:</strong> {{ deploymentInfo.currentUrl }}</li>
          <li><strong>Origin:</strong> {{ deploymentInfo.origin }}</li>
        </ul>
      </div>

      <div class="diagnostic-section">
        <h4>Asset Path Resolution</h4>
        <ul>
          <li><strong>Learning Path JSON:</strong> {{ learningPathUrl }}</li>
          <li><strong>Sample Content Path:</strong> {{ sampleContentUrl }}</li>
        </ul>
      </div>

      <div class="diagnostic-section">
        <h4>HTTP Tests</h4>
        <button (click)="testLearningPathLoad()" [disabled]="isTestingLearningPath">
          {{ isTestingLearningPath ? 'Testing...' : 'Test Learning Path Load' }}
        </button>
        <div *ngIf="learningPathTestResult" class="test-result" 
             [class.success]="learningPathTestResult.success"
             [class.error]="!learningPathTestResult.success">
          {{ learningPathTestResult.message }}
        </div>

        <button (click)="testContentLoad()" [disabled]="isTestingContent">
          {{ isTestingContent ? 'Testing...' : 'Test Content Load' }}
        </button>
        <div *ngIf="contentTestResult" class="test-result" 
             [class.success]="contentTestResult.success"
             [class.error]="!contentTestResult.success">
          {{ contentTestResult.message }}
        </div>
      </div>

      <div class="diagnostic-section">
        <h4>Navigation Service Status</h4>
        <p><strong>Navigation Tree Loaded:</strong> {{ hasNavigationData ? 'Yes' : 'No' }}</p>
        <p><strong>Topics Count:</strong> {{ topicsCount }}</p>
      </div>
    </div>
  `,
  styles: [`
    .diagnostic-panel {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 8px;
      margin: 20px;
      background-color: #f9f9f9;
      font-family: monospace;
    }

    .diagnostic-section {
      margin-bottom: 20px;
      padding: 10px;
      background-color: white;
      border-radius: 4px;
    }

    .diagnostic-section h4 {
      margin-top: 0;
      color: #333;
    }

    .diagnostic-section ul {
      list-style-type: none;
      padding: 0;
    }

    .diagnostic-section li {
      padding: 4px 0;
      border-bottom: 1px solid #eee;
    }

    button {
      padding: 8px 16px;
      margin: 8px;
      border: 1px solid #007acc;
      background-color: #007acc;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    }

    button:disabled {
      background-color: #ccc;
      border-color: #ccc;
      cursor: not-allowed;
    }

    .test-result {
      padding: 8px;
      margin: 8px;
      border-radius: 4px;
    }

    .test-result.success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .test-result.error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  `]
})
export class DeploymentDiagnosticComponent implements OnInit {
  
  deploymentInfo: any = {};
  learningPathUrl = '';
  sampleContentUrl = '';
  hasNavigationData = false;
  topicsCount = 0;

  isTestingLearningPath = false;
  isTestingContent = false;
  learningPathTestResult: { success: boolean; message: string } | null = null;
  contentTestResult: { success: boolean; message: string } | null = null;

  constructor(
    private assetPathService: AssetPathService,
    private http: HttpClient,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.deploymentInfo = this.assetPathService.getDeploymentInfo();
    this.learningPathUrl = this.assetPathService.resolveAssetPath('assets/data/learning-path.json');
    this.sampleContentUrl = this.assetPathService.resolveAssetPath('assets/concepts/fundamentals/introduction-to-angular.md');

    // Subscribe to navigation tree to check if data is loaded
    this.navigationService.navigationTree$.subscribe(tree => {
      this.hasNavigationData = tree.length > 0;
      this.topicsCount = tree.reduce((count, node) => count + (node.children?.length || 0), 0);
    });
  }

  testLearningPathLoad(): void {
    this.isTestingLearningPath = true;
    this.learningPathTestResult = null;

    this.http.get(this.learningPathUrl).subscribe({
      next: (data) => {
        this.learningPathTestResult = {
          success: true,
          message: `✓ Successfully loaded learning path data with ${Array.isArray(data) ? data.length : 'unknown'} items`
        };
        this.isTestingLearningPath = false;
      },
      error: (error) => {
        this.learningPathTestResult = {
          success: false,
          message: `✗ Failed to load learning path: ${error.status} ${error.statusText} - ${error.url}`
        };
        this.isTestingLearningPath = false;
      }
    });
  }

  testContentLoad(): void {
    this.isTestingContent = true;
    this.contentTestResult = null;

    this.http.get(this.sampleContentUrl, { responseType: 'text' }).subscribe({
      next: (data) => {
        this.contentTestResult = {
          success: true,
          message: `✓ Successfully loaded content (${data.length} characters)`
        };
        this.isTestingContent = false;
      },
      error: (error) => {
        this.contentTestResult = {
          success: false,
          message: `✗ Failed to load content: ${error.status} ${error.statusText} - ${error.url}`
        };
        this.isTestingContent = false;
      }
    });
  }
}