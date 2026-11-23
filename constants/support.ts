// Where "Contact Support" sends email (More tab, FAQ, Terms of Service).
export const SUPPORT_EMAIL = 'arafat@faqi.com.au';

/** mailto: link with a prefilled subject. */
export const supportMailto = (subject = 'FAQ Sports support') =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
