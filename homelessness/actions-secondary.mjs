// Authored action pages. Row orders refer to the unchanged verified issue records.
export const secondaryPages = {
  'youth-housing': {
    title: 'Housing help for young people',
    intro: 'Tell the local youth service whether you need somewhere to stay now, support to stay safely at home, or help to plan a move.',
    issue: 6,
    sections: [
      { title: 'Crisis accommodation', orders: [4, 9, 11], note: 'Use the programme’s urgent contact. Ampe Akweke has a specific pregnancy and baby-care pathway.' },
      { title: 'Supported housing for a longer stay', orders: [5, 10] },
      { title: 'Help with housing options, family or living skills', orders: [6, 7, 8] }
    ],
    related: [
      { title: 'Family and school support', href: '#page/family-school' },
      { title: 'Leaving care or another service', href: '#page/leaving-service' }
    ]
  },
  'family-school': {
    title: 'Family and school support',
    intro: 'Ask for help with family pressures, parenting or a housing-related school move. If you are worried a child is unsafe, use the child-safety contact below.',
    issue: 6,
    sections: [
      { title: 'Find family support', orders: [1, 12, 13, 14] },
      { title: 'School enrolment, attendance and transport', orders: [3, 15] },
      { title: 'Concern about a child’s safety', orders: [2] }
    ],
    related: [
      { title: 'Housing help for young people', href: '#page/youth-housing' },
      { title: 'Transport and communication', href: '#page/transport-communication' }
    ]
  },
  visiting: {
    title: 'Visiting town or returning home',
    intro: 'Arrange a place to stay before travelling. For assisted return travel, talk through a safe destination where you want to go and the repayment arrangements.',
    issue: 5,
    sections: [
      { title: 'Help to return home', orders: [1, 5] },
      { title: 'Book a hostel while away from home', orders: [2, 3, 4, 6, 7] }
    ],
    related: [
      { title: 'Health care and medical travel', href: '#page/health-medical' },
      { title: 'Transport and communication', href: '#page/transport-communication' }
    ]
  },
  'health-medical': {
    title: 'Health care and medical travel',
    intro: 'For specialist travel, ask your clinic or travel office about approval before booking. For a health concern, choose health advice or a clinic in your area.',
    issue: 10,
    sections: [
      { title: 'Health advice and specialist travel', orders: [1, 2] },
      { title: 'Darwin and Palmerston health care', orders: [3] },
      { title: 'Katherine and Big Rivers health care', orders: [4, 5, 6] },
      { title: 'Barkly health care', orders: [7, 8, 9] },
      { title: 'Alice Springs and Central Australian health care', orders: [10, 11, 14] },
      { title: 'Arnhem health care', orders: [12, 13, 15, 16] }
    ],
    related: [
      { title: 'Visiting town or returning home', href: '#page/visiting' },
      { title: 'Disability, ageing and daily living', href: '#page/disability-ageing' },
      { title: 'Mental health support', href: '#page/mental-health' }
    ]
  },
  'mental-health': {
    title: 'Mental health support',
    intro: 'Choose a support line when you need to talk now, local walk-in help, or a service for ongoing counselling and support.',
    issue: 11,
    sections: [
      { title: 'Talk to someone now', orders: [1, 2, 3] },
      { title: 'Walk-in support', orders: [4, 6] },
      { title: 'Young people and family support', orders: [5, 7] },
      { title: 'Ongoing support and counselling', orders: [8, 9] }
    ],
    related: [
      { title: 'Health care and medical travel', href: '#page/health-medical' },
      { title: 'Alcohol and drug support', href: '#page/alcohol-drugs' }
    ]
  },
  'alcohol-drugs': {
    title: 'Alcohol and drug support',
    intro: 'Start with advice or an intake service to discuss treatment. For withdrawal or residential care, arrange the assessment before travelling.',
    issue: 12,
    sections: [
      { title: 'Advice and counselling', orders: [1, 3, 8] },
      { title: 'Withdrawal assessment and support', orders: [2, 18] },
      { title: 'Residential treatment and aftercare', orders: [4, 6, 7, 11, 13, 15, 16] },
      { title: 'Young people’s treatment and outreach', orders: [5, 19] },
      { title: 'Sobering care', orders: [9, 12, 14, 17, 20], note: 'These are specific sobering-care pathways, separate from general accommodation and medical withdrawal treatment.' },
      { title: 'Harm reduction and practical care', orders: [10] }
    ],
    related: [
      { title: 'Mental health support', href: '#page/mental-health' },
      { title: 'Housing after treatment or another service', href: '#page/leaving-service' }
    ]
  },
  'disability-ageing': {
    title: 'Disability, ageing and daily living',
    intro: 'Ask an assessment or local support team about care and help with daily tasks. For a problem with a service or decision, choose independent advocacy.',
    issue: 13,
    sections: [
      { title: 'Arrange an assessment or find a support pathway', orders: [1, 2, 5, 16] },
      { title: 'Help at home and with daily living', orders: [7, 8, 9, 12, 14, 15, 17, 18, 19] },
      { title: 'Supported living and housing', orders: [13] },
      { title: 'Support for unpaid carers', orders: [3] },
      { title: 'Independent care and disability advocacy', orders: [4, 6, 10, 11] }
    ],
    related: [
      { title: 'Health care and medical travel', href: '#page/health-medical' },
      { title: 'Transport and communication', href: '#page/transport-communication' },
      { title: 'Legal advice and complaints', href: '#page/legal' }
    ]
  },
  'leaving-service': {
    title: 'Leaving hospital, care, custody or temporary housing',
    intro: 'Tell your current worker if you have no safe place to go. Start planning housing, income, documents and support before discharge or release.',
    issue: 14,
    sections: [
      { title: 'Hospital discharge and mental health recovery', orders: [1, 6] },
      { title: 'Custody, release and reintegration', orders: [3, 4, 5, 10], note: 'For the combined TeamHEALTH listing, ask which of its two programmes fits your situation.' },
      { title: 'Leaving out-of-home care', orders: [2] },
      { title: 'Transitional housing after violence or homelessness', orders: [7, 8], note: 'Home Safe has a family-violence pathway. Ladybird House provides non-crisis transitional housing.' },
      { title: 'Housing after alcohol or drug treatment', orders: [9] }
    ],
    related: [
      { title: 'Housing help for young people', href: '#page/youth-housing' },
      { title: 'Legal advice and complaints', href: '#page/legal' }
    ]
  },
  legal: {
    title: 'Legal advice and complaints',
    intro: 'Call early about notices, court dates or appeal deadlines. Keep the notice or decision if available and explain the help you need.',
    issue: 15,
    sections: [
      { title: 'Legal advice and referrals', orders: [1, 2, 3] },
      { title: 'Public housing decisions and appeals', orders: [4] },
      { title: 'Discrimination and identity-related legal help', orders: [5, 8] },
      { title: 'Complaints about government services', orders: [6, 7] },
      { title: 'Family matters, violence and women’s legal services', orders: [9, 10, 11, 12, 13, 14] }
    ],
    related: [
      { title: 'Interpreting and communication support', href: '#page/transport-communication' },
      { title: 'Family and school support', href: '#page/family-school' }
    ]
  },
  'transport-communication': {
    title: 'Transport and communication',
    intro: 'Choose help to make a call, reach a service, or work through forms and referrals. For local safety transport, contact the patrol serving your community.',
    issue: 16,
    sections: [
      { title: 'Interpreting and phone relay', orders: [1, 2, 3] },
      { title: 'Public buses and community transport', orders: [6, 10, 11] },
      { title: 'Local safety patrols', orders: [5, 9, 12, 13, 14, 15] },
      { title: 'Refugee and migrant settlement support', orders: [7, 8] },
      { title: 'Housing-related navigation for veterans and families', orders: [4], note: 'A service-coordination and referral contact for eligible veterans and families facing housing difficulties.' }
    ],
    related: [
      { title: 'Visiting town or returning home', href: '#page/visiting' },
      { title: 'Legal advice and complaints', href: '#page/legal' }
    ]
  }
};
