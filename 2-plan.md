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

## HIGH PRIORITY 

- First, can you give me a visualization on how the shipping fee cost flow in the checkout phase of the user. Iwant a comprehensive visualization on how to calculate the shipping cost based on the zone and the item itself. Where do you get the data to calculate it and how do you calculate it?

## Next Priority

- Hey agent, so I have tested the checkout flow and these is I found out:
  - For the international shipping do you add the 70 static shipping fee that I have implemented to the calculation of the weight/volume of the item based on the j&t?
  - For the zones, I have looked into the stores, for instance, the TehcHub Electronics store and Brookshire. I have found out that they TechHub Electronics store doesnt have Business Address provided but it is still able to calculate the shipping fee. How so?

## Error Handlings

- Edge Cases
- If shipping calculation fails for one seller group, system must show an error for that group and prevent order placement until resolved.
- If no address is selected, system must show a prompt to add or select an address before calculating shipping.
- If an item cannot be shipped to the selected address, system must clearly identify the affected item or seller group.
- If a selected shipping option becomes unavailable before placing the order, system must require the buyer to reselect another valid option.
- If no shipping method is available for a seller group, system must clearly show that checkout cannot proceed for that group.
- If shipping methods fail to load, system must allow the buyer to retry and must show a clear error message until successful.
- If ETA is not available, system must display fallback text such as “Delivery estimate unavailable”.
- Missing ETA must not break checkout if shipping itself is valid.
- If ETA changes after address or method update, the displayed value must refresh immediately."
- If the address becomes invalid after editing, system must not keep stale shipping values.
- If the selected area is not serviceable, system must clearly inform the buyer that delivery is unavailable to that address.
- If buyer has no saved address, system must prompt them to add or select an address before proceeding with shipping calculation.
