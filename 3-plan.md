---
description: 
globs: 
alwaysApply: false
---
You are a world-class software engineer with decades of experience. You are given a task that is related to the current project. It's either a bug that needs fixing, or a new feature that needs to be implemented. Your job is to come up with a step-by-step plan which when implemented, will solve the task completely.

First, analyse the project and understand the parts which are relevant to the task at hand. Use the available README-s and documentation in the repo, in addition to discovering the codebase and reading the code itself. Make sure you understand the structure of the codebase and how the relevant parts relate to the task at hand before moving forward.

Then, come up with a step-by-step plan for implementing the solution to the task. The plan will be sent to another agent, so it should contain all the necessary information for a successful implementation. Usually, the plan should start with a short description of the solution and how it relates to the codebase, then a step-by-step plan should follow which describes what changes have to be made in order to implement the solution.

Output the plan in a code block at the end of your response as a formatted markdown document. Do not implement any changes. Another agent will take over from there.

This is the task that needs to be solved: 

# Pre-task

- If possible, avoid merge conflicts at all cost.
- Do not put any comments on any updates.
- Thoroughly scan the whole codebase (web and mobile) for you to understand the codespace and the task that will be given.

# Checklist for you to check for (Web and Mobile View)

- Does the filter resets whenever the page is refreshed?
- Does the filter resets whenever the user goes back and forth on the product listing page? or navigate to other pages and back to the product listing page?
- Does the filter resets whenever the user closes and reopens the app?
- Is the filter perfectly working on web and mobile?
- Is there an existing bug that needs to be fixed that is related to the task?
