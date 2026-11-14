# Translating Aksharajanani

The interface is in English and Tamil. This guide explains how to update a translation or add a new interface language.

Most people using the app have never made a font. Translate for them: use everyday words in your language and avoid type-design terms (glyph, kerning, ligature, Latin) unless there is no other way. Prefer language names ("Tamil letters", "English letters") over script names.

## 1. Where the files are

```
locales/
  en.json            # the interface (English is the source)
  ta.json            # Tamil
  help/en.json       # the Help page
  help/ta.json
  tutorial/en.json   # the tutorial and tips
  tutorial/ta.json
```

Each file is a flat list of keys and texts:

```json
{
  "exportOtf": "Export Font",
  "changeScript": "My fonts"
}
```

Translate the texts on the right. Never change the keys on the left; a key's name doesn't always match its text any more (`changeScript` is the "My fonts" button), so go by the English text. Keep placeholders such as `{count}` and `{name}` exactly as they are. Their position in the sentence can change.

The app loads these files while it runs (from `/locales/…`); `vite.config.ts` copies the folder into the build.

## 2. Finding missing translations

```bash
npm run check:translations
```

This lists every key the code uses that is missing from a translation, with where it is used. It should print "None found" before a pull request.

## 3. Adding an interface language

1. Copy `locales/en.json`, `locales/help/en.json` and `locales/tutorial/en.json` to files named with your language code (for example `hi.json` for Hindi), and translate them.
2. Add the language to `availableLocales` in `contexts/LocaleContext.tsx`:

   ```typescript
   export const availableLocales: LocaleInfo[] = [
     { code: 'en', nativeName: 'English' },
     { code: 'ta', nativeName: 'தமிழ்' },
     { code: 'hi', nativeName: 'हिन्दी' },
   ];
   ```
3. Run `npm run dev`, choose the language on the start page, and go through the main screens: the start page, the letter grid, drawing a letter, Spacing, the Test page, export and Settings. Check on a phone-sized window too: long words can push buttons off the screen.

A missing key falls back to English. A few screens still have English written into the code (being moved into `locales/`), so not everything will change yet.

## 4. Words with more than one meaning

Look at the screen where a text appears before translating it. For example:
- **"Case"** can mean capital/small letters or a test case;
- **"Mark"** can mean an accent or vowel sign, or ticking a box;
- **"Spacing"** means the space between letters, not between lines.

If you're unsure, ask in a GitHub issue or pull request.

## 5. Sending a translation

1. Fork the repository and create a branch, for example `translate-hindi`.
2. Add or update the JSON files (and `LocaleContext.tsx` for a new language).
3. Run `npm run check:translations` and `npm run check`.
4. Open a pull request.

Thank you for helping more people make fonts in their own language.
