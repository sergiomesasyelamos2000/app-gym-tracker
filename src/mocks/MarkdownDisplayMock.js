const React = require("react");
const { Text } = require("react-native");

const Markdown = ({ children }) => {
  return React.createElement(Text, { testID: "markdown-display" }, children);
};

module.exports = Markdown;
module.exports.default = Markdown;
