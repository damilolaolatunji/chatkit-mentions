function insertTextAtIndices(text, obj) {
  return text.replace(/./g, function(character, index) {
    return obj[index] ? obj[index] + character : character;
  });
}

export { insertTextAtIndices };
