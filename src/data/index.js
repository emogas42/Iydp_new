// ─── Navigation items ───────────────────────────────────────
export const navItems = [
  {
    label: 'About',
    children: [
      { label: 'About IYDP', href: '/#about' },
      { label: 'Erasmus+ & ESC', href: '/erasmus' },
    ],
  },
  {
    label: 'Projects',
    children: [
      { label: 'Present Projects', href: '/projects' },
      { label: 'Finished Projects', href: '/projects/finished' },
    ],
  },
  { label: 'Events', href: '/events' },
  { label: 'Stories', href: '/stories' },
  { label: 'News', href: '/news' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

// ─── Stats ──────────────────────────────────────────────────
export const stats = [
  { value: 5000, suffix: '+', label: 'Youth served annually', color: '#00aef6' },
  { value: 300, suffix: '+', label: 'Join global programs yearly', color: '#7dba4e' },
  { value: 30, suffix: '+', label: 'Countries reached', color: '#f06e60' },
]

// ─── About / Objectives ─────────────────────────────────────
export const objectives = [
  {
    icon: 'Globe',
    text: 'Increase opportunities for youth to participate in international projects and programs.',
    color: '#00aef6',
  },
  {
    icon: 'MessageCircle',
    text: 'Implement initiatives that promote intercultural dialogue and cooperation.',
    color: '#6f3d90',
  },
  {
    icon: 'Sprout',
    text: 'Develop youth as active and responsible individuals capable of responding to global challenges.',
    color: '#7dba4e',
  },
  {
    icon: 'BookOpen',
    text: 'Support knowledge and skills development through non-formal education methods.',
    color: '#f06e60',
  },
  {
    icon: 'Handshake',
    text: 'Increase social integration of youth and support their role as active representatives of Azerbaijan in the international arena.',
    color: '#00aef6',
  },
]

// ─── ESC Features ───────────────────────────────────────────
export const escFeatures = [
  { icon: 'Star', title: 'ESC Quality Label', subtitle: 'Since 2020', color: '#00aef6' },
  { icon: 'Globe', title: 'Erasmus+ Partner', subtitle: 'Certified', color: '#6f3d90' },
  { icon: 'Users', title: 'Youth Exchanges', subtitle: 'EU & Beyond', color: '#7dba4e' },
  { icon: 'Award', title: 'Youthpass', subtitle: 'Recognized certificates', color: '#f06e60' },
]

// ─── FAQ ─────────────────────────────────────────────────────
export const faqs = [
  {
    question: 'What is Erasmus+?',
    answer: 'Erasmus+ is a program of the European Union that creates international learning and mobility opportunities in the fields of education, youth, and sport.',
    category: 'General',
  },
  {
    question: 'Who can participate in Erasmus+ projects?',
    answer: 'Usually, young people aged 18-30 can participate in Erasmus+ youth projects. However, the age limit may vary depending on the activity.',
    category: 'General',
  },
  {
    question: 'Are Erasmus+ projects funded?',
    answer: 'Most Erasmus+ projects are funded by the European Union. Accommodation, meals, visa, and program costs are usually covered. Travel expenses are reimbursed within a certain limit.',
    category: 'Programs',
  },
  {
    question: 'How long do Erasmus+ projects last?',
    answer: 'Youth exchanges usually last between 5-21 days, while training courses may last approximately 2-60 days.',
    category: 'Programs',
  },
  {
    question: 'Is it necessary to know English to participate?',
    answer: 'Most projects are conducted in English. However, a high level is not required. A basic level that allows you to communicate is usually sufficient.',
    category: 'Application',
  },
  {
    question: 'Do participants receive a certificate?',
    answer: 'Yes. At the end of the project, participants receive a Youthpass certificate, which recognizes the skills and competencies they gained.',
    category: 'Logistics',
  },
  {
    question: 'How can someone apply for Erasmus+ projects?',
    answer: 'Projects can be found through Erasmus+ platforms, by applying through local youth organizations like IYDP, or by following our social media pages.',
    category: 'Application',
  },
  {
    question: 'Is it necessary to be a student to participate?',
    answer: 'No. It is not necessary to be a student to participate in Erasmus+ youth projects. The program is open to young people from different backgrounds.',
    category: 'Application',
  },
  {
    question: 'Is a visa required to participate?',
    answer: 'This depends on the country where the project takes place. If the project is held in the Schengen area, Azerbaijani citizens usually need a Schengen visa. The hosting organization often provides an invitation letter.',
    category: 'Logistics',
  },
  {
    question: 'What do participants learn?',
    answer: 'Projects use non-formal education methods. Participants develop skills such as leadership, teamwork, communication, problem-solving, and awareness of various social topics.',
    category: 'Programs',
  },
]

// ─── Partners ────────────────────────────────────────────────
export const partners = [
  'Erasmus+',
  'European Solidarity Corps',
  'SALTO Eastern Europe & Caucasus',
  'Visegrad Fund',
  'Youth Express Network',
  'YEE – Youth and Environment Europe',
  'Azərbaycan Gənclər Fondu',
  'Azərbaycan Gənclər və İdman Nazirliyi',
]

// ─── Contact info ────────────────────────────────────────────
export const contactInfo = {
  email: 'info@iydp.org',
  phone: '+994 51 877 41 15',
  address: '13th floor, Globus Center, 609 Jafar Jabbarly Str., Baku',
}

// ─── Social links ────────────────────────────────────────────
export const socialLinks = [
  { platform: 'Facebook', url: 'https://www.facebook.com/iydp.az', icon: 'Facebook' },
  { platform: 'Instagram', url: 'https://www.instagram.com/iydp.az', icon: 'Instagram' },
  { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/iydp', icon: 'Linkedin' },
]
