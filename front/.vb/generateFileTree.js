/**
 * Visual Builder :: Generate Project File Tree Script
 * Mdtk Soft (c) 2020
 */

const fs = require('fs')
const dree = require('dree')

const scanFolder = '../'
const filename = `file-tree.json`

const options = {
  stat: false,
  size: false,
  hash: false,
  sizeInBytes: false,
  normalize: true,
  exclude: [/node_modules/, /.cloudflare/, /.vb/, /yarn.lock/, /.git/, /.DS_Store/, /build/, /dist/],
}

const tree = dree.scan(scanFolder, options);

const modifiedTree = tree => {
  return tree && tree.map(({ name, type, children }) => {
    const item = {
      title: name,
      key: Math.random().toString(36).substr(2, 9),
      isLeaf: type === 'file',
      children: modifiedTree(children),
    }
    return item
  })
    .sort((a, b) => {
      if (a.isLeaf === b.isLeaf) {
        if (a.title > b.title) {
          return 1;
        }
        else if (a.title < b.title) {
          return -1;
        }
      }

      return a.isLeaf ? 1 : -1
    })
}

fs.writeFile(filename, JSON.stringify(modifiedTree(tree.children), null, 2), 'utf8', function (err) {
  if (err) return console.log(err)
})
