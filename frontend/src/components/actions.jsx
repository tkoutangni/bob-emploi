import React from 'react'
import {connect} from 'react-redux'
import {browserHistory} from 'react-router'
import Radium from 'radium'

import {ActionStatus} from 'api/project'
import {Modal, ModalHeader} from './modal'
import {Routes} from 'components/url'
import {Colors, ExternalSiteButton, Icon, Markdown, Button, Styles} from './theme'
import {isActionStuck, stickyProgress} from 'store/action'
import {finishAction, cancelAction, readAction, stickAction,
        openActionExternalLink, saveAction} from 'store/actions'
import {extractDomainName} from 'store/link'


const ACTION_SHAPE = React.PropTypes.shape({
  actionId: React.PropTypes.string.isRequired,
  doneCaption: React.PropTypes.string,
  durationSeconds: React.PropTypes.number,
  extraContent: React.PropTypes.string,
  goal: React.PropTypes.string,
  howTo: React.PropTypes.string,
  justification: React.PropTypes.string,
  shortDescription: React.PropTypes.string,
  shortDescriptionFeminine: React.PropTypes.string,
  status: React.PropTypes.oneOf(Object.keys(ActionStatus)).isRequired,
  title: React.PropTypes.string,
  titleFeminine: React.PropTypes.string,
})


class ActionDescriptionModalBase extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
    dispatch: React.PropTypes.func.isRequired,
    gender: React.PropTypes.string,
    isShown: React.PropTypes.bool,
    // For tips, show the title without the chantier, and change call to action.
    isShownAsTip: React.PropTypes.bool,
    onClose: React.PropTypes.func.isRequired,
  }

  state = {
    isConfirmStickyActionModalShown: false,
    isNegativeFeedbackModalShown: false,
    isPositiveFeedbackModalShown: false,
    onHidden: null,
  }

  componentDidMount() {
    const {action, isShown} = this.props
    if (isShown && action && action.status === 'ACTION_UNREAD') {
      this.props.dispatch(readAction(action))
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isShown && !this.props.isShown &&
        nextProps.action && nextProps.action.status === 'ACTION_UNREAD') {
      this.props.dispatch(readAction(nextProps.action))
    }
  }

  closeAndDo = callback => {
    const {isShown, onClose} = this.props
    // In case the modal is already closing, due to some other reason, do the action right away.
    if (!isShown) {
      callback()
      return
    }
    this.setState({onHidden: () => {
      this.setState({onHidden: null})
      callback()
    }})
    onClose()
  }

  handleFinishAction = () => {
    this.setState({isPositiveFeedbackModalShown: true})
  }

  handleSubmitPositiveFeedback = (wasUseful, caption) => {
    const {dispatch, action} = this.props
    this.closeAndDo(() => {
      this.setState({isPositiveFeedbackModalShown: false})
      dispatch(finishAction(action, {caption, wasUseful}))
    })
  }

  handleSubmitNegativeFeedback = caption => {
    const {dispatch, action} = this.props
    this.closeAndDo(() => {
      this.setState({isNegativeFeedbackModalShown: false})
      dispatch(finishAction(action, {caption, status: 'ACTION_DECLINED'}))
    })
  }

  handleCancelAction = feedback => {
    const {dispatch, action} = this.props
    if (feedback.status === 'ACTION_DECLINED') {
      this.setState({isNegativeFeedbackModalShown: true})
    } else {
      this.closeAndDo(() => dispatch(cancelAction(action, feedback)))
    }
  }

  handleSaveAction = () => {
    const {dispatch, action} = this.props
    this.closeAndDo(() => dispatch(saveAction(action)))
  }

  handleStickAction = () => {
    const {action, dispatch} = this.props
    this.setState({isConfirmStickyActionModalShown: false})
    dispatch(stickAction(action))
  }

  renderAsAction(action) {
    const isSticky = !!(action && action.goal)
    const {gender} = this.props
    if (!action) {
      return null
    }
    return <div>
      <ActionModalHeader action={action} gender={gender} />
      <div style={{maxHeight: '80vh', overflow: 'auto'}}>
        <ActionContent action={action} gender={gender} />
        {isSticky ?
          <StickyActionIncentive
              action={action}
              onClick={() => this.setState({isConfirmStickyActionModalShown: true})} /> :
              <ActionHowto action={action} />}
      </div>
      <ButtonsBar
          action={action}
          onCancelAction={this.handleCancelAction}
          onFinishAction={this.handleFinishAction} />
    </div>
  }

  handleLinkClick = () => {
    const {action, dispatch} = this.props
    dispatch(openActionExternalLink(action))
  }

  renderAsTip(action) {
    if (!action) {
      return null
    }
    const {gender} = this.props
    const shortDescription =
        gender === 'FEMININE' && action.shortDescriptionFeminine || action.shortDescription
    const titleStyle = {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 30,
    }
    const contentStyle = {
      maxHeight: '80vh',
      overflow: 'auto',
      padding: 35,
    }
    const linkStyle = {
      color: Colors.SKY_BLUE,
      fontWeight: 'bold',
    }
    return <div>
      <ActionModalHeader action={action} gender={gender} isShownAsTip={true} />
      <div style={contentStyle}>
        <Markdown content={shortDescription} />
        <div style={titleStyle}>
          Vous ne savez pas par où commencer ?
        </div>
        <div style={{marginBottom: 15, marginTop: 5}}>
          <a style={linkStyle} target="_blank" href={action.link} onClick={this.handleLinkClick}>
          Cliquez ici</a> pour avoir un coup de pouce.
        </div>
      </div>
    </div>
  }

  render() {
    const {action, isShown, isShownAsTip, onClose} = this.props
    const {isConfirmStickyActionModalShown, isNegativeFeedbackModalShown,
           isPositiveFeedbackModalShown, onHidden} = this.state
    const style = {
      fontSize: 14,
      width: 700,
    }
    const isMainModalShown =
      isShown && !isPositiveFeedbackModalShown && !isNegativeFeedbackModalShown &&
      !isConfirmStickyActionModalShown
    return <div>
      <Modal isShown={isMainModalShown} onClose={onClose} onHidden={onHidden} style={style}>
        {isShownAsTip ? this.renderAsTip(action) : this.renderAsAction(action)}
      </Modal>
      <PositiveFeedbackModal
          isShown={isShown && isPositiveFeedbackModalShown} onHidden={onHidden}
          onSubmit={this.handleSubmitPositiveFeedback} />
      <NegativeFeedbackModal
          isShown={isShown && isNegativeFeedbackModalShown} onHidden={onHidden}
          onSubmit={this.handleSubmitNegativeFeedback} />
      <StickyActionConfirmModal
          isShown={isShown && isConfirmStickyActionModalShown}
          onCancel={() => this.setState({isConfirmStickyActionModalShown: false})}
          onConfirm={this.handleStickAction} />
    </div>
  }
}
const ActionDescriptionModal = connect()(ActionDescriptionModalBase)


class ActionModalHeader extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
    gender: React.PropTypes.string,
    isShownAsTip: React.PropTypes.bool,
  }


  render() {
    const {action, gender, isShownAsTip} = this.props
    const title = gender === 'FEMININE' && action.titleFeminine || action.title
    const chantierTitles = (action.chantiers || []).map(
        chantier => chantier.titleFirstPerson || chantier.title)
    const subHeaderStyle = {
      display: isShownAsTip ? 'none' : 'block',
      fontSize: 14,
      fontWeight: 'normal',
    }
    const headerStyle = {
      display: 'block',
      fontSize: 17,
      padding: isShownAsTip ? 35 : '25px 35px',
    }
    return <ModalHeader style={headerStyle}>
      <div style={subHeaderStyle}>
        Action pour {chantierTitles.join(' et pour ')}&nbsp;:
      </div>
      {title}
    </ModalHeader>
  }
}


class StickyActionIncentive extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
    onClick: React.PropTypes.func,
    style: React.PropTypes.object,
  }

  render() {
    const {action, onClick, style} = this.props
    const containerStyle = {
      border: 'solid 1px ' + Colors.SILVER,
      borderRadius: 4,
      margin: '0 25px 35px',
      padding: 25,
      position: 'relative',
      ...style,
    }
    const starStyle = {
      color: Colors.SUN_YELLOW,
      fontSize: 20,
      position: 'absolute',
      right: 20,
      top: 20,
    }
    return <div style={containerStyle}>
      <Icon style={starStyle} name="star" />
      <div style={{fontWeight: 'bold', marginBottom: 15}}>{action.goal}</div>
      <div>{action.stickyActionIncentive}</div>
      <div style={{marginTop: 25, textAlign: 'center'}}>
        <Button onClick={onClick}>
          Faire cette action en plusieurs étapes
        </Button>
      </div>
    </div>
  }
}


class StickyActionConfirmModal extends React.Component {
  static propTypes = {
    onCancel: React.PropTypes.func.isRequired,
    onConfirm: React.PropTypes.func.isRequired,
  }

  render() {
    const {onCancel, onConfirm, ...extraProps} = this.props
    const style = {
      color: Colors.SLATE,
      fontSize: 14,
      lineHeight: 1.5,
      padding: '0 50px 30px',
      textAlign: 'center',
    }
    const buttonStyle = {
      margin: '0 10px',
      padding: '10px 0 8px',
      width: 160,
    }
    return <Modal {...extraProps} title="Super, on y va ?" style={style}>
      <img src={require('images/thumb-up.svg')} style={{margin: '35px 0'}} />
      <div style={{margin: 'auto', maxWidth: 300}}>
        Nous vous proposons un coaching étape par étape pour vous aider à
        réussir cette action.
      </div>
      <div style={{marginTop: 40}}>
        <Button onClick={onCancel} style={buttonStyle}>
          Pas maintenant
        </Button>
        <Button type="validation" onClick={onConfirm} style={buttonStyle}>
          Je me lance
        </Button>
      </div>
    </Modal>
  }
}


class ActionContentBase extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
    dispatch: React.PropTypes.func.isRequired,
    gender: React.PropTypes.string,
  }

  handleLinkClick = () => {
    const {action, dispatch} = this.props
    dispatch(openActionExternalLink(action))
  }

  render() {
    const {action, gender} = this.props

    const shortDescription = (
        gender === 'FEMININE' && action.shortDescriptionFeminine || action.shortDescription)
    const contentStyle = {
      backgroundColor: '#fff',
      color: Colors.CHARCOAL_GREY,
      padding: '20px 35px 30px',
    }
    if (action.applyToCompany) {
      return <CompanyDescription
          company={action.applyToCompany} style={contentStyle}
          onExternalLinkClick={this.handleLinkClick} />
    }
    return <div style={contentStyle}>
      <Markdown content={shortDescription} />
      <div style={{textAlign: 'center'}}>
        {action.link ? <div>
          <ExternalSiteButton
              href={action.link} style={{margin: 9}}
              onClick={this.handleLinkClick}>
            Aller sur {extractDomainName(action.link)}
          </ExternalSiteButton>
          <div style={{textAlign: 'center'}}>pour faire cette action</div>
        </div> : null}
      </div>
    </div>
  }
}
const ActionContent = connect()(ActionContentBase)


const makeGoogleLink = keywords => {
  return 'https://www.google.fr/search?q=' + encodeURIComponent(keywords.join(' '))
}


class CompanyDescription extends React.Component {
  static propTypes = {
    company: React.PropTypes.object.isRequired,
    onExternalLinkClick: React.PropTypes.func,
    style: React.PropTypes.object,
  }

  render() {
    const {company, onExternalLinkClick, style} = this.props
    const containerStyle = {
      ...style,
      padding: '20px 35px 10px',
    }
    const titleCellStyle = {
      textAlign: 'left',
      width: 225,
    }
    const linkStyle = {
      color: Colors.SKY_BLUE,
      fontSize: 13,
      paddingRight: '.5em',
      textDecoration: 'underline',
    }
    const copyrightBoxStyle = {
      alignItems: 'center',
      display: 'flex',
      fontSize: 12,
      justifyContent: 'flex-end',
      marginTop: 15,
      textAlign: 'right',
    }
    return <div style={containerStyle}>
      <table>
        <tr><th style={titleCellStyle}>Nom de la société</th><td>{company.name}</td></tr>
        <tr><th style={titleCellStyle}>Ville</th><td>{company.cityName}</td></tr>
        <tr>
          <th style={titleCellStyle}>Secteur d'activité</th>
          <td>{company.activitySectoryName}</td>
        </tr>
        <tr>
          <th style={titleCellStyle}>Taille de l'enterprise</th>
          <td>{company.headcountText}</td>
        </tr>
        <tr><th style={titleCellStyle}>Plus d'infos</th><td>
          <a
              href={makeGoogleLink([company.name, company.cityName])} target="_blank"
              style={linkStyle}>
            Google
          </a> <a
              href={`http://fr.kompass.com/searchCompanies?text=${company.siret}`}
              target="_blank" style={linkStyle}>
            Kompass
          </a>
        </td></tr>
      </table>
      <div style={{margin: 9, textAlign: 'center'}}>
        <ExternalSiteButton
            href={`http://labonneboite.pole-emploi.fr/${company.siret}/details?` +
              'utm_medium=web&utm_source=bob&utm_campaign=bob-action-ent'}
            onClick={onExternalLinkClick}>
          Voir la carte et le contact
        </ExternalSiteButton>
      </div>
      <div style={copyrightBoxStyle}>
        <div style={{marginRight: 10}}>
          Informations fournies par<br />La Bonne Boite avec
        </div>
        <img src={require('images/ple-emploi-ico.png')} height={50} />
      </div>
    </div>
  }
}


class ActionHowto extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
  }

  state = {
    isExpanded: false,
  }

  render() {
    const howTo = this.props.action.howTo
    if (!howTo) {
      return null
    }
    const howToStyle = {
      borderTop: 'solid 1px ' + Colors.MODAL_PROJECT_GREY,
      padding: '15px 35px',
    }
    const titleStyle = {
      fontSize: 14,
      fontWeight: 'bold',
    }
    return <div style={howToStyle}>
      <div style={titleStyle}>Astuce de la communauté</div>
      <Markdown content={howTo} />
    </div>
  }
}


class ButtonsBar extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
    onCancelAction: React.PropTypes.func,
    onFinishAction: React.PropTypes.func,
  }

  render() {
    const {action, onCancelAction, onFinishAction} = this.props
    if (action.status === 'ACTION_DONE') {
      return null
    }
    const style = {
      alignItems: 'center',
      background: Colors.BACKGROUND_GREY,
      borderTop: 'solid 1px ' + Colors.MODAL_PROJECT_GREY,
      color: Colors.COOL_GREY,
      display: 'flex',
      fontSize: 13,
      fontWeight: 500,
      justifyContent: 'center',
      padding: '17px 35px',
      position: 'relative',
    }
    const separatorStyle = {
      borderLeft: 'solid 1px',
      height: 27,
      marginLeft: 9,
      marginRight: 9,
      opacity: .5,
    }
    return <div style={style}>
      <Button
          type="discreet" isNarrow={true}
          onClick={() => onCancelAction({status: 'ACTION_DECLINED'})}>
        Ne pas faire cette action
      </Button>
      <span style={separatorStyle} />
      <Button
          type="discreet" isNarrow={true}
          onClick={() => onCancelAction({status: 'ACTION_SNOOZED'})}>
        La faire un autre jour
      </Button>
      <span style={{flex: 1}} />
      <Button
          type="validation" isNarrow={true}
          onClick={onFinishAction}>
        <Icon name="check" /> J'ai fait cette action
      </Button>
    </div>
  }
}


class ActionBase extends React.Component {
  static propTypes = {
    action: ACTION_SHAPE,
    context: React.PropTypes.oneOf(['', 'project']),
    gender: React.PropTypes.string,
    onOpen: React.PropTypes.func.isRequired,
    project: React.PropTypes.object,
    style: React.PropTypes.object,
  }


  renderRightButton() {
    const {action} = this.props
    const isDone = action.status === 'ACTION_DONE'
    const doneMarkerStyle = {
      color: Colors.GREENISH_TEAL,
      fontSize: 27,
    }
    if (isDone) {
      return <Icon name="check-circle" style={doneMarkerStyle} />
    }
    const buttonStyle = {
      ':hover': {
        backgroundColor: Colors.COOL_GREY,
        color: '#fff',
      },
      alignItems: 'center',
      backgroundColor: Colors.MODAL_PROJECT_GREY,
      color: Colors.COOL_GREY,
      display: 'flex',
      padding: 2,
      transition: 'background-color 450ms, color 450ms',
    }
    const chevronStyle = {
      fontSize: 20,
      verticalAlign: 'middle',
    }
    return <Button isNarrow={true} type="discreet" style={buttonStyle}>
      <Icon name="chevron-right" style={chevronStyle} />
    </Button>
  }

  handleProjectClick = event => {
    event.stopPropagation()
    browserHistory.push(Routes.PROJECT_PAGE + '/' + this.props.project.projectId)
  }

  getBulletColor(actionStatus) {
    if (actionStatus === 'ACTION_SAVED') {
      return Colors.GREENISH_TEAL
    }
    if (actionStatus === 'ACTION_UNREAD') {
      return Colors.SKY_BLUE
    }
    return Colors.SILVER
  }

  renderBullet() {
    const bulletStyle = {
      backgroundColor: this.getBulletColor(this.props.action.status),
      borderRadius: '50%',
      height: 10,
      margin: '0 20px 0 5px',
      width: 10,
    }
    return <div style={bulletStyle} />
  }

  renderProgress() {
    const {action} = this.props
    if (!isActionStuck(action)) {
      return null
    }
    const style = {
      backgroundColor: Colors.MODAL_PROJECT_GREY,
      borderRadius: 100,
      height: 10,
      margin: 15,
      overflow: 'hidden',
      position: 'relative',
      // This is a CSS stunt to make the hidden overflow + border-radius
      // effective on Mac + Chrome.
      transform: 'scale(1)',
      width: 100,
    }
    const progressStyle = {
      ...Styles.PROGRESS_GRADIENT,
      bottom: 0,
      left: 0,
      position: 'absolute',
      top: 0,
      width: 100 * stickyProgress(action),
    }
    return <div style={style}>
      <div style={progressStyle} />
    </div>
  }

  renderStarOrBullet() {
    const {action} = this.props
    if (!action.goal) {
      return this.renderBullet()
    }
    const isStuck = isActionStuck(action)
    const style = {
      color: isStuck ? Colors.SUN_YELLOW : Colors.PINKISH_GREY,
      fontSize: 20,
      paddingRight: 12,
    }
    return <Icon name={isStuck ? 'star' : 'star-outline'} style={style} />
  }

  render() {
    const {action, context, gender, onOpen, project} = this.props
    const isRead = action.status === 'ACTION_UNREAD'
    const style = {
      ':focus': {backgroundColor: Colors.LIGHT_GREY},
      ':hover': {backgroundColor: Colors.LIGHT_GREY},
      backgroundColor: '#fff',
      marginBottom: 1,
      position: 'relative',
      ...this.props.style,
    }
    const contentStyle = {
      alignItems: 'center',
      color: Colors.DARK,
      cursor: 'pointer',
      display: 'flex',
      fontSize: 14,
      height: 55,
      padding: '0 20px',
    }
    const titleStyle = {
      flex: 1,
      fontWeight: isRead ?
        'bold' :
        (action.status === 'ACTION_DONE' ? 500 : 'inherit'),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      ...Styles.CENTER_FONT_VERTICALLY,
    }
    const contextStyle = {
      color: Colors.COOL_GREY,
      fontSize: 13,
      fontStyle: 'italic',
      fontWeight: 'normal',
    }
    const title = gender === 'FEMININE' && action.titleFeminine || action.title
    const contextText = context === 'project' ? project.title : ''
    return <div style={style}>
      <div style={contentStyle} onClick={onOpen}>
        {this.renderStarOrBullet()}
        <div style={titleStyle}>
          {title} {contextText ? <span style={contextStyle}>
            - {contextText}
          </span> : null}
        </div>

        {this.renderProgress()}
        {this.renderRightButton()}
      </div>
    </div>
  }
}
const Action = connect(({user}) => ({
  gender: user.profile.gender,
}))(Radium(ActionBase))


class PositiveFeedbackModal extends React.Component {
  static propTypes = {
    isShown: React.PropTypes.bool,
    onSubmit: React.PropTypes.func.isRequired,
  }

  state = {
    isNotUseful: false,
    isUseful: false,
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isShown && nextProps.isShown) {
      if (this.refs.comment) {
        this.refs.comment.value = ''
      }
      this.setState({isNotUseful: false, isUseful: false})
    }
  }

  handleSubmit = () => {
    const {isNotUseful, isUseful} = this.state
    if (isNotUseful === isUseful) {
      return
    }
    this.props.onSubmit(isUseful, this.refs.comment.value)
  }

  render() {
    const {isNotUseful, isUseful} = this.state
    const style = {
      fontSize: 14,
      textAlign: 'center',
      width: 480,
    }
    const pictoStyle = {
      margin: 15,
    }
    const subtitleStyle = {
      fontSize: 19,
      fontWeight: 500,
    }
    return <Modal
        {...this.props} style={style}
        title="Félicitations&nbsp;!">
      <img src={require('images/congrats-ico.svg')} style={pictoStyle} />
      <div style={subtitleStyle}>
        Qu'avez vous pensé de cette action&nbsp;?
      </div>
      <div style={{margin: '0 80px'}}>
        Nous posons cette question pour affiner les actions que nous vous
        proposons.
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', margin: '30px 50px 20px'}}>
        <IconSelectButton
            iconName="thumb-up" isSelected={isUseful}
            onClick={() => this.setState({isNotUseful: false, isUseful: true})}>
          Utile
        </IconSelectButton>
        <IconSelectButton
            iconName="thumb-down" isSelected={isNotUseful}
            onClick={() => this.setState({isNotUseful: true, isUseful: false})}>
          Pas utile
        </IconSelectButton>
      </div>

      <div style={{display: 'flex', margin: '0 50px'}}>
        <textarea
            ref="comment" style={{flex: 1, minHeight: 110, padding: 10}}
            placeholder="Donnez-nous votre avis (Facultatif)" />
      </div>

      <Button
          type="validation" disabled={!isUseful && !isNotUseful}
          style={{margin: '25px 0 40px'}} onClick={this.handleSubmit}>
        Envoyer
      </Button>
    </Modal>
  }
}


class IconSelectButton extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
    iconName: React.PropTypes.string.isRequired,
    isSelected: React.PropTypes.bool,
    style: React.PropTypes.object,
  }

  render() {
    const {children, iconName, isSelected, style, ...extraProps} = this.props
    const buttonStyle = {
      ':hover': {
        backgroundColor: isSelected ? Colors.SKY_BLUE : '#fff',
        border: 'solid 2px ' + (isSelected ? Colors.SKY_BLUE : Colors.SKY_BLUE_HOVER),
        color: isSelected ? '#fff' : Colors.SKY_BLUE_HOVER,
      },
      backgroundColor: isSelected ? Colors.SKY_BLUE : '#fff',
      border: 'solid 2px ' + Colors.SKY_BLUE,
      color: isSelected ? '#fff' : Colors.SKY_BLUE,
      fontWeight: 'bold',
      position: 'relative',
      width: 185,
      ...style,
    }
    const iconStyle = {
      left: 10,
      position: 'absolute',
      top: 14,
    }
    return <Button {...extraProps} style={buttonStyle}>
      <Icon name={iconName} style={iconStyle} />
      {children}
    </Button>
  }
}


class NegativeFeedbackModal extends React.Component {
  static propTypes = {
    isShown: React.PropTypes.bool,
    onSubmit: React.PropTypes.func.isRequired,
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.isShown && nextProps.isShown && this.refs.comment) {
      this.refs.comment.value = ''
    }
  }

  handleSubmit = () => {
    this.props.onSubmit(this.refs.comment.value)
  }

  render() {
    const style = {
      fontSize: 14,
      textAlign: 'center',
      width: 480,
    }
    const subtitleStyle = {
      fontSize: 19,
      fontWeight: 500,
    }
    return <Modal
        {...this.props} style={style}
        title="Désolé…">
      <div style={subtitleStyle}>
        Pourquoi n'avez vous pas aimé<br />
        cette action&nbsp;?
      </div>
      <div style={{margin: '15px 80px 0'}}>
        Nous posons cette question pour affiner les actions que nous vous
        proposons.
      </div>

      <div style={{display: 'flex', margin: '25px 50px'}}>
        <textarea
            ref="comment" style={{flex: 1, minHeight: 110, padding: 10}}
            placeholder="Donnez-nous votre avis (Facultatif)" />
      </div>

      <Button
          type="validation"
          style={{margin: '0 0 40px'}} onClick={this.handleSubmit}>
        Envoyer
      </Button>
    </Modal>
  }
}


export {Action, ActionDescriptionModal, ACTION_SHAPE}
