# 📚 BazaarPH - Intern GitHub Guide

## 🎯 Introduction

Welcome to the BazaarPH project! This guide will help you understand how to use Git and GitHub to contribute to the project effectively.

---

## 🌿 Branch Structure

We use a **3-branch workflow** to manage code changes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BRANCH STRUCTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   main/master ─────────────────────────────────────────────────────│
│        │      (Production - DO NOT TOUCH directly)                 │
│        │                                                           │
│        ├──────► prod ───────────────────────────────────────────── │
│        │        (Staging for production-ready code)                │
│        │                                                           │
│        └──────► dev ────────────────────────────────────────────── │
│                 (Development - INTERNS WORK HERE)                  │
│                      │                                             │
│                      ├── feature/your-feature-name                 │
│                      ├── fix/bug-description                       │
│                      └── update/what-you-changed                   │
│                                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Branch Descriptions:

| Branch | Purpose | Who Can Push |
|--------|---------|--------------|
| `main/master` | Production code - Live application | **Lead Developer Only** |
| `prod` | Pre-production staging | **Lead Developer Only** |
| `dev` | Active development | **Interns (via Pull Requests)** |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mozhdeveloper/BAZAARX.git
cd BAZAARX
```

### 2. Switch to the Dev Branch

```bash
git checkout dev
git pull origin dev
```

### 3. Create Your Feature Branch

**ALWAYS create a new branch from `dev` before making changes:**

```bash
# For new features
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/bug-description

# For updates
git checkout -b update/what-you-changed
```

**Example branch names:**
- `feature/add-payment-method`
- `fix/cart-total-calculation`
- `update/seller-dashboard-ui`

---

## 💻 Daily Workflow

### Before Starting Work

```bash
# 1. Switch to dev branch
git checkout dev

# 2. Pull latest changes
git pull origin dev

# 3. Create your feature branch
git checkout -b feature/your-task-name
```

### While Working

```bash
# Check what files you've changed
git status

# Stage specific files
git add src/pages/YourFile.tsx

# Or stage all changes
git add .

# Commit with a descriptive message
git commit -m "feat: add product search functionality"
```

### Commit Message Format

Use these prefixes for your commits:

| Prefix | Use For |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `update:` | Updates to existing features |
| `style:` | UI/CSS changes |
| `refactor:` | Code restructuring |
| `docs:` | Documentation |
| `test:` | Adding tests |

**Examples:**
```bash
git commit -m "feat: add product filtering by category"
git commit -m "fix: resolve cart quantity issue"
git commit -m "update: improve seller dashboard layout"
git commit -m "style: adjust button colors on checkout page"
```

### After Completing Your Task

```bash
# 1. Push your branch to GitHub
git push origin feature/your-task-name

# 2. Go to GitHub and create a Pull Request (PR)
#    - Base: dev
#    - Compare: feature/your-task-name

# 3. Wait for code review
```

---

## 📝 Creating a Pull Request (PR)

### Step-by-Step:

1. **Go to GitHub**: https://github.com/mozhdeveloper/BAZAARX

2. **Click "Pull Requests"** → **"New Pull Request"**

3. **Set the branches:**
   - **Base:** `dev` ← Your changes go here
   - **Compare:** `feature/your-branch-name`

4. **Write a good PR description:**

```markdown
## What does this PR do?
- Added product search functionality
- Implemented filter by category

## Files Changed
- src/pages/ShopPage.tsx
- src/components/SearchBar.tsx

## Screenshots (if UI changes)
[Attach screenshots here]

## Testing Done
- Tested on Chrome
- Tested on Mobile view
```

5. **Request a review** from the lead developer

---

## ⚠️ Important Rules

### ❌ NEVER DO:
- Push directly to `main/master`
- Push directly to `prod`
- Force push (`git push -f`) to any shared branch
- Merge without approval

### ✅ ALWAYS DO:
- Create a feature branch for every task
- Pull latest `dev` before starting work
- Write clear commit messages
- Create a Pull Request for review
- Test your changes locally before pushing

---

## 🔧 Common Git Commands

```bash
# Check current branch
git branch

# Switch to a branch
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# See changes you've made
git status

# See detailed changes
git diff

# Add files to staging
git add filename.tsx
git add .  # Add all files

# Commit changes
git commit -m "your message"

# Push to GitHub
git push origin branch-name

# Pull latest changes
git pull origin branch-name

# Discard changes in a file
git checkout -- filename.tsx

# See commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

---

## 🆘 Troubleshooting

### "I committed to the wrong branch!"

```bash
# Undo the commit but keep changes
git reset --soft HEAD~1

# Switch to correct branch
git checkout correct-branch

# Commit again
git add .
git commit -m "your message"
```

### "I have merge conflicts!"

1. Open the conflicted file(s)
2. Look for conflict markers:
   ```
   <<<<<<< HEAD
   Your changes
   =======
   Their changes
   >>>>>>> other-branch
   ```
3. Edit the file to resolve the conflict
4. Remove the conflict markers
5. Stage and commit:
   ```bash
   git add .
   git commit -m "fix: resolve merge conflict"
   ```

### "I need to update my branch with latest dev!"

```bash
# On your feature branch
git fetch origin
git merge origin/dev

# Or use rebase (cleaner history)
git rebase origin/dev
```

---

## 📞 Getting Help

- **Slack/Discord**: Ask in the team channel
- **GitHub Issues**: Check existing issues or create new one
- **Lead Developer**: Contact for urgent problems

---

## ✅ Checklist Before PR

- [ ] Code runs without errors
- [ ] All files are committed
- [ ] Commit messages are clear
- [ ] PR description is complete
- [ ] Screenshots attached (if UI changes)
- [ ] Tested on local machine

---

**Happy Coding! 🚀**
