import type MeteorNamespace from 'meteor/meteor';

export const getServerUrl = (): string => {
  const { Meteor } = window.require('meteor/meteor') as typeof MeteorNamespace;
  return Meteor.absoluteUrl().replace(/\/$/, '');
};
