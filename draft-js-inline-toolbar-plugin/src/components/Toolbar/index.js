/* eslint-disable react/no-array-index-key */
import React from 'react';
import { getVisibleSelectionRect } from 'draft-js';

// TODO make toolbarHeight to be determined or a parameter
const toolbarHeight = 44;

const getRelativeParent = (element) => {
  if (!element) {
    return null;
  }

  const position = window.getComputedStyle(element).getPropertyValue('position');
  if (position !== 'static') {
    return element;
  }

  return getRelativeParent(element.parentElement);
};

export default class Toolbar extends React.Component {

  state = {
    isVisible: false,
    position: undefined,

    /**
     * If this is set, the toolbar will render this instead of the regular
     * structure and will also be shown when the editor loses focus. It's
     * the responsibility of the callee to call this function again with
     * `undefined` to show the regular structure again or hide the toolbar
     * if the editor doesn't have focus anymore.
     *
     * @type {Component}
     */
    overrideContent: undefined
  }

  componentWillMount() {
    this.props.store.subscribeToItem('selection', this.onSelectionChanged);
  }

  componentWillUnmount() {
    this.props.store.unsubscribeFromItem('selection', this.onSelectionChanged);
  }

  onOverrideContent = (overrideContent) =>
    this.setState({ overrideContent });

  onVisibilityChanged = (isVisible) => {
    // need to wait a tick for window.getSelection() to be accurate
    // when focusing editor with already present selection
    setTimeout(() => {
      let position;
      if (isVisible) {
        const relativeParent = getRelativeParent(this.toolbar.parentElement);
        const relativeRect = relativeParent ? relativeParent.getBoundingClientRect() : document.body.getBoundingClientRect();
        const selectionRect = getVisibleSelectionRect(window);
        position = {
          top: (selectionRect.top - relativeRect.top) - toolbarHeight,
          left: (selectionRect.left - relativeRect.left) + (selectionRect.width / 2),
          transform: 'translate(-50%) scale(1)',
          transition: 'transform 0.15s cubic-bezier(.3,1.2,.2,1)',
        };
      } else {
        position = { transform: 'translate(-50%) scale(0)' };
      }
      this.setState({ position });
    }, 0);

    // Revert back to the regular structure when the toolbar gets hidden
    if (!isVisible && this.state.overrideContent) {
      this.setState({ overrideContent: undefined });
    }
  }

  onSelectionChanged = (selection) => {
    const relativeParent = getRelativeParent(this.toolbar.parentElement);
    const relativeRect = (relativeParent || document.body).getBoundingClientRect();
    const selectionRect = getVisibleSelectionRect(window);

    if (!selectionRect) return;

    const position = {
      top: (selectionRect.top - relativeRect.top) - toolbarHeight,
      left: (selectionRect.left - relativeRect.left) + (selectionRect.width / 2),
    };
    this.setState({ position });
  };

  getStyle() {
    const { store } = this.props;
    const { overrideContent, position } = this.state;
    const selection = store.getItem('getEditorState')().getSelection();
    const isVisible = !selection.isCollapsed() || overrideContent;
    const style = { ...position };

    if (isVisible) {
      style.transform = 'translate(-50%) scale(1)';
      style.transition = 'transform 0.15s cubic-bezier(.3,1.2,.2,1)';
    } else {
      style.transform = 'translate(-50%) scale(0)';
    }

    return style;
  }

  handleToolbarRef = (node) => {
    this.toolbar = node;
  };

  render() {
    const { theme, store, structure } = this.props;
    const { overrideContent: OverrideContent } = this.state;
    const childrenProps = {
      theme: theme.buttonStyles,
      getEditorState: store.getItem('getEditorState'),
      setEditorState: store.getItem('setEditorState'),
      onOverrideContent: this.onOverrideContent
    };

    return (
      <div
        className={theme.toolbarStyles.toolbar}
        style={this.getStyle()}
        ref={this.handleToolbarRef}
      >
        {OverrideContent
          ? <OverrideContent {...childrenProps} />
          : structure.map((Component, index) =>
            <Component key={index} {...childrenProps} />)}
      </div>
    );
  }
}
