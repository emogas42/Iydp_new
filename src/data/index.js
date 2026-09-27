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
      { label: 'Present Projects', href: '/opportunities' },
      { label: 'Finished Projects', href: '/opportunities?status=finished' },
    ],
  },
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

// ─── Programs (mock data) ───────────────────────────────────
export const programs = [
  {
    id: 1,
    title: 'ESC Volunteering in Barcelona',
    description: 'A 9-month volunteering placement in a youth center in Barcelona, working with local youth and refugees.',
    type: 'ESC Volunteering',
    location: 'Spain',
    duration: '9 months',
    participants: '1 volunteer',
    funding: 'Fully funded',
    status: 'Open',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 2,
    title: 'Youth Exchange: Green Future',
    description: 'A 10-day youth exchange in Tbilisi focusing on environmental sustainability and eco-activism.',
    type: 'Youth Exchange',
    location: 'Georgia',
    duration: '10 days',
    participants: '36 participants',
    funding: 'Erasmus+ funded',
    status: 'Open',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 3,
    title: 'Training Course: Digital Youth Work',
    description: 'A 6-day training course for youth workers on using digital tools in non-formal education.',
    type: 'Training Course',
    location: 'Türkiye',
    duration: '6 days',
    participants: '25 participants',
    funding: 'Erasmus+ funded',
    status: 'Open',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 4,
    title: 'Solidarity Project: Youth for Peace',
    description: 'A local solidarity project in Baku promoting peace-building and intercultural dialogue.',
    type: 'Solidarity Project',
    location: 'Azerbaijan',
    duration: '3 months',
    participants: '12 participants',
    funding: 'ESC funded',
    status: 'Closing Soon',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 5,
    title: 'ESC Volunteering in Krakow',
    description: 'A 6-month volunteering project in Krakow working with children in an after-school program.',
    type: 'ESC Volunteering',
    location: 'Poland',
    duration: '6 months',
    participants: '2 volunteers',
    funding: 'Fully funded',
    status: 'Open',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 6,
    title: 'Capacity Building: Youth Inclusion',
    description: 'A strategic partnership project aimed at enhancing youth organizations capacity for inclusive work.',
    type: 'Capacity Building',
    location: 'Italy',
    duration: '12 months',
    participants: '6 organizations',
    funding: 'Erasmus+ funded',
    status: 'Open',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=600',
  },
]

// ─── Stories (mock) ─────────────────────────────────────────
export const stories = [
  {
    id: 1,
    title: 'How ESC Changed My Perspective on Life',
    excerpt: 'When I first arrived in Berlin for my ESC project, I felt completely out of my comfort zone. Nine months later, I returned home a different person.',
    category: 'Volunteering',
    author: 'Leyla Mammadova',
    role: 'ESC Volunteer, Germany',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?auto=format&fit=facearea&facepad=2&q=80&w=100',
  },
  {
    id: 2,
    title: 'Bridging Cultures Through Youth Exchange',
    excerpt: 'The youth exchange in Portugal brought together 40 young people from 6 countries. We spent 10 incredible days exploring diversity.',
    category: 'Youth Exchange',
    author: 'Orkhan Aliyev',
    role: 'Participant, Portugal',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&q=80&w=100',
  },
  {
    id: 3,
    title: 'From Baku to Brussels: My Erasmus Journey',
    excerpt: 'Participating in the training course in Brussels was a turning point in my career as a youth worker. The skills I gained are irreplaceable.',
    category: 'Training',
    author: 'Nigar Hasanova',
    role: 'Youth Worker',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&q=80&w=100',
  },
]

// ─── News (mock) ────────────────────────────────────────────
export const newsItems = [
  {
    id: 1,
    title: 'IYDP Opens Applications for ESC 2025',
    date: '15 Jan 2025',
    category: 'Programs',
    excerpt: 'New volunteering placements available in 5 European countries for 2025.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 2,
    title: 'Youth Exchange Success in Georgia',
    date: '08 Jan 2025',
    category: 'Events',
    excerpt: 'Our latest youth exchange brought together 36 young people from 6 countries.',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 3,
    title: 'Partnership with YEE Announced',
    date: '01 Jan 2025',
    category: 'Partnerships',
    excerpt: 'IYDP and Youth and Environment Europe join forces for sustainability projects.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600',
  },
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
