Load the `user-documentation` skill.

Work only on customer-facing documentation for the current Git repository. Do
not modify the engineering OpenWiki.

Arguments: $ARGUMENTS
Interpret as a feature, journey, guide path, or audience. If empty, audit the
coverage gap and propose the smallest next guide.

Steps:

1. Resolve the Git root and read `.documentation/config.yml`.
2. Identify the existing Help Center framework and content directory. Preserve
   it. Do not migrate without a concrete reason.
3. If no framework exists, select one using the adapter decision order. Stage
   setup files; do not install dependencies or change app routes without
   confirmation.
4. Investigate the actual product: routes, roles, navigation, menus, forms,
   buttons, permissions, prerequisites, success states, errors.
5. Verify exact UI labels against the running app or current components.
6. Write task-based guides using the 11-point anatomy. One primary task per
   article.
7. Request real screenshots from `documentation-screenshots` for visual steps.
   Never use mockups or fabricated UI.
8. Validate links, labels, permissions, expected results, and public safety.
9. Report framework, audience, articles, journeys, screenshots, and gaps.

Do not expose internal architecture, prompts, secrets, runbooks, or customer
data. Do not publish or deploy without authorization.
