import type { AppConfig } from "./configSchema.js";

export function normalizeConfig(config: AppConfig) {
  const warnings: string[] = [];

  const normalizedEntities = config.entities.map((entity) => {
    const safeEntityName = entity.name.trim().toLowerCase().replace(/\s+/g, "_");

    const normalizedFields = entity.fields.map((field) => {
      let fieldType = field.type || "text";

      const allowedTypes = [
        "text",
        "email",
        "number",
        "select",
        "textarea",
        "date",
        "checkbox",
      ];

      if (!allowedTypes.includes(fieldType)) {
        warnings.push(
          `Field '${field.name}' in entity '${entity.name}' had unknown type '${fieldType}', defaulted to 'text'`
        );
        fieldType = "text";
      }

      return {
        name: field.name.trim(),
        type: fieldType,
        label: field.label || field.name,
        required: field.required ?? false,
        options: field.options || [],
      };
    });

    if (normalizedFields.length === 0) {
      warnings.push(`Entity '${entity.name}' has no fields`);
    }

    return {
      name: safeEntityName,
      label: entity.label || entity.name,
      fields: normalizedFields,
    };
  });

  return {
    normalizedConfig: {
      appName: config.appName,
      auth: {
        enabled: config.auth?.enabled ?? true,
        providers: config.auth?.providers ?? ["email"],
      },
      locales: config.locales ?? ["en"],
      defaultLocale: config.defaultLocale ?? "en",
      entities: normalizedEntities,
      translations: config.translations ?? {},
    },
    warnings,
  };
}