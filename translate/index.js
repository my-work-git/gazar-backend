import AM from './am';
import RU from './ru';
import EN from './en';

const known_languages = {
  am: AM,
  en: EN,
  ru: RU,
};

export default (keyword, lang) => {
  lang = lang.toLowerCase();
  if (!(lang in known_languages)) {
    return '';
  }

  if (keyword in known_languages[lang]) {
    return known_languages[lang][keyword];
  }

  return keyword;
};
