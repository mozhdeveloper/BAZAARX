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

# Logic checking
- Does the product update actually duplicates every time? One is an update highlight and a message? Check if the automatic product tracker update is duplicating
- The date separator of the chat is placed below the conversation and its confusing. The date of the conversation must be placed on the top of the message.
- The message don't update real-time on both end (buyer and seller). Right now, the messages only reflect when they refresh the page entirely. That goes with the read and unread, and the bump to up feature where the profile of the user who messaged should bump to the top of the chatbox.