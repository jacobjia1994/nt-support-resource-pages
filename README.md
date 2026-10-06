# Northern Territory support resource pages

Two static, source-linked support finders:

- [Housing and homelessness](homelessness/) — people without a safe or stable home, families and workers in the NT.
- [Defence family support](defence/) — Defence members, veterans and families.

Both start from concrete tasks. Essential ID, phone and benefit-access help is visible on the housing page; posting and time apart lead to practical actions on the Defence page. The homepage shows compact entrances; related specific tasks appear after an entrance is chosen. Each task asks only the questions that change eligibility or contact order, one at a time. Every single-choice selection immediately advances to the next necessary question or shows the contacts; no repeated Next action is needed. Earlier answers remain editable, with Back, dependent-answer invalidation, native radio keyboard focus, browser Back/Forward history and no-match recovery preserved. The first three contacts reflect the selected need, eligibility and local fit; additional relevant routes and the optional resource-detail browser remain available. Answers stay in memory and are not collected or submitted. Start again clears current and remembered choices, eligibility, region, recovery context and resource filters, then returns to the homepage with heading focus. Existing browser history keeps its URLs but cannot restore pre-reset answers.

The source snapshot was checked on 5 October 2026. Scoped programme-description and issue-association corrections were checked on 6 October; only amended records receive the later date:

| Page | Issue groups | Distinct service routes | Issue-specific entries | Source catalogue IDs |
| --- | ---: | ---: | ---: | ---: |
| Housing and homelessness | 16 | 219 | 219 | 194 |
| Defence family support | 45 | 189 | 334 | 141 |

These counts describe routes and cross-listed entries, not unique providers or exhaustive coverage. Published audience, access rules, regional catchments, fees, uncertainty and check dates remain visible. The resource-detail browser preserves the supplied region order: NT-wide, Darwin/Palmerston, Katherine/Tindal, Tennant Creek/Barkly, Alice Springs, then other regional or remote areas. This order does not determine the first three support contacts.

Providers confirm current eligibility, hours, fees and availability. No live bed or appointment availability is supplied. NT Central Intake uses its published online referral route during the telephone outage; its non-urgent response window is retained. The Alice Springs Lutheran Care venue notice is retained. In immediate danger, call 000 directly from either page.

The pages share a stylesheet and established Lutheran Care branding. Specific prominent titles and house/family symbols distinguish them within a consistent navy, warm-orange and white palette. Titles use the available desktop width and wrap naturally on mobile. Public copy has no prototype or internal review labels and makes no claim of an approved official rollout.

## Local checks

Run `node --test tests/*.test.mjs` for the routing, eligibility, contact-action and flow checks. Set `DEFENCE_VERIFIED_SOURCE` to the current revised public Defence JSON to additionally compare the embedded data against that handoff. The homelessness JSON and module are checked for exact equality.

Desktop and mobile browser verification covers visible details, repeated selections, Back/Forward, native radio focus, no-match recovery, telephone/source actions and 320/390 px reflow. Review screenshots and browser logs are stored separately from this public repository.
