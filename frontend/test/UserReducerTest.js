var chai = require('chai')
var expect = chai.expect
chai.config.truncateThreshold = 0
import {user} from 'store/user_reducer'
import {CREATE_PROJECT, EDIT_FIRST_PROJECT} from 'store/actions'

describe('user reducer', () => {
  it('should return unchanged state for an unknown action', () => {
    const action = {type: 'SOME_UNKNOWN_ACTION'}
    const oldState = {foo: 'bar'}
    const newState = user(oldState, action)
    expect(newState).to.deep.equal(oldState)
  })

  it('should not add a new project when there is already one', () => {
    const action = {project: {title: 'new project'}, type: CREATE_PROJECT}
    const oldState = {foo: 'bar', projects: [{title: 'a project'}]}
    const newState = user(oldState, action)
    expect(newState.projects.length).to.equal(1)
    expect(newState.projects[0].title).to.equal('a project')
    expect(newState.foo).to.equal('bar')
  })

  it('should add a first project', () => {
    const action = {project: {title: 'new project'}, type: CREATE_PROJECT}
    const oldState = {foo: 'bar'}
    const newState = user(oldState, action)
    expect(newState.projects.length).to.equal(1)
    expect(newState.projects[0].title).to.equal('new project')
    expect(newState.foo).to.equal('bar')
  })

  it('should not edit a complete project', () => {
    const action = {project: {title: 'new project'}, type: EDIT_FIRST_PROJECT}
    const oldState = {foo: 'bar', projects: [{title: 'a project'}]}
    const newState = user(oldState, action)
    expect(newState.projects.length).to.equal(1)
    expect(newState.projects[0].title).to.equal('a project')
    expect(newState.foo).to.equal('bar')
  })

  it('should edit an incomplete project', () => {
    const action = {project: {title: 'new project'}, type: EDIT_FIRST_PROJECT}
    const oldState = {
      foo: 'bar',
      projects: [{isIncomplete: true, target: 'job', title: 'a project'}],
    }
    const newState = user(oldState, action)
    expect(newState.projects.length).to.equal(1)
    expect(newState.projects[0].title).to.equal('new project')
    expect(newState.projects[0].target).to.be.undefined
    expect(newState.foo).to.equal('bar')
  })

  it('should create an incomplete project on first edit', () => {
    const action = {project: {title: 'new project'}, type: EDIT_FIRST_PROJECT}
    const oldState = {foo: 'bar'}
    const newState = user(oldState, action)
    expect(newState.projects.length).to.equal(1)
    expect(newState.projects[0].title).to.equal('new project')
    expect(newState.projects[0].isIncomplete).to.equal(true)
    expect(newState.foo).to.equal('bar')
  })
})

