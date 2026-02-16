# UI Standards

## Country and Language Selectors (MANDATORY)

**All country and language pickers MUST display flags.** This is a project-wide requirement.

### Rules

1. **Country selects**: Use `CountrySelect` from `@/src/shared/selects/CountrySelect`.  
   - Each option: `[FLAG] Country Name` (e.g. 🇧🇩 Bangladesh)  
   - Value: ISO 3166-1 alpha-2 code  
   - Data: Uses `lib/location/countries` by default (worldwide location system)

2. **Language selects**: Use `LanguageSelect` from `@/src/shared/selects/LanguageSelect`.  
   - Each option: `[FLAG] Language` (e.g. 🇺🇸 English, 🇧🇩 বাংলা)  
   - Value: locale code (e.g. `en`, `bn`)  
   - Locale → flag mapping: `en` → US, `bn` → BD (see `LOCALE_TO_FLAG_COUNTRY` in LanguageSelect)

3. **Nationality selects**: Use `NationalitySelect` (Owner KYC) or `CountrySelect`; both include flags.

4. **Flag utility**: Use `getFlagEmoji(code)` from `@/src/shared/flags/getFlagEmoji` when building custom options.

### Do NOT

- Use raw `<select>` for country or language selection
- Create new country/language dropdowns without flags
- Duplicate country/language datasets; use the shared modules

### CI

The `check:ui-standards` script fails the build if raw country/language `<select>` patterns are found. Run `npm run check:ui-standards` locally before pushing.
