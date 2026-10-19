#!/usr/bin/env python3
"""Move the Jira tickets that a release ships to the next status.

A prerelease tag (has a "-", e.g. 4.19.0-alpha.1) moves each ticket to
"Ready for QA". A stable tag (e.g. 4.19.0) moves each ticket to "Done".
Tickets move forward only: a ticket already in QA, QA Tested or a done
status for the target stays where it is.

The tickets are the Jira keys in the commit messages between the previous
tag and this tag. For a stable tag the previous tag is the previous stable
tag, so the range covers every alpha of the cycle.

Usage (dry run by default):
  source ~/.claude/skills/jira/jira-env.sh
  .claude/skills/ship-release/jira-release-sync.py <tag> [--since <tag>] [--apply]
"""

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

# The look-arounds reject IDs inside longer names, such as QA flow
# "CONF-QA-001", which is not the Jira key QA-001.
KEY_RE = re.compile(r"(?<![\w-])[A-Z][A-Z0-9]+-\d+(?![\w-])")
QA_OR_LATER = {"ready for qa", "in qa", "qa tested"}


def git(*args):
    return subprocess.run(
        ["git", *args], check=True, capture_output=True, text=True
    ).stdout.strip()


def previous_tag(tag, stable):
    args = ["describe", "--tags", "--abbrev=0"]
    if stable:
        args += ["--exclude", "*-*"]
    return git(*args, f"{tag}^")


def jira_keys(since, tag):
    log = git("log", "--format=%s%n%b", f"{since}..{tag}")
    return sorted(set(KEY_RE.findall(log)))


def jira_config():
    server = os.environ.get("JIRA_SERVER")
    login = os.environ.get("JIRA_LOGIN")
    path = os.path.expanduser("~/.config/.jira/.config.yml")
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                name, _, value = line.partition(":")
                if name == "server" and not server:
                    server = value.strip()
                if name == "login" and not login:
                    login = value.strip()
    token = os.environ.get("JIRA_API_TOKEN")
    if not (server and login and token):
        sys.exit(
            "Jira credentials missing. Run: source ~/.claude/skills/jira/jira-env.sh"
        )
    auth = base64.b64encode(f"{login}:{token}".encode()).decode()
    return server.rstrip("/"), auth


def request(server, auth, method, path, body=None):
    req = urllib.request.Request(
        f"{server}/rest/api/3/{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": f"Basic {auth}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as res:
        data = res.read()
        return json.loads(data) if data else None


def plan(issue, transitions, target, stable):
    status = issue["fields"]["status"]
    name = status["name"]
    if status["statusCategory"]["key"] == "done":
        return None, f"skip: already {name}"
    if not stable and name.lower() in QA_OR_LATER:
        return None, f"skip: already {name}"
    match = next(
        (t for t in transitions if t["to"]["name"].lower() == target.lower()), None
    )
    if not match:
        return None, f"skip: no transition to {target} from {name}"
    return match, f"{name} -> {match['to']['name']}"


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("tag")
    parser.add_argument("--since", help="previous tag (default: auto)")
    parser.add_argument("--apply", action="store_true", help="run the transitions")
    args = parser.parse_args()

    stable = "-" not in args.tag
    target = "Done" if stable else "Ready for QA"
    since = args.since or previous_tag(args.tag, stable)
    keys = jira_keys(since, args.tag)
    print(f"{since}..{args.tag}: {len(keys)} ticket(s), target {target}")

    server, auth = jira_config()
    failed = False
    for key in keys:
        try:
            issue = request(server, auth, "GET", f"issue/{key}?fields=status,summary")
            transitions = request(server, auth, "GET", f"issue/{key}/transitions")
        except urllib.error.HTTPError as e:
            print(f"{key}: skip: cannot read ({e.code})")
            continue
        transition, note = plan(issue, transitions["transitions"], target, stable)
        summary = issue["fields"]["summary"][:70]
        if transition and args.apply:
            try:
                request(
                    server,
                    auth,
                    "POST",
                    f"issue/{key}/transitions",
                    {"transition": {"id": transition["id"]}},
                )
                note += " (done)"
            except urllib.error.HTTPError as e:
                note += f" (FAILED {e.code})"
                failed = True
        elif transition:
            note += " (dry run)"
        print(f"{key}: {note} | {summary}")
    if not args.apply:
        print("Dry run. Pass --apply to run the transitions.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
