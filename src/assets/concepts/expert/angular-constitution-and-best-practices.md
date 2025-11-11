# Angular Constitution and Best Practices

## Overview

The Angular Constitution represents a set of foundational principles and best practices that guide modern Angular development. These principles are designed to ensure code quality, maintainability, performance, and team collaboration in Angular projects.

> **Note**: This is educational content about development best practices. These principles guide development decisions but are not enforced at runtime by the application itself.

## Constitutional Principles

### 1. Standalone-First Architecture

**Principle**: All new components, directives, and pipes should be standalone by default.

```typescript
// ✅ Constitutional Compliance
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent {
  // Component implementation
}
```

```typescript
// ❌ Legacy Pattern (avoid in new code)
@NgModule({
  declarations: [UserProfileComponent],
  imports: [CommonModule, ReactiveFormsModule],
  exports: [UserProfileComponent]
})
export class UserProfileModule { }
```

**Why This Matters:**
- Explicit dependency management
- Better tree-shaking and bundle optimization
- Simplified testing and component reuse
- Aligns with Angular's modern architecture direction

### 2. OnPush Change Detection Mandate

**Principle**: All components should use `ChangeDetectionStrategy.OnPush` unless there's a specific technical reason not to.

```typescript
// ✅ Constitutional Compliance
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngFor="let product of products(); trackBy: trackById">
      {{ product.name }} - {{ product.price | currency }}
    </div>
  `
})
export class ProductListComponent {
  products = signal<Product[]>([]);
  
  trackById = (index: number, product: Product) => product.id;
}
```

**Benefits:**
- Significant performance improvements
- Predictable change detection behavior
- Forces better architectural decisions
- Works seamlessly with signals and reactive patterns

### 3. Reactive-First State Management

**Principle**: Prefer reactive patterns (Signals, Observables) over imperative state management.

```typescript
// ✅ Constitutional Compliance - Signals
@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  template: `
    <div>
      <p>Items: {{ itemCount() }}</p>
      <p>Total: {{ totalPrice() | currency }}</p>
      <button (click)="clearCart()">Clear Cart</button>
    </div>
  `
})
export class ShoppingCartComponent {
  private items = signal<CartItem[]>([]);
  
  // Computed values automatically update
  itemCount = computed(() => 
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );
  
  totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  );
  
  addItem(item: CartItem): void {
    this.items.update(current => [...current, item]);
  }
  
  clearCart(): void {
    this.items.set([]);
  }
}
```

```typescript
// ✅ Constitutional Compliance - RxJS for Async Operations
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userSubject = new BehaviorSubject<User | null>(null);
  
  readonly user$ = this.userSubject.asObservable();
  readonly isLoggedIn$ = this.user$.pipe(
    map(user => !!user)
  );
  
  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<User>('/api/auth/login', credentials).pipe(
      tap(user => this.userSubject.next(user)),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }
}
```

### 4. Explicit Type Discipline

**Principle**: All component inputs, outputs, and public methods must have explicit type annotations.

```typescript
// ✅ Constitutional Compliance
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `<!-- template -->`
})
export class DataTableComponent<T> {
  @Input() data!: T[];
  @Input() columns!: TableColumn<T>[];
  @Input() loading: boolean = false;
  @Input() pageSize: number = 10;
  
  @Output() rowSelected = new EventEmitter<T>();
  @Output() sortChanged = new EventEmitter<SortEvent<T>>();
  
  currentPage = signal<number>(1);
  sortColumn = signal<keyof T | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');
  
  // Explicit return types
  onRowClick(row: T): void {
    this.rowSelected.emit(row);
  }
  
  sortBy(column: keyof T): void {
    const currentSort = this.sortColumn();
    if (currentSort === column) {
      this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    
    this.sortChanged.emit({
      column,
      direction: this.sortDirection()
    });
  }
}

// Supporting interfaces
interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  formatter?: (value: T[keyof T]) => string;
}

interface SortEvent<T> {
  column: keyof T;
  direction: 'asc' | 'desc';
}
```

### 5. Immutable Data Patterns

**Principle**: All data updates should create new references rather than mutating existing objects.

```typescript
// ✅ Constitutional Compliance
@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private todos = signal<Todo[]>([]);
  
  readonly allTodos = this.todos.asReadonly();
  readonly activeTodos = computed(() => 
    this.todos().filter(todo => !todo.completed)
  );
  readonly completedTodos = computed(() =>
    this.todos().filter(todo => todo.completed)
  );
  
  addTodo(text: string): void {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    };
    
    // ✅ Immutable update
    this.todos.update(current => [...current, newTodo]);
  }
  
  toggleTodo(id: string): void {
    // ✅ Immutable update with map
    this.todos.update(current =>
      current.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  }
  
  updateTodoText(id: string, text: string): void {
    // ✅ Immutable update with validation
    this.todos.update(current =>
      current.map(todo =>
        todo.id === id
          ? { ...todo, text: text.trim(), updatedAt: new Date() }
          : todo
      )
    );
  }
  
  deleteTodo(id: string): void {
    // ✅ Immutable deletion
    this.todos.update(current => current.filter(todo => todo.id !== id));
  }
}
```

## Architectural Guidelines

### Service Layer Organization

```typescript
// ✅ Domain-specific service structure
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private cache: CacheService,
    private logger: LoggerService
  ) {}
  
  // Clear method signatures with proper error handling
  getProducts(filters?: ProductFilters): Observable<Product[]> {
    const cacheKey = this.buildCacheKey('products', filters);
    
    return this.cache.get<Product[]>(cacheKey).pipe(
      switchMap(cached => 
        cached 
          ? of(cached)
          : this.fetchProductsFromApi(filters).pipe(
              tap(products => this.cache.set(cacheKey, products, 300000)) // 5 min cache
            )
      ),
      catchError(error => {
        this.logger.error('Failed to fetch products', error);
        return throwError(() => new ProductServiceError('Failed to load products', error));
      })
    );
  }
  
  private fetchProductsFromApi(filters?: ProductFilters): Observable<Product[]> {
    const params = this.buildHttpParams(filters);
    return this.http.get<Product[]>('/api/products', { params });
  }
  
  private buildCacheKey(base: string, filters?: ProductFilters): string {
    return filters 
      ? `${base}_${JSON.stringify(filters)}`
      : base;
  }
  
  private buildHttpParams(filters?: ProductFilters): HttpParams {
    let params = new HttpParams();
    
    if (filters?.category) {
      params = params.set('category', filters.category);
    }
    if (filters?.minPrice) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters?.maxPrice) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }
    
    return params;
  }
}

// Custom error class for better error handling
export class ProductServiceError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ProductServiceError';
  }
}
```

### Component Architecture

```typescript
// ✅ Smart/Container Component
@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [
    CommonModule,
    ProductListComponent,
    ProductFormComponent,
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="product-management">
      <app-loading-spinner *ngIf="loading()"></app-loading-spinner>
      
      <app-product-form
        [initialData]="selectedProduct()"
        (productSaved)="onProductSaved($event)"
        (formCancelled)="onFormCancelled()">
      </app-product-form>
      
      <app-product-list
        [products]="products()"
        [loading]="loading()"
        (productSelected)="onProductSelected($event)"
        (productDeleted)="onProductDeleted($event)">
      </app-product-list>
    </div>
  `
})
export class ProductManagementComponent implements OnInit {
  // State management with signals
  private products = signal<Product[]>([]);
  private selectedProduct = signal<Product | null>(null);
  private loading = signal<boolean>(false);
  
  // Read-only exposure
  readonly productsData = this.products.asReadonly();
  readonly selectedProductData = this.selectedProduct.asReadonly();
  readonly loadingState = this.loading.asReadonly();
  
  constructor(
    private productService: ProductService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void {
    this.loadProducts();
  }
  
  private async loadProducts(): Promise<void> {
    this.loading.set(true);
    
    try {
      const products = await firstValueFrom(this.productService.getProducts());
      this.products.set(products);
    } catch (error) {
      this.notificationService.showError('Failed to load products');
      console.error('Product loading error:', error);
    } finally {
      this.loading.set(false);
    }
  }
  
  onProductSelected(product: Product): void {
    this.selectedProduct.set(product);
  }
  
  async onProductSaved(product: Product): Promise<void> {
    try {
      if (product.id) {
        await firstValueFrom(this.productService.updateProduct(product));
        this.products.update(current =>
          current.map(p => p.id === product.id ? product : p)
        );
      } else {
        const newProduct = await firstValueFrom(this.productService.createProduct(product));
        this.products.update(current => [...current, newProduct]);
      }
      
      this.selectedProduct.set(null);
      this.notificationService.showSuccess('Product saved successfully');
    } catch (error) {
      this.notificationService.showError('Failed to save product');
    }
  }
  
  onFormCancelled(): void {
    this.selectedProduct.set(null);
  }
  
  async onProductDeleted(productId: string): Promise<void> {
    try {
      await firstValueFrom(this.productService.deleteProduct(productId));
      this.products.update(current => current.filter(p => p.id !== productId));
      this.notificationService.showSuccess('Product deleted successfully');
    } catch (error) {
      this.notificationService.showError('Failed to delete product');
    }
  }
}
```

## Testing Standards

### Component Testing

```typescript
// ✅ Constitutional Testing Approach
describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent] // Standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  it('should display products correctly', () => {
    // Arrange
    const mockProducts: Product[] = [
      { id: '1', name: 'Product 1', price: 100 },
      { id: '2', name: 'Product 2', price: 200 }
    ];

    // Act
    component.products.set(mockProducts);
    fixture.detectChanges();

    // Assert
    const productElements = fixture.debugElement.queryAll(By.css('.product-item'));
    expect(productElements).toHaveLength(2);
    expect(productElements[0].nativeElement.textContent).toContain('Product 1');
  });

  it('should emit productSelected when product is clicked', () => {
    // Arrange
    const mockProduct: Product = { id: '1', name: 'Test Product', price: 100 };
    component.products.set([mockProduct]);
    
    spyOn(component.productSelected, 'emit');
    fixture.detectChanges();

    // Act
    const productElement = fixture.debugElement.query(By.css('.product-item'));
    productElement.nativeElement.click();

    // Assert
    expect(component.productSelected.emit).toHaveBeenCalledWith(mockProduct);
  });
});
```

### Service Testing

```typescript
// ✅ Service testing with proper mocking
describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  let cacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    const cacheServiceSpy = jasmine.createSpyObj('CacheService', ['get', 'set']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ProductService,
        { provide: CacheService, useValue: cacheServiceSpy }
      ]
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(CacheService) as jasmine.SpyObj<CacheService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch products from API when cache is empty', (done) => {
    // Arrange
    const mockProducts: Product[] = [
      { id: '1', name: 'Product 1', price: 100 }
    ];
    cacheService.get.and.returnValue(of(null));

    // Act
    service.getProducts().subscribe(products => {
      // Assert
      expect(products).toEqual(mockProducts);
      expect(cacheService.set).toHaveBeenCalled();
      done();
    });

    // Verify HTTP request
    const req = httpMock.expectOne('/api/products');
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
  });
});
```

## Performance Guidelines

### Bundle Optimization

```typescript
// ✅ Lazy loading with proper module structure
const routes: Routes = [
  {
    path: 'products',
    loadComponent: () => import('./features/products/product-list.component')
      .then(m => m.ProductListComponent)
  },
  {
    path: 'orders',
    loadChildren: () => import('./features/orders/orders.routes')
      .then(m => m.ordersRoutes)
  }
];

// ✅ Strategic imports to avoid circular dependencies
// products/product-list.component.ts
@Component({
  standalone: true,
  imports: [
    CommonModule,
    // Only import what you need
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class ProductListComponent { }
```

### Memory Management

```typescript
// ✅ Proper subscription management
@Component({
  selector: 'app-data-subscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataSubscriptionComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  
  ngOnInit(): void {
    // ✅ Automatic cleanup with takeUntilDestroyed
    this.dataService.getData().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.processData(data);
    });
    
    // ✅ Multiple subscriptions properly managed
    merge(
      this.searchInput.valueChanges,
      this.filterChanges$,
      this.sortChanges$
    ).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.performSearch();
    });
  }
  
  private processData(data: any[]): void {
    // Data processing logic
  }
  
  private performSearch(): void {
    // Search logic
  }
}
```

## Code Quality Standards

### Error Handling

```typescript
// ✅ Comprehensive error handling
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private logger: LoggerService,
    private notification: NotificationService
  ) {}
  
  getData<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(endpoint).pipe(
      retry(3),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error, endpoint);
        return throwError(() => new ApiError(
          `Failed to fetch data from ${endpoint}`,
          error.status,
          error
        ));
      })
    );
  }
  
  private handleError(error: HttpErrorResponse, context: string): void {
    const errorMessage = this.getErrorMessage(error);
    
    this.logger.error(`API Error in ${context}:`, {
      status: error.status,
      message: errorMessage,
      url: error.url,
      timestamp: new Date().toISOString()
    });
    
    // Show user-friendly message
    this.notification.showError(
      this.getUserFriendlyMessage(error.status)
    );
  }
  
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return error.error.message;
    }
    return error.error?.message || error.message || 'Unknown error';
  }
  
  private getUserFriendlyMessage(status: number): string {
    switch (status) {
      case 401: return 'Please log in to continue';
      case 403: return 'You do not have permission to perform this action';
      case 404: return 'The requested resource was not found';
      case 500: return 'Server error. Please try again later';
      default: return 'An unexpected error occurred';
    }
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public originalError: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## Development Workflow

### Linting and Formatting

```json
// .eslintrc.json - Constitutional rules
{
  "extends": [
    "@angular-eslint/recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@angular-eslint/component-class-suffix": "error",
    "@angular-eslint/directive-class-suffix": "error",
    "@angular-eslint/prefer-on-push-component-change-detection": "error",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "prefer-const": "error"
  }
}
```

### Git Workflow

```bash
# Constitutional commit message format
feat(products): add product filtering with signals

# Breaking change example
feat(auth)!: migrate to standalone components

BREAKING CHANGE: AuthModule removed, use standalone AuthComponent
```

## Migration Strategies

### From Modules to Standalone

```typescript
// Before: Module-based
@NgModule({
  declarations: [FeatureComponent],
  imports: [CommonModule, ReactiveFormsModule],
  exports: [FeatureComponent]
})
export class FeatureModule { }

// After: Standalone
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  // ... component implementation
})
export class FeatureComponent { }
```

### From Observables to Signals (where appropriate)

```typescript
// Before: Observable-based
export class OldComponent {
  private dataSubject = new BehaviorSubject<Data[]>([]);
  data$ = this.dataSubject.asObservable();
  
  updateData(newData: Data[]): void {
    this.dataSubject.next(newData);
  }
}

// After: Signal-based
export class NewComponent {
  data = signal<Data[]>([]);
  
  updateData(newData: Data[]): void {
    this.data.set(newData);
  }
}
```

## Conclusion

The Angular Constitution provides a framework for building maintainable, performant, and scalable Angular applications. These principles should guide decision-making throughout the development process, from initial architecture to daily coding practices.

Remember: These are guidelines developed through experience and community best practices. They should be adapted to your specific project needs while maintaining the core principles of code quality, performance, and maintainability.

## Next Steps

- Implement these principles gradually in existing projects
- Set up linting rules to enforce constitutional standards
- Train team members on reactive patterns and OnPush strategies
- Regular code reviews focusing on constitutional compliance
- Measure performance improvements from following these practices

---

**Key Takeaways:**
- Standalone components are the future of Angular architecture
- OnPush + Signals provide optimal performance and developer experience
- Immutable data patterns prevent common bugs and improve predictability
- Explicit typing catches errors early and improves code documentation
- Reactive patterns make applications more maintainable and testable
- These principles work together to create robust, scalable applications