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


## Answer

- No, dont remove the carousel. We're just going to remove the featured under the dropdown of attributes
- The price sort will be going to combined with the attribute filter dropdown. So it will be like this: Price: High to Low, Low to High.
- The View All (mobile) and See All (web) navigation will stay the same. It will still navigate to the featured product listing page. The only thing we'll be removing is the "Featured" Under the attributes filter both on web and mobile.


# Clarifications

- The dropdown filters will only change its label again ONLY THE LABELS. The functionality will stay the same. Here:

Change:
Top Rated -> Rating
Newest Arrivals -> Newest
Best sellers -> Popularity

This should go the same for both web and mobile.

- AFter combining the attributes and price sort, add a default filter where it will show the randomized products.
- The layout, the logic, stays the same, we're only adding new filters and modifying the existing ones.
- The skeleton placeholder should be the same as the featured products skeleton placeholder.
- The price range filter should overwrite and remove the filter of the price: high to low vice versa (when combined) when the price range is activated. 


### IMPORTANT NOTE

- The web and mobile must be using the same logic for this for it to be consistent. 
- Make a comprehensive implementation plan for this.
