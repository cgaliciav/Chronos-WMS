/* eslint-disable import/no-extraneous-dependencies */

// Overriding CreateReactApp settings, ref: https://github.com/arackaf/customize-cra
const {
  override,
  // fixBabelImports,
  addLessLoader,
  useEslintRc,
  addDecoratorsLegacy,
  useBabelRc,
} = require('customize-cra')

const WebpackBar = require('webpackbar');
// eslint config
const eslintConfig = require('./.eslintrc.js');

const useEslintConfig = configRules => config => {
  const updatedRules = config.module.rules.map(
    rule => {
      // Only target rules that have defined a `useEslintrc` parameter in their options
      // eslint-disable-next-line no-void
      if (rule.use && rule.use.some(use => use.options && use.options.useEslintrc !== void 0)) {
        const ruleUse = rule.use[0]
        const baseOptions = ruleUse.options
        const baseConfig = baseOptions.baseConfig || {}
        const newOptions = {
          useEslintrc: false,
          ignore: true,
          baseConfig: { ...baseConfig, ...configRules },
        }
        ruleUse.options = newOptions
        return rule

        // Rule not using eslint. Do not modify.
        /* eslint-disable no-else-return */
      } else {
        return rule
      }
    }
  )

  config.module.rules = updatedRules;
  return config;
}

const addWebpackBar = config => {
  config.plugins.push(new WebpackBar());
  return config;
};

module.exports = override(
  addDecoratorsLegacy(),
  useEslintRc(),
  addLessLoader({
    javascriptEnabled: true,
  }),
  useEslintConfig(eslintConfig),
  useBabelRc(),
  addWebpackBar
)