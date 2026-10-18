// All portfolio copy (docs/PORTFOLIO_CONTENT.md §2–3). Components only render this.
// Dates are 'YYYY-MM' and formatted en-GB at render time.

/**
 * @typedef {{ label: string, href: string }} Link
 * @typedef {{ id: string, title: string, org?: string, body: string, tags: string[], links: Link[], note?: string }} Project
 * @typedef {{ company: string, location: string, start: string, end: string | null, role: string, bullets: string[], tags: string[], href?: string }} Role
 */

export const profile = {
  meta: {
    title: 'Joe Doherty · Full-stack software engineer',
    description:
      'Full-stack engineer with over a decade building everything from product sites to distributed systems. Currently building Tapp Cloud, a payments platform, at Tapp.',
  },

  hero: {
    name: 'Joe Doherty',
    role: 'Full-stack software engineer.',
    tagline: 'Curiosity compels me.',
    intro:
      'I’ve spent over a decade designing, building and running software, from simple product sites to distributed network systems. I like hard problems, good tools and working with people who’ll teach me something.',
    hint: 'Psst, click the dragon. (It’s me.)',
  },

  about: {
    // null renders a placeholder. Drop a photo at public/profile.jpg and set '/profile.jpg'.
    photo: null,
    paragraphs: [
      'I’m a self-taught engineer who works across the stack: interface design, APIs, databases, infrastructure and the automation that holds it together. I care about clear documentation, sensible standards and systems that are easy for the next person to pick up.',
      'I’m currently at Tapp, building Tapp Cloud, the web platform behind its payments services, from React front ends to serverless APIs and the telemetry that shows whether they’re healthy.',
      'Outside work I’m drawn to science, philosophy, linguistics, free and open source software, and making music and visual effects. I studied computing, maths and a mix of sciences and humanities before teaching myself the rest.',
    ],
  },

  work: {
    /** @type {Project[]} */
    professional: [
      {
        id: 'tapp-cloud',
        title: 'Tapp Cloud',
        org: 'Tapp',
        body: 'The web platform where merchants and partner platforms using Tapp’s payment services manage content, reporting and support. I design and build its admin and reporting interface, the serverless APIs behind it, and the telemetry behind its service-health dashboards.',
        tags: ['React', 'Vite', 'GraphQL', 'Node.js', 'AWS', 'MySQL', 'Adyen', 'Grafana', 'Sentry', 'Playwright'],
        links: [{ label: 'paytapp.co', href: 'https://paytapp.co' }],
      },
      {
        id: 'monica-vinader',
        title: 'Monica Vinader',
        org: 'D3R',
        body: 'Bespoke applications behind the jewellery brand’s e-commerce, customer relations, point of sale, operations and data analysis.',
        tags: ['PHP', 'MySQL', 'JavaScript', 'AWS'],
        links: [{ label: 'monicavinader.com', href: 'https://www.monicavinader.com/' }],
      },
      {
        id: 'qi',
        title: 'Collections on Qi',
        org: 'Keepthinking',
        body: 'Several projects on Keepthinking’s Qi collection and content management system for museums, archives and cultural organisations: transforming and importing collection data, business logic in SQL, and a complex site built single-handedly from Figma designs.',
        tags: ['PHP', 'CodeIgniter', 'Vue', 'Elasticsearch', 'MySQL'],
        links: [{ label: 'keepthinking.it', href: 'https://keepthinking.it' }],
      },
    ],
    /** @type {Project[]} */
    personal: [
      {
        id: 'voxel-dragon',
        title: 'Voxel dragon',
        body: 'The scene behind this page: a pixel-art sprite turned into thousands of animated voxels that react to your cursor, scrolling and clicks, driven by a composable effects engine.',
        tags: ['React', 'Three.js', 'React Three Fiber', 'Vite', 'Playwright'],
        links: [],
        note: 'You’re looking at it.',
      },
      {
        id: 'henhouse-panic',
        title: 'Henhouse Panic',
        body: 'A first-person farming panic in the browser: carry hens to the coops and hold off foxes with a shotgun and a flamethrower. A single-file Three.js game with keyboard and touch controls.',
        tags: ['Three.js', 'WebGL', 'JavaScript'],
        links: [
          { label: 'Play', href: 'https://spjz.github.io/henhouse-panic/' },
          { label: 'Source', href: 'https://github.com/spjz/henhouse-panic' },
        ],
      },
      {
        id: 'splitter-cell',
        title: 'Splitter Cell',
        body: 'A trippy cellular-automata art toy with live animation and graphics controls.',
        tags: ['Svelte', 'TypeScript', 'Vite'],
        links: [
          { label: 'Play', href: 'https://spjz.github.io/splitter-cell/' },
          { label: 'Source', href: 'https://github.com/spjz/splitter-cell' },
        ],
      },
    ],
    /** Off-the-clock profiles, shown under the personal projects. @type {Link[]} */
    elsewhere: [
      { label: 'Anime watch list', href: 'https://myanimelist.net/animelist/sPJz' },
      { label: 'Last.fm music charts', href: 'https://www.last.fm/user/Bjehsus/' },
    ],
  },

  /** @type {Role[]} */
  experience: [
    {
      company: 'Tapp',
      href: 'https://paytapp.co',
      location: 'Hilsea',
      start: '2025-05',
      end: null,
      role: 'Web developer',
      bullets: [
        'Design and build Tapp Cloud’s administrative and reporting interface for a payments platform.',
        'Implement business logic as serverless API resources, working closely with the mobile app developers.',
        'Collect telemetry for service-health dashboards, and promote standards, automation and documentation.',
        'Introduced AI-assisted development with LLM coding agents, significantly raising both the quality and the volume of the team’s output.',
        'Led performance optimisation, architectural reorganisation, dependency upgrades and security hardening across the front end and the APIs.',
        'Set up real-time error monitoring with Sentry, and continuous integration testing with Playwright end-to-end automation on every staging deploy.',
        'Migrated the entire API surface to a restructured, domain-based layout, keeping legacy clients working through HTTP proxy routing.',
      ],
      tags: ['Node.js', 'React', 'Vite', 'GraphQL', 'Tailwind CSS', 'MySQL', 'Docker', 'Adyen', 'AWS', 'Grafana', 'Sentry', 'Playwright'],
    },
    {
      company: 'Keepthinking',
      href: 'https://keepthinking.it',
      location: 'Southwark',
      start: '2024-07',
      end: '2025-05',
      role: 'Web developer',
      bullets: [
        'Full-stack development and maintenance of client sites for cultural organisations on Keepthinking’s Qi collection management system.',
        'Transformed and imported client data from varied formats into Qi, with business logic as SQL functions.',
        'Built a complex web application single-handedly from Figma designs: PHP (MVC, active record) behind Vue components.',
        'Deployed internal Docker services for LLM and translation APIs.',
      ],
      tags: ['PHP', 'CodeIgniter', 'Vue', 'Tailwind CSS', 'Elasticsearch', 'MySQL', 'SCSS', 'Docker', 'GitLab'],
    },
    {
      company: 'D3R',
      location: 'Chichester',
      start: '2023-01',
      end: '2023-07',
      role: 'Web developer',
      bullets: [
        'Full-stack development at an agile digital agency, building bespoke applications for Monica Vinader across e-commerce, CRM, point of sale, operations and data analysis.',
      ],
      tags: ['PHP', 'MySQL', 'JavaScript', 'Composer', 'Gulp', 'AWS', 'Vagrant', 'GitHub'],
    },
    {
      company: 'MindWorks Marketing',
      href: 'https://mindworks.co.uk',
      location: 'Emsworth',
      start: '2017-03',
      end: '2022-02',
      role: 'Software, network and systems engineer',
      bullets: [
        'Designed and built digital marketing solutions with a small creative team, for clients from local charities to international corporations, including several WordPress projects.',
        'Ran GitLab and other internal services, the network, VPN and IT support.',
        'Introduced continuous integration for automated build, test and deployment of client projects.',
      ],
      tags: ['PHP', 'Laravel', 'Symfony', 'React', 'MySQL', 'Linux', 'GitLab', 'Kubernetes'],
    },
    {
      company: 'Growbag Buddy',
      location: 'Warsash',
      start: '2016-10',
      end: '2017-02',
      role: 'Web development, marketing and administration',
      bullets: [
        'Built and ran a start-up’s entire online operation as a freelance consultant: website, intranet, email server, social media, directory listings and sales platforms.',
        'Also designed print marketing and ran the office and the CRM.',
      ],
      tags: ['PHP', 'Phalcon', 'Foundation', 'MySQL', 'Linux'],
    },
    {
      company: 'Just Develop It',
      location: 'Segensworth',
      start: '2016-04',
      end: '2016-07',
      role: 'Junior PHP developer',
      bullets: ['Back-end development for a VPN reseller subscription service and a website builder and CMS.'],
      tags: ['PHP', 'Phalcon', 'MySQL', 'Jira', 'Git Flow'],
    },
  ],

  earlier:
    'Laboratory assistant at Wickham Laboratories (2015–16) and customer service advisor at Innovation Group (2015). Earlier experience on request.',

  skills: [
    { name: 'Front end', items: ['React', 'Vue', 'Svelte', 'Lit', 'Redux', 'Nuxt', 'Tailwind CSS', 'TypeScript', 'JavaScript', 'HTML', 'CSS/SCSS', 'Three.js'] },
    { name: 'Back end & data', items: ['Node.js', 'Express', 'GraphQL', 'PHP (Laravel, Symfony, CodeIgniter, Phalcon)', 'MySQL', 'Elasticsearch', 'RabbitMQ'] },
    { name: 'Infrastructure', items: ['AWS', 'Docker', 'Kubernetes', 'Google Compute Engine', 'DigitalOcean', 'OVH', 'Nginx', 'Apache', 'Linux', 'macOS'] },
    { name: 'Ways of working', items: ['Architecture & design', 'Documentation', 'CI/CD', 'Observability (Grafana, Sentry)', 'Technical writing', 'Working with LLM agents'] },
  ],

  contact: {
    heading: 'Let’s build something.',
    body: 'I’m interested in projects where I can collaborate with other engineers, apply what I know and learn something new.',
    // Never stored whole: the user part is reversed and split, and each domain label is
    // reversed. assembleEmail() joins it in the browser after mount (§4).
    email: { user: ['murehp', 'esojrevapap'], domain: ['liamg', 'moc'] },
    links: [{ label: 'GitHub', href: 'https://github.com/spjz' }],
  },

  footer: { note: 'I am a dragon.' },
};

const reverse = (s) => [...s].reverse().join('');

/** @param {{ user: string[], domain: string[] }} parts */
export function assembleEmail(parts) {
  return `${reverse(parts.user.join(''))}@${parts.domain.map(reverse).join('.')}`;
}
