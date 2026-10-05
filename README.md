# Northern Territory support resource pages

Two static, source-linked support finders:

- [Housing and homelessness](homelessness/) — people without a safe or stable home, families and workers in the NT.
- [Defence family support](defence/) — Defence members, veterans and families.

Both retain seven task-first topics. Relevant questions appear on the same page and contacts appear automatically once the necessary choices are complete. The first three contacts reflect the selected need, eligibility and local fit; additional relevant routes and the optional resource-detail browser remain available. Answers stay in memory and are not collected or submitted.

The verified public resource snapshot was checked on 5 October 2026:

| Demo | Issue groups | Distinct service routes | Issue-specific entries | Source catalogue IDs |
| --- | ---: | ---: | ---: | ---: |
| Housing and homelessness | 16 | 219 | 219 | 194 |
| Defence family support | 45 | 189 | 337 | 141 |

These counts describe routes and cross-listed entries, not unique providers or exhaustive coverage. Published audience, access rules, regional catchments, fees, uncertainty and check dates remain visible. The resource-detail browser preserves the supplied region order: NT-wide, Darwin/Palmerston, Katherine/Tindal, Tennant Creek/Barkly, Alice Springs, then other regional or remote areas. This order does not determine the first three support contacts.

Providers confirm current eligibility, hours, fees and availability. No live bed or appointment availability is supplied. NT Central Intake uses its published online referral route during the telephone outage; its non-urgent response window is retained. The Alice Springs Lutheran Care venue notice is retained. In immediate danger, call 000 directly from either page.

The demos share a stylesheet, while specific titles, audience descriptions, house/family symbols and accessible teal/blue treatments distinguish them. Lutheran Care branding is retained; the pages identify themselves as resource demos for review.

## Local checks

Run `node --test tests/*.test.mjs` for the routing, eligibility, contact-action and flow checks. Set `DEFENCE_VERIFIED_SOURCE` to the original public Defence JSON to additionally compare the embedded data against that handoff. The homelessness JSON and module are checked for exact equality.

Desktop and mobile browser verification covers visible details, repeated selections, Back/Forward, native radio focus, no-match recovery, telephone/source actions and 320/390 px reflow. Review screenshots and browser logs are stored separately from this public repository.
