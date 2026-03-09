/**
 * Centralized SMS Templates (EN/FR)
 * 
 * All outgoing SMS messages in both languages.
 * Template variables: {name}, {restaurant}, {partySize}, {waitTime}, {gracePeriod}
 */

const templates = {
  en: {
    confirmation: 
      `Hi {name} You\u2019re on the waitlist at {restaurant} for a table of {partySize}.\nEstimated wait time: {waitTime}. We\u2019ll text you when your table is ready.`,

    tableReady: 
      `Hi {name}! Your table for {partySize} at {restaurant} is ready.\nPlease arrive within {gracePeriod} minutes.\nReply Y to confirm or N to cancel.`,

    followUp: 
      `Hi {name} We\u2019re still holding your table at {restaurant}.\nPlease arrive within the next 7 minutes or your table may be released.\nReply Y to confirm or N to cancel.`,

    autoCancel: 
      `Hi {name}\nYour table at {restaurant} has been released because we did not see you arrive within the confirmed time window.\nPlease re-join the waitlist if you\u2019d still like to dine with us.`,

    cancelledByCustomer: 
      `Hi {name}! Your table at {restaurant} has been cancelled as requested.\nThanks for letting us know. You\u2019re welcome to re-join the waitlist anytime.`,

    cancelled: 
      `Hi {name}, your booking at {restaurant} has been cancelled. We hope to see you another time!`,

    invalidResponse: 
      `Invalid response. Please reply Y (Yes) or N (No) to confirm your booking.`
  },

  fr: {
    confirmation: 
      `Bonjour {name}, vous \u00eates sur la liste d\u2019attente de {restaurant} pour un groupe de {partySize}.\nTemps d\u2019attente estim\u00e9 : {waitTime}.\nNous vous enverrons un message lorsque votre table sera pr\u00eate.`,

    tableReady: 
      `Bonjour {name}, votre table pour {partySize} chez {restaurant} est pr\u00eate.\nMerci d\u2019arriver dans les {gracePeriod} minutes.\nR\u00e9pondez O pour confirmer ou N pour annuler.`,

    followUp: 
      `Bonjour {name}, nous conservons toujours votre table chez {restaurant}.\nMerci d\u2019arriver dans les 7 prochaines minutes, sinon votre table pourra \u00eatre lib\u00e9r\u00e9e.\nR\u00e9pondez O pour confirmer ou N pour annuler.`,

    autoCancel: 
      `Bonjour {name}, votre table chez {restaurant} a \u00e9t\u00e9 lib\u00e9r\u00e9e car nous ne vous avons pas vu arriver dans le d\u00e9lai confirm\u00e9.\nVeuillez rejoindre la liste d\u2019attente si vous souhaitez toujours d\u00eener avec nous.`,

    cancelledByCustomer: 
      `Bonjour {name} !\nVotre table chez {restaurant} a \u00e9t\u00e9 annul\u00e9e comme demand\u00e9.\nMerci de nous en avoir inform\u00e9s.\nVous pouvez rejoindre la liste d\u2019attente \u00e0 tout moment.`,

    cancelled: 
      `Bonjour {name}, votre r\u00e9servation chez {restaurant} a \u00e9t\u00e9 annul\u00e9e. Nous esp\u00e9rons vous revoir bient\u00f4t !`,

    invalidResponse: 
      `R\u00e9ponse invalide. Veuillez r\u00e9pondre O (Oui) ou N (Non) pour confirmer votre r\u00e9servation.`
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
