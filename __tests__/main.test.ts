import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import * as main from '../src/main'

jest.mock('@actions/core')
jest.mock('@actions/github', () => {
  return {
    ...jest.requireActual('@actions/github'),
    getOctokit: jest.fn(),
    context: {
      payload: {
        issue: {
          number: null
        },
        comment: {
          body: null,
          user: {
            login: null
          }
        }
      },
      repo: {
        owner: 'OWASP',
        repo: 'nest-repo'
      }
    }
  }
})

describe('Issue Manager Assignment', () => {
  let octokitMock: jest.Mocked<Octokit>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fail if GitHub token is empty', async () => {
    ;(core.getInput as jest.Mock).mockImplementation((inputName: string) => {
      if (inputName === 'token') return ''
      return ''
    })

    const errorMock = jest.spyOn(core, 'error').mockImplementation()
    const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith('GitHub token is missing')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('should fail if issue number is missing', async () => {
    ;(github.context as any).payload.comment.body = '/assign'
    ;(github.context as any).payload.comment.user.login = 'nest-contributor'
    ;(github.context as any).payload.issue.number = null
    ;(core.getInput as jest.Mock).mockImplementation((inputName: string) => {
      if (inputName === 'token') return 'token'
      if (inputName === 'assign-command') return '/assign'
      return ''
    })

    octokitMock = {
      rest: {
        issues: {
          get: jest.fn().mockResolvedValue({
            data: {
              assignees: ['another-contributor']
            }
          }),
          addAssignees: jest.fn().mockResolvedValue({})
        }
      }
    } as unknown as jest.Mocked<Octokit>
    ;(github.getOctokit as jest.Mock).mockReturnValue(octokitMock)

    await main.run()

    expect(octokitMock.rest.issues.addAssignees).not.toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith(
      'Issue number, comment, or commenter is missing'
    )
  })

  it('should skip assignment if issue already has an assignee', async () => {
    ;(github.context as any).payload.comment.body = '/assign'
    ;(github.context as any).payload.comment.user.login = 'nest-contributor'
    ;(github.context as any).payload.issue.number = 123
    ;(core.getInput as jest.Mock).mockImplementation((inputName: string) => {
      if (inputName === 'token') return 'token'
      if (inputName === 'assign-command') return '/assign'
      return ''
    })

    octokitMock = {
      rest: {
        issues: {
          get: jest.fn().mockResolvedValue({
            data: {
              assignees: ['another-contributor']
            }
          }),
          addAssignees: jest.fn().mockResolvedValue({})
        }
      }
    } as unknown as jest.Mocked<Octokit>
    ;(github.getOctokit as jest.Mock).mockReturnValue(octokitMock)

    await main.run()

    expect(octokitMock.rest.issues.addAssignees).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      'The issue has already been assigned'
    )
  })

  it('should skip assignment if command is incorrect', async () => {
    ;(github.context as any).payload.comment.body = '/assign-foo'
    ;(github.context as any).payload.comment.user.login = 'nest-contributor'
    ;(github.context as any).payload.issue.number = 123
    ;(core.getInput as jest.Mock).mockImplementation((inputName: string) => {
      if (inputName === 'token') return 'token'
      if (inputName === 'assign-command') return '/assign'
      return ''
    })

    octokitMock = {
      rest: {
        issues: {
          get: jest.fn().mockResolvedValue({
            data: {
              assignees: []
            }
          }),
          addAssignees: jest.fn().mockResolvedValue({})
        }
      }
    } as unknown as jest.Mocked<Octokit>
    ;(github.getOctokit as jest.Mock).mockReturnValue(octokitMock)
    ;(core.getInput as jest.Mock).mockImplementation((inputName: string) => {
      if (inputName === 'token') return 'token'
      if (inputName === 'assign-command') return '/assign'
      return ''
    })

    await main.run()

    expect(octokitMock.rest.issues.addAssignees).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      'Skipped assignment as comment text does not match the assign command'
    )
  })

  it('should assign the issue and call core.info with success message', async () => {
    ;(github.context as any).payload.comment.body = '/assign'
    ;(github.context as any).payload.comment.user.login = 'nest-contributor'
    ;(github.context as any).payload.issue.number = 123

    octokitMock = {
      rest: {
        issues: {
          get: jest.fn().mockResolvedValue({
            data: {
              assignees: []
            }
          }),
          addAssignees: jest.fn().mockResolvedValue({})
        }
      }
    } as unknown as jest.Mocked<Octokit>
    ;(github.getOctokit as jest.Mock).mockReturnValue(octokitMock)

    // Mock core.getInput
    ;(core.getInput as jest.Mock).mockImplementation((inputName: string) => {
      if (inputName === 'token') return 'token'
      if (inputName === 'assign-command') return '/assign'
      return ''
    })

    await main.run()

    // Check that octokit.rest.issues.get was called with the correct parameters
    expect(octokitMock.rest.issues.get).toHaveBeenCalledWith({
      issue_number: 123,
      owner: 'OWASP',
      repo: 'nest-repo'
    })

    // Check that octokit.rest.issues.addAssignees was called with the correct parameters
    expect(octokitMock.rest.issues.addAssignees).toHaveBeenCalledWith({
      assignees: ['nest-contributor'],
      issue_number: 123,
      owner: 'OWASP',
      repo: 'nest-repo'
    })

    // Check that core.info was called with the expected message
    expect(core.info).toHaveBeenCalledWith(
      'Assigned issue #123 to nest-contributor'
    )
  })
})
