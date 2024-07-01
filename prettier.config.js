module.exports = {
  printWidth: 120,
  tabWidth: 4,
  semi: true,
  singleQuote: false,
  bracketSpacing: true,
  overrides: [
    {
      files: ["*.yml", "*.yaml"],
      options: {
        parser: "yaml",
      },
    },
    {
      files: ["*.json", "*.jsonc"],
      options: {
        parser: "json",
      },
    },
  ],
  // Default parser for other file types
  parser: "typescript",
};