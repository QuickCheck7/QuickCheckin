// content.ts
import type { Language } from '@/lib/i18n'
import { useI18nStore } from '@/lib/i18n'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BellRing,
  Building2,
  ClipboardList,
  LayoutDashboard,
  MailCheck,
  MessageCircle,
  Monitor,
  PlugZap,
  Repeat,
  Settings2,
  ShieldCheck,
  Tablet,
  Timer,
  UserCheck,
  UserRound,
} from 'lucide-react'

// ---------------- Types ----------------

export type NavLink = {
  label: string
  href: string
}

export type ButtonLink = {
  label: string
  href: string
}

type ProblemPoint = {
  title: string
  description: string
}

type OutcomeItem = {
  stat: string
  description: string
}

type FeatureHighlight = {
  icon: LucideIcon
  title: string
  description: string
}

type DemoMessage = {
  title: string
  body: string
  from?: 'quickcheck' | 'guest'
}

type IntegrationCard = {
  icon: LucideIcon
  title: string
  description: string
  bullets: string[]
}

type PlanPreview = {
  name: string
  price: string
  cadence?: string
  description: string
  highlight: string
  cta: ButtonLink
  featured?: boolean
  features?: string[]
}

export type FAQItem = {
  question: string
  answer: string
}

type FeatureCluster = {
  category: string
  summary: string
  items: FeatureHighlight[]
}

type FooterContent = {
  tagline: string
  description: string
  columns: {
    title: string
    links: NavLink[]
  }[]
  legal: NavLink[]
  copyright: string
}

type LandingContent = {
  hero: {
    eyebrow: string
    title: string
    description: string
    primaryCta: ButtonLink
    secondaryCta: ButtonLink
  }
  problemOutcome: {
    eyebrow: string
    title: string
    description: string
    problems: ProblemPoint[]
    outcomes: OutcomeItem[]
    note: string
    labels: {
      problemsHeading: string
      outcomesHeading: string
    }
  }
  features: {
    title: string
    description: string
    highlights: FeatureHighlight[]
  }
  liveDemo: {
    title: string
    description: string
    inputLabel: string
    helperText: string
    submitLabel: string
    successMessage: string
    messages: DemoMessage[]
    placeholder?: string
    replyHint?: string
    fallbackGuest?: string
  }
  integrations: {
    eyebrow: string
    title: string
    description: string
    cards: IntegrationCard[]
  }
  pricingPreview: {
    eyebrow: string
    title: string
    description: string
    plans: PlanPreview[]
    link: ButtonLink
  }
  testimonials: {
    title: string
    description: string
    brands: string[]
    quotes: {
      quote: string
      author: string
      role: string
    }[]
  }
  reliability: {
    eyebrow: string
    title: string
    description: string
    highlights: OutcomeItem[]
    link: ButtonLink
  }
  cta: {
    title: string
    description: string
    primaryCta: ButtonLink
    secondaryCta: ButtonLink
    trustBadges: string[]
  }
}

type PageHeroContent = {
  eyebrow?: string
  title: string
  description: string
  actions?: ButtonLink[]
}

type PricingContent = {
  hero: PageHeroContent
  plans: PlanPreview[]
  faq: FAQItem[]
  whatsIncluded: { title: string; description: string }
  includedItems: string[]
  faqSection: { title: string; description: string }
}

type FeaturesContent = {
  hero: PageHeroContent
  clusters: FeatureCluster[]
  simplePricing: {
    eyebrow: string
    title: string
    description: string
  }
  planHighlights: string[]
}

type MarketingContent = {
  announcement: string
  nav: {
    links: NavLink[]
    login: ButtonLink
    primaryCta: ButtonLink
  }
  landing: LandingContent
  pages: {
    features: FeaturesContent
    pricing: PricingContent
  }
  footer: FooterContent
}

// ---------------- Constants ----------------

const CURRENT_YEAR = 2025 as const

// ---------------- Content (EN + FR) ----------------

const content: Record<Language, MarketingContent> = {
  en: {
    announcement:
      'QuickCheck - Digital waitlist management for modern restaurants. Start your 1-month free trial today!',
    nav: {
      links: [
        { label: 'Home', href: '/' },
        { label: 'Features', href: '/features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Contact', href: '/contact' },
      ],
      login: { label: 'Log in', href: '/auth' },
      primaryCta: { label: 'Start free trial', href: '/pricing' },
    },
    landing: {
      hero: {
        eyebrow: 'Digital waitlists that text back',
        title: 'A modern digital waitlist and reservation system for restaurants.',
        description:
          'Reduce walk-offs, auto-notify guests, and track seating in real time. QuickCheck replaces clipboards with automated SMS flows built for the dinner rush.',
        primaryCta: { label: 'Start free trial', href: '/pricing' },
        secondaryCta: { label: 'View pricing', href: '/pricing' },
      },
      problemOutcome: {
        eyebrow: 'Problem & outcome',
        title: 'Give hosts back their focus and guests their confidence',
        description:
          'Manual processes make the host stand chaotic. QuickCheck automates messaging and seating, so service stays calm and organized.',
        problems: [
          { title: 'Manual notes', description: 'Hosts juggle clipboards and sticky notes that never stay in sync.' },
          { title: 'Missed calls', description: 'Guests give up when no one can answer the phone during the dinner rush.' },
          { title: 'Blocked tables', description: 'Tables sit empty while staff chase no-shows and outdated wait times.' },
          { title: 'No status updates', description: 'Guests stay in the dark, walk off, or crowd the host stand for updates.' },
        ],
        outcomes: [
          { stat: 'Fewer walk-offs', description: 'Automated SMS updates keep guests informed and eager to return.' },
          { stat: 'Faster table turns', description: 'Smart reassignment frees blocked tables the moment plans change.' },
          { stat: 'Happier staff & guests', description: 'Hosts focus on hospitality instead of spreadsheets and status calls.' },
        ],
        note: 'QuickCheck mirrors the steps your team already follows and adds automation where it matters.',
        labels: {
          problemsHeading: 'Pain points we eliminate',
          outcomesHeading: 'Outcomes restaurants see',
        },
      },
      features: {
        title: 'Key features built for busy floors',
        description:
          'Digital waitlists, two-way SMS, and smart seating combine into one platform that keeps your dining room humming.',
        highlights: [
          { icon: ClipboardList, title: 'Digital waitlists', description: 'Replace paper lists with synced kiosks, QR codes, and host tablets.' },
          { icon: MessageCircle, title: 'Two-way messaging', description: 'Guest replies update statuses instantly, so staff always know who is coming back.' },
          { icon: Monitor, title: 'Real-time dashboard', description: 'View party statuses, table availability, and pacing metrics from any device.' },
          { icon: Repeat, title: 'Smart follow-ups', description: 'Automated nudges reclaim tables while your hosts stay focused on guests.' },
        ],
      },
      liveDemo: {
        title: 'Try the guest experience',
        description:
          'Drop in a number to see the automated SMS flow guests receive. This demo is instant and only simulates the experience—no messages are sent.',
        inputLabel: 'Enter a mobile number',
        helperText: "We'll never send a message to this number—it powers the preview only.",
        submitLabel: 'Preview SMS flow',
        successMessage: 'Preview updated for {{number}}.',
        fallbackGuest: 'your guest',
        placeholder: '(555) 123-4567',
        // replyHint: 'Reply options: Y to confirm, N to release, STOP to opt out.',
        messages: [
          { title: 'Confirmation', body: "Thanks for joining the QuickCheck waitlist! We'll text you when your table is ready.", from: 'quickcheck' },
          { title: 'Table ready', body: 'Your table is ready at Willow & Rye. Reply Y to hold it for 15 minutes or N to release.', from: 'quickcheck' },
          { title: 'Guest reply', body: 'Y', from: 'guest' },
          { title: 'Confirmed', body: '', from: 'quickcheck' },
        ],
      },
      integrations: {
        eyebrow: 'Integrations',
        title: 'Works with your existing setup',
        description:
          'QuickCheck is designed to work alongside your existing operations with minimal setup required.',
        cards: [
          {
            icon: PlugZap,
            title: 'Easy setup',
            description:
              'Get started in minutes with our simple onboarding process. No complex integrations required.',
            bullets: [
              'Self-service kiosk setup',
              'SMS notifications via Telnyx',
              'Real-time dashboard access',
              'Export data anytime (CSV)',
            ],
          },
          {
            icon: ShieldCheck,
            title: 'Secure & reliable',
            description:
              'Your data is protected with industry-standard security measures.',
            bullets: [
              'Encrypted data transmission',
              'Secure cloud hosting on AWS',
              'Regular automated backups',
              'TCPA-compliant SMS messaging',
            ],
          },
        ],
      },
      pricingPreview: {
        eyebrow: 'Simple pricing',
        title: 'Two plans. No hidden fees. All features included.',
        description:
          'Choose based on your restaurant\'s seating capacity. Both plans include all features, unlimited SMS, and a 1-month free trial.',
        plans: [
          {
            name: 'Small',
            price: '$299',
            cadence: 'per month',
            description: 'For restaurants with 50 seats or less.',
            highlight: 'All features included',
            cta: { label: 'Start free trial', href: '/pricing' },
          },
          {
            name: 'Large',
            price: '$499',
            cadence: 'per month',
            description: 'For restaurants with 51 seats or more.',
            highlight: 'All features included',
            featured: true,
            cta: { label: 'Start free trial', href: '/pricing' },
          },
          {
            name: 'Multi-Location',
            price: 'Custom',
            description: 'For restaurant groups operating multiple locations.',
            highlight: 'Volume discounts available',
            cta: { label: 'Talk to sales', href: '/contact' },
          },
        ],
        link: { label: 'View detailed pricing', href: '/pricing' },
      },
      testimonials: {
        title: '',
        description: '',
        brands: [],
        quotes: [],
      },
      reliability: {
        eyebrow: 'Reliability & compliance',
        title: 'Built for restaurants that depend on uptime',
        description:
          'QuickCheck is hosted on AWS with redundancy built in. Your guest communications are protected and compliant.',
        highlights: [
          { stat: 'Cloud-hosted on AWS', description: 'Reliable infrastructure with automatic scaling and redundancy.' },
          { stat: 'SMS compliance', description: 'TCPA-compliant messaging with opt-out support and consent tracking.' },
          { stat: 'Data security', description: 'Encrypted connections and secure data storage for peace of mind.' },
        ],
        link: { label: 'Contact us about security', href: '/contact' },
      },
      cta: {
        title: 'Launch your digital waitlist in minutes',
        description:
          'Sign up for a free trial or schedule a guided demo to see how QuickCheck keeps guests informed and your dining room at capacity.',
        primaryCta: { label: 'Start free trial', href: '/pricing' },
        secondaryCta: { label: 'Talk to sales', href: '/contact' },
        trustBadges: ['Reliable performance', 'Realtime monitoring'],
      },
    },
    pages: {
      features: {
        hero: {
          eyebrow: 'Feature overview',
          title: 'Everything you need to manage your waitlist',
          description:
            'QuickCheck unifies guest check-in, two-way SMS messaging, seating management, and analytics in one simple platform.',
          actions: [
            { label: 'View pricing', href: '/pricing' },
            { label: 'Contact us', href: '/contact' },
          ],
        },
        clusters: [
          {
            category: 'Waitlist & kiosk',
            summary: 'Self-service check-in that keeps guests informed from arrival to seating.',
            items: [
              { icon: Tablet, title: 'Self check-in kiosk', description: 'Guests join the waitlist themselves with party size, name, and phone number.' },
              { icon: UserRound, title: 'Walk-ins welcome', description: 'Add walk-in customers to the queue quickly and easily.' },
              { icon: UserCheck, title: 'Party size management', description: 'Match parties to appropriately sized tables automatically.' },
            ],
          },
          {
            category: 'SMS messaging',
            summary: 'Two-way SMS that keeps guests in the loop and staff in control.',
            items: [
              { icon: MailCheck, title: 'Automated notifications', description: 'Table-ready alerts sent automatically when you notify a guest.' },
              { icon: BellRing, title: 'Smart reminders', description: 'Follow-up messages if guests don\'t respond within your set timeframe.' },
              { icon: ShieldCheck, title: 'Opt-out compliance', description: 'Automatic STOP keyword handling for TCPA compliance.' },
            ],
          },
          {
            category: 'Table management',
            summary: 'Keep tables moving with real-time status tracking.',
            items: [
              { icon: Timer, title: 'Wait time estimates', description: 'Automatic wait time calculations based on table turnover.' },
              { icon: LayoutDashboard, title: 'Table status board', description: 'See all tables at a glance - available, occupied, or being cleaned.' },
              { icon: Settings2, title: 'Easy overrides', description: 'Staff can adjust statuses, mark no-shows, or seat walk-ins instantly.' },
            ],
          },
          {
            category: 'Dashboard & analytics',
            summary: 'Understand your operations with real-time data.',
            items: [
              { icon: Monitor, title: 'Live dashboard', description: 'Monitor wait times, queue length, and table statuses in real time.' },
              { icon: BarChart3, title: 'Performance insights', description: 'Track seating efficiency and identify peak times.' },
              { icon: Building2, title: 'Message history', description: 'View all SMS conversations with guests in one place.' },
            ],
          },
        ],
        simplePricing: {
          eyebrow: 'Simple pricing',
          title: 'All features, every plan',
          description: 'Both Small and Large plans include all features. Choose based on your seating capacity—50 seats or less, or 51 seats or more.',
        },
        planHighlights: [
          'All features included in both Small and Large plans.',
          'Unlimited SMS messaging - no per-message fees.',
          'Onboarding assistance included with every plan.',
        ],
      },
      pricing: {
        hero: {
          eyebrow: 'Pricing',
          title: 'Simple, transparent pricing',
          description:
            'Choose based on your seating capacity. All features included in every plan. No hidden fees.',
          actions: [
            { label: 'Start free trial', href: '/pricing' },
            { label: 'Talk to sales', href: '/contact' },
          ],
        },
        plans: [
          {
            name: 'Small',
            price: '$299',
            cadence: 'per month',
            description: 'For restaurants with 50 seats or less.',
            highlight: '1-month free trial',
            features: [
              'Self check-in kiosk',
              'Unlimited SMS notifications',
              'Two-way guest messaging',
              'Real-time dashboard',
              'Table management',
              'Wait time estimates',
              'Message history',
              'Onboarding included',
            ],
            cta: { label: 'Start free trial', href: '/signup' },
          },
          {
            name: 'Large',
            price: '$499',
            cadence: 'per month',
            description: 'For restaurants with 51 seats or more.',
            highlight: '1-month free trial',
            features: [
              'Self check-in kiosk',
              'Unlimited SMS notifications',
              'Two-way guest messaging',
              'Real-time dashboard',
              'Table management',
              'Wait time estimates',
              'Message history',
              'Onboarding included',
            ],
            featured: true,
            cta: { label: 'Start free trial', href: '/signup' },
          },
          {
            name: 'Multi-Location',
            price: 'Talk to us',
            description: 'For restaurant groups with multiple locations.',
            highlight: 'Volume discounts available',
            features: [
              'Toutes les fonctionnalités des forfaits Petit et Grand',
              'Multiple location management',
              'Centralized billing',
              'Volume-based pricing',
              'Dedicated onboarding support',
            ],
            cta: { label: 'Contact sales', href: '/contact' },
          },
        ],
        faq: [
          { question: 'How long is the free trial?', answer: 'All plans include a 1-month free trial with full access to all features.' },
          { question: 'What payment methods do you accept?', answer: 'We accept all major debit and credit cards for monthly billing.' },
          { question: 'Can I cancel anytime?', answer: 'Yes. You can cancel your subscription at any time with no cancellation fees.' },
          { question: 'Are SMS messages included?', answer: 'Yes! Unlimited SMS messaging is fully included in your plan with no additional charges.' },
          { question: 'Is onboarding included?', answer: 'Yes. Guided onboarding is included with all plans to help you get started smoothly.' },
          { question: 'How do I know which plan to choose?', answer: 'Choose based on your restaurant\'s seating capacity. 50 seats or less = Small plan. 51 seats or more = Large plan.  Both plans include identical features.' },
        ],
        whatsIncluded: {
          title: "What's Included",
          description: 'Every plan includes everything you need to manage your waitlist.',
        },
        includedItems: [
          '1-month free trial - no charge during trial',
          'Unlimited SMS messaging - no per-message fees',
          'All features included - no tier restrictions',
          'Onboarding assistance included',
          'Cancel anytime - no long-term contracts',
        ],
        faqSection: {
          title: 'Frequently Asked Questions',
          description: 'Common questions about pricing, billing, and features.',
        },
      },
    },
    footer: {
      tagline: 'QuickCheck',
      description:
        'Digital waitlists with two-way SMS that keep your tables full and guests informed.',
      columns: [
        {
          title: 'Product',
          links: [
            { label: 'Features', href: '/features' },
            { label: 'Pricing', href: '/pricing' },
          ],
        },
        {
          title: 'Contact Us',
          links: [
            { label: 'Get in touch', href: '/contact' },
            { label: 'info@quickcheckin.ca', href: 'mailto:info@quickcheckin.ca' },
            { label: '+1 647-221-6677', href: 'tel:+16472216677' },
          ],
        },
      ],
      legal: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
      copyright: '\u00A9 ' + CURRENT_YEAR + ' QuickCheck. All rights reserved.',
    },
  },

  fr: {
    announcement:
      'QuickCheck - Gestion digitale des listes d\'attente pour les restaurants modernes. Commencez votre essai gratuit d\'1 mois !',
    nav: {
      links: [
        { label: 'Accueil', href: '/' },
        { label: 'Fonctionnalités', href: '/features' },
        { label: 'Tarifs', href: '/pricing' },
        { label: 'Contact', href: '/contact' },
      ],
      login: { label: 'Connexion', href: '/auth' },
      primaryCta: { label: 'Essai gratuit', href: '/pricing' },
    },
    landing: {
      hero: {
        eyebrow: 'Listes d\'attente numériques qui répondent',
        title: 'Un système moderne de liste d\'attente et de réservation numérique pour les restaurants.',
        description:
          'Réduisez les abandons, avertissez automatiquement les clients et suivez l\'occupation des tables en temps réel. QuickCheck remplace les carnets papier par des SMS automatisés.',
        primaryCta: { label: 'Essai gratuit', href: '/pricing' },
        secondaryCta: { label: 'Voir les tarifs', href: '/pricing' },
      },
      problemOutcome: {
        eyebrow: 'Problème & solution',
        title: 'Redonnez sérénité à vos hôtes et confiance à vos clients',
        description:
          'Les processus manuels rendent l\'accueil chaotique. QuickCheck automatise la messagerie et l\'attribution des tables, pour un service fluide et organisé.',
        problems: [
          { title: 'Notes manuscrites', description: 'Les hôtes jonglent entre carnets et post-it jamais synchronisés.' },
          { title: 'Appels manqués', description: 'Les clients abandonnent quand personne ne répond pendant le rush.' },
          { title: 'Tables bloquées', description: 'Des tables restent vides pendant qu\'on gère les absences.' },
          { title: 'Communication limitée', description: 'Les clients restent dans le flou et viennent demander des nouvelles.' },
        ],
        outcomes: [
          { stat: 'Moins d\'abandons', description: 'Des SMS automatisés tiennent les clients informés.' },
          { stat: 'Rotation accélérée', description: 'La réaffectation intelligente libère les tables rapidement.' },
          { stat: 'Équipes satisfaites', description: 'Les hôtes se concentrent sur l\'accueil.' },
        ],
        note: 'QuickCheck s\'adapte à vos méthodes et automatise ce qui compte.',
        labels: {
          problemsHeading: 'Problèmes que nous résolvons',
          outcomesHeading: 'Résultats constatés',
        },
      },
      features: {
        title: 'Fonctionnalités conçues pour les salles animées',
        description:
          'Listes d\'attente numériques, SMS bidirectionnels et gestion intelligente des tables réunis dans une plateforme simple.',
        highlights: [
          { icon: ClipboardList, title: 'Listes d\'attente digitales', description: 'Remplacez le papier par des kiosques et tablettes synchronisés.' },
          { icon: MessageCircle, title: 'Messagerie bidirectionnelle', description: 'Les réponses clients mettent à jour le statut en temps réel, pour que le personnel sache toujours qui revient.' },
          { icon: Monitor, title: 'Tableau de bord temps réel', description: 'Visualisez les statuts et la disponibilité des tables.' },
          { icon: Repeat, title: 'Relances intelligentes', description: 'Des rappels automatiques pour récupérer les tables.' },
        ],
      },
      liveDemo: {
        title: 'Testez l\'expérience client',
        description:
          'Saisissez un numéro pour visualiser le flux SMS automatisé. Démo instantanée, aucun message réel envoyé.',
        inputLabel: 'Entrez un numéro de mobile',
        helperText: 'Aucun SMS ne sera envoyé : ce numéro sert uniquement à la prévisualisation.',
        submitLabel: 'Prévisualiser le flux SMS',
        successMessage: 'Prévisualisation mise à jour pour {{number}}.',
        fallbackGuest: 'votre invité',
        placeholder: '06 12 34 56 78',
        // replyHint: 'Réponses possibles : Y pour confirmer, N pour libérer, STOP pour se désinscrire.',
        messages: [
          { title: 'Confirmation', body: 'Merci d\'avoir rejoint la liste d\'attente QuickCheck ! Nous vous avertirons quand votre table sera prête.', from: 'quickcheck' },
          { title: 'Table prête', body: 'Votre table est prête. Répondez O pour la garder 15 minutes ou N pour la libérer.', from: 'quickcheck' },
          { title: 'Réponse client', body: 'O', from: 'guest' },
          { title: 'Confirmé', body: '', from: 'quickcheck' },
        ],
      },
      integrations: {
        eyebrow: 'Intégrations',
        title: 'Fonctionne avec votre configuration existante',
        description:
          'QuickCheck est conçu pour fonctionner avec vos opérations existantes avec une configuration minimale.',
        cards: [
          {
            icon: PlugZap,
            title: 'Configuration simple',
            description:
              'Commencez en quelques minutes avec notre processus d\'intégration simple.',
            bullets: [
              'Configuration du kiosque en libre-service',
              'Notifications SMS via Telnyx',
              'Accès au tableau de bord en temps réel',
              'Export des données (CSV)',
            ],
          },
          {
            icon: ShieldCheck,
            title: 'Sécurisé et fiable',
            description:
              'Vos données sont protégées avec des mesures de sécurité standard.',
            bullets: [
              'Transmission de données chiffrée',
              'Hébergement cloud sécurisé sur AWS',
              'Sauvegardes automatiques régulières',
              'Messagerie SMS conforme TCPA',
            ],
          },
        ],
      },
      pricingPreview: {
        eyebrow: 'Tarifs simples',
        title: 'Deux forfaits. Pas de frais cachés. Toutes les fonctionnalités incluses.',
        description:
          'Choisissez en fonction de la capacité de votre restaurant. Les deux forfaits incluent toutes les fonctionnalités, SMS illimités et 1 mois d\'essai gratuit.',
        plans: [
          {
            name: 'Petit',
            price: '299 $',
            cadence: 'par mois',
            description: 'Pour les restaurants de 50 places ou moins.',
            highlight: 'Toutes fonctionnalités incluses',
            featured: false,
            cta: { label: 'Essai gratuit', href: '/pricing' },
          },
          {
            name: 'Grand',
            price: '499 $',
            cadence: 'par mois',
            description: 'Pour les restaurants de 51 places ou plus.',
            highlight: 'Toutes fonctionnalités incluses',
            featured: true,
            cta: { label: 'Essai gratuit', href: '/pricing' },
          },
          {
            name: 'Multi-établissements',
            price: 'Sur devis',
            description: 'Pour les groupes de restauration avec plusieurs établissements.',
            highlight: 'Remises volume disponibles',
            cta: { label: 'Contacter les ventes', href: '/contact' },
          },
        ],
        link: { label: 'Voir les tarifs détaillés', href: '/pricing' },
      },
      testimonials: {
        title: '',
        description: '',
        brands: [],
        quotes: [],
      },
      reliability: {
        eyebrow: 'Fiabilité et conformité',
        title: 'Conçu pour les restaurants qui dépendent de la disponibilité',
        description:
          'QuickCheck est hébergé sur AWS avec redondance intégrée. Vos communications avec les clients sont protégées et conformes.',
        highlights: [
          { stat: 'Hébergé sur AWS', description: 'Infrastructure fiable avec mise à l\'échelle automatique et redondance.' },
          { stat: 'Conformité SMS', description: 'Messagerie conforme TCPA avec support de désinscription.' },
          { stat: 'Sécurité des données', description: 'Connexions chiffrées et stockage sécurisé des données.' },
        ],
        link: { label: 'Contactez-nous pour la sécurité', href: '/contact' },
      },
      cta: {
        title: 'Lancez votre liste d\'attente digitale en quelques minutes',
        description:
          'Inscrivez-vous pour un essai gratuit ou planifiez une démo guidée pour découvrir comment QuickCheck garde vos clients informés et votre salle à pleine capacité.',
        primaryCta: { label: 'Essai gratuit', href: '/pricing' },
        secondaryCta: { label: 'Contacter les ventes', href: '/contact' },
        trustBadges: ['Performance fiable', 'Surveillance en temps réel'],
      },
    },
    pages: {
      features: {
        hero: {
          eyebrow: 'Aperçu des fonctionnalités',
          title: 'Tout ce dont vous avez besoin pour gérer votre liste d\'attente',
          description:
            'QuickCheck réunit l\'enregistrement client, la messagerie SMS bidirectionnelle, la gestion des tables et les analyses dans une plateforme simple.',
          actions: [
            { label: 'Voir les tarifs', href: '/pricing' },
            { label: 'Nous contacter', href: '/contact' },
          ],
        },
        clusters: [
          {
            category: 'Liste d\'attente & kiosque',
            summary: 'Enregistrement en libre-service qui informe les clients de l\'arrivée à l\'installation.',
            items: [
              { icon: Tablet, title: 'Kiosque libre-service', description: 'Les clients rejoignent la liste d\'attente avec leur taille de groupe, nom et téléphone.' },
              { icon: UserRound, title: 'Clients sans réservation', description: 'Ajoutez rapidement les clients sans réservation à la file.' },
              { icon: UserCheck, title: 'Gestion des groupes', description: 'Associez automatiquement les groupes aux tables de taille appropriée.' },
            ],
          },
          {
            category: 'Messagerie SMS',
            summary: 'SMS bidirectionnels qui informent les clients et simplifient le travail du personnel.',
            items: [
              { icon: MailCheck, title: 'Notifications automatiques', description: 'Alertes “table prête” envoyées automatiquement lorsque vous informez un client.' },
              { icon: BellRing, title: 'Rappels intelligents', description: 'Messages de suivi si les clients ne répondent pas dans le délai défini.' },
              { icon: ShieldCheck, title: 'Conformité désinscription', description: 'Gestion automatique du mot-clé STOP pour la conformité TCPA.' },
            ],
          },
          {
            category: 'Gestion des tables',
            summary: 'Gardez les tables en mouvement avec le suivi des statuts en temps réel.',
            items: [
              { icon: Timer, title: 'Estimations de temps d\'attente', description: 'Calculs automatiques du temps d\'attente basés sur la rotation des tables.' },
              { icon: LayoutDashboard, title: 'Tableau des statuts', description: 'Voyez toutes les tables d\'un coup d\'œil - disponible, occupée ou en nettoyage.' },
              { icon: Settings2, title: 'Ajustements faciles', description: 'Le personnel peut modifier les statuts, marquer les absences ou installer les clients sans réservation instantanément.' },
            ],
          },
          {
            category: 'Tableau de bord & analyses',
            summary: 'Comprenez vos opérations avec des données en temps réel.',
            items: [
              { icon: Monitor, title: 'Tableau de bord en temps réel', description: 'Surveillez les temps d\'attente, la longueur de la file et les statuts des tables.' },
              { icon: BarChart3, title: 'Indicateurs de performance', description: 'Suivez l\'efficacité de l\'installation et identifiez les heures de pointe.' },
              { icon: Building2, title: 'Historique des messages', description: 'Consultez toutes les conversations SMS avec les clients.' },
            ],
          },
        ],
        simplePricing: {
          eyebrow: 'Tarification simple',
          title: 'Toutes les fonctionnalités incluses dans chaque forfait',
          description: 'Les forfaits Petit et Grand incluent toutes les fonctionnalités. Choisissez selon votre capacité d\'accueil : 50 places ou moins, ou 51 places et plus.',
        },
        planHighlights: [
          'Toutes les fonctionnalités incluses dans les forfaits Petit et Grand.',
          'Messagerie SMS illimitée - pas de frais par message.',
          'Assistance à l\'intégration incluse avec chaque forfait.',
        ],
      },
      pricing: {
        hero: {
          eyebrow: 'Tarification',
          title: 'Tarifs simples et transparents',
          description:
            'Choisissez en fonction de votre capacité d\'accueil. Toutes les fonctionnalités incluses. Pas de frais cachés.',
          actions: [
            { label: 'Essai gratuit', href: '/pricing' },
            { label: 'Contacter les ventes', href: '/contact' },
          ],
        },
        plans: [
          {
            name: 'Petit',
            price: '299 $',
            cadence: 'par mois',
            description: 'Pour les restaurants de 50 places ou moins.',
            highlight: '1 mois d\'essai gratuit',
            features: [
              'Kiosque d\'enregistrement',
              'SMS illimités',
              'Messagerie bidirectionnelle',
              'Tableau de bord temps réel',
              'Gestion des tables',
              'Estimation des temps d\'attente',
              'Historique des messages',
              'Intégration incluse',
            ],
            cta: { label: 'Essai gratuit', href: '/signup' },
          },
          {
            name: 'Grand',
            price: '499 $',
            cadence: 'par mois',
            description: 'Pour les restaurants de 51 places ou plus.',
            highlight: '1 mois d\'essai gratuit',
            features: [
              'Kiosque d\'enregistrement',
              'SMS illimités',
              'Messagerie bidirectionnelle',
              'Tableau de bord temps réel',
              'Gestion des tables',
              'Estimation des temps d\'attente',
              'Historique des messages',
              'Intégration incluse',
            ],
            featured: true,
            cta: { label: 'Essai gratuit', href: '/signup' },
          },
          {
            name: 'Multi-établissements',
            price: 'Sur devis',
            description: 'Pour les groupes de restauration avec plusieurs établissements.',
            highlight: 'Remises volume disponibles',
            features: [
              'Toutes les fonctionnalités des forfaits Petit et Grand',
              'Gestion multi-établissements',
              'Facturation centralisée',
              'Tarification basée sur le volume',
              'Support d\'intégration dédié',
            ],
            cta: { label: 'Contacter les ventes', href: '/contact' },
          },
        ],
        faq: [
          { question: 'Quelle est la durée de l\'essai gratuit ?', answer: 'Tous les forfaits incluent 1 mois d\'essai gratuit avec accès complet à toutes les fonctionnalités. Aucune carte de crédit requise.' },
          { question: 'Quels moyens de paiement acceptez-vous ?', answer: 'Nous acceptons toutes les principales cartes de débit et de crédit pour la facturation mensuelle.' },
          { question: 'Puis-je annuler à tout moment ?', answer: 'Oui. Vous pouvez annuler votre abonnement à tout moment sans frais d\'annulation.' },
          { question: 'Les SMS sont-ils inclus ?', answer: 'Oui ! La messagerie SMS illimitée est entièrement incluse dans votre forfait sans frais supplémentaires.' },
          { question: 'L\'intégration est-elle incluse ?', answer: 'Oui, l\'assistance à l\'intégration est incluse avec tous les forfaits pour vous aider à démarrer.' },
          { question: 'Comment choisir le bon forfait ?', answer: 'Choisissez en fonction de la capacité de votre restaurant. 50 places ou moins : forfait Petit. 51 places et plus : forfait Grand. Les deux forfaits incluent les mêmes fonctionnalités.' },
        ],
        whatsIncluded: {
          title: 'Ce qui est inclus',
          description: 'Chaque forfait inclut tout ce dont vous avez besoin pour gérer votre liste d\'attente.',
        },
        includedItems: [
          '1 mois d\'essai gratuit - sans carte de crédit',
          'SMS illimités - pas de frais par message',
          'Toutes les fonctionnalités incluses \u2013 sans restrictions',
          'Assistance à l\'intégration incluse',
          'Annulez à tout moment \u2013 sans contrat à long terme',
        ],
        faqSection: {
          title: 'Questions fréquentes',
          description: 'Questions courantes sur les tarifs, la facturation et les fonctionnalités.',
        },
      },
    },
    footer: {
      tagline: 'QuickCheck',
      description:
        'Listes d\'attente numériques avec SMS bidirectionnels pour garder vos tables remplies et vos clients informés.',
      columns: [
        {
          title: 'Produit',
          links: [
            { label: 'Fonctionnalités', href: '/features' },
            { label: 'Tarifs', href: '/pricing' },
          ],
        },
        {
          title: 'Nous contacter',
          links: [
            { label: 'Contactez-nous', href: '/contact' },
            { label: 'info@quickcheckin.ca', href: 'mailto:info@quickcheckin.ca' },
            { label: '+1 647-221-6677', href: 'tel:+16472216677' },
          ],
        },
      ],
      legal: [
        { label: 'Politique de confidentialité', href: '/privacy' },
        { label: 'Conditions d\'utilisation', href: '/terms' },
      ],
      copyright: '\u00A9 ' + CURRENT_YEAR + ' QuickCheck. Tous droits réservés.',
    },
  },
}

// ---------- Server-safe selectors & (optional) hook-like accessors ----------

export function getMarketingContent(language?: Language): MarketingContent {
  const lang =
    language && content[language as keyof typeof content] ? language : 'en'
  return content[lang as keyof typeof content] ?? content.en
}

export function useMarketingContent() {
  const isServer = typeof window === 'undefined'
  if (isServer) {
    return content.en
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { language } = useI18nStore()
  return getMarketingContent(language)
}

/** Convenience accessors */
export const useNav = () => useMarketingContent().nav
export const useAnnouncement = () => useMarketingContent().announcement
export const useFooter = () => useMarketingContent().footer
export const useHero = () => useMarketingContent().landing.hero
export const usePricingPreview = () => useMarketingContent().landing.pricingPreview

// ---------- Named re-exports for components ----------
export const homeFeatureHighlights = content.en.landing.features.highlights
export const problemPoints = content.en.landing.problemOutcome.problems
export const positiveOutcomes = content.en.landing.problemOutcome.outcomes
export const complianceHighlights = content.en.landing.reliability.highlights

// Features & Pricing pages need these:
export const featureClusters = content.en.pages.features.clusters
export const pricingPlans = content.en.pages.pricing.plans
export const pricingFaq = content.en.pages.pricing.faq
