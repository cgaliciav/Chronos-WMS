/* eslint-disable */
var GetPostProcessor = function () {
  function Processor(options) {
    this.options = options || {}
  }

  Processor.prototype = {
    process: function (css) {
      // Check if css is wrapped with any one of the marks
      const antDesignTemplateMark = this.options.wrappers.reduce((mark, wrapper) => (css.indexOf(wrapper) >= 0 ? wrapper : mark), '')

      if (!antDesignTemplateMark) {
        return css
      }

      // Escape the mark to be RegExp friendly
      const escapedMark = antDesignTemplateMark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Split, map, remove all, add one, clean double spaces
      const lines = css.split('\n').map((line) => {
        if (line.indexOf(antDesignTemplateMark) === -1) {
          return line
        }

        const finder = new RegExp(escapedMark, 'g')
        const finderNested = new RegExp(`(?<!^(?<!s))${escapedMark} `, 'g')
        const replaceNestedLine = line.replace(finderNested, '')
        const replaceLine = `${antDesignTemplateMark} ${replaceNestedLine.replace(finder, '')}`
        const removeTwoSpace = replaceLine.replace(/( {2})/g, ' ')
        const final = removeTwoSpace

        return final
      })

      return lines.join('\n')
    }
  }

  return Processor;
}

registerPlugin({
  install: function (less, pluginManager) {
    var PostProcessor = GetPostProcessor(less)
    pluginManager.addPostProcessor(new PostProcessor(this.options))
  },
  setOptions: function (theOptions) {
    this.options = JSON.parse(theOptions.replace(/(\r\n|\n|\r)/gm, ''))
  },
})