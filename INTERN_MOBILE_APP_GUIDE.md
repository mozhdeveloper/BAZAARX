# 📱 BazaarPH - Mobile App Intern Guide

## 👋 Welcome Mobile App Intern!

You'll be working on the **BazaarPH Mobile Application** using React Native and Expo, located in the `/mobile-app` directory. This guide will help you contribute effectively using AI assistance and GitHub workflows.

---

## 📂 Your Workspace: `/mobile-app` Directory

```
BAZAARX/
└── mobile-app/                   ← YOU WORK HERE
    ├── app/                      ← App screens (Expo Router)
    │   ├── (tabs)/              ← Bottom tab screens
    │   ├── seller/              ← Seller module screens
    │   ├── HomeScreen.tsx
    │   ├── CartScreen.tsx
    │   └── ...
    ├── src/
    │   ├── components/          ← Reusable components
    │   ├── stores/              ← Zustand state management
    │   ├── types/               ← TypeScript types
    │   └── data/                ← Mock data
    ├── assets/                   ← Images, fonts, icons
    ├── app.json                 ← Expo configuration
    ├── package.json             ← Dependencies
    └── tsconfig.json            ← TypeScript config
```

### ⚠️ IMPORTANT: You ONLY modify files in `/mobile-app`

**DO NOT touch:**
- `/web` - Web team's work
- `/src` - Root source (if exists)
- Root configuration files (unless specifically asked)

---

## 🤖 Working with AI Assistants (GitHub Copilot, ChatGPT, etc.)

### How to Prompt AI for Mobile App Tasks

When asking AI for help, **always specify you're working on React Native mobile app**:

#### ✅ GOOD PROMPTS:

```
"I am a mobile app intern working on the BazaarPH React Native app in the /mobile-app directory.
I need to create a new product card component using React Native.
The component should display product image, name, price, and an add-to-cart button.
Please create the component in /mobile-app/src/components/ProductCard.tsx
Use React Native components (View, Text, Image, TouchableOpacity)."
```

```
"For the BazaarPH mobile app (/mobile-app folder), update the buyer login screen at 
/mobile-app/app/LoginScreen.tsx to add email validation and show error messages.
Use React Native TextInput and follow React Native best practices."
```

```
"In the mobile app, I need to add a new screen for seller analytics.
Create /mobile-app/app/seller/AnalyticsScreen.tsx showing sales charts.
Use React Native components and Zustand for state management.
Make it compatible with both iOS and Android."
```

#### ❌ BAD PROMPTS:

```
"Create a product card"  ← Too vague, might generate web code
```

```
"Use Tailwind CSS"  ← WRONG! React Native doesn't use Tailwind
```

```
"Update the web app"  ← WRONG! You work on mobile, not web
```

```
"Use div and span"  ← WRONG! Use View and Text instead
```

### AI Prompt Template

Use this template for consistency:

```
Role: I am a mobile app intern for BazaarPH React Native application
Location: /mobile-app directory
Task: [Describe what you need to do]
Files: [Specific files to modify/create in /mobile-app/...]
Tech Stack: React Native, Expo, TypeScript, Zustand
Platform: iOS and Android
Requirements:
- [Requirement 1]
- [Requirement 2]
Context: [Any additional context]
```

---

## 🛠️ Tech Stack You'll Use

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **React Native** | Mobile Framework | https://reactnative.dev/ |
| **Expo** | Development Platform | https://docs.expo.dev/ |
| **TypeScript** | Type Safety | https://www.typescriptlang.org/ |
| **Expo Router** | Navigation | https://docs.expo.dev/router/introduction/ |
| **Zustand** | State Management | https://zustand-demo.pmnd.rs/ |
| **React Native Paper** | UI Components | https://reactnativepaper.com/ |
| **Expo Image** | Image Handling | https://docs.expo.dev/versions/latest/sdk/image/ |
| **Expo Camera** | Camera Access | https://docs.expo.dev/versions/latest/sdk/camera/ |

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

# Navigate to mobile-app directory
cd mobile-app

# Install dependencies
npm install
```

### 2. Running the Mobile App Locally

```bash
# Make sure you're in the /mobile-app directory
cd /Users/[your-username]/Dev/BAZAARX/mobile-app

# Start Expo development server
npm start
# or
npx expo start

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on physical device
```

### 3. Testing Your Changes

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android
```

---

## 💼 Common Tasks & AI Prompts

### Task 1: Creating a New Screen

**Prompt to AI:**
```
I'm a mobile app intern working in /mobile-app directory.
Create a new screen for [feature name] at /mobile-app/app/[ScreenName].tsx

Requirements:
- Use React Native components (View, Text, ScrollView, TouchableOpacity)
- Use TypeScript with proper types
- Follow Expo Router navigation patterns
- Use SafeAreaView for proper layout
- Use StyleSheet.create() for styling
- Support both iOS and Android
- Use BazaarPH orange theme (#FF6A00)
- Make it responsive for different screen sizes

Do NOT use: HTML elements, Tailwind CSS, or web-specific code
```

### Task 2: Creating a Component

**Prompt to AI:**
```
For BazaarPH mobile app (/mobile-app folder), create a reusable component:

File: /mobile-app/src/components/[ComponentName].tsx
Purpose: [What the component does]
Props: [List the props it should accept]

Use:
- React Native components (View, Text, Image, etc.)
- StyleSheet.create() for styling
- TypeScript interfaces for props
- Platform-specific code if needed (Platform.OS)

Make compatible with iOS and Android.
```

### Task 3: Updating Styles

**Prompt to AI:**
```
In /mobile-app/app/[ScreenName].tsx, update the styling:
- Use StyleSheet.create() with React Native styles
- Change button colors to orange (#FF6A00)
- Add proper spacing and padding
- Make layout responsive using Dimensions or flexbox
- Support both light and dark mode
- Ensure touch targets are at least 44x44 (iOS HIG)
```

### Task 4: Adding Navigation

**Prompt to AI:**
```
For the mobile app using Expo Router:

I need to navigate from /mobile-app/app/ScreenA.tsx to /mobile-app/app/ScreenB.tsx
- Use Expo Router's useRouter hook
- Pass parameters: [list parameters]
- Add a back button
- Handle navigation state

Show me the navigation code for both screens.
```

### Task 5: Adding State Management

**Prompt to AI:**
```
For the mobile app, I need to add state management:

File: /mobile-app/src/stores/[storeName].ts
Purpose: Manage [what data] using Zustand
Features:
- Persist data to AsyncStorage using persist middleware
- Include actions: [list actions]
- TypeScript interfaces for the store

Then show me how to use this store in a React Native component.
```

---

## 🎨 React Native Styling Guide

### Use StyleSheet, NOT Tailwind

```typescript
import { StyleSheet, View, Text } from 'react-native';

// ✅ CORRECT
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6A00',
  },
  button: {
    backgroundColor: '#FF6A00',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});

// ❌ WRONG - Don't use Tailwind
<View className="flex-1 bg-white p-4">  // This won't work!
```

### BazaarPH Mobile Theme

```typescript
// /mobile-app/src/theme/colors.ts
export const COLORS = {
  primary: '#FF6A00',
  primaryDark: '#E65F00',
  primaryLight: '#FF8533',
  
  background: '#FFFFFF',
  backgroundGray: '#F5F5F5',
  
  text: '#1A1A1A',
  textGray: '#666666',
  textLight: '#999999',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  border: '#E0E0E0',
  white: '#FFFFFF',
  black: '#000000',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: 'normal' },
  small: { fontSize: 14, fontWeight: 'normal' },
};
```

### Common React Native Components

```typescript
// Use these React Native components
import {
  View,          // Instead of <div>
  Text,          // Instead of <span>, <p>, <h1>
  Image,         // Instead of <img>
  ScrollView,    // Scrollable container
  FlatList,      // Optimized lists
  TouchableOpacity,  // Buttons/clickable items
  TextInput,     // Input fields
  SafeAreaView,  // Safe area for notches
  Modal,         // Modals/dialogs
  ActivityIndicator,  // Loading spinners
  Switch,        // Toggle switches
  Pressable,     // Advanced touch handling
} from 'react-native';
```

---

## 🌿 Git Workflow for Mobile App

### Daily Workflow

```bash
# 1. Start in mobile-app directory
cd BAZAARX/mobile-app

# 2. Switch to dev and pull latest
cd ..  # Go back to root
git checkout dev
git pull origin dev

# 3. Create your feature branch
git checkout -b feature/mobile-your-feature-name

# 4. Make your changes in /mobile-app directory
cd mobile-app
# ... edit files in /mobile-app/app/ or /mobile-app/src/ ...

# 5. Test your changes
npx tsc --noEmit  # Check TypeScript
npm start  # Test in Expo Go

# 6. Go back to root to commit
cd ..

# 7. Stage ONLY /mobile-app files
git add mobile-app/

# 8. Commit with clear message
git commit -m "feat(mobile): add product search screen"

# 9. Push your branch
git push origin feature/mobile-your-feature-name

# 10. Create Pull Request on GitHub
```

### Branch Naming Convention

**Format:** `feature/mobile-what-you-built`

**Examples:**
- `feature/mobile-buyer-profile-screen`
- `feature/mobile-seller-dashboard`
- `fix/mobile-cart-calculation-bug`
- `update/mobile-login-screen-ui`

---

## 📝 Commit Message Format

### Structure:
```
<type>(mobile): <description>

[optional body]
```

### Types:

| Type | Use For |
|------|---------|
| `feat(mobile):` | New features |
| `fix(mobile):` | Bug fixes |
| `update(mobile):` | Updates to existing features |
| `style(mobile):` | UI styling changes |
| `refactor(mobile):` | Code restructuring |

### Examples:

```bash
git commit -m "feat(mobile): add product filtering screen"
git commit -m "fix(mobile): resolve cart total calculation"
git commit -m "update(mobile): improve seller dashboard layout"
git commit -m "style(mobile): adjust button styles on checkout"
git commit -m "refactor(mobile): optimize product list rendering"
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
- **Compare:** `feature/mobile-your-feature-name`

**4. Write PR Description:**

```markdown
## 📋 Summary
Brief description of what this PR does for the mobile application.

## 🎯 Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] UI/UX improvement
- [ ] Code refactoring
- [ ] Documentation

## 📂 Files Changed (Mobile Only)
- mobile-app/app/[ScreenName].tsx
- mobile-app/src/components/[ComponentName].tsx
- mobile-app/src/stores/[storeName].ts

## 📱 Screenshots/Videos
[Attach screenshots from iOS/Android or screen recordings]

## ✅ Testing Checklist
- [ ] TypeScript has no errors (`npx tsc --noEmit`)
- [ ] Tested on iOS simulator/device
- [ ] Tested on Android emulator/device
- [ ] Tested different screen sizes
- [ ] Tested portrait and landscape (if applicable)
- [ ] No console warnings
- [ ] Animations are smooth (60fps)
- [ ] Touch targets are accessible

## 🧪 How to Test
1. Navigate to [screen/tab]
2. [Step by step testing instructions]

## 📱 Platform Compatibility
- [ ] iOS
- [ ] Android

## 📝 Additional Notes
[Any additional context, dependencies, or concerns]
```

**5. Request Review** from lead developer

**6. Wait for Approval** - Do not merge yourself

---

## ⚠️ Important Rules for Mobile Interns

### ❌ NEVER:
- Modify files in `/web`
- Use HTML elements (div, span, p, etc.)
- Use Tailwind CSS or web-specific styling
- Push directly to `main` or `prod`
- Commit `node_modules/` or `android/build/`
- Use `git push -f` (force push)
- Merge your own PR
- Commit environment files (`.env`)

### ✅ ALWAYS:
- Work in `/mobile-app` directory only
- Use React Native components (View, Text, etc.)
- Use StyleSheet.create() for styling
- Test on both iOS and Android
- Create feature branch from `dev`
- Add `(mobile)` in commit messages
- Only stage `/mobile-app` files: `git add mobile-app/`
- Write clear PR descriptions
- Request code review

---

## 🎯 React Native vs Web - Important Differences

| Web | React Native | Usage |
|-----|--------------|-------|
| `<div>` | `<View>` | Container |
| `<span>`, `<p>` | `<Text>` | Text content |
| `<img>` | `<Image>` | Images |
| `<button>` | `<TouchableOpacity>` | Buttons |
| `<input>` | `<TextInput>` | Input fields |
| `className` | `style` | Styling |
| CSS files | `StyleSheet.create()` | Styles |
| `onClick` | `onPress` | Touch events |
| `px`, `rem` | Numbers | Units |

```typescript
// ❌ WRONG (Web syntax)
<div className="container" onClick={handleClick}>
  <p>Hello</p>
  <button>Click me</button>
</div>

// ✅ CORRECT (React Native)
<View style={styles.container}>
  <Text>Hello</Text>
  <TouchableOpacity onPress={handlePress}>
    <Text>Click me</Text>
  </TouchableOpacity>
</View>
```

---

## 🔍 Code Review Checklist

Before submitting PR, verify:

- [ ] All files are in `/mobile-app` directory
- [ ] TypeScript has no errors (`npx tsc --noEmit`)
- [ ] Using React Native components (no HTML)
- [ ] Using StyleSheet.create() (no Tailwind)
- [ ] Components are properly typed
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] No console.logs left in code
- [ ] Responsive on different screen sizes
- [ ] Matches BazaarPH orange theme
- [ ] Comments added for complex logic
- [ ] No hardcoded values (use constants)

---

## 🆘 Troubleshooting

### "Cannot find module" error

```bash
cd mobile-app
npm install
```

### "Module not registered in the graph"

```bash
# Clear Metro bundler cache
npx expo start -c
```

### TypeScript errors

```bash
# Check errors
npx tsc --noEmit

# If you're stuck, ask AI:
"I'm getting TypeScript error in React Native: [error message]
In file: /mobile-app/app/[file].tsx
Please help me fix this for the mobile app."
```

### iOS simulator not opening

```bash
# List available simulators
xcrun simctl list devices

# Start specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Then run
npm run ios
```

### Android emulator not opening

```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_7_API_34

# Then run
npm run android
```

### Git conflicts in `/mobile-app`

```bash
# Update your branch with latest dev
git fetch origin
git merge origin/dev

# If conflicts in /mobile-app files:
# 1. Open conflicted files
# 2. Resolve conflicts
# 3. Test: cd mobile-app && npx tsc --noEmit
# 4. Commit: git add mobile-app/ && git commit -m "fix: resolve merge conflicts"
```

---

## 📚 Learning Resources

### React Native
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)

### Platform Guidelines
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design (Android)](https://m3.material.io/)

### State Management
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

### Components & UI
- [React Native Paper](https://reactnativepaper.com/)
- [React Native Elements](https://reactnativeelements.com/)

---

## 💡 Tips for Success

1. **Always specify "React Native" in AI prompts** - Prevents web code generation

2. **Test on both platforms:**
   ```bash
   npm run ios    # Test on iOS
   npm run android # Test on Android
   ```

3. **Use React Native debugger:**
   - Press `j` in Expo to open debugger
   - Use `console.log()` during development (remove before PR)

4. **Keep PRs small** - Easier to review, faster to merge

5. **Follow platform guidelines** - iOS and Android have different UX patterns

6. **Ask questions early** - Don't struggle alone

7. **Document your code** - Add comments for complex logic

8. **Performance matters** - Mobile devices are less powerful than desktops

---

## 📞 Getting Help

### When using AI:
```
"I'm a mobile app intern working on React Native in /mobile-app directory.
I need help with [specific problem].
File: /mobile-app/app/[path]
Platform: [iOS/Android/Both]
Error: [error message or description]
What I've tried: [list what you tried]

Please provide React Native solution (no web code)."
```

### When asking team:
- **Slack/Discord**: `#mobile-app` channel
- **GitHub Issues**: Create issue with `mobile` label
- **Lead Developer**: Tag in PR or Slack

---

## ✅ Pre-Push Checklist

Before every `git push`:

- [ ] I worked only in `/mobile-app` directory
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Used React Native components (no HTML)
- [ ] Used StyleSheet (no Tailwind)
- [ ] Code tested on iOS simulator/device
- [ ] Code tested on Android emulator/device
- [ ] Branch name starts with `feature/mobile-`
- [ ] Commit message includes `(mobile)`
- [ ] Only staged files from `/mobile-app`: `git add mobile-app/`

---

## 🎯 Your First Task

Try this to get started:

1. **Clone and setup:**
   ```bash
   git clone https://github.com/mozhdeveloper/BAZAARX.git
   cd BAZAARX
   git checkout dev
   cd mobile-app
   npm install
   ```

2. **Create a branch:**
   ```bash
   cd ..
   git checkout -b feature/mobile-my-first-component
   ```

3. **Ask AI to create a simple component:**
   ```
   I'm a mobile app intern working on React Native in /mobile-app directory.
   Create a simple HelloWorld component at /mobile-app/src/components/HelloWorld.tsx
   
   Requirements:
   - Use React Native View and Text components
   - Display "Hello, BazaarPH!" in orange color (#FF6A00)
   - Use TypeScript
   - Use StyleSheet.create() for styling
   - Center the text
   - Export as default
   
   Do NOT use HTML or Tailwind CSS.
   ```

4. **Test it:**
   ```bash
   cd mobile-app
   npx tsc --noEmit
   npm start
   ```

5. **Commit and push:**
   ```bash
   cd ..
   git add mobile-app/
   git commit -m "feat(mobile): add HelloWorld component"
   git push origin feature/mobile-my-first-component
   ```

6. **Create your first PR!**

---

## 🎨 Quick Styling Reference

```typescript
// Common styles you'll use
const styles = StyleSheet.create({
  // Layouts
  container: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Colors
  primary: {
    color: '#FF6A00',
  },
  background: {
    backgroundColor: '#FFFFFF',
  },
  
  // Typography
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  body: {
    fontSize: 16,
    color: '#666666',
  },
  
  // Common components
  button: {
    backgroundColor: '#FF6A00',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3, // Android shadow
  },
});
```

---

**Happy Coding! 🚀**

Remember: You're building the mobile experience for thousands of Filipino users. Every screen matters!
