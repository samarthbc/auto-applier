// Profile field definitions, shared by the options page and the form filler.
// `kw` are keywords matched (as whole words) against a form field's label / name / id / placeholder.
// The longest matching keyword wins, so keep specific phrases alongside generic ones.
globalThis.AA_FIELDS = [
  // Personal
  { key: 'firstName', group: 'Personal', label: 'First name', kw: ['first name', 'given name', 'fname', 'forename', 'firstname'] },
  { key: 'middleName', group: 'Personal', label: 'Middle name', kw: ['middle name', 'middle initial', 'mname'] },
  { key: 'lastName', group: 'Personal', label: 'Last name', kw: ['last name', 'surname', 'family name', 'lname', 'lastname'] },
  { key: 'fullName', group: 'Personal', label: 'Full name', kw: ['full name', 'your name', 'legal name', 'candidate name', 'applicant name', 'name', 'fullname'], hint: 'Leave blank to use first + last' },
  { key: 'preferredName', group: 'Personal', label: 'Preferred name', kw: ['preferred name', 'preferred first name', 'nickname'] },
  { key: 'email', group: 'Personal', label: 'Email', kw: ['email', 'e mail', 'email address', 'email id', 'mail id', 'gmail', 'mail'], type: 'email' },
  { key: 'phone', group: 'Personal', label: 'Phone', kw: ['phone', 'mobile', 'telephone', 'phone number', 'mobile number', 'contact number', 'cell'], type: 'tel' },
  { key: 'dob', group: 'Personal', label: 'Date of birth', kw: ['date of birth', 'dob', 'birth date', 'birthday'], hint: 'YYYY-MM-DD' },
  { key: 'gender', group: 'Personal', label: 'Gender', kw: ['gender', 'sex'] },
  { key: 'pronouns', group: 'Personal', label: 'Pronouns', kw: ['pronouns', 'pronoun'] },

  // Address
  { key: 'address1', group: 'Address', label: 'Address line 1', kw: ['address', 'street', 'street address', 'address line 1', 'address 1', 'address1'] },
  { key: 'address2', group: 'Address', label: 'Address line 2', kw: ['address line 2', 'address 2', 'address2', 'apartment', 'suite', 'apt'] },
  { key: 'city', group: 'Address', label: 'City', kw: ['city', 'town'] },
  { key: 'state', group: 'Address', label: 'State / Province', kw: ['state', 'province', 'region', 'state province'] },
  { key: 'zip', group: 'Address', label: 'Postal code', kw: ['zip', 'zip code', 'zipcode', 'postal', 'postal code', 'postcode', 'pin code', 'pincode'] },
  { key: 'country', group: 'Address', label: 'Country', kw: ['country', 'country of residence'] },
  { key: 'location', group: 'Address', label: 'Current location', kw: ['location', 'current location', 'where are you based', 'where are you located', 'city and country'], hint: 'e.g. Bengaluru, India' },

  // Links
  { key: 'linkedin', group: 'Links', label: 'LinkedIn', kw: ['linkedin', 'linkedin profile', 'linkedin url'], type: 'url' },
  { key: 'github', group: 'Links', label: 'GitHub', kw: ['github', 'github profile', 'github url'], type: 'url' },
  { key: 'portfolio', group: 'Links', label: 'Portfolio / Website', kw: ['portfolio', 'website', 'personal website', 'personal site', 'url', 'blog'], type: 'url' },
  { key: 'twitter', group: 'Links', label: 'Twitter / X', kw: ['twitter', 'x profile', 'twitter url'], type: 'url' },
  { key: 'otherLink', group: 'Links', label: 'Other link', kw: ['other link', 'other website', 'other url', 'additional link'], type: 'url' },

  // Work
  { key: 'currentCompany', group: 'Work', list: 'work', attr: 'company', label: 'Current company', kw: ['current company', 'current employer', 'company', 'employer', 'organization', 'company name', 'most recent employer'] },
  { key: 'currentTitle', group: 'Work', list: 'work', attr: 'title', label: 'Current title', kw: ['current title', 'job title', 'title', 'current role', 'designation', 'current position', 'current job title'] },
  { key: 'workStart', group: 'Work', list: 'work', attr: 'start', month: true, label: 'Start date', kw: ['start date', 'from date', 'date from', 'joining date', 'date of joining', 'started'] },
  { key: 'workEnd', group: 'Work', list: 'work', attr: 'end', month: true, label: 'End date', kw: ['end date', 'to date', 'date to', 'leaving date', 'relieving date', 'until'] },
  { key: 'workLocation', group: 'Work', list: 'work', attr: 'location', label: 'Job location', kw: ['job location', 'work location', 'office location', 'company location'] },
  { key: 'workDescription', group: 'Work', list: 'work', attr: 'description', label: 'Job description', kw: ['description', 'responsibilities', 'job description', 'role description', 'key responsibilities', 'roles and responsibilities'] },
  { key: 'experienceYears', group: 'Work', label: 'Years of experience', kw: ['years of experience', 'total experience', 'experience', 'years experience', 'work experience'] },
  { key: 'currentSalary', group: 'Work', label: 'Current salary', kw: ['current salary', 'current ctc', 'ctc', 'current compensation'] },
  { key: 'expectedSalary', group: 'Work', label: 'Expected salary', kw: ['expected salary', 'expected ctc', 'desired salary', 'salary expectation', 'salary expectations', 'expected compensation', 'desired compensation', 'salary'] },
  { key: 'noticePeriod', group: 'Work', label: 'Notice period / availability', kw: ['notice period', 'notice', 'availability', 'available to start', 'when can you start', 'earliest start date'] },
  { key: 'skills', group: 'Work', label: 'Skills', kw: ['skills', 'key skills', 'technical skills'], type: 'textarea' },
  { key: 'summary', group: 'Work', label: 'Summary / About me', kw: ['summary', 'about yourself', 'about you', 'tell us about yourself', 'bio', 'professional summary', 'introduce yourself'], type: 'textarea' },
  { key: 'coverLetter', group: 'Work', label: 'Cover letter (text)', kw: ['cover letter', 'coverletter', 'motivation', 'why are you interested'], type: 'textarea' },

  // Education
  { key: 'university', group: 'Education', list: 'education', attr: 'institution', label: 'University / College', kw: ['university', 'college', 'school', 'institution', 'school name', 'institute'] },
  { key: 'degree', group: 'Education', list: 'education', attr: 'degree', label: 'Degree', kw: ['degree', 'qualification', 'highest qualification', 'education level', 'highest degree'] },
  { key: 'major', group: 'Education', list: 'education', attr: 'major', label: 'Major / Field of study', kw: ['major', 'field of study', 'discipline', 'specialization', 'specialisation', 'branch'] },
  { key: 'gradYear', group: 'Education', list: 'education', attr: 'end', year: true, label: 'Graduation year', kw: ['graduation year', 'graduation date', 'year of graduation', 'passing year', 'year of passing', 'graduation'] },
  { key: 'gpa', group: 'Education', list: 'education', attr: 'grade', label: 'GPA / CGPA', kw: ['gpa', 'cgpa', 'grade', 'percentage'] },

  // Eligibility & other
  { key: 'workAuth', group: 'Eligibility & other', label: 'Authorized to work?', kw: ['authorized to work', 'authorised to work', 'work authorization', 'work authorisation', 'legally authorized', 'eligible to work', 'right to work', 'legally eligible'], hint: 'e.g. Yes' },
  { key: 'sponsorship', group: 'Eligibility & other', label: 'Need visa sponsorship?', kw: ['sponsorship', 'visa sponsorship', 'require sponsorship', 'need sponsorship', 'visa'], hint: 'e.g. No' },
  { key: 'relocate', group: 'Eligibility & other', label: 'Willing to relocate?', kw: ['relocate', 'relocation', 'willing to relocate', 'open to relocation'], hint: 'e.g. Yes' },
  { key: 'hearAbout', group: 'Eligibility & other', label: 'How did you hear about us?', kw: ['how did you hear', 'hear about', 'where did you hear', 'how did you find', 'referral source', 'source'], hint: 'e.g. LinkedIn' },
  { key: 'ethnicity', group: 'Eligibility & other', label: 'Ethnicity / Race', kw: ['ethnicity', 'race', 'ethnic'] },
  { key: 'veteran', group: 'Eligibility & other', label: 'Veteran status', kw: ['veteran', 'veteran status', 'protected veteran'] },
  { key: 'disability', group: 'Eligibility & other', label: 'Disability status', kw: ['disability', 'disability status', 'disabled'] },
];

// Fields with `list` come from the repeatable Work / Education entries instead of a single box:
// the 1st matching field on a form gets entry 1, the 2nd gets entry 2, and so on.

// Education levels. School levels (PU / 12th, 10th) are matched only when the form question names
// the level (e.g. "12th percentage", "PU college name"); degree-level questions use the other entries.
globalThis.AA_EDU_LEVELS = [
  { id: 'pg', label: "Postgraduate (Master's, PhD)" },
  { id: 'ug', label: "Undergraduate (Bachelor's)" },
  { id: 'diploma', label: 'Diploma' },
  { id: '12', label: 'PU / 12th', school: true, kw: ['12th', '12 th', 'xii', 'class 12', 'class xii', 'pu', 'puc', 'pre university', 'higher secondary', 'hsc', 'intermediate', 'senior secondary', 'plus two'] },
  { id: '10', label: '10th / SSLC', school: true, kw: ['10th', '10 th', 'class 10', 'class x', 'sslc', 'ssc', 'matriculation', 'matric', 'high school'] },
  { id: 'other', label: 'Other' },
];
// Keywords for each part of a school-level entry.
globalThis.AA_SCHOOL_ATTRS = {
  institution: ['school', 'college', 'institution', 'institute', 'school name', 'college name', 'name of school', 'name of college', 'name of institution'],
  board: ['board', 'board of education', 'examination board'],
  major: ['stream', 'major', 'specialization', 'subjects', 'combination', 'field of study'],
  end: ['year', 'passing year', 'year of passing', 'completion year', 'year of completion', 'graduation year'],
  grade: ['percentage', 'marks', 'grade', 'score', 'cgpa', 'gpa', 'aggregate', 'result'],
};

// Standard HTML autocomplete tokens → profile keys (most reliable signal when a site sets it).
globalThis.AA_AUTOCOMPLETE = {
  'given-name': 'firstName',
  'additional-name': 'middleName',
  'family-name': 'lastName',
  'name': 'fullName',
  'nickname': 'preferredName',
  'email': 'email',
  'tel': 'phone',
  'tel-national': 'phone',
  'bday': 'dob',
  'sex': 'gender',
  'street-address': 'address1',
  'address-line1': 'address1',
  'address-line2': 'address2',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'zip',
  'country': 'country',
  'country-name': 'country',
  'organization': 'currentCompany',
  'organization-title': 'currentTitle',
  'url': 'portfolio',
};
