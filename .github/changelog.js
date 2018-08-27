const { readFileSync: readFile } = require('fs');
const { resolve } = require('path');
const gitUrl = 'https://github.com/RocketChat/Rocket.Chat.Electron';

const parserOpts = {
	mergePattern: /^(Merge pull request #(\d+) from (.*)|(.*) \(#(\d+)\))$/,
	mergeCorrespondence: ['_', 'pr', 'source', 'subject_squashed', 'pr_squashed'],
	headerPattern: /^(\[([A-z]+)\] )?(.*)$/m,
	headerCorrespondence: ['stype', 'type', 'subject'],
};

const LABELS = {
	BREAK: {
		title: 'BREAKING CHANGES',
		collapse: false
	},
	NEW: {
		title: 'New Features',
		collapse: false
	},
	IMPROVE: {
		title: 'Improvements',
		collapse: false
	},
	FIX: {
		title: 'Bug Fixes',
		collapse: false
	},
	DOC: {
		title: 'Documentation',
		collapse: true
	},
	OTHER: {
		title: 'Others',
		collapse: true
	}
};

const sort = Object.keys(LABELS);

const writerOpts = {
	transform: (commit) => {
		if (!commit.pr && !commit.pr_squashed) {
			return;
		}

		if (commit.pr_squashed) {
			commit.pr = commit.pr_squashed;
			const matches = /^(\[([A-z]+)\] )?(.*)$/m.exec(commit.subject_squashed);
			if (matches) {
				commit.stype = matches[1];
				commit.type = matches[2];
				commit.subject = matches[3];
			} else {
				commit.subject = commit.subject_squashed;
			}

			delete commit.pr_squashed;
			delete commit.subject_squashed;
		}

		commit.type = (commit.type || 'OTHER').toUpperCase();
		if (LABELS[commit.type] == null) {
			return;
		}

		commit.pr_url = gitUrl + '/pull/' + commit.pr;

		const issues = [];

		if (typeof commit.hash === 'string') {
			commit.hash = commit.hash.substring(0, 7);
		}

		if (typeof commit.subject === 'string') {
			// GitHub issue URLs.
			commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
				issues.push(issue);
				return `[#${issue}](${gitUrl}/issues/${issue})`;
			});
			// GitHub user URLs.
			commit.subject = commit.subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)');
		}

		// remove references that already appear in the subject
		commit.references = commit.references.filter(({ issue }) => issues.includes(issue));

		return commit;
	},
	groupBy: 'type',
	commitGroupsSort: (a, b) => sort.indexOf(a.title) > sort.indexOf(b.title),
	finalizeContext: (context) => {
		context.commitGroups.forEach((g) => Object.assign(g, LABELS[g.title.toUpperCase()]));
		return context;
	},
	commitsSort: ['subject']
};

writerOpts.mainTemplate = readFile(resolve(__dirname, 'templates/template.hbs'), 'utf-8');
writerOpts.headerPartial = readFile(resolve(__dirname, 'templates/header.hbs'), 'utf-8');
writerOpts.commitPartial = readFile(resolve(__dirname, 'templates/commit.hbs'), 'utf-8');
writerOpts.footerPartial = readFile(resolve(__dirname, 'templates/footer.hbs'), 'utf-8');

module.exports = {
	gitRawCommitsOpts: {
		merges: null
	},
	parserOpts: parserOpts,
	writerOpts: writerOpts
};
