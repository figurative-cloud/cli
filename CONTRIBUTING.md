# Reasonai CLI Contributing Guide

Hi! Welcome to the Reasonai community. Before submitting your contribution, please make sure to take a moment and read through the following guidelines:

- [Pull Request Guidelines](#pull-request-guidelines)

## Pull Request Guidelines

- Checkout a topic branch from the relevant branch, e.g. `main`, and merge back against that branch.

- If adding a new feature:

  - Provide a convincing reason to add this feature. Ideally, you should open a suggestion issue first and have it approved before working on it.

- If fixing bug:

  - Provide a detailed description of the bug in the PR. Live demo preferred.

- It's OK to have multiple small commits as you work on the PR - GitHub can automatically squash them before merging.

- We use [release-please](https://github.com/googleapis/release-please) to create release PRs so:
  - Read more on semver versioning and commit message styles on their page
  - Use squash-merge wherever possible

## Development Setup

We use yarn package manager

After cloning the repo, run:

```sh
# install the dependencies of the project
$ yarn install
# setup git hooks
$ npx simple-git-hooks
```

## Dev Testing

When testing locally, you can run the command below followed by the reasonai commands.

- Read more on the [Getting Started](https://docs.reasonai.dev/guide/introduction/getting-started) page for initialization instructions

- A `reason` directory will be added to the root folder when you run the `init` command. This is where reasonai will generate its output. The whole dir is git-ignored

The _yarn cli_ command will build and run the local changes using [tsx.is](https://tsx.is)
This runs out of the _src_ directory

```sh
$ yarn cli init # init the reason environment
$ yarn cli <reasonai command> [OPTIONS]
```

## Building

We use [ pkgroll ](https://www.npmjs.com/package/pkgroll?activeTab=readme) to build and bundle the binary package

Run the following:

```sh
$ yarn build # to build the output
```

## Output Testing

To test the built output (uses node instead of tsx) run:

```sh
yarn start <reasonai command> [OPTIONS]
```

```

This runs out of the dist folder instead of the src folder
```
