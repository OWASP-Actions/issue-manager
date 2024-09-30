import * as core from '@actions/core'
import * as github from '@actions/github'

export async function run(): Promise<void> {
  try {
    const assignCommand = core.getInput('assign-command')
    const token = core.getInput('github-token')

    const octokit = github.getOctokit(token)
    const { context } = github

    const issueNumber = context.payload.issue?.number
    const comment = context.payload.comment?.body
    const commenter = context.payload.comment?.user.login

    if (!issueNumber || !comment || !commenter) {
      core.setFailed('Issue number, comment, or commenter is missing')
      return
    }

    if (comment.trim() === assignCommand) {
      await octokit.rest.issues.addAssignees({
        assignees: [commenter],
        issue_number: issueNumber,
        owner: context.repo.owner,
        repo: context.repo.repo
      })
      core.info(`Assigned issue #${issueNumber} to ${commenter}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(`Error: ${error.message}`)
  }
}

run()
