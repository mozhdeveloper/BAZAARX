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


## User Acceptance Criteria

- Filter Interaction Flow
1. User opens Product Listing Page
2. User selects one or more filters (price, category, rating, availability)
3. System updates product results immediately

- Filter Validation
4. Display only products matching selected filters
5. Multiple filters can be applied simultaneously

- Scroll / Pagination Flow (Hybrid)
6. System reloads results with 24 products initially
7. User scrolls → loads next 24 filtered products
8. Products append without refresh
9. Loading indicator is shown
10. No duplicate products

- State Persistence
11. Applied filters must remain active during scrolling

- Empty State
12. If no results → show “No products match your filters”




## Concerns

# General concern

- Missing default product listing. Right now, the product list is using the new arrivals as the default listing which is very wrong because its an attribute. Maybe add a default attribute on the sort by dropdown like the price dropdown sorter.

# Web


- What is the logic used for filtering the Top Rated? Is it the reviews or the total stars?
- What is the logic used for filtering Best Sellers? Is it the total sales or the reviews?
- The price range filter on the side overwrites the price sorter of the dropdown filter. For instance, when I select price high to low, it will show me the products from high to low price. But when I select the price range filter, it will show me the products in the price range regardless of the price sorter. That's a problem.


# Mobile

- The attribute filter label and probably the logic is in different with the web. Like the Best Match attribute, it shows the same result as the New Arrivals. I think it should be the same as the web, isnt it?
- Same concern as the web because it should be consistent with the web. 


# QA Assessment 

- The QA told us that its better to just combine the attributes and the price sorter into one filter dropdown. Price: High to Low, Low to High. Now, make a comprehensive implementation about this so I can review it myself.
- These updates should be applicable to both web and mobile.

# Main Task

- Check if all these concerns are already implemented in the codebase. If not, report back to me and add it into our implementation plan.
- Also check if there are any related problems existing within this scope of issue. If there is, report back to me and add it into our implementation plan.

## QA Changes

# Label Changes

- Top Rated -> Rating
Newest Arrivals -> Newest
Best sellers -> Popularity

Remove:
- Featured

# Filter Changes

Change:
- Make it into one sorting dropdown 
- Fix skeleton placeholder for loading products. (I know we have implemented this, but it wont show on web when the page is refershed. Only the featured products shows skeleton loading when the page is refereshed but I think the skeleton loading exists when filtering its just it renders fast making it to not appear anymore)



### High Priority Additional Task Consult (Can we do it today as well? with 100% confidence that its working?)

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
