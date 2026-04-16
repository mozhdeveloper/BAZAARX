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

- Thoroughly scan the mobile-app folder for you to understand the codespace and the task that will be given.
- Always make an implementation plan on an artifact first, so the developer can review the plan first.

# Main Task

- I have some issues. I want to fix them, but I want to make sure that I have a good plan before I start implementing the fixes. I will give you the issues one by one, and I want you to create a step-by-step plan for each issue. The plan should include the following:
   - The shipping feee calculation per seller is based on zones too right? But why when I chekcout an item from a seller that has no location provided, the shipping fee is still calculated? I want to make sure that the shipping fee is not calculated for sellers that have no location provided or when the location is invalid. Please create a plan to fix this issue.
   - Make sure that the calculation of shipping fee per seller is based on zones of the seller versus the buyer's address.
   - Make sure that that the user and the seller have provided a location and the system should validate it so the shipping fee calculation works properly. If the location is invalid, the system should prompt the user to update their location or select a valid address before proceeding with the checkout. Please create a plan to implement this feature.
   - For those seller with an international address, when the user selects a shipping method, the card should show this is a sample shipping fee for international address. Please create a plan to implement this feature. Maybe put the price on 70 pesos for now, and we can update it later when we have the actual fee. But for the local sellers, the shipping fee should be calculated based on the zones.
   - The table shipping_zones have a hardcoded list of cities and their corresponding zones. We need to make sure that this list is up to date, that's why instead of using a hardcoded list, we should use our react-native-maps library to get the location of the seller and buyer and calculate the zones based on that. Please create a plan to implement this feature.
   - We should be able to calculate the shipping fee using the react-native-maps of ours, with the formula of the service provider given and the weight/volume of the item. Please create a plan to implement this feature.



   ## Notes:

   - Update our [text](bxdsu_april15.md.resolved) for the updates that we will be doing. Date it April 16 2026, and make sure to include the details of the changes that we will be doing in the text. This will be used for our documentation and for our future reference.
