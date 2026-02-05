# 🌐 BazaarPH - Web Frontend Intern Guide

## 👋 Welcome Web Frontend Intern!

You'll be working on the **BazaarPH Web Application** located in the `/web` directory. This guide will help you contribute effectively using AI assistance and GitHub workflows.

---

## 📂 Your Workspace: `/web` Directory

```
BAZAARX/
└── web/                          ← YOU WORK HERE
    ├── src/
    │   ├── pages/               ← React pages/screens
    │   ├── components/          ← Reusable UI components
    │   │   └── ui/             ← shadcn/ui components
    │   ├── stores/             ← Zustand state management
    │   ├── hooks/              ← Custom React hooks
    │   ├── lib/                ← Utility functions
    │   ├── styles/             ← CSS/Tailwind styles
    │   └── types/              ← TypeScript type definitions
    ├── public/                  ← Static assets
    ├── package.json            ← Dependencies
    ├── tsconfig.json           ← TypeScript config
    ├── tailwind.config.js      ← Tailwind CSS config
    └── vite.config.ts          ← Vite build config
```

### ⚠️ IMPORTANT: You ONLY modify files in `/web`

**DO NOT touch:**
- `/mobile-app` - Mobile app team's work
- `/src` - Root source (if exists)
- Root configuration files (unless specifically asked)

---

## 🤖 Working with AI Assistants (GitHub Copilot, ChatGPT, etc.)

### How to Prompt AI for Web Frontend Tasks

When asking AI for help, **always specify you're working on web frontend**:

#### ✅ GOOD PROMPTS:

```
"I am a frontend intern working on the BazaarPH web application in the /web directory.
I need to create a new product card component using React and Tailwind CSS.
The component should display product image, name, price, and a cart button.
Please create the component in /web/src/components/ProductCard.tsx"
```

```
"For the BazaarPH web app (/web folder), update the buyer login page at 
/web/src/pages/BuyerLoginPage.tsx to add email validation and show error messages.
Use React hooks and match the existing orange theme."
```

```
"In the web application, I need to add a new page for seller analytics.
Create /web/src/pages/SellerAnalytics.tsx with charts showing sales data.
Use the existing UI components from /web/src/components/ui/ and Zustand for state."
```

#### ❌ BAD PROMPTS:

```
"Create a product card"  ← Too vague, AI might create for wrong platform
```

```
"Add validation"  ← Doesn't specify which file or platform
```

```
"Update the mobile app"  ← WRONG! You work on web, not mobile
```

### AI Prompt Template

Use this template for consistency:

```
Role: I am a frontend intern for BazaarPH web application
Location: /web directory
Task: [Describe what you need to do]
Files: [Specific files to modify/create in /web/src/...]
Tech Stack: React, TypeScript, Tailwind CSS, Zustand
Requirements:
- [Requirement 1]
- [Requirement 2]
Context: [Any additional context]
```

---

## 🛠️ Tech Stack You'll Use

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **React 18** | UI Framework | https://react.dev/ |
| **TypeScript** | Type Safety | https://www.typescriptlang.org/ |
| **Tailwind CSS** | Styling | https://tailwindcss.com/ |
| **Zustand** | State Management | https://zustand-demo.pmnd.rs/ |
| **React Router** | Navigation | https://reactrouter.com/ |
| **Vite** | Build Tool | https://vitejs.dev/ |
| **shadcn/ui** | UI Components | https://ui.shadcn.com/ |
| **Lucide React** | Icons | https://lucide.dev/ |
| **Framer Motion** | Animations | https://www.framer.com/motion/ |

---

## 🚀 Getting Started

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/mozhdeveloper/BAZAARX.git
cd BAZAARX

# Switch to dev branch
git checkout dev
git pull origin dev

# Navigate to web directory
cd web

# Install dependencies
npm install
```

### 2. Running the Web App Locally

```bash
# Make sure you're in the /web directory
cd /Users/[your-username]/Dev/BAZAARX/web

# Start development server
npm run dev

# App will open at http://localhost:5173 or http://localhost:5174
```

### 3. Testing Your Changes

```bash
# Check for TypeScript errors
npm run build

# Run linter
npm run lint
```

---

## 💼 Common Tasks & AI Prompts

### Task 1: Creating a New Page

**Prompt to AI:**
```
I'm a web frontend intern working in /web directory.
Create a new page for [feature name] at /web/src/pages/[PageName].tsx

Requirements:
- Use React functional component with TypeScript
- Import necessary components from /web/src/components/ui/
- Use Tailwind CSS for styling with BazaarPH orange theme (#FF6A00)
- Add proper TypeScript types
- Include responsive design for mobile

Then update /web/src/App.tsx to add the route.
```

### Task 2: Creating a Component

**Prompt to AI:**
```
For BazaarPH web app (/web folder), create a reusable component:

File: /web/src/components/[ComponentName].tsx
Purpose: [What the component does]
Props: [List the props it should accept]
Styling: Tailwind CSS with orange theme
State: Use React hooks (useState, useEffect as needed)

Include TypeScript interfaces for props.
```

### Task 3: Updating Styles

**Prompt to AI:**
```
In /web/src/pages/[PageName].tsx, update the styling:
- Change button colors to orange-600 hover:orange-700
- Make the layout responsive for mobile (use Tailwind breakpoints)
- Add smooth transitions and animations using Framer Motion
- Ensure dark mode compatibility
```

### Task 4: Adding State Management

**Prompt to AI:**
```
For the web app, I need to add state management:

File: /web/src/stores/[storeName].ts
Purpose: Manage [what data] using Zustand
Features:
- Persist data to localStorage using persist middleware
- Include actions: [list actions]
- TypeScript interfaces for the store

Then show me how to use this store in a component.
```

### Task 5: Integrating with Existing Components

**Prompt to AI:**
```
In /web/src/pages/[PageName].tsx, integrate the existing UI components:
- Use Button from /web/src/components/ui/button
- Use Input from /web/src/components/ui/input
- Use Card from /web/src/components/ui/card

Match the styling of other pages in the project.
```

---

## 🌿 Git Workflow for Web Frontend

### Daily Workflow

```bash
# 1. Start in web directory
cd BAZAARX/web

# 2. Switch to dev and pull latest
cd ..  # Go back to root
git checkout dev
git pull origin dev

# 3. Create your feature branch
git checkout -b feature/web-your-feature-name

# 4. Make your changes in /web directory
cd web
# ... edit files in /web/src/ ...

# 5. Test your changes
npm run build

# 6. Go back to root to commit
cd ..

# 7. Stage ONLY /web files
git add web/

# 8. Commit with clear message
git commit -m "feat(web): add product search functionality"

# 9. Push your branch
git push origin feature/web-your-feature-name

# 10. Create Pull Request on GitHub
```

### Branch Naming Convention

**Format:** `feature/web-what-you-built`

**Examples:**
- `feature/web-buyer-profile-page`
- `feature/web-seller-dashboard-charts`
- `fix/web-cart-calculation-bug`
- `update/web-login-page-styling`

---

## 📝 Commit Message Format

### Structure:
```
<type>(web): <description>

[optional body]
```

### Types:

| Type | Use For |
|------|---------|
| `feat(web):` | New features |
| `fix(web):` | Bug fixes |
| `update(web):` | Updates to existing features |
| `style(web):` | UI/CSS changes |
| `refactor(web):` | Code restructuring |

### Examples:

```bash
git commit -m "feat(web): add product filtering by category"
git commit -m "fix(web): resolve cart total calculation error"
git commit -m "update(web): improve seller dashboard layout"
git commit -m "style(web): adjust button colors on checkout page"
git commit -m "refactor(web): optimize product card component"
```

---

## 🔄 Creating a Pull Request (PR)

### Step-by-Step:

**1. Go to GitHub:**
```
https://github.com/mozhdeveloper/BAZAARX/pulls
```

**2. Click "New Pull Request"**

**3. Set Branches:**
- **Base:** `dev`
- **Compare:** `feature/web-your-feature-name`

**4. Write PR Description:**

```markdown
## 📋 Summary
Brief description of what this PR does for the web application.

## 🎯 Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] UI/UX improvement
- [ ] Code refactoring
- [ ] Documentation

## 📂 Files Changed (Web Only)
- web/src/pages/[PageName].tsx
- web/src/components/[ComponentName].tsx
- web/src/stores/[storeName].ts

## 🖼️ Screenshots
[Attach before/after screenshots if UI changes]

## ✅ Testing Checklist
- [ ] Code builds without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on mobile viewport
- [ ] Tested all interactive elements
- [ ] Checked responsive design

## 🧪 How to Test
1. Navigate to http://localhost:5173/[route]
2. [Step by step testing instructions]

## 📝 Additional Notes
[Any additional context, dependencies, or concerns]
```

**5. Request Review** from lead developer

**6. Wait for Approval** - Do not merge yourself

---

## ⚠️ Important Rules for Web Interns

### ❌ NEVER:
- Modify files in `/mobile-app`
- Push directly to `main` or `prod`
- Commit `node_modules/` or `dist/` folders
- Use `git push -f` (force push)
- Merge your own PR
- Commit environment files (`.env`)

### ✅ ALWAYS:
- Work in `/web` directory only
- Create feature branch from `dev`
- Test with `npm run build` before pushing
- Add `(web)` in commit messages
- Only stage `/web` files: `git add web/`
- Write clear PR descriptions
- Request code review

---

## 🎨 BazaarPH Design System

### Color Palette

```css
/* Primary */
--orange-500: #FF6A00;  /* Main brand color */
--orange-600: #E65F00;  /* Hover states */
--orange-700: #CC5500;  /* Active states */

/* Neutral */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-900: #111827;

/* Semantic */
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
```

### Typography

```css
/* Headings */
.heading-xl: text-3xl font-bold
.heading-lg: text-2xl font-bold
.heading-md: text-xl font-semibold

/* Body */
.body-lg: text-base
.body-md: text-sm
.body-sm: text-xs
```

### Spacing

Use Tailwind's spacing scale: `p-4`, `m-6`, `gap-8`, etc.

---

## 🔍 Code Review Checklist

Before submitting PR, verify:

- [ ] All files are in `/web` directory
- [ ] TypeScript has no errors
- [ ] Code follows existing patterns
- [ ] Components are properly typed
- [ ] Tailwind classes are used (not inline styles)
- [ ] No console.logs left in code
- [ ] Responsive design implemented
- [ ] Matches BazaarPH orange theme
- [ ] Comments added for complex logic
- [ ] No hardcoded values (use constants)

---

## 🆘 Troubleshooting

### "Cannot find module" error

```bash
cd web
npm install
```

### "Port already in use"

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### TypeScript errors

```bash
# Check errors
npm run build

# If you're stuck, ask AI:
"I'm getting TypeScript error: [error message]
In file: /web/src/[file].tsx
Please help me fix this for the web app."
```

### Git conflicts in `/web`

```bash
# Update your branch with latest dev
git fetch origin
git merge origin/dev

# If conflicts in /web files:
# 1. Open conflicted files
# 2. Resolve conflicts
# 3. Test: cd web && npm run build
# 4. Commit: git add web/ && git commit -m "fix: resolve merge conflicts"
```

---

## 📚 Learning Resources

### React & TypeScript
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Tailwind CSS
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind UI](https://tailwindui.com/components)

### State Management
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Icons & UI
- [Lucide Icons](https://lucide.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## 💡 Tips for Success

1. **Always specify "web" in your AI prompts** - Prevents confusion with mobile app

2. **Test before committing:**
   ```bash
   cd web
   npm run build  # Must succeed
   ```

3. **Keep PRs small** - Easier to review, faster to merge

4. **Follow existing patterns** - Look at similar components first

5. **Ask questions early** - Don't struggle alone

6. **Document your code** - Add comments for complex logic

7. **Mobile-first design** - Always test responsive layouts

---

## 📞 Getting Help

### When using AI:
```
"I'm a web frontend intern working in /web directory.
I need help with [specific problem].
File: /web/src/[path]
Error: [error message or description]
What I've tried: [list what you tried]"
```

### When asking team:
- **Slack/Discord**: `#web-frontend` channel
- **GitHub Issues**: Create issue with `web` label
- **Lead Developer**: Tag in PR or Slack

---

## ✅ Pre-Push Checklist

Before every `git push`:

- [ ] I worked only in `/web` directory
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Code tested in browser
- [ ] Responsive design checked
- [ ] Branch name starts with `feature/web-`
- [ ] Commit message includes `(web)`
- [ ] Only staged files from `/web`: `git add web/`

---

## 🎯 Your First Task

Try this to get started:

1. **Clone and setup:**
   ```bash
   git clone https://github.com/mozhdeveloper/BAZAARX.git
   cd BAZAARX
   git checkout dev
   cd web
   npm install
   ```

2. **Create a branch:**
   ```bash
   cd ..
   git checkout -b feature/web-my-first-component
   ```

3. **Ask AI to create a simple component:**
   ```
   I'm a web frontend intern working in /web directory.
   Create a simple HelloWorld component at /web/src/components/HelloWorld.tsx
   - Display "Hello, BazaarPH!" in orange color
   - Use TypeScript
   - Use Tailwind CSS
   - Export as default
   ```

4. **Test it:**
   ```bash
   cd web
   npm run build
   ```

5. **Commit and push:**
   ```bash
   cd ..
   git add web/
   git commit -m "feat(web): add HelloWorld component"
   git push origin feature/web-my-first-component
   ```

6. **Create your first PR!**

---

**Happy Coding! 🚀**

Remember: You're building the web experience for thousands of Filipino users. Every component matters!
