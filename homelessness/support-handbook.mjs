import release,{rows,services,regionLabels} from './support-catalog.mjs?v=20261006-housing-scope';
export const handbookRegions=regionLabels;
export const handbookNeeds=release.issues.map(issue=>({id:issue.issue_id,title:issue.heading.replace(/^\d+\.\s*/,''),summary:issue.note||''}));
export const handbookDirectory=rows.map(row=>services[row.appearance_id]);
export const catalogueMetadata={version:'2026-10-05',verifiedDate:release.information_checked_on,records:release.counts.row_appearances,routes:release.counts.distinct_routes,catalogueIds:release.counts.catalogue_ids,needs:release.counts.issue_groups,scope:'Published resource routes; no live availability or individual eligibility assessment.'};
export const handbookLinks=Object.fromEntries(rows.map(row=>[row.appearance_id,[row.appearance_id]]));
export const handbookRouteAdditions={};
