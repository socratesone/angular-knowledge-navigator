# Angular Knowledge Navigator

An **interactive documentation and learning platform** built with **Angular**, designed to teach Angular concepts progressively — from fundamentals to expert-level patterns.  
The application itself is written **in Angular** and serves as a living example of Angular best practices.

---

## 📘 Overview

**Angular Knowledge Navigator** is both an educational tool and a technical showcase.  
It organizes Angular topics hierarchically, provides rich content with syntax-highlighted examples, and demonstrates how to build scalable, modern Angular applications using standalone components, Signals, OnPush change detection, and clean architecture principles.

---

## 🚀 Core Features

| Category | Description |
|-----------|-------------|
| **Hierarchical Navigation** | Browse Angular topics by skill level: Fundamentals → Intermediate → Advanced → Expert. |
| **Progressive Learning** | Each concept builds upon previous material in a guided, skill-based sequence. |
| **Search & Discovery** | Quickly locate topics, examples, or patterns via keyword-based search. |
| **Rich Markdown Content** | Concepts rendered from markdown files with highlighted TypeScript, HTML, SCSS, and JSON code examples. |
| **Responsive Layout** | Fully adaptive layout for desktop, tablet, and mobile devices. |
| **Accessibility Support** | Screen reader compatibility and full keyboard navigation. |
| **Deep Linking** | URLs map directly to specific Angular concepts with preserved navigation state. |

---

## 🧭 Key User Scenarios

### 1. **Navigation and Content Display**
Users browse the concept tree, select a topic, and view structured educational content with examples and best practices.

- Concepts are organized hierarchically by skill level.  
- Each concept page includes explanations, syntax-highlighted examples, and caveats.  
- URLs update dynamically for browser navigation and bookmarking.

### 2. **Progressive Learning Path**
Concepts form a continuous educational journey, enabling developers to evolve from junior to senior-level proficiency.

- Advanced sections reference previously covered fundamentals.  
- Best-practice sections follow current Angular style and design guides.  
- Code demonstrates modern patterns like standalone components and OnPush change detection.

### 3. **Search and Discovery**
Search filters topics and examples in real time.

- Navigation filters as users type.  
- Clicking results opens relevant content with highlights.  
- “Gotchas” sections surface common errors and anti-patterns.

### 4. **Responsive and Accessible Design**
Application adapts seamlessly across devices and input methods.

- Desktop: persistent navigation sidebar.  
- Mobile/tablet: collapsible/hamburger navigation.  
- All content is accessible via keyboard and screen readers.

---

## ⚙️ Functional Requirements

| ID | Requirement |
|----|--------------|
| **FR-001** | Display hierarchical left-navigation grouped by skill level. |
| **FR-002** | Render markdown-based concept pages with syntax highlighting. |
| **FR-003** | Include best-practice and caveats sections per topic. |
| **FR-004** | Implement keyword-based search and filtering. |
| **FR-005** | Maintain responsive design across devices. |
| **FR-006** | Support deep-linking and browser navigation. |
| **FR-007** | Handle missing routes gracefully with fallback content. |
| **FR-008** | Load content dynamically from `/src/assets/concepts/`. |
| **FR-009** | Provide user-friendly error handling for malformed markdown. |
| **FR-010** | Ensure accessibility compliance (WCAG 2.1 AA). |
| **FR-011** | Use standalone components with lazy-loaded feature modules. |
| **FR-012** | Integrate Prism.js for code syntax highlighting. |
| **FR-013** | Include utilities for markdown parsing and layout shell rendering. |

---

## 🧩 Core Architecture

| Component | Responsibility |
|------------|----------------|
| **App Shell** | Global layout, routing, and responsive container. |
| **Navigation Tree** | Hierarchical view of Angular concepts. |
| **Content Renderer** | Parses and renders markdown into structured Angular views. |
| **Search Filter** | Dynamically filters navigation and highlights results. |
| **Code Example Component** | Displays syntax-highlighted Angular code samples. |
| **Concept Service** | Loads and caches markdown content. |
| **Accessibility Utilities** | Provides ARIA roles, focus management, and keyboard support. |

---

## 🎯 Success Metrics

| ID | Metric |
|----|--------|
| **SC-001** | User can navigate to any concept within 15 s of page load. |
| **SC-002** | App shell loads within 3 s on standard broadband. |
| **SC-003** | Search returns results within 500 ms for ≤200 topics. |
| **SC-004** | Prism.js highlights all code examples accurately. |
| **SC-005** | Fully functional at 1920×1080, 768×1024, 375×667 resolutions. |
| **SC-006** | Deep-linking and browser history work 100% reliably. |
| **SC-007** | Screen readers can access all content. |
| **SC-008** | New topics can be added by dropping markdown files — no code change required. |

---

## 🧠 Assumptions

- Users access via JavaScript-enabled browsers.  
- English is the default content language (i18n planned).  
- Targets Angular v15+ using standalone architecture.  
- Internet connection required to load markdown and assets.  
- Performance optimized for pages with up to 10,000 words and multiple code examples.

---

## 🧪 Tech Stack

- **Framework:** Angular 18+  
- **Language:** TypeScript  
- **Routing:** Angular Router (lazy-loaded modules + standalone components)  
- **Content Rendering:** Markdown → HTML via custom renderer  
- **Syntax Highlighting:** Prism.js  
- **Testing:** Cypress or Playwright for end-to-end scenarios  
- **Build Tools:** Angular CLI + Vite (optional)  
- **Styling:** SCSS with responsive design utilities  

---

## 🏗️ Development Setup

```bash
# Clone and install
git clone https://github.com/your-org/angular-knowledge-navigator.git
cd angular-knowledge-navigator
npm install

# Run development server
npm start

# Build production bundle
npm run build

# Run end-to-end tests
npm run e2e

```

## Directory structure:
```
src/
 ├── app/
 │   ├── navigation/
 │   ├── concepts/
 │   ├── shared/
 │   └── core/
 ├── assets/
 │   └── concepts/
 │        ├── fundamentals/
 │        ├── intermediate/
 │        ├── advanced/
 │        └── expert/
 ├── styles/
 └── index.html
```
📄 License

Released under the MIT License.
See the LICENSE
 file for full details.

🧩 Roadmap

1. Implement markdown content loader and concept model.
2. Add navigation tree with expandable categories.
3. Integrate Prism.js for code syntax highlighting.
4. Add search with keyword filtering and highlighting.
5. Finalize responsive layout and accessibility compliance.
6. Add internationalization and user progress tracking.