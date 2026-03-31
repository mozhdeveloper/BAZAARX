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


### Did you include this? If yes can you separate the walkthrough that you did for this? and the implementation plan that you've made so I can review it

# Acceptance Criteria

- "All Orders" Universal Sorting Update
Priority: High
Target: Buyer
[ ] [Web] Update the sorting logic for the "All Orders" tab to sort strictly by the last_updated_timestamp in descending order.
[ ] [Web] Ensure that any state change (e.g., Processing -> Shipped, Shipped -> Delivered) bumps that order to the top of the list upon refresh, not just cancellations.	

# Test Cases

- "All Orders" Universal Sorting Update (Justine)
TC1 (Web): Note the current order at the top of the "All Orders" list on the web application.
TC2 (Web): Trigger a status change (e.g., mark as "Shipped") for an older order located further down the list.
TC3 (Web): Refresh the "All Orders" tab and verify that the newly updated order has immediately moved to the very top of the list.
