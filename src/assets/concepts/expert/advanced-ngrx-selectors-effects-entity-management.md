---
title: "Advanced NgRx (Selectors, Effects, Entity Management)"
slug: "advanced-ngrx-selectors-effects-entity-management"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["advanced", "ngrx", "state-management", "selectors", "effects", "entities"]
prerequisites: ["reactive-state-management-rxjs-componentstore-ngrx-introduction", "using-rxjs-operators-map-filter-switchmap-etc", "optimizing-change-detection-and-performance"]
relatedTopics: ["signals-and-modern-reactivity-model-angular-17", "smart-vs-presentational-components-pattern", "unit-testing-with-jest-and-angular-testing-library"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/advanced-ngrx-selectors-effects-entity-management.md"
---

# Advanced NgRx (Selectors, Effects, Entity Management)

## Learning Objectives
- Master advanced NgRx patterns for complex state management scenarios
- Implement efficient selectors with memoization and composition
- Design robust side effect handling with NgRx Effects
- Apply entity management patterns for normalized data structures
- Integrate NgRx with modern Angular features and constitutional practices

## Overview
Advanced NgRx usage involves sophisticated state management patterns that handle complex business logic, asynchronous operations, and normalized data structures efficiently while maintaining performance and testability.

## Advanced Selector Patterns
```typescript
// Feature state interface
export interface UserState {
  users: EntityState<User>;
  selectedUserId: string | null;
  loading: boolean;
  error: string | null;
  filters: UserFilters;
}

// Entity adapter for normalized state
export const userAdapter = createEntityAdapter<User>({
  selectId: (user: User) => user.id,
  sortComparer: (a: User, b: User) => a.name.localeCompare(b.name)
});

// Basic selectors
export const selectUserState = createFeatureSelector<UserState>('users');
export const selectUsersEntities = createSelector(
  selectUserState,
  (state) => userAdapter.getSelectors().selectAll(state.users)
);

// Parameterized selectors
export const selectUserById = createSelector(
  selectUsersEntities,
  (users: User[], props: { id: string }) => 
    users.find(user => user.id === props.id)
);

// Complex composed selectors
export const selectFilteredUsers = createSelector(
  selectUsersEntities,
  selectUserFilters,
  (users: User[], filters: UserFilters) => {
    return users.filter(user => {
      const matchesRole = !filters.role || user.role === filters.role;
      const matchesStatus = !filters.status || user.status === filters.status;
      const matchesSearch = !filters.search || 
        user.name.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesRole && matchesStatus && matchesSearch;
    });
  }
);

// Performance-optimized selectors with projector functions
export const selectUserStatistics = createSelector(
  selectUsersEntities,
  (users: User[]) => ({
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    usersByRole: users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  })
);
```

## Advanced Effects Patterns
```typescript
@Injectable()
export class UserEffects {
  private actions$ = inject(Actions);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Basic effect with error handling
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUsers),
      switchMap(() =>
        this.userService.getUsers().pipe(
          map(users => UserActions.loadUsersSuccess({ users })),
          catchError(error => of(UserActions.loadUsersFailure({ error: error.message })))
        )
      )
    )
  );

  // Effect with conditional logic
  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUser),
      switchMap(({ user }) =>
        this.userService.createUser(user).pipe(
          concatMap(createdUser => [
            UserActions.createUserSuccess({ user: createdUser }),
            UserActions.showNotification({ 
              message: `User ${createdUser.name} created successfully` 
            })
          ]),
          catchError(error => of(UserActions.createUserFailure({ error: error.message })))
        )
      )
    )
  );

  // Non-dispatching effect for side effects
  showNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.showNotification),
      tap(({ message }) => this.notificationService.show(message))
    ),
    { dispatch: false }
  );

  // Effect with debouncing and distinct
  searchUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.searchUsers),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query),
      switchMap(({ query }) =>
        this.userService.searchUsers(query).pipe(
          map(users => UserActions.searchUsersSuccess({ users })),
          catchError(error => of(UserActions.searchUsersFailure({ error: error.message })))
        )
      )
    )
  );

  // Complex effect with multiple async operations
  deleteUserWithConfirmation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.deleteUserWithConfirmation),
      concatMap(({ userId }) =>
        this.userService.getUserById(userId).pipe(
          switchMap(user => 
            this.notificationService.confirm(
              `Delete user ${user.name}?`
            ).pipe(
              filter(confirmed => confirmed),
              switchMap(() =>
                this.userService.deleteUser(userId).pipe(
                  concatMap(() => [
                    UserActions.deleteUserSuccess({ userId }),
                    UserActions.showNotification({ 
                      message: `User ${user.name} deleted` 
                    })
                  ]),
                  catchError(error => of(UserActions.deleteUserFailure({ 
                    error: error.message 
                  })))
                )
              )
            )
          )
        )
      )
    )
  );
}
```

## Entity Management Patterns
```typescript
// Advanced entity reducer with adapter
const initialState: UserState = userAdapter.getInitialState({
  selectedUserId: null,
  loading: false,
  error: null,
  filters: {
    role: null,
    status: null,
    search: ''
  }
});

export const userReducer = createReducer(
  initialState,
  
  // Load users
  on(UserActions.loadUsers, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(UserActions.loadUsersSuccess, (state, { users }) =>
    userAdapter.setAll(users, {
      ...state,
      loading: false
    })
  ),
  
  // Entity operations with adapter
  on(UserActions.createUserSuccess, (state, { user }) =>
    userAdapter.addOne(user, state)
  ),
  
  on(UserActions.updateUserSuccess, (state, { user }) =>
    userAdapter.updateOne({
      id: user.id,
      changes: user
    }, state)
  ),
  
  on(UserActions.deleteUserSuccess, (state, { userId }) =>
    userAdapter.removeOne(userId, state)
  ),
  
  // Batch operations
  on(UserActions.bulkUpdateUsers, (state, { updates }) =>
    userAdapter.updateMany(
      updates.map(update => ({ id: update.id, changes: update })),
      state
    )
  ),
  
  // Optimistic updates
  on(UserActions.updateUserOptimistic, (state, { user }) =>
    userAdapter.updateOne({
      id: user.id,
      changes: { ...user, _updating: true }
    }, state)
  )
);
```

## Constitutional Integration with Modern Angular
```typescript
// NgRx with OnPush components
@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatTableModule],
  template: `
    <mat-table [dataSource]="users$ | async">
      <!-- Table implementation -->
    </mat-table>
  `
})
export class UserListComponent {
  private store = inject(Store);
  
  users$ = this.store.select(selectFilteredUsers);
  loading$ = this.store.select(selectUserLoading);
  
  trackByUserId(index: number, user: User): string {
    return user.id;
  }
  
  onUserClick(user: User): void {
    this.store.dispatch(UserActions.selectUser({ userId: user.id }));
  }
}
```

## Assessment Questions
1. How do you optimize NgRx selectors for performance in large applications?
2. What are the best practices for handling complex async operations in Effects?
3. When should you use entity adapters vs manual state normalization?
4. How do you integrate NgRx with modern Angular features like signals?

## Next Steps
[[signals-and-modern-reactivity-model-angular-17]], [[unit-testing-with-jest-and-angular-testing-library]]

## Expansion Guidance for LLMs
Cover comprehensive NgRx patterns, performance optimization techniques, testing strategies, migration to signals, real-world state management scenarios, and integration with other Angular ecosystem tools.