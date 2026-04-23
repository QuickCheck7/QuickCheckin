'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Home,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import Link from 'next/link';
import Image from 'next/image';
import { useI18nStore } from '@/lib/i18n';

const EMAIL = 'info@quickcheckin.ca';
const PHONE_DISPLAY = '+1 647-221-6677';
const PHONE_TEL = '+16472216677';
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 1200;

// ---------------- i18n strings ----------------
const STRINGS = {
  en: {
    navBack: 'Back to Home',
    title: 'Get in Touch',
    subtitle:
      "Ready to elevate your restaurant's waitlist experience? We're here to help.",
    emailUs: 'Email Us',
    callUs: 'Call Us',
    visitUs: 'Visit Us',
    city: 'Toronto, ON, Canada',
    visitNote: 'Book a meeting at our office.',
    quickResponse: 'Quick Response',
    avgReply: 'Average reply time: ~2 hours',
    commitment: 'We’re committed to helping you succeed.',
    responseWindow: 'We typically respond within 2–24 hours.',
    compose: 'Compose',
    copy: 'Copy',
    copied: 'Copied',
    call: 'Call',
    hours: 'Mon–Fri, 9:00 AM – 5:00 PM EST',
    headerFormTitle: 'Send us a Message',
    headerFormDesc: "Fill out the form below and we'll get back to you as soon as possible.",
    fullName: 'Full Name',
    required: '*',
    emailAddress: 'Email Address',
    company: 'Restaurant/Company',
    phoneNumber: 'Phone Number',
    topic: 'Topic',
    selectTopic: 'Select a topic',
    tSupport: 'Support',
    tSales: 'Sales',
    tPartnerships: 'Partnerships',
    tOther: 'Other',
    subject: 'Subject',
    message: 'Message',
    messageHelpMore: (n: number) => `${n} more characters to go`,
    messageHelpLeft: (n: number) => `${n} characters left`,
    consentText:
      "I agree to be contacted about my inquiry and understand my data will be handled according to QuickCheck's policies.",
    sending: 'Sending Message...',
    send: 'Send Message',
    preferEmail: 'Prefer email? Write to ',
    sentTitle: 'Message Sent 🎉',
    sentBody: 'Thanks for reaching out! We usually reply within 2–24 hours.',
    backHome: 'Back to Home',
    emailUsAction: 'Email us',
    // validation
    vName: 'Please tell us your name.',
    vEmailReq: 'Email is required.',
    vEmailValid: 'Enter a valid email.',
    vSubject: 'Subject is required.',
    vTopic: 'Please choose a topic.',
    vMessageReq: 'Message is required.',
    vMessageMin: (n: number) => `Please add at least ${n} characters.`,
    vMessageMax: (n: number) => `Please keep it under ${n} characters.`,
    vPhone: 'Enter a valid phone number (optional).',
    vConsent: 'Please confirm you agree to be contacted.',
    vBot: 'Bot detected.',
    // FAQ
    faqTitle: 'Frequently Asked Questions',
    faqSubtitle: 'Quick answers to common questions about QuickCheck',
    faqs: [
      {
        q: 'How quickly can we get started?',
        a: 'Most restaurants are up and running within 24–48 hours. We provide onboarding assistance to help you get set up.',
      },
      {
        q: 'Do you offer a free trial?',
        a: 'Yes! We offer a 1-month free trial with full access to all features.',
      },
      {
        q: 'What kind of support do you provide?',
        a: 'We offer email support and phone support during business hours, along with setup assistance and documentation.',
      },
      {
        q: 'What is the pricing?',
        a: 'We have two simple plans: Small ($299/month) for 50 seats or less, and Large ($499/month) for 51 seats or more. Both include all features and unlimited SMS.',
      },
    ],
    // autoresponse
    autoHi: (name: string) =>
      `Hi ${name || ''},\n\nThanks for contacting QuickCheck! We received your message and will reply soon.\n\n— QuickCheck Team`,
  },
  fr: {
    navBack: "Retour à l'accueil",
    title: 'Contactez-nous',
    subtitle:
      'Prêt à sublimer la gestion de vos listes d’attente ? Nous sommes là pour vous aider.',
    emailUs: 'Nous écrire',
    callUs: 'Nous appeler',
    visitUs: 'Nous rendre visite',
    city: 'Toronto, ON, Canada',
    visitNote: 'Prenez rendez-vous à notre bureau.',
    quickResponse: 'Réponse rapide',
    avgReply: 'Délai moyen de réponse : ~2 heures',
    commitment: 'Nous sommes engagés pour votre succès.',
    responseWindow: 'Nous répondons généralement sous 2 à 24 heures.',
    compose: 'Rédiger',
    copy: 'Copier',
    copied: 'Copié',
    call: 'Appeler',
    hours: 'Lun–Ven, 9:00 AM – 5:00 PM EST',
    headerFormTitle: 'Envoyez-nous un message',
    headerFormDesc:
      'Remplissez le formulaire ci-dessous et nous vous répondrons au plus vite.',
    fullName: 'Nom complet',
    required: '*',
    emailAddress: 'Adresse e-mail',
    company: 'Restaurant/Entreprise',
    phoneNumber: 'Numéro de téléphone',
    topic: 'Sujet',
    selectTopic: 'Choisir un sujet',
    tSupport: 'Support',
    tSales: 'Ventes',
    tPartnerships: 'Partenariats',
    tOther: 'Autre',
    subject: 'Objet',
    message: 'Message',
    messageHelpMore: (n: number) => `Encore ${n} caractères`,
    messageHelpLeft: (n: number) => `${n} caractères restants`,
    consentText:
      'J’accepte d’être contacté au sujet de ma demande et comprends que mes données seront traitées conformément aux politiques de QuickCheck.',
    sending: 'Envoi du message…',
    send: 'Envoyer le message',
    preferEmail: 'Vous préférez l’e-mail ? Écrivez à ',
    sentTitle: 'Message envoyé 🎉',
    sentBody:
      'Merci pour votre message ! Nous répondons généralement sous 2 à 24 heures.',
    backHome: "Retour à l'accueil",
    emailUsAction: 'Nous écrire',
    // validation
    vName: 'Merci d’indiquer votre nom.',
    vEmailReq: 'L’e-mail est requis.',
    vEmailValid: 'Entrez une adresse e-mail valide.',
    vSubject: 'L’objet est requis.',
    vTopic: 'Merci de choisir un sujet.',
    vMessageReq: 'Le message est requis.',
    vMessageMin: (n: number) => `Ajoutez au moins ${n} caractères.`,
    vMessageMax: (n: number) => `Limitez-vous à ${n} caractères.`,
    vPhone: 'Entrez un numéro valide (optionnel).',
    vConsent: 'Merci de confirmer votre accord pour être contacté.',
    vBot: 'Bot détecté.',
    // FAQ
    faqTitle: 'Questions fréquentes',
    faqSubtitle: 'Des réponses rapides aux questions courantes sur QuickCheck',
    faqs: [
      {
        q: 'En combien de temps peut-on démarrer ?',
        a: 'La plupart des restaurants sont opérationnels en 24–48 h. Nous assurons la configuration et la formation.',
      },
      {
        q: 'Proposez-vous un essai gratuit ?',
        a: 'Oui ! 1 mois avec accès complet à toutes les fonctionnalités. Sans carte bancaire.',
      },
      {
        q: 'Quel support proposez-vous ?',
        a: 'Support e-mail et téléphone aux horaires ouvrés, assistance à la configuration et documentation.',
      },
      {
        q: 'Quels sont les tarifs ?',
        a: 'Deux forfaits simples : Petit (299 $/mois) pour 50 places ou moins, et Grand (499 $/mois) pour 51 places ou plus. Les deux incluent toutes les fonctionnalités et SMS illimités.',
      },
    ],
    // autoresponse
    autoHi: (name: string) =>
      `Bonjour ${name || ''},\n\nMerci d’avoir contacté QuickCheck ! Nous avons bien reçu votre message et vous répondrons rapidement.\n\n— L’équipe QuickCheck`,
  },
} as const;

// ---------------- form model ----------------
const initialForm = {
  name: '',
  email: '',
  company: '',
  phone: '',
  subject: '',
  message: '',
  // spam honeypot (keep empty)
  website: '',
  consent: false as boolean,
  topic: '' as '' | 'Support' | 'Sales' | 'Partnerships' | 'Other',
};

type FormShape = typeof initialForm;
type Errors = Partial<Record<keyof FormShape, string>>;

// ------------------------------------------------

export default function ContactPage() {
  const { language } = useI18nStore();
  const lang = (language === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
  const s = STRINGS[lang];

  const [formData, setFormData] = useState<FormShape>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState<{ email?: boolean; phone?: boolean }>({});

  const chars = formData.message.length;
  const messageHelp =
    chars < MESSAGE_MIN
      ? s.messageHelpMore(MESSAGE_MIN - chars)
      : s.messageHelpLeft(Math.max(0, MESSAGE_MAX - chars));

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isValidPhone = (val: string) => !val || /^[+()\-\d\s]{7,}$/.test(val);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!formData.name.trim()) e.name = s.vName;
    if (!formData.email.trim()) e.email = s.vEmailReq;
    else if (!isValidEmail(formData.email)) e.email = s.vEmailValid;
    if (!formData.subject.trim()) e.subject = s.vSubject;
    if (!formData.topic) e.topic = s.vTopic;
    if (!formData.message.trim()) e.message = s.vMessageReq;
    else if (formData.message.length < MESSAGE_MIN) e.message = s.vMessageMin(MESSAGE_MIN);
    else if (formData.message.length > MESSAGE_MAX) e.message = s.vMessageMax(MESSAGE_MAX);
    if (!isValidPhone(formData.phone)) e.phone = s.vPhone;
    if (!formData.consent) e.consent = s.vConsent;
    if (formData.website) e.website = s.vBot; // honeypot
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  // Submit via FormSubmit AJAX to avoid redirect and stay on page
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // we’ll handle the POST manually
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      // Build the payload expected by FormSubmit AJAX API
      const payload: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        phone: formData.phone,
        topic: formData.topic || 'General',
        subject: formData.subject,
        message: formData.message,
        _subject: `QuickCheck Contact • ${formData.topic || 'General'} • ${formData.subject || ''}`,
        _template: 'table',
        _captcha: 'false',
        _autoresponse: s.autoHi(formData.name),
        // Honeypot (if filled, many services ignore or treat as spam)
        _honey: formData.website || '',
      };

      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(EMAIL)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // FormSubmit returns 200 with JSON { success: "..." } on OK
      if (!res.ok) {
        // Best-effort error surface
        const text = await res.text();
        throw new Error(text || 'Submission failed');
      }

      setIsSubmitted(true);
      setFormData(initialForm);
    } catch (err) {
      // If the AJAX call fails, you can optionally fall back to normal form POST by removing e.preventDefault,
      // but we keep it inline to stay on page. Show inline errors or a toast (not included here).
      setErrors((prev) => ({
        ...prev,
        subject:
          lang === 'fr'
            ? "Une erreur s'est produite. Réessayez ou écrivez-nous à l’adresse e-mail."
            : 'Something went wrong. Please try again or email us directly.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    return (
      formData.name &&
      formData.email &&
      isValidEmail(formData.email) &&
      formData.subject &&
      formData.topic &&
      formData.message.length >= MESSAGE_MIN &&
      formData.message.length <= MESSAGE_MAX &&
      formData.consent &&
      !isSubmitting
    );
  }, [formData, isSubmitting]);

  const copy = async (text: string, key: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 1500);
    } catch { }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-off flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-panel border border-border text-center shadow-soft">
          <CardContent className="pt-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold text-ink mb-3">{s.sentTitle}</h2>
            <p className="text-muted mb-6">{s.sentBody}</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/">
                <Button className="bg-primary hover:bg-primary-600 text-white">
                  <Home className="h-4 w-4 mr-2" />
                  {s.backHome}
                </Button>
              </Link>
              <a href={`mailto:${EMAIL}`}>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  {s.emailUsAction}
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off text-ink">
      {/* Navigation */}
      {/* <nav className="border-b border-border bg-panel/90 backdrop-blur supports-[backdrop-filter]:bg-panel/75 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
            >
              <Image src="/QuickCheck.svg" alt="QuickCheck Logo" width={36} height={36} />
              <span className="text-xl md:text-2xl font-display font-bold">QuickCheck</span>
            </Link>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <Link href="/">
                <Button variant="outline" className="border-ink/15 text-ink hover:bg-off">
                  <Home className="h-4 w-4 mr-2" />
                  {s.navBack}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav> */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Header */}
        <header className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-4 tracking-tight">
            {s.title}
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto">{s.subtitle}</p>
        </header>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Contact Information */}
          <aside className="lg:col-span-1 space-y-6">
            <Card className="bg-panel border border-border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg grid place-items-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink">{s.emailUs}</h3>
                    <p className="text-muted">
                      <a href={`mailto:${EMAIL}`} className="underline underline-offset-4 hover:text-ink">
                        {EMAIL}
                      </a>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(EMAIL, 'email')}>
                        {copied.email ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied.email ? s.copied : s.copy}
                      </Button>
                      <a href={`mailto:${EMAIL}`}>
                        <Button size="sm" className="bg-primary text-white hover:bg-primary-600">
                          {s.compose}
                        </Button>
                      </a>
                    </div>
                    <p className="text-xs text-muted mt-3">{s.responseWindow}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-panel border border-border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-sage/30 rounded-lg grid place-items-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink">{s.callUs}</h3>
                    <p className="text-muted">
                      <a href={`tel:${PHONE_TEL}`} className="underline underline-offset-4 hover:text-ink">
                        {PHONE_DISPLAY}
                      </a>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(PHONE_DISPLAY, 'phone')}>
                        {copied.phone ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied.phone ? s.copied : s.copy}
                      </Button>
                      <a href={`tel:${PHONE_TEL}`}>
                        <Button size="sm" className="bg-primary text-white hover:bg-primary-600">
                          {s.call}
                        </Button>
                      </a>
                    </div>
                    <p className="text-xs text-muted mt-3">{s.hours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="bg-panel border border-border shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg grid place-items-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink">{s.visitUs}</h3>
                    <p className="text-muted">{s.city}</p>
                    <p className="text-xs text-muted mt-3">{s.visitNote}</p>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            <Card className="bg-ink text-off shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-off/10 rounded-lg grid place-items-center">
                    <Clock className="h-6 w-6 text-off" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{s.quickResponse}</h3>
                    <p className="text-off/80">{s.avgReply}</p>
                    <p className="text-xs text-off/70 mt-3">{s.commitment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Contact Form (AJAX to FormSubmit) */}
          <section className="lg:col-span-2">
            <Card className="bg-panel border border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-2xl text-ink font-display">{s.headerFormTitle}</CardTitle>
                <CardDescription className="text-muted">{s.headerFormDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={`https://formsubmit.co/${EMAIL}`}
                  method="POST"
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  noValidate
                >
                  {/* Keep hidden helpers for parity, though AJAX handles them */}
                  <input
                    type="hidden"
                    name="_subject"
                    value={`QuickCheck Contact • ${formData.topic || 'General'} • ${formData.subject || ''}`}
                  />
                  <input type="hidden" name="_template" value="table" />
                  <input type="hidden" name="_captcha" value="false" />
                  {/* Removed _next to avoid redirection */}
                  <input type="hidden" name="_autoresponse" value={s.autoHi(formData.name)} />
                  {/* Honeypot recognized by FormSubmit */}
                  <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" />
                  {/* Your own honeypot */}
                  <div className="hidden">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-ink font-medium">
                        {s.fullName} <span className="text-error">{s.required}</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder={lang === 'fr' ? 'Jean Dupont' : 'John Doe'}
                        autoComplete="name"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                      />
                      {errors.name && (
                        <p id="name-error" className="text-error text-sm mt-2">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-ink font-medium">
                        {s.emailAddress} <span className="text-error">{s.required}</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder={lang === 'fr' ? 'jean@restaurant.com' : 'john@restaurant.com'}
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                      />
                      {errors.email && (
                        <p id="email-error" className="text-error text-sm mt-2">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="company" className="text-ink font-medium">
                        {s.company}
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder={lang === 'fr' ? 'Restaurant Bella Vista' : 'Bella Vista Restaurant'}
                        autoComplete="organization"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-ink font-medium">
                        {s.phoneNumber}
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder={lang === 'fr' ? '06 12 34 56 78' : '647-221-6677'}
                        autoComplete="tel"
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                      />
                      {errors.phone && (
                        <p id="phone-error" className="text-error text-sm mt-2">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="topic" className="text-ink font-medium">
                        {s.topic} <span className="text-error">{s.required}</span>
                      </Label>
                      <select
                        id="topic"
                        name="topic"
                        value={formData.topic}
                        onChange={handleInputChange}
                        className="mt-2 h-10 w-full rounded-md border border-border bg-panel px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-invalid={!!errors.topic}
                        aria-describedby={errors.topic ? 'topic-error' : undefined}
                        required
                      >
                        <option value="">{s.selectTopic}</option>
                        <option>Support</option>
                        <option>Sales</option>
                        <option>Partnerships</option>
                        <option>Other</option>
                      </select>
                      {errors.topic && (
                        <p id="topic-error" className="text-error text-sm mt-2">
                          {errors.topic}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="subject" className="text-ink font-medium">
                        {s.subject} <span className="text-error">{s.required}</span>
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder={
                          lang === 'fr'
                            ? 'Intéressé par QuickCheck pour mon restaurant'
                            : 'Interested in QuickCheck for my restaurant'
                        }
                        aria-invalid={!!errors.subject}
                        aria-describedby={errors.subject ? 'subject-error' : undefined}
                      />
                      {errors.subject && (
                        <p id="subject-error" className="text-error text-sm mt-2">
                          {errors.subject}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="message" className="text-ink font-medium">
                        {s.message} <span className="text-error">{s.required}</span>
                      </Label>
                      <span className={`text-xs ${chars < MESSAGE_MIN ? 'text-amber-700' : 'text-muted'}`}>
                        {messageHelp}
                      </span>
                    </div>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={(e) => {
                        if (e.target.value.length <= MESSAGE_MAX) handleInputChange(e);
                      }}
                      required
                      rows={6}
                      className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                      placeholder={
                        lang === 'fr'
                          ? 'Parlez-nous de votre établissement et de la façon dont nous pouvons aider…'
                          : 'Tell us about your restaurant and how we can help...'
                      }
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                    />
                    {errors.message && (
                      <p id="message-error" className="text-error text-sm mt-2">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Consent */}
                  <div className="space-y-2">
                    <label className="inline-flex items-start gap-3 select-none">
                      <input
                        type="checkbox"
                        name="consent"
                        checked={formData.consent}
                        onChange={handleInputChange}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        aria-invalid={!!errors.consent}
                        aria-describedby={errors.consent ? 'consent-error' : undefined}
                        required
                      />
                      <span className="text-sm text-muted">{s.consentText}</span>
                    </label>
                    {errors.consent && (
                      <p id="consent-error" className="text-error text-sm">
                        {errors.consent}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-primary hover:bg-primary-600 text-white py-3"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                        {s.sending}
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        {s.send}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted text-center">
                    {s.preferEmail}
                    <a className="underline underline-offset-4 hover:text-ink" href={`mailto:${EMAIL}`}>
                      {EMAIL}
                    </a>
                    .
                  </p>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* FAQ Section */}
        <section className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold mb-3">{s.faqTitle}</h2>
            <p className="text-muted">{s.faqSubtitle}</p>
          </div>

          <div className="mx-auto max-w-4xl space-y-4">
            {s.faqs.map((item, idx) => (
              <details key={idx} className="group rounded-lg border border-border bg-panel p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="font-medium text-ink">{item.q}</span>
                  <ChevronDown className="h-5 w-5 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
