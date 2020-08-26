export const getServerUrl = (): string => {
  const { Meteor } = window.require('meteor/meteor');
  return Meteor.absoluteUrl().replace(/\/$/, '');
};
