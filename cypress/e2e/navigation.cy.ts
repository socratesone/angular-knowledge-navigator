describe('Angular Knowledge Navigator - Basic Navigation Journey', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the application successfully', () => {
    cy.contains('Angular Knowledge Navigator')
    cy.get('[data-testid="app-layout"]').should('be.visible')
  })

  it('should display the navigation tree with skill levels', () => {
    // Check that navigation tree is visible
    cy.get('[data-testid="navigation-tree"]').should('be.visible')
    
    // Check that all skill levels are present
    cy.contains('Fundamentals').should('be.visible')
    cy.contains('Intermediate').should('be.visible')
    cy.contains('Advanced').should('be.visible')
    cy.contains('Expert').should('be.visible')
  })

  it('should expand fundamentals category by default', () => {
    // Fundamentals should be expanded by default
    cy.get('[data-testid="category-fundamentals"]')
      .should('have.class', 'expanded')
    
    // Should show fundamentals topics
    cy.contains('Introduction to Angular').should('be.visible')
    cy.contains('Components and Templates').should('be.visible')
    cy.contains('Data Binding').should('be.visible')
  })

  it('should allow category expansion and collapse', () => {
    // Click intermediate category to expand
    cy.get('[data-testid="category-intermediate"]').click()
    
    // Should show intermediate topics
    cy.contains('Angular Signals').should('be.visible')
    cy.contains('Component Communication').should('be.visible')
    
    // Click again to collapse
    cy.get('[data-testid="category-intermediate"]').click()
    
    // Topics should be hidden
    cy.contains('Angular Signals').should('not.be.visible')
  })

  it('should navigate to content when clicking a topic', () => {
    // Click on Introduction to Angular
    cy.contains('Introduction to Angular').click()
    
    // Should navigate to the content page
    cy.url().should('include', '/concepts/fundamentals/introduction-to-angular')
    
    // Content should be displayed
    cy.get('[data-testid="content-viewer"]').should('be.visible')
    cy.get('[data-testid="content-body"]').should('contain.text', 'Angular')
  })

  it('should display content with syntax highlighting', () => {
    // Navigate to a topic with code examples
    cy.contains('Introduction to Angular').click()
    
    // Wait for content to load
    cy.get('[data-testid="content-body"]').should('be.visible')
    
    // Check for syntax highlighted code blocks
    cy.get('pre code').should('exist')
    cy.get('.language-typescript').should('exist')
  })

  it('should show table of contents for content with headings', () => {
    // Navigate to content
    cy.contains('Components and Templates').click()
    
    // Should show table of contents
    cy.get('[data-testid="table-of-contents"]').should('be.visible')
    cy.get('.table-of-contents a').should('have.length.at.least', 1)
  })

  it('should support browser back/forward navigation', () => {
    // Navigate to first topic
    cy.contains('Introduction to Angular').click()
    cy.url().should('include', 'introduction-to-angular')
    
    // Navigate to second topic
    cy.contains('Components and Templates').click()
    cy.url().should('include', 'components-and-templates')
    
    // Use browser back
    cy.go('back')
    cy.url().should('include', 'introduction-to-angular')
    
    // Use browser forward
    cy.go('forward')
    cy.url().should('include', 'components-and-templates')
  })

  it('should handle direct URL navigation', () => {
    // Navigate directly to a specific topic
    cy.visit('/concepts/intermediate/angular-signals')
    
    // Content should load
    cy.get('[data-testid="content-viewer"]').should('be.visible')
    cy.contains('Angular Signals').should('be.visible')
    
    // Navigation should show correct selection
    cy.get('[data-testid="navigation-tree"]').should('be.visible')
    cy.get('.topic-node.selected').should('contain.text', 'Angular Signals')
  })

  it('should show reading time estimate', () => {
    cy.contains('Introduction to Angular').click()
    
    // Should display reading time
    cy.get('[data-testid="reading-time"]').should('be.visible')
    cy.get('[data-testid="reading-time"]').should('contain.text', 'min read')
  })

  it('should be responsive on mobile viewports', () => {
    // Test mobile viewport
    cy.viewport(375, 667)
    
    // Navigation should adapt for mobile
    cy.get('[data-testid="navigation-tree"]').should('be.visible')
    
    // Content should be readable
    cy.contains('Introduction to Angular').click()
    cy.get('[data-testid="content-body"]').should('be.visible')
    
    // Code blocks should not overflow
    cy.get('pre code').should('be.visible')
  })

  it('should handle error states gracefully', () => {
    // Try to navigate to non-existent content
    cy.visit('/concepts/non-existent/topic', { failOnStatusCode: false })
    
    // Should show error message or fallback content
    cy.get('body').should(($body) => {
      expect($body.text()).to.match(/Content not found|Error loading content|404/)
    })
  })

  it('should complete full learning journey', () => {
    // Start with fundamentals
    cy.contains('Introduction to Angular').click()
    cy.get('[data-testid="content-body"]').should('contain.text', 'Angular')
    
    // Progress to components
    cy.contains('Components and Templates').click()
    cy.get('[data-testid="content-body"]').should('contain.text', 'Component')
    
    // Move to intermediate
    cy.get('[data-testid="category-intermediate"]').click()
    cy.contains('Angular Signals').click()
    cy.get('[data-testid="content-body"]').should('contain.text', 'Signals')
    
    // Advance to advanced
    cy.get('[data-testid="category-advanced"]').click()
    cy.contains('Change Detection Strategies').click()
    cy.get('[data-testid="content-body"]').should('contain.text', 'OnPush')
    
    // Complete with expert level
    cy.get('[data-testid="category-expert"]').click()
    cy.contains('Angular Constitution and Best Practices').click()
    cy.get('[data-testid="content-body"]').should('contain.text', 'Best Practices')
  })

  it('should maintain state during navigation', () => {
    // Expand intermediate category
    cy.get('[data-testid="category-intermediate"]').click()
    
    // Navigate to a topic
    cy.contains('Angular Signals').click()
    
    // Go back to home/navigation
    cy.visit('/')
    
    // Intermediate should still be expanded (if state is maintained)
    cy.get('[data-testid="category-intermediate"]')
      .should('have.class', 'expanded')
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      cy.get('[data-testid="navigation-tree"]')
        .should('have.attr', 'role', 'tree')
      
      cy.get('.category-node')
        .should('have.attr', 'role', 'treeitem')
        .should('have.attr', 'aria-expanded')
    })

    it('should support keyboard navigation', () => {
      // Focus navigation tree
      cy.get('[data-testid="navigation-tree"]').focus()
      
      // Use arrow keys to navigate
      cy.get('body').type('{downarrow}')
      cy.get('.category-node:first').should('have.focus')
      
      // Use Enter to expand/collapse
      cy.get('body').type('{enter}')
    })

    it('should work with screen readers', () => {
      // Check for screen reader friendly content
      cy.get('[data-testid="content-body"]')
        .should('have.attr', 'aria-live', 'polite')
      
      // Headings should be properly structured
      cy.get('h1').should('exist')
      cy.get('h2').should('exist')
    })
  })
});