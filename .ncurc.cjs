/** @type {import('npm-check-updates').RunOptions} */
module.exports = {
  reject: [
    // v10.x has whatBump bug — https://github.com/release-it/conventional-changelog/issues/107
    "@release-it/conventional-changelog",
  ],
};
