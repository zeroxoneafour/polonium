# contributing

Here to help out? Add a new feature that you or someone else desires? Fix some bugs that are irking you?

This project is open to contribution from everyone, and I will probably accept the majority of pull requests. However, keep this in mind -

-   I do review all of the pull requests, so don't try anything sneaky or malicious.
-   You must follow the style guide below.
-   **DO NOT** format or beautify any preexisting files.

## style guide

-   Indent is always 4 spaces
-   All variable, property, and method names are camelCase, and all class names are PascalCase
-   Never use `if (condition) <statement>` or `for (loop) <statement>` without brackets
-   Never use namespaces if at all possible, and it almost always is possible. Look for the idiomatic TypeScript way
-   Use `const` instead of `let` anywhere possible

## opening an issue/pr

To open an issue about a bug, **you need a log**. If the issue is determined to be a bug and there is no log, **it will not be fixed**.

Because of the minimalist feature set of this project, many supposed bugs are features that I have not implemented yet. I will look at these cases, and you may not need a log. **Get one just in case.**

Pull requests are always open and, as I have said, most will be accepted. After I accept them, I may reformat them a bit or alter small things like variable names to better fit with the project. These changes, if present will likely be released in the next commit to master after I have accepted the request.

## changelog

When submitting a PR, it is expected that you update the changelog with the changes you made in your PR. Make sure to file these changes in the relevant section.

## documentation

Documentation should be written in Markdown wherever possible. Adding new and helpful documentation is always welcome. Make sure it looks correct before you submit it to be merged.
