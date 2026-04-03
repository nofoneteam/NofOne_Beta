function removeUndefinedValues(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function buildTimestamps(existingData = null) {
  return {
    createdAt: existingData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  removeUndefinedValues,
  buildTimestamps,
};
