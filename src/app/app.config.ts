import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/global-error-handler.service';
import { errorInterceptor, loadingInterceptor, cacheInterceptor } from './core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router configuration with performance optimizations
    provideRouter(
      routes,
      withEnabledBlockingInitialNavigation(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    ),
    
    // Animations
    provideAnimations(),
    
    // HTTP Client with interceptors
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        cacheInterceptor,
        errorInterceptor
      ])
    ),
    
    // Global error handler
    { 
      provide: ErrorHandler, 
      useClass: GlobalErrorHandler 
    }
  ]
};