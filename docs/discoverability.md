# Project discoverability

Financial Digital Twin is a governance workspace for financial institutions. Its public entry points should explain the review workflow, distinguish the synthetic demo from the connected development stack, and link to reproducible evidence. Search visibility must not depend on unsupported production or regulatory claims.

## Repository entry points

- [README](../README.md): audience, problem, workflow, demo, and setup.
- [Product vision](product-vision.md) and [quickstart](quickstart.md): current scope and runnable paths.
- [GitHub settings guide](github-setup.md): repository description, homepage, and relevant topics.
- [Contribution guide](../CONTRIBUTING.md), issue forms, pull request template, security policy, and CODEOWNERS: maintenance and review expectations.
- [AGENTS.md](../AGENTS.md), scoped app instructions, and [agent guide](agent-guide.md): contributor contracts and progressive technical context.
- [Copilot instructions](../.github/copilot-instructions.md): a concise repository-specific entry point for supported GitHub tools.

Use topics that describe the actual audience, domain, and implementation. GitHub documents their discovery role and limits in its [repository topics guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics). Agent instruction support varies by client; see [GitHub's custom instruction documentation](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).

## Public demo metadata

The canonical demo URL is <https://safetymp.github.io/Financial-Digital-Twin-Compliance/>. The static export includes:

- A descriptive title and description, canonical URL, and Open Graph/Twitter sharing metadata.
- A local [social card](../apps/governance-console/public/social-card.png), with editable SVG source, and favicon.
- WebApplication and SoftwareSourceCode JSON-LD describing the demo and source repository without invented certifications, ratings, or adoption claims.
- A static `sitemap.xml` containing the public entry page.
- An advisory `llms.txt` documentation index, copied unchanged from the [root source](../llms.txt) during prebuild.

The connected development app requests `noindex, nofollow`; this is crawler guidance, not access control. No project-path `robots.txt` is shipped: robots directives apply at an origin's root, which this GitHub Pages project does not own. The repository's custom GitHub social preview is a separate setting from the demo's Open Graph image; upload the prepared PNG through repository Settings when a signed-in browser is available.

Clear content and correct metadata improve interpretation and sharing. They do not guarantee crawling, indexing, search position, rich results, or ingestion by an agent. `llms.txt` is an optional reading aid, not an authorization policy or a universally supported protocol. Google's [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) describes the relevant content and indexing principles.

## Verification and maintenance

Run from the repository root:

```bash
python3 scripts/check-project-docs.py
./scripts/publish-check.sh
npm test --prefix apps/governance-console
NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build --prefix apps/governance-console
```

The documentation check verifies local Markdown link destinations; it does not claim to check every external URL or heading fragment. The demo build verifies the emitted HTML metadata, structured data, canonical URL, sitemap, PNG dimensions, local assets, and byte-for-byte documentation index. Changes to `llms.txt` and the discovery checker trigger the Pages and governance integration workflows.

After deployment, check the public page, `sitemap.xml`, `llms.txt`, and `social-card.png` at the canonical base path. Confirm the interface still works and associate the deployment with its exact commit. Keep historic reviews and specifications clearly labeled; update current guides rather than rewriting old evidence as if it were newly verified.
