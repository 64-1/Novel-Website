export function createChromeController({ body, chromeElements }) {
  let drawerOpen = false;
  let popoverVisible = false;

  function setVisible(visible, { force = false } = {}) {
    if (!force && !visible && (drawerOpen || popoverVisible)) {
      return;
    }
    body.classList.toggle("chrome-open", visible);
    chromeElements.forEach((element) => {
      element.hidden = !visible;
    });
  }

  function setDrawerState(isOpen) {
    drawerOpen = isOpen;
  }

  function setPopoverState(isVisible) {
    popoverVisible = isVisible;
  }

  return {
    setVisible,
    setDrawerState,
    setPopoverState
  };
}
