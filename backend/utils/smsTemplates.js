/**
 * Centralized SMS Templates (EN/FR)
 * 
 * All outgoing SMS messages in both languages.
 * Template variables: {name}, {restaurant}, {partySize}, {waitTime}, {gracePeriod}
 */

const templates = {
  en: {
    confirmation: 
      `QuickCheck: Hi {name}! You’re on the waitlist at {restaurant} for a table of {partySize}.\nEstimated wait time: {waitTime}. We’ll text you when your table is ready.\nReply STOP to opt out.`,

    tableReady: 
      `QuickCheck: Hi {name}! Your table for {partySize} at {restaurant} is ready.\nPlease arrive within {gracePeriod} minutes.\nReply Y to confirm or N to cancel. Reply STOP to opt out.`,

    followUp: 
      `QuickCheck: Hi {name}, We’re still holding your table at {restaurant}.\nPlease arrive within the next 7 minutes or your table may be released.\nReply Y to confirm or N to cancel. Reply STOP to opt out.`,

    autoCancel: 
      `QuickCheck: Hi {name}, Your table at {restaurant} has been released because we did not see you arrive within the confirmed time window.\nPlease re-join the waitlist if you’d still like to dine with us. Reply STOP to opt out.`,

    cancelledByCustomer: 
      `QuickCheck: Hi {name}! Your table at {restaurant} has been cancelled as requested.\nThanks for letting us know. You’re welcome to re-join the waitlist anytime.`,

    cancelled: 
      `QuickCheck: Hi {name}, your booking at {restaurant} has been cancelled. We hope to see you another time!`,

    invalidResponse: 
      `QuickCheck: Invalid response. Please reply Y (Yes) or N (No) to confirm your booking, or STOP to opt out.`
  },

  fr: {
    confirmation: 
      `QuickCheck : Bonjour {name}, vous êtes sur la liste d’attente de {restaurant} pour un groupe de {partySize}.\nTemps d’attente estimé : {waitTime}.\nNous vous enverrons un message lorsque votre table sera prête.\nRépondez STOP pour vous désabonner.`,

    tableReady: 
      `QuickCheck : Bonjour {name}, votre table pour {partySize} chez {restaurant} est prête.\nMerci d’arriver dans les {gracePeriod} minutes.\nRépondez O pour confirmer ou N pour annuler. Répondez STOP pour vous désabonner.`,

    followUp: 
      `QuickCheck : Bonjour {name}, nous conservons toujours votre table chez {restaurant}.\nMerci d’arriver dans les 7 prochaines minutes, sinon votre table pourra être libérée.\nRépondez O pour confirmer ou N pour annuler. Répondez STOP pour vous désabonner.`,

    autoCancel: 
      `QuickCheck : Bonjour {name}, votre table chez {restaurant} a été libérée car nous ne vous avons pas vu arriver dans le délai confirmé.\nVeuillez rejoindre la liste d’attente si vous souhaitez toujours dîner avec nous. Répondez STOP pour vous désabonner.`,

    cancelledByCustomer: 
      `QuickCheck : Bonjour {name} !\nVotre table chez {restaurant} a été annulée comme demandé.\nMerci de nous en avoir informés.\nVous pouvez rejoindre la liste d’attente à tout moment.`,

    cancelled: 
      `QuickCheck : Bonjour {name}, votre réservation chez {restaurant} a été annulée. Nous espérons vous revoir bientôt !`,

    invalidResponse: 
      `QuickCheck : Réponse invalide. Veuillez répondre O (Oui) ou N (Non) pour confirmer votre réservation, ou STOP pour vous désabonner.`
  }
};

/**
 * Get an SMS template in the specified language with variables replaced.
 * @param {string} templateKey - Template key (e.g., 'confirmation', 'tableReady')
 * @param {string} language - Language code ('en' or 'fr'), defaults to 'en'
 * @param {object} variables - Key-value pairs to replace in the template
 * @returns {string} Formatted SMS message
 */
const getSmsTemplate = (templateKey, language = 'en', variables = {}) => {
  const lang = templates[language] ? language : 'en';
  const template = templates[lang][templateKey];
  
  if (!template) {
    console.error(`[SMS Templates] Template "${templateKey}" not found for language "${lang}"`);
    return '';
  }

  let result = template;
  
  // Format name if present
  if (variables.name) {
    variables.name = variables.name
      .toLowerCase()
      .replace(/(?:^|\s|-)\S/g, l => l.toUpperCase());
  }

  // Format waitTime into hours/minutes if >= 60
  if (variables.waitTime !== undefined) {
    const minutes = parseInt(variables.waitTime, 10);
    if (!isNaN(minutes)) {
      if (minutes < 60) {
        variables.waitTime = `${minutes} ${lang === 'fr' ? 'minutes' : 'minutes'}`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remMins = minutes % 60;
        const hrStr = lang === 'fr' ? 'h' : (hours === 1 ? 'hr' : 'hrs');
        const minStr = lang === 'fr' ? 'min' : 'min';
        
        if (remMins === 0) {
          variables.waitTime = `${hours} ${hrStr}`;
        } else {
          variables.waitTime = `${hours} ${hrStr} ${remMins} ${minStr}`;
        }
      }
    }
  }

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
};

module.exports = {
  templates,
  getSmsTemplate
};
